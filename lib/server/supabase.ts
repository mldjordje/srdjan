import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/server/env";

type DynamicDatabase = {
  public: {
    Tables: Record<
      string,
      {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
        Relationships: [];
      }
    >;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

let cached: SupabaseClient<DynamicDatabase> | null = null;

export const getSupabaseAdmin = () => {
  if (!cached) {
    cached = createClient<DynamicDatabase>(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return cached;
};
