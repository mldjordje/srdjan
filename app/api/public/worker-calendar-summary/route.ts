import { buildAvailability, getWorkerService } from "@/lib/server/scheduling";
import { jsonError, jsonOk } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { isIsoDate } from "@/lib/server/time";
import type { ShiftType } from "@/lib/server/types";

type ShiftSettings = {
  morning_start: string;
  morning_end: string;
  afternoon_start: string;
  afternoon_end: string;
};

type ShiftRow = {
  date: string;
  shift_type: ShiftType;
};

type OccupiedRow = {
  date: string;
  start_time: string;
  end_time: string;
};

const dateRange = (from: string, to: string) => {
  const days: string[] = [];
  const cursor = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (cursor <= end) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    days.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locationId = (searchParams.get("locationId") || "").trim();
  const workerId = (searchParams.get("workerId") || "").trim();
  const serviceId = (searchParams.get("serviceId") || "").trim();
  const from = (searchParams.get("from") || "").trim();
  const to = (searchParams.get("to") || "").trim();

  if (!locationId || !workerId || !serviceId || !from || !to) {
    return jsonError("locationId, workerId, serviceId, from and to are required.", 422);
  }
  if (!isIsoDate(from) || !isIsoDate(to)) {
    return jsonError("from and to must be in YYYY-MM-DD format.", 422);
  }

  const workerService = await getWorkerService(workerId, serviceId);
  if (!workerService) {
    return jsonError("Service is not available for selected worker.", 404);
  }
  const durationMin = Number(workerService.duration_min);
  if (!Number.isFinite(durationMin) || durationMin <= 0) {
    return jsonError("Invalid service duration.", 500);
  }

  const db = getSupabaseAdmin();
  const [
    { data: settings, error: settingsError },
    { data: shifts, error: shiftsError },
    { data: appointments, error: appointmentsError },
    { data: blocks, error: blocksError },
  ] = await Promise.all([
    db
      .from("shift_settings")
      .select("morning_start, morning_end, afternoon_start, afternoon_end")
      .eq("location_id", locationId)
      .maybeSingle<ShiftSettings>(),
    db
      .from("worker_shifts")
      .select("date, shift_type")
      .eq("location_id", locationId)
      .eq("worker_id", workerId)
      .gte("date", from)
      .lte("date", to)
      .returns<ShiftRow[]>(),
    db
      .from("appointments")
      .select("date, start_time, end_time")
      .eq("location_id", locationId)
      .eq("worker_id", workerId)
      .gte("date", from)
      .lte("date", to)
      .not("status", "eq", "cancelled")
      .returns<OccupiedRow[]>(),
    db
      .from("calendar_blocks")
      .select("date, start_time, end_time")
      .eq("location_id", locationId)
      .eq("worker_id", workerId)
      .gte("date", from)
      .lte("date", to)
      .returns<OccupiedRow[]>(),
  ]);

  const firstError = settingsError || shiftsError || appointmentsError || blocksError;
  if (firstError) {
    return jsonError(firstError.message, 500);
  }
  if (!settings) {
    return jsonOk({ summaries: [] });
  }

  const shiftByDate = new Map((shifts || []).map((item) => [item.date, item.shift_type]));
  const occupiedByDate = new Map<string, Array<{ start_time: string; end_time: string }>>();
  for (const row of [...(appointments || []), ...(blocks || [])]) {
    const list = occupiedByDate.get(row.date) || [];
    list.push({ start_time: row.start_time, end_time: row.end_time });
    occupiedByDate.set(row.date, list);
  }

  const summaries = dateRange(from, to).map((date) => {
    const shiftType = shiftByDate.get(date) || "off";
    if (shiftType === "off") {
      return { date, shiftType, availability: "off" as const };
    }

    const shiftStart =
      shiftType === "morning" ? settings.morning_start : settings.afternoon_start;
    const shiftEnd = shiftType === "morning" ? settings.morning_end : settings.afternoon_end;

    const slots = buildAvailability({
      shiftStart,
      shiftEnd,
      durationMin,
      occupied: occupiedByDate.get(date) || [],
    });

    return {
      date,
      shiftType,
      availability: slots.length > 0 ? ("free" as const) : ("busy" as const),
    };
  });

  return jsonOk({ summaries });
}
