import { NextResponse } from "next/server";

import { clearAdminSessionCookie } from "@/lib/server/auth";

export async function POST() {
  const response = NextResponse.json({ status: "ok" });
  clearAdminSessionCookie(response);
  return response;
}

