import { getClientFromRequest } from "@/lib/server/auth";
import { sendWorkerNewAppointmentEmail } from "@/lib/server/email";
import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import {
  ensureNoConflict,
  getOccupiedByWorkerAndDate,
  getShiftWindowForDay,
  isOverlapConflictError,
  getWorkerService,
} from "@/lib/server/scheduling";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import {
  isIsoDate,
  minutesToTime,
  parseTimeToMinutes,
} from "@/lib/server/time";

type CreateAppointmentBody = {
  locationId?: string;
  workerId?: string;
  serviceId?: string;
  date?: string;
  time?: string;
  note?: string;
};

export async function POST(request: Request) {
  const client = await getClientFromRequest(request);
  if (!client) {
    return jsonError("Unauthorized", 401);
  }

  const body = await parseJson<CreateAppointmentBody>(request);
  if (!body) {
    return jsonError("Invalid JSON body.");
  }

  const locationId = (body.locationId || "").trim();
  const workerId = (body.workerId || "").trim();
  const serviceId = (body.serviceId || "").trim();
  const date = (body.date || "").trim();
  const time = (body.time || "").trim();
  const note = (body.note || "").trim();

  if (!locationId || !workerId || !serviceId || !date || !time) {
    return jsonError("locationId, workerId, serviceId, date and time are required.", 422);
  }
  if (!isIsoDate(date)) {
    return jsonError("date must be in YYYY-MM-DD format.", 422);
  }

  const startMinutes = parseTimeToMinutes(time);
  if (startMinutes === null) {
    return jsonError("time must be in HH:mm format.", 422);
  }

  const workerService = await getWorkerService(workerId, serviceId);
  if (!workerService || !workerService.services) {
    return jsonError("Service is not available for selected worker.", 404);
  }

  const shiftWindow = await getShiftWindowForDay(locationId, workerId, date);
  if (!shiftWindow) {
    return jsonError("Worker is off on selected date.", 422);
  }

  const shiftStart = parseTimeToMinutes(shiftWindow.start);
  const shiftEnd = parseTimeToMinutes(shiftWindow.end);
  if (shiftStart === null || shiftEnd === null || shiftEnd <= shiftStart) {
    return jsonError("Shift setup is invalid.", 500);
  }

  const durationMin = Number(workerService.duration_min);
  if (!Number.isFinite(durationMin) || durationMin <= 0) {
    return jsonError("Invalid service duration.", 500);
  }
  const endMinutes = startMinutes + durationMin;
  const endTime = minutesToTime(endMinutes);

  if (startMinutes < shiftStart || endMinutes > shiftEnd) {
    return jsonError("Appointment must be within worker shift.", 422);
  }

  const occupied = await getOccupiedByWorkerAndDate(locationId, workerId, date);
  const hasNoConflict = ensureNoConflict({
    startTime: time,
    endTime: endTime,
    occupied,
  });
  if (!hasNoConflict) {
    return jsonError("Selected slot is not available.", 409);
  }

  const db = getSupabaseAdmin();
  const { data: appointment, error } = await db
    .from("appointments")
    .insert({
      location_id: locationId,
      worker_id: workerId,
      client_id: client.id,
      service_id: serviceId,
      service_name_snapshot: workerService.services.name,
      duration_min_snapshot: durationMin,
      price_snapshot: workerService.price,
      date,
      start_time: time,
      end_time: endTime,
      note: note || null,
      status: "pending",
      source: "web",
    })
    .select(
      "id, location_id, worker_id, client_id, service_id, service_name_snapshot, duration_min_snapshot, price_snapshot, date, start_time, end_time, note, status, cancellation_reason, cancelled_at, source, created_at"
    )
    .single();

  if (isOverlapConflictError(error)) {
    return jsonError("Selected slot is not available.", 409);
  }
  if (error || !appointment) {
    return jsonError(error?.message || "Cannot create appointment.", 500);
  }

  const { data: workerRow } = await db
    .from("workers")
    .select("id, name, notification_email")
    .eq("id", workerId)
    .maybeSingle<{ id: string; name: string; notification_email?: string | null }>();

  if (workerRow?.notification_email) {
    const requestOrigin = (() => {
      try {
        return new URL(request.url).origin;
      } catch {
        return "";
      }
    })();

    await sendWorkerNewAppointmentEmail({
      to: workerRow.notification_email,
      workerName: workerRow.name || "Radnik",
      clientName: client.full_name || "Klijent",
      serviceName: workerService.services.name || "Usluga",
      date,
      startTime: time,
      endTime,
      workerId,
      appointmentId: appointment.id as string,
      origin: requestOrigin,
    });
  }

  return jsonOk({ appointment }, 201);
}
