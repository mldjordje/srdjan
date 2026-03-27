import { env } from "@/lib/server/env";
import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/rbac";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const BUCKET_NAME = "worker-avatars";
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const getFileExtension = (file: File) => {
  if (file.type === "image/png") {
    return "png";
  }
  if (file.type === "image/webp") {
    return "webp";
  }
  return "jpg";
};

const extractStoragePath = (url: string) => {
  const baseUrl = env.supabaseUrl().replace(/\/+$/, "");
  const publicPrefix = `${baseUrl}/storage/v1/object/public/${BUCKET_NAME}/`;
  if (!url.startsWith(publicPrefix)) {
    return null;
  }
  return decodeURIComponent(url.slice(publicPrefix.length).split("?")[0] || "");
};

const ensureBucket = async () => {
  const db = getSupabaseAdmin();
  const { data: buckets, error: bucketsError } = await db.storage.listBuckets();
  if (bucketsError) {
    throw new Error(bucketsError.message);
  }

  const exists = (buckets || []).some((bucket) => bucket.name === BUCKET_NAME);
  if (exists) {
    return;
  }

  const { error: createError } = await db.storage.createBucket(BUCKET_NAME, {
    public: true,
    fileSizeLimit: `${MAX_FILE_SIZE}`,
    allowedMimeTypes: [...ALLOWED_TYPES],
  });
  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw new Error(createError.message);
  }
};

const loadWorker = async (workerId: string) => {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("workers")
    .select("id, profile_image_url")
    .eq("id", workerId)
    .maybeSingle<{ id: string; profile_image_url?: string | null }>();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Worker not found.");
  }
  return data;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workerId: string }> }
) {
  const { admin, error } = await requireAdmin(request, ["owner"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const { workerId } = await params;
  const normalizedWorkerId = (workerId || "").trim();
  if (!normalizedWorkerId) {
    return jsonError("workerId is required.", 422);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonError("Image file is required.", 422);
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return jsonError("Allowed image types are JPG, PNG and WEBP.", 422);
    }
    if (file.size > MAX_FILE_SIZE) {
      return jsonError("Image must be smaller than 2 MB.", 422);
    }

    const worker = await loadWorker(normalizedWorkerId);
    await ensureBucket();

    const db = getSupabaseAdmin();
    const extension = getFileExtension(file);
    const filePath = `${normalizedWorkerId}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}.${extension}`;
    const buffer = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await db.storage.from(BUCKET_NAME).upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) {
      return jsonError(uploadError.message, 500);
    }

    const {
      data: { publicUrl },
    } = db.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    const { error: updateError } = await db
      .from("workers")
      .update({ profile_image_url: publicUrl })
      .eq("id", normalizedWorkerId);
    if (updateError) {
      return jsonError(updateError.message, 500);
    }

    const oldPath = worker.profile_image_url ? extractStoragePath(worker.profile_image_url) : null;
    if (oldPath) {
      await db.storage.from(BUCKET_NAME).remove([oldPath]);
    }

    return jsonOk({ profileImageUrl: publicUrl });
  } catch (uploadError) {
    const message = uploadError instanceof Error ? uploadError.message : "Avatar upload failed.";
    const status = message === "Worker not found." ? 404 : 500;
    return jsonError(message, status);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ workerId: string }> }
) {
  const { admin, error } = await requireAdmin(request, ["owner"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const { workerId } = await params;
  const normalizedWorkerId = (workerId || "").trim();
  if (!normalizedWorkerId) {
    return jsonError("workerId is required.", 422);
  }

  try {
    const worker = await loadWorker(normalizedWorkerId);
    const db = getSupabaseAdmin();
    const oldPath = worker.profile_image_url ? extractStoragePath(worker.profile_image_url) : null;

    if (oldPath) {
      await ensureBucket();
      await db.storage.from(BUCKET_NAME).remove([oldPath]);
    }

    const { error: updateError } = await db
      .from("workers")
      .update({ profile_image_url: null })
      .eq("id", normalizedWorkerId);
    if (updateError) {
      return jsonError(updateError.message, 500);
    }

    return jsonOk({ profileImageUrl: null });
  } catch (deleteError) {
    const message = deleteError instanceof Error ? deleteError.message : "Avatar delete failed.";
    const status = message === "Worker not found." ? 404 : 500;
    return jsonError(message, status);
  }
}
