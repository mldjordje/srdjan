const readEnv = (name: string, fallback?: string) => {
  const value = process.env[name];
  if (value && value.trim() !== "") {
    return value.trim();
  }
  if (fallback !== undefined && fallback.trim() !== "") {
    return fallback;
  }
  throw new Error(`Missing required environment variable: ${name}`);
};

export const env = {
  supabaseUrl: () =>
    readEnv("SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ""),
  supabaseServiceRoleKey: () => readEnv("SUPABASE_SERVICE_ROLE_KEY"),
  sessionSecret: () => readEnv("SESSION_SECRET"),
  adminSessionSecret: () => readEnv("ADMIN_SESSION_SECRET"),
  defaultLocationId: () => readEnv("NEXT_PUBLIC_DEFAULT_LOCATION_ID", ""),
  appName: () => readEnv("NEXT_PUBLIC_APP_NAME", "Frizerski salon Srdjan"),
  supabasePublishableKey: () =>
    readEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ""
    ),
  webPushPublicKey: () => readEnv("WEB_PUSH_VAPID_PUBLIC_KEY", ""),
  webPushPrivateKey: () => readEnv("WEB_PUSH_VAPID_PRIVATE_KEY", ""),
  webPushContact: () => readEnv("WEB_PUSH_CONTACT", "mailto:admin@example.com"),
};
