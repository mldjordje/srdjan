import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/rbac";
import { getSupabaseAdmin } from "@/lib/server/supabase";

type CreateWorkerBody = {
  locationId?: string;
  name?: string;
  isActive?: boolean;
};

type PatchWorkerBody = {
  id?: string;
  locationId?: string;
  name?: string;
  isActive?: boolean;
};

type LocationRow = {
  id: string;
  name: string;
  is_active: boolean;
  max_active_workers: number;
};

const assertWorkerLimit = async ({
  locationId,
  excludeWorkerId,
}: {
  locationId: string;
  excludeWorkerId?: string;
}) => {
  const db = getSupabaseAdmin();
  const { data: location, error: locationError } = await db
    .from("locations")
    .select("id, max_active_workers")
    .eq("id", locationId)
    .maybeSingle<{ id: string; max_active_workers: number }>();
  if (locationError) {
    throw new Error(locationError.message);
  }
  if (!location) {
    throw new Error("Location not found.");
  }

  let activeQuery = db
    .from("workers")
    .select("id", { count: "exact", head: true })
    .eq("location_id", locationId)
    .eq("is_active", true);
  if (excludeWorkerId) {
    activeQuery = activeQuery.neq("id", excludeWorkerId);
  }
  const { count, error: countError } = await activeQuery;
  if (countError) {
    throw new Error(countError.message);
  }
  const active = count || 0;
  if (active >= location.max_active_workers) {
    throw new Error(
      `Limit radnika za ovu lokaciju je dostignut (${location.max_active_workers}).`
    );
  }
};

export async function GET(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner", "staff-admin"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const locationId = (searchParams.get("locationId") || "").trim();
  const includeInactive = searchParams.get("includeInactive") === "1";
  const includeLocations = searchParams.get("includeLocations") === "1";
  const db = getSupabaseAdmin();
  let query = db
    .from("workers")
    .select("id, location_id, name, is_active")
    .order("name");

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }
  if (locationId) {
    query = query.eq("location_id", locationId);
  }

  const { data, error: fetchError } = await query;
  if (fetchError) {
    return jsonError(fetchError.message, 500);
  }

  if (!includeLocations) {
    return jsonOk({ workers: data || [] });
  }

  const { data: locations, error: locationsError } = await db
    .from("locations")
    .select("id, name, is_active, max_active_workers")
    .order("name");
  if (locationsError) {
    return jsonError(locationsError.message, 500);
  }
  const locationRows = (locations || []) as LocationRow[];
  const workerRows = (data || []) as Array<{
    id: string;
    location_id: string;
    name: string;
    is_active: boolean;
  }>;
  const activeByLocation = workerRows.reduce((acc, row) => {
    if (!row.is_active) {
      return acc;
    }
    acc[row.location_id] = (acc[row.location_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return jsonOk({
    workers: workerRows,
    locations: locationRows,
    locationStats: locationRows.map((location) => ({
      locationId: location.id,
      activeWorkers: activeByLocation[location.id] || 0,
      maxActiveWorkers: location.max_active_workers,
    })),
  });
}

export async function POST(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const body = await parseJson<CreateWorkerBody>(request);
  if (!body) {
    return jsonError("Invalid JSON body.");
  }

  const locationId = (body.locationId || "").trim();
  const name = (body.name || "").trim();
  const isActive = body.isActive !== false;
  if (!locationId || !name) {
    return jsonError("locationId and name are required.", 422);
  }

  if (isActive) {
    try {
      await assertWorkerLimit({ locationId });
    } catch (limitError) {
      return jsonError(limitError instanceof Error ? limitError.message : "Limit error.", 409);
    }
  }

  const db = getSupabaseAdmin();
  const { data, error: insertError } = await db
    .from("workers")
    .insert({
      location_id: locationId,
      name,
      is_active: isActive,
    })
    .select("id, location_id, name, is_active")
    .single();
  if (insertError || !data) {
    return jsonError(insertError?.message || "Cannot create worker.", 500);
  }
  return jsonOk({ worker: data }, 201);
}

export async function PATCH(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const body = await parseJson<PatchWorkerBody>(request);
  if (!body) {
    return jsonError("Invalid JSON body.");
  }

  const id = (body.id || "").trim();
  if (!id) {
    return jsonError("id is required.", 422);
  }

  const db = getSupabaseAdmin();
  const { data: existing, error: existingError } = await db
    .from("workers")
    .select("id, location_id, is_active")
    .eq("id", id)
    .maybeSingle<{ id: string; location_id: string; is_active: boolean }>();
  if (existingError) {
    return jsonError(existingError.message, 500);
  }
  if (!existing) {
    return jsonError("Worker not found.", 404);
  }

  const nextLocationId = (body.locationId || "").trim() || existing.location_id;
  const nextIsActive =
    typeof body.isActive === "boolean" ? body.isActive : existing.is_active;

  if (nextIsActive) {
    try {
      await assertWorkerLimit({ locationId: nextLocationId, excludeWorkerId: id });
    } catch (limitError) {
      return jsonError(limitError instanceof Error ? limitError.message : "Limit error.", 409);
    }
  }

  const patch: Record<string, unknown> = {
    location_id: nextLocationId,
    is_active: nextIsActive,
  };
  if (body.name && body.name.trim()) {
    patch.name = body.name.trim();
  }

  const { data, error: updateError } = await db
    .from("workers")
    .update(patch)
    .eq("id", id)
    .select("id, location_id, name, is_active")
    .single();
  if (updateError || !data) {
    return jsonError(updateError?.message || "Cannot update worker.", 500);
  }
  return jsonOk({ worker: data });
}
