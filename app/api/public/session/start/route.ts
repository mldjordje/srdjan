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
  const rawPhone = (body.phone || "").trim();
  const normalizedPhone = rawPhone.replace(/\D+/g, "");
  const email = (body.email || "").trim().toLowerCase();
  const hasPhone = normalizedPhone.length >= 6;
  const hasEmail = email.length > 0;

  if (!hasPhone && !hasEmail) {
    return jsonError("Unesite barem telefon ili email.", 422);
  }

  if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError("Email format nije validan.", 422);
  }

  const db = getSupabaseAdmin();

  const [phoneLookup, emailLookup] = await Promise.all([
    hasPhone
      ? db
          .from("clients")
          .select("id, full_name, phone, email, created_at, updated_at")
          .eq("phone", normalizedPhone)
          .maybeSingle<ClientLookupRow>()
      : Promise.resolve({ data: null, error: null }),
    hasEmail
      ? db
          .from("clients")
          .select("id, full_name, phone, email, created_at, updated_at")
          .eq("email", email)
          .maybeSingle<ClientLookupRow>()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (phoneLookup.error) {
    return jsonError(phoneLookup.error.message, 500);
  }
  if (emailLookup.error) {
    return jsonError(emailLookup.error.message, 500);
  }

  const phoneExisting = (phoneLookup.data as ClientLookupRow | null) || null;
  const emailExisting = (emailLookup.data as ClientLookupRow | null) || null;

  if (
    phoneExisting &&
    emailExisting &&
    phoneExisting.id !== emailExisting.id
  ) {
    return jsonError(
      "Telefon i email su povezani sa razlicitim nalozima. Javite se salonu da spoji naloge.",
      409
    );
  }

  const typedExisting = phoneExisting || emailExisting;
  let clientId = typedExisting?.id;

  if (typedExisting) {
    const patch: Record<string, string> = {};

    if (hasPhone && typedExisting.phone !== normalizedPhone) {
      patch.phone = normalizedPhone;
    }
    if (hasEmail && typedExisting.email !== email) {
      patch.email = email;
    }
    if (!typedExisting.full_name?.trim() && fullName) {
      patch.full_name = fullName;
    }

    if (Object.keys(patch).length > 0) {
      patch.updated_at = new Date().toISOString();
      const { error: updateError } = await db
        .from("clients")
        .update(patch)
        .eq("id", typedExisting.id);

      if (updateError) {
        if (updateError.code === "23505") {
          return jsonError(
            "Telefon ili email su vec povezani sa drugim nalogom.",
            409
          );
        }
        return jsonError(updateError.message, 500);
      }
    }
  } else {
    if (!fullName || !hasPhone || !hasEmail) {
      return jsonError(
        "Prva prijava trazi ime i prezime, telefon i email.",
        422
      );
    }

    const { data: created, error: insertError } = await db
      .from("clients")
      .insert({
        full_name: fullName,
        phone: normalizedPhone,
        email,
      })
      .select("id")
      .single();

    if (insertError || !created?.id) {
      if (insertError?.code === "23505") {
        return jsonError("Klijent sa tim telefonom ili emailom vec postoji.", 409);
      }
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
