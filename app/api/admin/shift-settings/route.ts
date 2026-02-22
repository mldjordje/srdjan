import { jsonError, jsonOk, parseJson } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/rbac";
import { getSupabaseAdmin } from "@/lib/server/supabase";

type PatchBody = {
  locationId?: string;
  morningStart?: string;
  morningEnd?: string;
  afternoonStart?: string;
  afternoonEnd?: string;
};

type ShiftSettingsRow = {
  location_id: string;
  morning_start: string;
  morning_end: string;
  afternoon_start: string;
  afternoon_end: string;
};

const toMinutes = (value: string) => {
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
};

const validateShiftSettings = (settings: {
  morning_start: string;
  morning_end: string;
  afternoon_start: string;
  afternoon_end: string;
}) => {
  const morningStart = toMinutes(settings.morning_start);
  const morningEnd = toMinutes(settings.morning_end);
  const afternoonStart = toMinutes(settings.afternoon_start);
  const afternoonEnd = toMinutes(settings.afternoon_end);

  if (
    morningStart === null ||
    morningEnd === null ||
    afternoonStart === null ||
    afternoonEnd === null
  ) {
    return "Times must be in HH:mm format.";
  }
  if (morningStart >= morningEnd) {
    return "Morning shift must end after it starts.";
  }
  if (afternoonStart >= afternoonEnd) {
    return "Afternoon shift must end after it starts.";
  }
  if (morningEnd > afternoonStart) {
    return "Morning shift must end before or at afternoon shift start.";
  }
  return null;
};

export async function GET(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner", "staff-admin"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const { searchParams } = new URL(request.url);
  const locationId = (searchParams.get("locationId") || "").trim();
  if (!locationId) {
    return jsonError("locationId is required.", 422);
  }

  const db = getSupabaseAdmin();
  const { data, error: fetchError } = await db
    .from("shift_settings")
    .select("location_id, morning_start, morning_end, afternoon_start, afternoon_end")
    .eq("location_id", locationId)
    .maybeSingle();
  if (fetchError) {
    return jsonError(fetchError.message, 500);
  }
  return jsonOk({ settings: data });
}

export async function PATCH(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner", "staff-admin"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const body = await parseJson<PatchBody>(request);
  if (!body) {
    return jsonError("Invalid JSON body.");
  }
  const locationId = (body.locationId || "").trim();
  if (!locationId) {
    return jsonError("locationId is required.", 422);
  }

  const db = getSupabaseAdmin();
  const { data: existing, error: existingError } = await db
    .from("shift_settings")
    .select("location_id, morning_start, morning_end, afternoon_start, afternoon_end")
    .eq("location_id", locationId)
    .maybeSingle<ShiftSettingsRow>();
  if (existingError) {
    return jsonError(existingError.message, 500);
  }

  const nextSettings = {
    morning_start: (body.morningStart || "").trim() || existing?.morning_start || "",
    morning_end: (body.morningEnd || "").trim() || existing?.morning_end || "",
    afternoon_start: (body.afternoonStart || "").trim() || existing?.afternoon_start || "",
    afternoon_end: (body.afternoonEnd || "").trim() || existing?.afternoon_end || "",
  };

  if (
    !nextSettings.morning_start ||
    !nextSettings.morning_end ||
    !nextSettings.afternoon_start ||
    !nextSettings.afternoon_end
  ) {
    return jsonError(
      "All shift times are required (morningStart, morningEnd, afternoonStart, afternoonEnd).",
      422
    );
  }

  const validationError = validateShiftSettings(nextSettings);
  if (validationError) {
    return jsonError(validationError, 422);
  }

  const { error: upsertError } = await db
    .from("shift_settings")
    .upsert({ location_id: locationId, ...nextSettings }, { onConflict: "location_id" });

  if (upsertError) {
    return jsonError(upsertError.message, 500);
  }
  return jsonOk({ status: "ok" });
}
