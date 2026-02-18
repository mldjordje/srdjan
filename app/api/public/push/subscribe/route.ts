import { getClientFromRequest } from "@/lib/server/auth";
import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/server/supabase";

type SubscribeBody = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function POST(request: Request) {
  const client = await getClientFromRequest(request);
  if (!client) {
    return jsonError("Unauthorized", 401);
  }

  const body = await parseJson<SubscribeBody>(request);
  if (!body) {
    return jsonError("Invalid JSON body.");
  }

  const endpoint = (body.endpoint || "").trim();
  const p256dh = (body.keys?.p256dh || "").trim();
  const auth = (body.keys?.auth || "").trim();

  if (!endpoint || !p256dh || !auth) {
    return jsonError("Invalid push subscription payload.", 422);
  }

  const db = getSupabaseAdmin();
  const { error } = await db.from("push_subscriptions").upsert(
    {
      client_id: client.id,
      endpoint,
      p256dh,
      auth,
      user_agent: request.headers.get("user-agent"),
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );

  if (error) {
    return jsonError(error.message, 500);
  }

  return jsonOk({ status: "ok" });
}

