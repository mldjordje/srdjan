import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/rbac";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export async function GET(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner", "staff-admin"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const workerId = (searchParams.get("workerId") || "").trim();

  const db = getSupabaseAdmin();
  let query = db
    .from("client_notifications")
    .select(
      "id, client_id, type, title, message, appointment_id, is_read, created_at, clients(full_name, phone), appointments!inner(worker_id)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (workerId) {
    query = query.eq("appointments.worker_id", workerId);
  }

  const { data, error: fetchError } = await query;

  if (fetchError) {
    return jsonError(fetchError.message, 500);
  }

  return jsonOk({ notifications: data || [] });
}
