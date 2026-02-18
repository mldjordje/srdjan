import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/rbac";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import type { ShiftType } from "@/lib/server/types";

type SwapBody = {
  locationId?: string;
  date?: string;
  workerAId?: string;
  workerBId?: string;
};

type ShiftRow = {
  id: string;
  worker_id: string;
  shift_type: ShiftType;
};

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export async function POST(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner", "staff-admin"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const body = await parseJson<SwapBody>(request);
  if (!body) {
    return jsonError("Invalid JSON body.");
  }

  const locationId = (body.locationId || "").trim();
  const date = (body.date || "").trim();
  const workerAId = (body.workerAId || "").trim();
  const workerBId = (body.workerBId || "").trim();

  if (!locationId || !date || !workerAId || !workerBId || workerAId === workerBId) {
    return jsonError("locationId, date, workerAId and workerBId are required.", 422);
  }
  if (!isIsoDate(date)) {
    return jsonError("date must be in YYYY-MM-DD format.", 422);
  }

  const db = getSupabaseAdmin();

  const { data: appointments, error: appointmentsError } = await db
    .from("appointments")
    .select("id, worker_id")
    .eq("location_id", locationId)
    .eq("date", date)
    .in("worker_id", [workerAId, workerBId])
    .not("status", "eq", "cancelled");

  if (appointmentsError) {
    return jsonError(appointmentsError.message, 500);
  }
  if ((appointments || []).length > 0) {
    return jsonError(
      "Swap is allowed only if both workers have zero appointments on selected date.",
      409
    );
  }

  const { data: shifts, error: shiftsError } = await db
    .from("worker_shifts")
    .select("id, worker_id, shift_type")
    .eq("location_id", locationId)
    .eq("date", date)
    .in("worker_id", [workerAId, workerBId]);

  if (shiftsError) {
    return jsonError(shiftsError.message, 500);
  }
  const typedShifts = (shifts || []) as ShiftRow[];
  if (typedShifts.length !== 2) {
    return jsonError("Both workers must have assigned shifts on selected date.", 422);
  }

  const shiftA = typedShifts.find((item) => item.worker_id === workerAId);
  const shiftB = typedShifts.find((item) => item.worker_id === workerBId);
  if (!shiftA || !shiftB) {
    return jsonError("Both workers must have assigned shifts on selected date.", 422);
  }

  const { error: firstError } = await db
    .from("worker_shifts")
    .update({ shift_type: shiftB.shift_type as ShiftType })
    .eq("id", shiftA.id);
  if (firstError) {
    return jsonError(firstError.message, 500);
  }

  const { error: secondError } = await db
    .from("worker_shifts")
    .update({ shift_type: shiftA.shift_type as ShiftType })
    .eq("id", shiftB.id);
  if (secondError) {
    return jsonError(secondError.message, 500);
  }

  return jsonOk({ status: "ok" });
}
