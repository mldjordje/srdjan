import crypto from "node:crypto";

import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { env } from "@/lib/server/env";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import type { AdminRole, AdminUserRecord, ClientRecord } from "@/lib/server/types";

export const CLIENT_SESSION_COOKIE = "srdjan_client_session";
export const ADMIN_SESSION_COOKIE = "srdjan_admin_session";
const CLIENT_SESSION_TTL_DAYS = 180;
const ADMIN_SESSION_TTL_DAYS = 7;

type AdminSessionPayload = {
  sub: string;
  username: string;
  role: AdminRole;
  exp: number;
};

const sha256 = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

const base64Url = (value: string) =>
  Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const fromBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
};

const getCookie = (request: Request, key: string) => {
  const header = request.headers.get("cookie");
  if (!header) {
    return null;
  }
  const parts = header.split(";").map((item) => item.trim());
  for (const part of parts) {
    const [k, ...rest] = part.split("=");
    if (k === key) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const signAdminPayload = (payload: string) =>
  crypto
    .createHmac("sha256", env.adminSessionSecret())
    .update(payload)
    .digest("base64url");

const buildAdminToken = (payload: AdminSessionPayload) => {
  const encoded = base64Url(JSON.stringify(payload));
  const signature = signAdminPayload(encoded);
  return `${encoded}.${signature}`;
};

const parseAdminToken = (token: string): AdminSessionPayload | null => {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return null;
  }
  const expected = signAdminPayload(encoded);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as AdminSessionPayload;
    if (!payload?.sub || !payload?.role || !payload?.exp) {
      return null;
    }
    if (Date.now() / 1000 >= payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};

export const createClientSession = async (clientId: string) => {
  const token = crypto.randomBytes(32).toString("hex");
  const hash = sha256(`${token}:${env.sessionSecret()}`);
  const expiresAt = addDays(new Date(), CLIENT_SESSION_TTL_DAYS).toISOString();
  const db = getSupabaseAdmin();
  const { error } = await db.from("client_sessions").insert({
    client_id: clientId,
    session_token_hash: hash,
    expires_at: expiresAt,
  });
  if (error) {
    throw new Error(error.message);
  }
  return { token, expiresAt };
};

export const attachClientSessionCookie = (
  response: NextResponse,
  token: string,
  expiresAt: string
) => {
  response.cookies.set({
    name: CLIENT_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
};

export const clearClientSessionCookie = (response: NextResponse) => {
  response.cookies.set({
    name: CLIENT_SESSION_COOKIE,
    value: "",
    maxAge: 0,
    path: "/",
  });
};

export const getClientFromRequest = async (request: Request): Promise<ClientRecord | null> => {
  const token = getCookie(request, CLIENT_SESSION_COOKIE);
  if (!token) {
    return null;
  }

  const hash = sha256(`${token}:${env.sessionSecret()}`);
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data: session, error: sessionError } = await db
    .from("client_sessions")
    .select("client_id, expires_at")
    .eq("session_token_hash", hash)
    .gt("expires_at", now)
    .maybeSingle();

  if (sessionError || !session?.client_id) {
    return null;
  }

  const { data: client, error: clientError } = await db
    .from("clients")
    .select("id, full_name, phone, email, created_at, updated_at")
    .eq("id", session.client_id)
    .maybeSingle<ClientRecord>();

  if (clientError || !client) {
    return null;
  }

  return client;
};

export const verifyAdminCredentials = async (username: string, password: string) => {
  const db = getSupabaseAdmin();
  const { data: user, error } = await db
    .from("admin_users")
    .select("id, username, password_hash, role, is_active")
    .eq("username", username)
    .eq("is_active", true)
    .maybeSingle<AdminUserRecord>();

  if (error || !user) {
    return null;
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return null;
  }

  return user;
};

export const createAdminSessionToken = (user: Pick<AdminUserRecord, "id" | "username" | "role">) => {
  const exp = Math.floor(addDays(new Date(), ADMIN_SESSION_TTL_DAYS).getTime() / 1000);
  return buildAdminToken({
    sub: user.id,
    username: user.username,
    role: user.role,
    exp,
  });
};

export const attachAdminSessionCookie = (response: NextResponse, token: string) => {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_DAYS * 24 * 60 * 60,
  });
};

export const clearAdminSessionCookie = (response: NextResponse) => {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    maxAge: 0,
    path: "/",
  });
};

export const getAdminFromRequest = async (
  request: Request
): Promise<{ id: string; username: string; role: AdminRole } | null> => {
  const token = getCookie(request, ADMIN_SESSION_COOKIE);
  if (!token) {
    return null;
  }
  const payload = parseAdminToken(token);
  if (!payload) {
    return null;
  }

  const db = getSupabaseAdmin();
  const { data: user, error } = await db
    .from("admin_users")
    .select("id, username, role, is_active")
    .eq("id", payload.sub)
    .eq("is_active", true)
    .maybeSingle<{ id: string; username: string; role: AdminRole; is_active: boolean }>();

  if (error || !user) {
    return null;
  }

  return { id: user.id, username: user.username, role: user.role };
};
