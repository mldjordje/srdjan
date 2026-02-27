import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/rbac";
import { getSupabaseAdmin } from "@/lib/server/supabase";

type CreateServiceBody = {
  workerId?: string;
  serviceId?: string;
  name?: string;
  durationMin?: number;
  price?: number;
  color?: string;
  isActive?: boolean;
};

type PatchServiceBody = {
  workerServiceId?: string;
  name?: string;
  durationMin?: number;
  price?: number;
  color?: string | null;
  isActive?: boolean;
};

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
const MIN_DURATION_MIN = 5;
const MAX_DURATION_MIN = 240;

const parseDuration = (value: unknown) => {
  const num = Number(value);
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    return null;
  }
  if (num < MIN_DURATION_MIN || num > MAX_DURATION_MIN) {
    return null;
  }
  return num;
};

const normalizeColor = (value?: string | null) => {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return null;
  }
  if (!HEX_COLOR_RE.test(trimmed)) {
    return null;
  }
  return trimmed.toUpperCase();
};

export async function GET(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner", "staff-admin"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const requestedWorkerId = (searchParams.get("workerId") || "").trim();
  const ownWorkerId = (admin.worker_id || "").trim();
  const workerId =
    admin.role === "staff-admin"
      ? requestedWorkerId || ownWorkerId
      : requestedWorkerId;

  if (admin.role === "staff-admin" && !ownWorkerId) {
    return jsonError("Staff account is not linked to a worker.", 422);
  }

  const db = getSupabaseAdmin();
  let query = db
    .from("worker_services")
    .select(
      "id, worker_id, service_id, duration_min, price, color, is_active, workers(id, name), services(id, name, is_active)"
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

  const requestedWorkerId = (body.workerId || "").trim();
  const workerId =
    admin.role === "staff-admin"
      ? (admin.worker_id || "").trim()
      : requestedWorkerId;
  const providedServiceId = (body.serviceId || "").trim();
  const name = (body.name || "").trim();
  const durationMin = parseDuration(body.durationMin);
  const price = Number(body.price || 0);
  const color = normalizeColor(body.color);
  const isActive = body.isActive !== false;

  if (!workerId || (!providedServiceId && !name)) {
    return jsonError(
      "workerId and (serviceId or name) with valid durationMin/price are required.",
      422
    );
  }
  if (!durationMin) {
    return jsonError(
      `durationMin must be an integer between ${MIN_DURATION_MIN} and ${MAX_DURATION_MIN}.`,
      422
    );
  }
  if (!Number.isFinite(price) || price < 0) {
    return jsonError("price must be a non-negative number.", 422);
  }
  if ((body.color || "").trim() && !color) {
    return jsonError("color must be a valid HEX code (#RRGGBB).", 422);
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

  const { data: row, error: createError } = await db
    .from("worker_services")
    .insert({
      worker_id: workerId,
      service_id: serviceId,
      duration_min: durationMin,
      price,
      color,
      is_active: isActive,
    })
    .select(
      "id, worker_id, service_id, duration_min, price, color, is_active, workers(id, name), services(id, name, is_active)"
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
  const { data: currentService, error: currentServiceError } = await db
    .from("worker_services")
    .select("id, worker_id, service_id")
    .eq("id", workerServiceId)
    .maybeSingle<{ id: string; worker_id: string; service_id: string }>();
  if (currentServiceError) {
    return jsonError(currentServiceError.message, 500);
  }
  if (!currentService) {
    return jsonError("Service row not found.", 404);
  }
  if (
    admin.role === "staff-admin" &&
    currentService.worker_id !== (admin.worker_id || "")
  ) {
    return jsonError("Forbidden", 403);
  }
  if (admin.role === "staff-admin" && body.name && body.name.trim()) {
    return jsonError("Staff cannot rename service names.", 403);
  }

  const patch: Record<string, unknown> = {};
  if (body.durationMin !== undefined) {
    const durationMin = parseDuration(body.durationMin);
    if (!durationMin) {
      return jsonError(
        `durationMin must be an integer between ${MIN_DURATION_MIN} and ${MAX_DURATION_MIN}.`,
        422
      );
    }
    patch.duration_min = durationMin;
  }
  if (body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) {
      return jsonError("price must be a non-negative number.", 422);
    }
    patch.price = price;
  }
  if (body.color !== undefined) {
    if (body.color === null || body.color.trim() === "") {
      patch.color = null;
    } else {
      const normalized = normalizeColor(body.color);
      if (!normalized) {
        return jsonError("color must be a valid HEX code (#RRGGBB).", 422);
      }
      patch.color = normalized;
    }
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
    const { error: renameError } = await db
      .from("services")
      .update({ name: body.name.trim() })
      .eq("id", currentService.service_id);
    if (renameError) {
      return jsonError(renameError.message, 500);
    }
  }

  const { data: row, error: fetchError } = await db
    .from("worker_services")
    .select(
      "id, worker_id, service_id, duration_min, price, color, is_active, workers(id, name), services(id, name, is_active)"
    )
    .eq("id", workerServiceId)
    .single();

  if (fetchError || !row) {
    return jsonError(fetchError?.message || "Cannot load updated row.", 500);
  }

  return jsonOk({ service: row });
}
