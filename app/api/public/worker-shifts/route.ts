import { jsonError, jsonOk } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locationId = (searchParams.get("locationId") || "").trim();
  const workerId = (searchParams.get("workerId") || "").trim();
  const from = (searchParams.get("from") || "").trim();
  const to = (searchParams.get("to") || "").trim();

  if (!locationId || !workerId || !from || !to) {
    return jsonError("locationId, workerId, from and to are required.", 422);
  }
  if (!isIsoDate(from) || !isIsoDate(to)) {
    return jsonError("from and to must be in YYYY-MM-DD format.", 422);
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("worker_shifts")
    .select("date, shift_type")
    .eq("location_id", locationId)
    .eq("worker_id", workerId)
    .gte("date", from)
    .lte("date", to);

  if (error) {
    return jsonError(error.message, 500);
  }

  return jsonOk({ shifts: data || [] });
}

