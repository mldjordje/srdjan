import { NextResponse } from "next/server";

import { attachClientSessionCookie, createClientSession } from "@/lib/server/auth";
import { jsonError, parseJson } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/server/supabase";

type SessionStartBody = {
  fullName?: string;
  phone?: string;
  email?: string;
};

type ClientLookupRow = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  created_at: string;
  updated_at: string;
};

export async function POST(request: Request) {
  const body = await parseJson<SessionStartBody>(request);
  if (!body) {
    return jsonError("Invalid JSON body.");
  }

  const fullName = (body.fullName || "").trim();
  const phone = (body.phone || "").trim();
  const email = (body.email || "").trim().toLowerCase();

  if (!fullName || !phone || !email) {
    return jsonError("fullName, phone, and email are required.", 422);
  }

  const db = getSupabaseAdmin();

  const { data: existing, error: existingError } = await db
    .from("clients")
    .select("id, full_name, phone, email, created_at, updated_at")
    .or(`phone.eq.${phone},email.eq.${email}`)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return jsonError(existingError.message, 500);
  }

  const typedExisting = (existing as ClientLookupRow | null) || null;
  let clientId = typedExisting?.id;

  if (typedExisting) {
    const { error: updateError } = await db
      .from("clients")
      .update({
        full_name: fullName,
        phone,
        email,
        updated_at: new Date().toISOString(),
      })
      .eq("id", typedExisting.id);

    if (updateError) {
      return jsonError(updateError.message, 500);
    }
  } else {
    const { data: created, error: insertError } = await db
      .from("clients")
      .insert({
        full_name: fullName,
        phone,
        email,
      })
      .select("id")
      .single();

    if (insertError || !created?.id) {
      return jsonError(insertError?.message || "Cannot create client.", 500);
    }
    clientId = created.id as string;
  }

  if (!clientId) {
    return jsonError("Cannot resolve client profile.", 500);
  }

  const { token, expiresAt } = await createClientSession(clientId);

  const { data: client, error: clientError } = await db
    .from("clients")
    .select("id, full_name, phone, email, created_at, updated_at")
    .eq("id", clientId)
    .single();

  if (clientError || !client) {
    return jsonError(clientError?.message || "Cannot load profile.", 500);
  }

  const response = NextResponse.json({
    client: {
      id: (client as ClientLookupRow).id,
      fullName: (client as ClientLookupRow).full_name,
      phone: (client as ClientLookupRow).phone,
      email: (client as ClientLookupRow).email,
    },
  });
  attachClientSessionCookie(response, token, expiresAt);
  return response;
}
