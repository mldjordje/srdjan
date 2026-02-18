import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/rbac";
import { getSupabaseAdmin } from "@/lib/server/supabase";

type PatchBody = {
  locationId?: string;
  morningStart?: string;
  morningEnd?: string;
  afternoonStart?: string;
  afternoonEnd?: string;
};

export async function GET(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner", "staff-admin"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const locationId = (searchParams.get("locationId") || "").trim();
  if (!locationId) {
    return jsonError("locationId is required.", 422);
  }

  const db = getSupabaseAdmin();
  const { data, error: fetchError } = await db
    .from("shift_settings")
    .select("location_id, morning_start, morning_end, afternoon_start, afternoon_end")
    .eq("location_id", locationId)
    .maybeSingle();
  if (fetchError) {
    return jsonError(fetchError.message, 500);
  }
  return jsonOk({ settings: data });
}

export async function PATCH(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner", "staff-admin"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const body = await parseJson<PatchBody>(request);
  if (!body) {
    return jsonError("Invalid JSON body.");
  }
  const locationId = (body.locationId || "").trim();
  if (!locationId) {
    return jsonError("locationId is required.", 422);
  }

  const patch: Record<string, string> = {};
  if (body.morningStart) patch.morning_start = body.morningStart;
  if (body.morningEnd) patch.morning_end = body.morningEnd;
  if (body.afternoonStart) patch.afternoon_start = body.afternoonStart;
  if (body.afternoonEnd) patch.afternoon_end = body.afternoonEnd;

  const db = getSupabaseAdmin();
  const { error: upsertError } = await db
    .from("shift_settings")
    .upsert({ location_id: locationId, ...patch }, { onConflict: "location_id" });

  if (upsertError) {
    return jsonError(upsertError.message, 500);
  }
  return jsonOk({ status: "ok" });
}

