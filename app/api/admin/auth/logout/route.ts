import { NextResponse } from "next/server";

import { clearAdminSessionCookie } from "@/lib/server/auth";
import { PRIVATE_ADMIN_CACHE_HEADERS } from "@/lib/server/cache";

export async function POST() {
  const response = NextResponse.json({ status: "ok" }, { headers: PRIVATE_ADMIN_CACHE_HEADERS });
  clearAdminSessionCookie(response);
  return response;
}
