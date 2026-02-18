import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/rbac";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import type { ShiftType } from "@/lib/server/types";

const allowed: ShiftType[] = ["morning", "afternoon", "off"];

type ShiftInput = {
  workerId?: string;
  date?: string;
  shiftType?: ShiftType;
};

type WeekBody = {
  locationId?: string;
  shifts?: ShiftInput[];
};

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export async function POST(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner", "staff-admin"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const body = await parseJson<WeekBody>(request);
  if (!body) {
    return jsonError("Invalid JSON body.");
  }
  const locationId = (body.locationId || "").trim();
  const shifts = body.shifts || [];

  if (!locationId || !Array.isArray(shifts) || shifts.length === 0) {
    return jsonError("locationId and shifts[] are required.", 422);
  }

  const rows = shifts.map((shift) => ({
    location_id: locationId,
    worker_id: (shift.workerId || "").trim(),
    date: (shift.date || "").trim(),
    shift_type: shift.shiftType as ShiftType,
  }));

  for (const row of rows) {
    if (!row.worker_id || !row.date || !isIsoDate(row.date) || !allowed.includes(row.shift_type)) {
      return jsonError("Each shift must include workerId, date, shiftType.", 422);
    }
  }

  const db = getSupabaseAdmin();
  const { error: upsertError } = await db
    .from("worker_shifts")
    .upsert(rows, { onConflict: "worker_id,date" });

  if (upsertError) {
    return jsonError(upsertError.message, 500);
  }

  return jsonOk({ status: "ok", count: rows.length });
}

