import bcrypt from "bcryptjs";

import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/rbac";
import { getSupabaseAdmin } from "@/lib/server/supabase";

type CreateStaffUserBody = {
  workerId?: string;
  username?: string;
  password?: string;
  isActive?: boolean;
};

type PatchStaffUserBody = {
  id?: string;
  username?: string;
  password?: string;
  isActive?: boolean;
};

export async function GET(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const db = getSupabaseAdmin();
  const { data, error: fetchError } = await db
    .from("admin_users")
    .select("id, username, role, is_active, worker_id, workers(id, name, location_id)")
    .eq("role", "staff-admin")
    .order("username");

  if (fetchError) {
    return jsonError(fetchError.message, 500);
  }

  return jsonOk({ staffUsers: data || [] });
}

export async function POST(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const body = await parseJson<CreateStaffUserBody>(request);
  if (!body) {
    return jsonError("Invalid JSON body.");
  }

  const workerId = (body.workerId || "").trim();
  const username = (body.username || "").trim();
  const password = (body.password || "").trim();
  const isActive = body.isActive !== false;
  if (!workerId || !username || !password) {
    return jsonError("workerId, username and password are required.", 422);
  }
  if (password.length < 6) {
    return jsonError("Password must have at least 6 characters.", 422);
  }

  const db = getSupabaseAdmin();
  const { data: worker, error: workerError } = await db
    .from("workers")
    .select("id")
    .eq("id", workerId)
    .maybeSingle();
  if (workerError) {
    return jsonError(workerError.message, 500);
  }
  if (!worker) {
    return jsonError("Worker not found.", 404);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const { data, error: insertError } = await db
    .from("admin_users")
    .insert({
      username,
      password_hash: passwordHash,
      role: "staff-admin",
      worker_id: workerId,
      is_active: isActive,
    })
    .select("id, username, role, is_active, worker_id")
    .single();

  if (insertError || !data) {
    if (insertError?.code === "23505") {
      return jsonError("Username ili worker je vec povezan sa drugim staff nalogom.", 409);
    }
    return jsonError(insertError?.message || "Cannot create staff user.", 500);
  }

  return jsonOk({ staffUser: data }, 201);
}

export async function PATCH(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const body = await parseJson<PatchStaffUserBody>(request);
  if (!body) {
    return jsonError("Invalid JSON body.");
  }

  const id = (body.id || "").trim();
  if (!id) {
    return jsonError("id is required.", 422);
  }

  const patch: Record<string, unknown> = {};
  if (body.username && body.username.trim()) {
    patch.username = body.username.trim();
  }
  if (typeof body.isActive === "boolean") {
    patch.is_active = body.isActive;
  }
  if (body.password && body.password.trim()) {
    if (body.password.trim().length < 6) {
      return jsonError("Password must have at least 6 characters.", 422);
    }
    patch.password_hash = await bcrypt.hash(body.password.trim(), 10);
  }
  if (Object.keys(patch).length === 0) {
    return jsonError("No fields to update.", 422);
  }

  const db = getSupabaseAdmin();
  const { data, error: updateError } = await db
    .from("admin_users")
    .update(patch)
    .eq("id", id)
    .eq("role", "staff-admin")
    .select("id, username, role, is_active, worker_id")
    .single();
  if (updateError || !data) {
    if (updateError?.code === "23505") {
      return jsonError("Username je vec zauzet.", 409);
    }
    return jsonError(updateError?.message || "Cannot update staff user.", 500);
  }

  return jsonOk({ staffUser: data });
}

