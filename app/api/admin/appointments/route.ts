import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/rbac";
import { getSupabaseAdmin } from "@/lib/server/supabase";

type UpdateBody = {
  id?: string;
  status?: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
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

