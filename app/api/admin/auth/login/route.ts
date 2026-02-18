import { NextResponse } from "next/server";

import {
  attachAdminSessionCookie,
  createAdminSessionToken,
  verifyAdminCredentials,
} from "@/lib/server/auth";
import { jsonError, parseJson } from "@/lib/server/http";

type LoginBody = {
  username?: string;
  password?: string;
};

export async function POST(request: Request) {
  const body = await parseJson<LoginBody>(request);
  if (!body) {
    return jsonError("Invalid JSON body.");
  }
  const username = (body.username || "").trim();
  const password = (body.password || "").trim();
  if (!username || !password) {
    return jsonError("username and password are required.", 422);
  }

  const user = await verifyAdminCredentials(username, password);
  if (!user) {
    return jsonError("Invalid credentials.", 401);
  }

  const token = createAdminSessionToken(user);
  const response = NextResponse.json({
    admin: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  });
  attachAdminSessionCookie(response, token);
  return response;
}

