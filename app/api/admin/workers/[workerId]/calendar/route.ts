import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/rbac";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export async function GET(
  request: Request,
  context: { params: Promise<{ workerId: string }> }
) {
  const { admin, error } = await requireAdmin(request, ["owner", "staff-admin"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const { workerId } = await context.params;
  const { searchParams } = new URL(request.url);
  const from = (searchParams.get("from") || "").trim();
  const to = (searchParams.get("to") || "").trim();

  if (!workerId || !from || !to || !isIsoDate(from) || !isIsoDate(to)) {
    return jsonError("workerId, from and to (YYYY-MM-DD) are required.", 422);
  }

  const db = getSupabaseAdmin();
  const [{ data: appointments, error: appointmentsError }, { data: blocks, error: blocksError }] =
    await Promise.all([
      db
        .from("appointments")
        .select(
          "id, location_id, worker_id, client_id, service_id, service_name_snapshot, duration_min_snapshot, price_snapshot, date, start_time, end_time, note, status, cancellation_reason, cancelled_at, source, created_at, clients(full_name, phone), workers(name)"
        )
        .eq("worker_id", workerId)
        .gte("date", from)
        .lte("date", to)
        .order("date")
        .order("start_time"),
      db
        .from("calendar_blocks")
        .select("id, location_id, worker_id, date, start_time, end_time, duration_min, note, created_at")
        .eq("worker_id", workerId)
        .gte("date", from)
        .lte("date", to)
        .order("date")
        .order("start_time"),
    ]);

  if (appointmentsError || blocksError) {
    return jsonError(appointmentsError?.message || blocksError?.message || "Failed.", 500);
  }

  return jsonOk({
    workerId,
    from,
    to,
    appointments: appointments || [],
    blocks: blocks || [],
  });
}

