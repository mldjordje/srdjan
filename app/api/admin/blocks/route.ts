import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { ensureNoConflict, isOverlapConflictError } from "@/lib/server/scheduling";
import { requireAdmin } from "@/lib/server/rbac";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import {
  isIsoDate,
  minutesToTime,
  normalizeDurationToStep,
  parseTimeToMinutes,
} from "@/lib/server/time";

type BlockPayload = {
  id?: string;
  locationId?: string;
  workerId?: string;
  date?: string;
  time?: string;
  duration?: number;
  note?: string;
};

type OccupiedItem = {
  start_time: string;
  end_time: string;
};

type ParsedBlockInput =
  | {
      locationId: string;
      workerId: string;
      date: string;
      time: string;
      note: string;
      durationMin: number;
      endTime: string;
    }
  | {
      error: string;
    };

const loadOccupied = async ({
  locationId,
  workerId,
  date,
  excludeBlockId,
}: {
  locationId: string;
  workerId: string;
  date: string;
  excludeBlockId?: string;
}) => {
  const db = getSupabaseAdmin();
  const [{ data: appointments, error: appointmentsError }, { data: blocks, error: blocksError }] =
    await Promise.all([
      db
        .from("appointments")
        .select("start_time, end_time")
        .eq("location_id", locationId)
        .eq("worker_id", workerId)
        .eq("date", date)
        .not("status", "eq", "cancelled")
        .returns<OccupiedItem[]>(),
      (excludeBlockId
        ? db
            .from("calendar_blocks")
            .select("start_time, end_time")
            .eq("location_id", locationId)
            .eq("worker_id", workerId)
            .eq("date", date)
            .neq("id", excludeBlockId)
        : db
            .from("calendar_blocks")
            .select("start_time, end_time")
            .eq("location_id", locationId)
            .eq("worker_id", workerId)
            .eq("date", date)
      ).returns<OccupiedItem[]>(),
    ]);

  if (appointmentsError) {
    throw new Error(appointmentsError.message);
  }
  if (blocksError) {
    throw new Error(blocksError.message);
  }
  return [...(appointments || []), ...(blocks || [])];
};

const parseBlockInput = (body: BlockPayload): ParsedBlockInput => {
  const locationId = (body.locationId || "").trim();
  const workerId = (body.workerId || "").trim();
  const date = (body.date || "").trim();
  const time = (body.time || "").trim();
  const note = (body.note || "").trim();
  const duration = Number(body.duration || 0);
  if (!locationId || !workerId || !date || !time || duration <= 0) {
    return { error: "locationId, workerId, date, time, duration are required." };
  }
  if (!isIsoDate(date)) {
    return { error: "date must be in YYYY-MM-DD format." };
  }
  const start = parseTimeToMinutes(time);
  if (start === null) {
    return { error: "time must be in HH:mm format." };
  }
  const normalizedDuration = normalizeDurationToStep(duration);
  const end = start + normalizedDuration;
  if (end > 24 * 60) {
    return { error: "Block exceeds end of day." };
  }

  return {
    locationId,
    workerId,
    date,
    time,
    note,
    durationMin: normalizedDuration,
    endTime: minutesToTime(end),
  };
};

export async function GET(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner", "staff-admin"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const workerId = (searchParams.get("workerId") || "").trim();
  const date = (searchParams.get("date") || "").trim();
  if (!workerId || !date || !isIsoDate(date)) {
    return jsonError("workerId and date (YYYY-MM-DD) are required.", 422);
  }

  const db = getSupabaseAdmin();
  const { data, error: fetchError } = await db
    .from("calendar_blocks")
    .select("id, location_id, worker_id, date, start_time, end_time, duration_min, note, created_at")
    .eq("worker_id", workerId)
    .eq("date", date)
    .order("start_time");

  if (fetchError) {
    return jsonError(fetchError.message, 500);
  }

  return jsonOk({ blocks: data || [] });
}

export async function POST(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner", "staff-admin"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const body = await parseJson<BlockPayload>(request);
  if (!body) {
    return jsonError("Invalid JSON body.");
  }

  const parsed = parseBlockInput(body);
  if ("error" in parsed) {
    return jsonError(parsed.error, 422);
  }

  const occupied = await loadOccupied({
    locationId: parsed.locationId,
    workerId: parsed.workerId,
    date: parsed.date,
  });
  const isAvailable = ensureNoConflict({
    startTime: parsed.time,
    endTime: parsed.endTime,
    occupied,
  });
  if (!isAvailable) {
    return jsonError("Block overlaps with existing appointment or block.", 409);
  }

  const db = getSupabaseAdmin();
  const { data, error: insertError } = await db
    .from("calendar_blocks")
    .insert({
      location_id: parsed.locationId,
      worker_id: parsed.workerId,
      date: parsed.date,
      start_time: parsed.time,
      end_time: parsed.endTime,
      duration_min: parsed.durationMin,
      note: parsed.note || null,
    })
    .select("id, location_id, worker_id, date, start_time, end_time, duration_min, note, created_at")
    .single();

  if (insertError || !data) {
    if (isOverlapConflictError(insertError)) {
      return jsonError("Block overlaps with existing appointment or block.", 409);
    }
    return jsonError(insertError?.message || "Cannot create block.", 500);
  }

  return jsonOk({ block: data }, 201);
}

export async function PATCH(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner", "staff-admin"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const body = await parseJson<BlockPayload>(request);
  if (!body) {
    return jsonError("Invalid JSON body.");
  }
  const id = (body.id || "").trim();
  if (!id) {
    return jsonError("id is required.", 422);
  }

  const parsed = parseBlockInput(body);
  if ("error" in parsed) {
    return jsonError(parsed.error, 422);
  }

  const occupied = await loadOccupied({
    locationId: parsed.locationId,
    workerId: parsed.workerId,
    date: parsed.date,
    excludeBlockId: id,
  });
  const isAvailable = ensureNoConflict({
    startTime: parsed.time,
    endTime: parsed.endTime,
    occupied,
  });
  if (!isAvailable) {
    return jsonError("Block overlaps with existing appointment or block.", 409);
  }

  const db = getSupabaseAdmin();
  const { data, error: updateError } = await db
    .from("calendar_blocks")
    .update({
      location_id: parsed.locationId,
      worker_id: parsed.workerId,
      date: parsed.date,
      start_time: parsed.time,
      end_time: parsed.endTime,
      duration_min: parsed.durationMin,
      note: parsed.note || null,
    })
    .eq("id", id)
    .select("id, location_id, worker_id, date, start_time, end_time, duration_min, note, created_at")
    .single();

  if (updateError || !data) {
    if (isOverlapConflictError(updateError)) {
      return jsonError("Block overlaps with existing appointment or block.", 409);
    }
    return jsonError(updateError?.message || "Cannot update block.", 500);
  }

  return jsonOk({ block: data });
}

export async function DELETE(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner", "staff-admin"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const id = (searchParams.get("id") || "").trim();
  if (!id) {
    return jsonError("id is required.", 422);
  }

  const db = getSupabaseAdmin();
  const { error: deleteError } = await db.from("calendar_blocks").delete().eq("id", id);
  if (deleteError) {
    return jsonError(deleteError.message, 500);
  }

  return jsonOk({ status: "ok" });
}
