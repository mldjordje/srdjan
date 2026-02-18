import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/rbac";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { normalizeDurationToStep } from "@/lib/server/time";

type CreateServiceBody = {
  workerId?: string;
  serviceId?: string;
  name?: string;
  durationMin?: number;
  price?: number;
  isActive?: boolean;
};

type PatchServiceBody = {
  workerServiceId?: string;
  name?: string;
  durationMin?: number;
  price?: number;
  isActive?: boolean;
};

export async function GET(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner", "staff-admin"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const workerId = (searchParams.get("workerId") || "").trim();

  const db = getSupabaseAdmin();
  let query = db
    .from("worker_services")
    .select(
      "id, worker_id, service_id, duration_min, price, is_active, workers(id, name), services(id, name, is_active)"
    )
    .order("created_at", { ascending: false });

  if (workerId) {
    query = query.eq("worker_id", workerId);
  }

  const { data, error: fetchError } = await query;
  if (fetchError) {
    return jsonError(fetchError.message, 500);
  }

  return jsonOk({ services: data || [] });
}

export async function POST(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner", "staff-admin"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const body = await parseJson<CreateServiceBody>(request);
  if (!body) {
    return jsonError("Invalid JSON body.");
  }

  const workerId = (body.workerId || "").trim();
  const providedServiceId = (body.serviceId || "").trim();
  const name = (body.name || "").trim();
  const durationMin = Number(body.durationMin || 0);
  const price = Number(body.price || 0);
  const isActive = body.isActive !== false;

  if (!workerId || (!providedServiceId && !name) || durationMin <= 0 || price < 0) {
    return jsonError(
      "workerId and (serviceId or name) with valid durationMin/price are required.",
      422
    );
  }

  const db = getSupabaseAdmin();
  let serviceId = providedServiceId;
  if (!serviceId) {
    const { data: createdService, error: createServiceError } = await db
      .from("services")
      .insert({ name, is_active: true })
      .select("id")
      .single();
    if (createServiceError || !createdService?.id) {
      return jsonError(createServiceError?.message || "Cannot create service.", 500);
    }
    serviceId = createdService.id as string;
  }

  const normalizedDuration = normalizeDurationToStep(durationMin);
  const { data: row, error: createError } = await db
    .from("worker_services")
    .insert({
      worker_id: workerId,
      service_id: serviceId,
      duration_min: normalizedDuration,
      price,
      is_active: isActive,
    })
    .select(
      "id, worker_id, service_id, duration_min, price, is_active, workers(id, name), services(id, name, is_active)"
    )
    .single();

  if (createError || !row) {
    return jsonError(createError?.message || "Cannot create worker service.", 500);
  }

  return jsonOk({ service: row }, 201);
}

export async function PATCH(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner", "staff-admin"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const body = await parseJson<PatchServiceBody>(request);
  if (!body) {
    return jsonError("Invalid JSON body.");
  }
  const workerServiceId = (body.workerServiceId || "").trim();
  if (!workerServiceId) {
    return jsonError("workerServiceId is required.", 422);
  }

  const db = getSupabaseAdmin();
  const patch: Record<string, unknown> = {};
  if (typeof body.durationMin === "number" && body.durationMin > 0) {
    patch.duration_min = normalizeDurationToStep(body.durationMin);
  }
  if (typeof body.price === "number" && body.price >= 0) {
    patch.price = body.price;
  }
  if (typeof body.isActive === "boolean") {
    patch.is_active = body.isActive;
  }

  if (Object.keys(patch).length > 0) {
    const { error: updateError } = await db
      .from("worker_services")
      .update(patch)
      .eq("id", workerServiceId);
    if (updateError) {
      return jsonError(updateError.message, 500);
    }
  }

  if (body.name && body.name.trim()) {
    const { data: current, error: currentError } = await db
      .from("worker_services")
      .select("service_id")
      .eq("id", workerServiceId)
      .single();
    if (currentError || !current?.service_id) {
      return jsonError(currentError?.message || "Cannot resolve service.", 500);
    }
    const { error: renameError } = await db
      .from("services")
      .update({ name: body.name.trim() })
      .eq("id", current.service_id);
    if (renameError) {
      return jsonError(renameError.message, 500);
    }
  }

  const { data: row, error: fetchError } = await db
    .from("worker_services")
    .select(
      "id, worker_id, service_id, duration_min, price, is_active, workers(id, name), services(id, name, is_active)"
    )
    .eq("id", workerServiceId)
    .single();

  if (fetchError || !row) {
    return jsonError(fetchError?.message || "Cannot load updated row.", 500);
  }

  return jsonOk({ service: row });
}

