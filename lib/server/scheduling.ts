import { getSupabaseAdmin } from "@/lib/server/supabase";
import {
  SLOT_STEP_MINUTES,
  isIsoDate,
  minutesToTime,
  parseTimeToMinutes,
  rangesOverlap,
} from "@/lib/server/time";
import type { ShiftType } from "@/lib/server/types";

type WorkerService = {
  id: string;
  worker_id: string;
  service_id: string;
  duration_min: number;
  price: number;
  is_active: boolean;
  services: {
    id: string;
    name: string;
    is_active: boolean;
  } | null;
};

type ShiftSettings = {
  location_id: string;
  morning_start: string;
  morning_end: string;
  afternoon_start: string;
  afternoon_end: string;
};

type WorkerShift = {
  id: string;
  location_id: string;
  worker_id: string;
  date: string;
  shift_type: ShiftType;
};

type OccupiedItem = {
  start_time: string;
  end_time: string;
};

type MaybeDbError = {
  code?: string;
  message?: string;
} | null | undefined;

export const getWorkerService = async (workerId: string, serviceId: string) => {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("worker_services")
    .select(
      "id, worker_id, service_id, duration_min, price, is_active, services(id, name, is_active)"
    )
    .eq("worker_id", workerId)
    .eq("service_id", serviceId)
    .eq("is_active", true)
    .maybeSingle<WorkerService>();

  if (error || !data || !data.services || data.services.is_active === false) {
    return null;
  }
  return data;
};

export const getShiftWindowForDay = async (
  locationId: string,
  workerId: string,
  date: string
) => {
  if (!isIsoDate(date)) {
    return null;
  }
  const db = getSupabaseAdmin();
  const [{ data: settings, error: settingsError }, { data: shift, error: shiftError }] =
    await Promise.all([
      db
        .from("shift_settings")
        .select(
          "location_id, morning_start, morning_end, afternoon_start, afternoon_end"
        )
        .eq("location_id", locationId)
        .maybeSingle<ShiftSettings>(),
      db
        .from("worker_shifts")
        .select("id, location_id, worker_id, date, shift_type")
        .eq("location_id", locationId)
        .eq("worker_id", workerId)
        .eq("date", date)
        .maybeSingle<WorkerShift>(),
    ]);

  if (settingsError || shiftError || !settings || !shift) {
    return null;
  }

  if (shift.shift_type === "off") {
    return null;
  }

  if (shift.shift_type === "morning") {
    return {
      shiftType: shift.shift_type,
      start: settings.morning_start,
      end: settings.morning_end,
    };
  }

  return {
    shiftType: shift.shift_type,
    start: settings.afternoon_start,
    end: settings.afternoon_end,
  };
};

export const getOccupiedByWorkerAndDate = async (
  locationId: string,
  workerId: string,
  date: string
) => {
  const db = getSupabaseAdmin();
  const [{ data: appointments, error: appointmentsError }, { data: blocks, error: blocksError }] =
    await Promise.all([
      db
        .from("appointments")
        .select("start_time, end_time")
        .eq("location_id", locationId)
        .eq("worker_id", workerId)
        .eq("date", date)
        .not("status", "eq", "cancelled")
        .returns<OccupiedItem[]>(),
      db
        .from("calendar_blocks")
        .select("start_time, end_time")
        .eq("location_id", locationId)
        .eq("worker_id", workerId)
        .eq("date", date)
        .returns<OccupiedItem[]>(),
    ]);

  if (appointmentsError) {
    throw new Error(appointmentsError.message);
  }
  if (blocksError) {
    throw new Error(blocksError.message);
  }
  return [...(appointments ?? []), ...(blocks ?? [])];
};

export const buildAvailability = ({
  shiftStart,
  shiftEnd,
  durationMin,
  occupied,
}: {
  shiftStart: string;
  shiftEnd: string;
  durationMin: number;
  occupied: OccupiedItem[];
}) => {
  const startMinutes = parseTimeToMinutes(shiftStart);
  const endMinutes = parseTimeToMinutes(shiftEnd);
  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return [];
  }

  if (!Number.isFinite(durationMin) || durationMin <= 0) {
    return [];
  }
  const occupiedRanges = occupied
    .map((item) => {
      const s = parseTimeToMinutes(item.start_time);
      const e = parseTimeToMinutes(item.end_time);
      if (s === null || e === null) {
        return null;
      }
      return { start: s, end: e };
    })
    .filter((item): item is { start: number; end: number } => Boolean(item));

  const slots: string[] = [];
  for (
    let slotStart = startMinutes;
    slotStart + durationMin <= endMinutes;
    slotStart += SLOT_STEP_MINUTES
  ) {
    const slotEnd = slotStart + durationMin;
    const overlaps = occupiedRanges.some((range) =>
      rangesOverlap(slotStart, slotEnd, range.start, range.end)
    );
    if (!overlaps) {
      slots.push(minutesToTime(slotStart));
    }
  }
  return slots;
};

export const ensureNoConflict = ({
  startTime,
  endTime,
  occupied,
}: {
  startTime: string;
  endTime: string;
  occupied: OccupiedItem[];
}) => {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start === null || end === null || end <= start) {
    return false;
  }

  for (const item of occupied) {
    const itemStart = parseTimeToMinutes(item.start_time);
    const itemEnd = parseTimeToMinutes(item.end_time);
    if (itemStart === null || itemEnd === null) {
      continue;
    }
    if (rangesOverlap(start, end, itemStart, itemEnd)) {
      return false;
    }
  }
  return true;
};

export const isOverlapConflictError = (error: MaybeDbError) => {
  const code = (error?.code || "").trim();
  const message = (error?.message || "").toLowerCase();
  if (code === "23P01") {
    return true;
  }
  return (
    message.includes("overlap") ||
    message.includes("selected slot is not available") ||
    message.includes("block overlaps")
  );
};
