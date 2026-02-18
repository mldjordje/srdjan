import webpush from "web-push";

import { env } from "@/lib/server/env";
import { getSupabaseAdmin } from "@/lib/server/supabase";

let configured = false;

const configure = () => {
  if (configured) {
    return true;
  }
  const publicKey = env.webPushPublicKey();
  const privateKey = env.webPushPrivateKey();
  if (!publicKey || !privateKey) {
    return false;
  }
  webpush.setVapidDetails(env.webPushContact(), publicKey, privateKey);
  configured = true;
  return true;
};

type PushPayload = {
  title: string;
  body: string;
  appointmentId?: string;
  reason?: string;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export const sendPushToClient = async (clientId: string, payload: PushPayload) => {
  if (!configure()) {
    return;
  }
  const db = getSupabaseAdmin();
  const { data: subscriptions, error } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("client_id", clientId)
    .eq("is_active", true);

  if (error || !subscriptions?.length) {
    return;
  }

  const message = JSON.stringify(payload);

  const typedSubscriptions = (subscriptions || []) as PushSubscriptionRow[];

  await Promise.all(
    typedSubscriptions.map(async (item) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: item.endpoint,
            keys: {
              p256dh: item.p256dh,
              auth: item.auth,
            },
          },
          message
        );
      } catch {
        await db
          .from("push_subscriptions")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", item.id);
      }
    })
  );
};
