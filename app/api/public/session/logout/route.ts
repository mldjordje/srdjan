import { NextResponse } from "next/server";

import { clearClientSessionCookie } from "@/lib/server/auth";

export async function POST() {
  const response = NextResponse.json({ status: "ok" });
  clearClientSessionCookie(response);
  return response;
}

