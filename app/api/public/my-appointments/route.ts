import { getClientFromRequest } from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export async function GET(request: Request) {
  const client = await getClientFromRequest(request);
  if (!client) {
    return jsonError("Unauthorized", 401);
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("appointments")
    .select(
      "id, location_id, worker_id, service_id, service_name_snapshot, duration_min_snapshot, price_snapshot, date, start_time, end_time, status, note, cancellation_reason, cancelled_at, source, created_at, workers(name)"
    )
    .eq("client_id", client.id)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    return jsonError(error.message, 500);
  }

  return jsonOk({
    client: {
      id: client.id,
      fullName: client.full_name,
      phone: client.phone,
      email: client.email,
    },
    appointments: data || [],
  });
}

