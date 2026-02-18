import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/rbac";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export async function GET(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner", "staff-admin"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const locationId = (searchParams.get("locationId") || "").trim();
  const db = getSupabaseAdmin();
  let query = db
    .from("workers")
    .select("id, location_id, name, is_active")
    .eq("is_active", true)
    .order("name");

  if (locationId) {
    query = query.eq("location_id", locationId);
  }

  const { data, error: fetchError } = await query;
  if (fetchError) {
    return jsonError(fetchError.message, 500);
  }
  return jsonOk({ workers: data || [] });
}

