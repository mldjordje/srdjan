import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { sendPushToClient } from "@/lib/server/push";
import { requireAdmin } from "@/lib/server/rbac";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { formatIsoDateToEuropean } from "@/lib/date";

type CancelWorkerDayBody = {
  locationId?: string;
  workerId?: string;
  date?: string;
  reason?: string;
};

type AppointmentRow = {
  id: string;
  client_id: string;
  service_name_snapshot: string;
  date: string;
  start_time: string;
};

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export async function POST(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner", "staff-admin"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const body = await parseJson<CancelWorkerDayBody>(request);
  if (!body) {
    return jsonError("Invalid JSON body.");
  }

  const locationId = (body.locationId || "").trim();
  const workerId = (body.workerId || "").trim();
  const date = (body.date || "").trim();
  const reason = (body.reason || "").trim();

  if (!locationId || !workerId || !date || !reason) {
    return jsonError("locationId, workerId, date, and reason are required.", 422);
  }
  if (!isIsoDate(date)) {
    return jsonError("date must be in YYYY-MM-DD format.", 422);
  }

  const db = getSupabaseAdmin();
  const { data: appointments, error: fetchError } = await db
    .from("appointments")
    .select("id, client_id, service_name_snapshot, date, start_time")
    .eq("location_id", locationId)
    .eq("worker_id", workerId)
    .eq("date", date)
    .not("status", "eq", "cancelled");

  if (fetchError) {
    return jsonError(fetchError.message, 500);
  }
  if (!appointments || appointments.length === 0) {
    return jsonOk({ status: "ok", cancelled: 0 });
  }

  const typedAppointments = appointments as AppointmentRow[];
  const ids = typedAppointments.map((item) => item.id);
  const now = new Date().toISOString();
  const { error: updateError } = await db
    .from("appointments")
    .update({
      status: "cancelled",
      cancelled_by: "admin",
      cancellation_reason: reason,
      cancelled_at: now,
      updated_at: now,
    })
    .in("id", ids);

  if (updateError) {
    return jsonError(updateError.message, 500);
  }

  const notifications = typedAppointments.map((item) => ({
    client_id: item.client_id,
    type: "appointment_cancelled",
    title: "Termin je otkazan",
    message: `Termin za ${item.service_name_snapshot} ${formatIsoDateToEuropean(item.date)} u ${item.start_time} je otkazan. Razlog: ${reason}`,
    appointment_id: item.id,
    is_read: false,
  }));

  const { error: notificationsError } = await db
    .from("client_notifications")
    .insert(notifications);

  if (notificationsError) {
    return jsonError(notificationsError.message, 500);
  }

  await Promise.all(
    typedAppointments.map((item) =>
      sendPushToClient(item.client_id, {
        title: "Termin je otkazan",
        body: `Termin ${formatIsoDateToEuropean(item.date)} u ${item.start_time} je otkazan. ${reason}`,
        appointmentId: item.id,
        reason,
      })
    )
  );

  return jsonOk({ status: "ok", cancelled: typedAppointments.length });
}
