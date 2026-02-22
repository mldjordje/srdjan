import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import {
  ensureNoConflict,
  getOccupiedByWorkerAndDate,
  getWorkerService,
  isOverlapConflictError,
} from "@/lib/server/scheduling";
import { requireAdmin } from "@/lib/server/rbac";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import {
  isIsoDate,
  minutesToTime,
  parseTimeToMinutes,
} from "@/lib/server/time";

type UpdateBody = {
  id?: string;
  status?: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
};

type AdminActionBody = {
  adminAction?: "create" | "update" | "delete" | "update_status";
  id?: string;
  locationId?: string;
  workerId?: string;
  clientName?: string;
  phone?: string;
  email?: string;
  serviceId?: string;
  date?: string;
  time?: string;
  notes?: string;
  status?: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  source?: "web" | "admin";
};

type ClientLookupRow = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();
const normalizePhone = (value: string) => value.replace(/\D+/g, "");
const trim = (value?: string) => (value || "").trim();
const parseDurationFromService = (durationValue: number) => Number(durationValue || 0);

const resolveClientId = async ({
  fullName,
  phone,
  email,
}: {
  fullName: string;
  phone: string;
  email: string;
}) => {
  const db = getSupabaseAdmin();
  const { data: existing, error: existingError } = await db
    .from("clients")
    .select("id, full_name, phone, email")
    .or(`phone.eq.${phone},email.eq.${email}`)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const typedExisting = (existing as ClientLookupRow | null) || null;
  if (typedExisting) {
    const { error: updateError } = await db
      .from("clients")
      .update({
        full_name: fullName,
        phone,
        email,
        updated_at: new Date().toISOString(),
      })
      .eq("id", typedExisting.id);
    if (updateError) {
      throw new Error(updateError.message);
    }
    return typedExisting.id;
  }

  const { data: created, error: createError } = await db
    .from("clients")
    .insert({
      full_name: fullName,
      phone,
      email,
    })
    .select("id")
    .single();
  if (createError || !created?.id) {
    throw new Error(createError?.message || "Cannot create client.");
  }
  return created.id as string;
};

export async function GET(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner", "staff-admin"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const date = (searchParams.get("date") || "").trim();
  const workerId = (searchParams.get("workerId") || "").trim();
  const locationId = (searchParams.get("locationId") || "").trim();

  const db = getSupabaseAdmin();
  let query = db
    .from("appointments")
    .select(
      "id, location_id, worker_id, client_id, service_id, service_name_snapshot, duration_min_snapshot, price_snapshot, date, start_time, end_time, note, status, cancelled_by, cancellation_reason, cancelled_at, source, created_at, clients(full_name, phone, email), workers(name)"
    )
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (locationId) {
    query = query.eq("location_id", locationId);
  }
  if (workerId) {
    query = query.eq("worker_id", workerId);
  }
  if (date) {
    query = query.eq("date", date);
  }

  const { data, error: fetchError } = await query;
  if (fetchError) {
    return jsonError(fetchError.message, 500);
  }
  return jsonOk({ appointments: data || [] });
}

export async function PATCH(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner", "staff-admin"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const body = await parseJson<UpdateBody>(request);
  if (!body) {
    return jsonError("Invalid JSON body.");
  }
  const id = (body.id || "").trim();
  const status = body.status;
  if (!id || !status) {
    return jsonError("id and status are required.", 422);
  }

  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "cancelled") {
    patch.cancelled_by = "admin";
    patch.cancelled_at = new Date().toISOString();
  } else {
    patch.cancelled_by = null;
    patch.cancelled_at = null;
  }

  const db = getSupabaseAdmin();
  const { error: updateError } = await db.from("appointments").update(patch).eq("id", id);
  if (updateError) {
    return jsonError(updateError.message, 500);
  }

  return jsonOk({ status: "ok" });
}

export async function POST(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner", "staff-admin"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const body = await parseJson<AdminActionBody>(request);
  if (!body) {
    return jsonError("Invalid JSON body.");
  }

  const action = body.adminAction;
  if (!action) {
    return jsonError("adminAction is required.", 422);
  }

  const db = getSupabaseAdmin();
  const id = trim(body.id);

  if (action === "delete") {
    if (!id) {
      return jsonError("id is required.", 422);
    }
    const { error: deleteError } = await db.from("appointments").delete().eq("id", id);
    if (deleteError) {
      return jsonError(deleteError.message, 500);
    }
    return jsonOk({ status: "ok" });
  }

  if (action === "update_status") {
    const status = body.status;
    if (!id || !status) {
      return jsonError("id and status are required.", 422);
    }
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === "cancelled") {
      patch.cancelled_by = "admin";
      patch.cancelled_at = new Date().toISOString();
    } else {
      patch.cancelled_by = null;
      patch.cancelled_at = null;
    }

    const { error: statusError } = await db.from("appointments").update(patch).eq("id", id);
    if (statusError) {
      return jsonError(statusError.message, 500);
    }
    return jsonOk({ status: "ok" });
  }

  const locationId = trim(body.locationId);
  const workerId = trim(body.workerId);
  const fullName = trim(body.clientName);
  const rawPhone = trim(body.phone);
  const normalizedPhone = normalizePhone(rawPhone);
  const emailInput = normalizeEmail(body.email || "");
  const fallbackEmail = `${normalizedPhone || "client"}@salonsrdjan.local`;
  const email = emailInput || fallbackEmail;
  const serviceId = trim(body.serviceId);
  const date = trim(body.date);
  const time = trim(body.time);
  const note = trim(body.notes);

  if (
    !locationId ||
    !workerId ||
    !fullName ||
    !normalizedPhone ||
    !serviceId ||
    !date ||
    !time
  ) {
    return jsonError(
      "locationId, workerId, clientName, phone, serviceId, date, time are required.",
      422
    );
  }
  if (!isIsoDate(date)) {
    return jsonError("date must be in YYYY-MM-DD format.", 422);
  }
  if (normalizedPhone.length < 6) {
    return jsonError("phone must include at least 6 digits.", 422);
  }

  const startMinutes = parseTimeToMinutes(time);
  if (startMinutes === null) {
    return jsonError("time must be in HH:mm format.", 422);
  }

  const workerService = await getWorkerService(workerId, serviceId);
  if (!workerService || !workerService.services) {
    return jsonError("Service is not available for selected worker.", 404);
  }

  const durationMin = parseDurationFromService(workerService.duration_min);
  if (!Number.isFinite(durationMin) || durationMin <= 0) {
    return jsonError("Invalid service duration.", 500);
  }
  const endTime = minutesToTime(startMinutes + durationMin);
  let existingAppointment:
    | {
        id: string;
        location_id: string;
        worker_id: string;
        date: string;
        start_time: string;
        end_time: string;
      }
    | null = null;
  if (action === "update") {
    if (!id) {
      return jsonError("id is required for update.", 422);
    }
    const { data: existing, error: existingError } = await db
      .from("appointments")
      .select("id, location_id, worker_id, date, start_time, end_time")
      .eq("id", id)
      .maybeSingle<{
        id: string;
        location_id: string;
        worker_id: string;
        date: string;
        start_time: string;
        end_time: string;
      }>();
    if (existingError) {
      return jsonError(existingError.message, 500);
    }
    if (!existing) {
      return jsonError("Appointment not found.", 404);
    }
    existingAppointment = existing;
  }

  const occupied = await getOccupiedByWorkerAndDate(locationId, workerId, date);
  let filteredOccupied = occupied;
  if (
    action === "update" &&
    existingAppointment &&
    existingAppointment.location_id === locationId &&
    existingAppointment.worker_id === workerId &&
    existingAppointment.date === date
  ) {
    let dropped = false;
    filteredOccupied = occupied.filter((slot) => {
      if (
        !dropped &&
        slot.start_time === existingAppointment.start_time &&
        slot.end_time === existingAppointment.end_time
      ) {
        dropped = true;
        return false;
      }
      return true;
    });
  }

  const hasNoConflict = ensureNoConflict({
    startTime: time,
    endTime,
    occupied: filteredOccupied,
  });
  if (!hasNoConflict) {
    return jsonError("Selected slot is not available.", 409);
  }

  let clientId: string;
  try {
    clientId = await resolveClientId({
      fullName,
      phone: normalizedPhone,
      email,
    });
  } catch (resolveError) {
    return jsonError(
      resolveError instanceof Error ? resolveError.message : "Cannot resolve client.",
      500
    );
  }

  if (action === "create") {
    const { data: created, error: createError } = await db
      .from("appointments")
      .insert({
        location_id: locationId,
        worker_id: workerId,
        client_id: clientId,
        service_id: serviceId,
        service_name_snapshot: workerService.services.name,
        duration_min_snapshot: durationMin,
        price_snapshot: workerService.price,
        date,
        start_time: time,
        end_time: endTime,
        note: note || null,
        status: body.status || "confirmed",
        source: body.source || "admin",
      })
      .select(
        "id, location_id, worker_id, client_id, service_id, service_name_snapshot, duration_min_snapshot, price_snapshot, date, start_time, end_time, note, status, cancelled_by, cancellation_reason, cancelled_at, source, created_at"
      )
      .single();

    if (createError || !created) {
      if (isOverlapConflictError(createError)) {
        return jsonError("Selected slot is not available.", 409);
      }
      return jsonError(createError?.message || "Cannot create appointment.", 500);
    }
    return jsonOk({ appointment: created }, 201);
  }

  if (action === "update") {
    if (!id) {
      return jsonError("id is required for update.", 422);
    }
    const { data: updated, error: updateError } = await db
      .from("appointments")
      .update({
        location_id: locationId,
        worker_id: workerId,
        client_id: clientId,
        service_id: serviceId,
        service_name_snapshot: workerService.services.name,
        duration_min_snapshot: durationMin,
        price_snapshot: workerService.price,
        date,
        start_time: time,
        end_time: endTime,
        note: note || null,
        status: body.status || "confirmed",
        source: body.source || "admin",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        "id, location_id, worker_id, client_id, service_id, service_name_snapshot, duration_min_snapshot, price_snapshot, date, start_time, end_time, note, status, cancelled_by, cancellation_reason, cancelled_at, source, created_at"
      )
      .single();

    if (updateError || !updated) {
      if (isOverlapConflictError(updateError)) {
        return jsonError("Selected slot is not available.", 409);
      }
      return jsonError(updateError?.message || "Cannot update appointment.", 500);
    }
    return jsonOk({ appointment: updated });
  }

  return jsonError("Unsupported adminAction.", 422);
}
