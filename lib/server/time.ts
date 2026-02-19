export const SLOT_STEP_MINUTES = 20;

export const parseTimeToMinutes = (value: string) => {
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

export const minutesToTime = (minutes: number) => {
  const normalized = Math.max(0, Math.min(23 * 60 + 59, minutes));
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export const ceilToStep = (value: number, step: number) =>
  Math.ceil(value / step) * step;

export const normalizeDurationToStep = (durationMin: number) =>
  Math.max(SLOT_STEP_MINUTES, ceilToStep(durationMin, SLOT_STEP_MINUTES));

export const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export const rangesOverlap = (
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
) => aStart < bEnd && aEnd > bStart;
