import { jsonError, jsonOk } from "@/lib/server/http";
import {
  buildAvailability,
  getOccupiedByWorkerAndDate,
  getShiftWindowForDay,
  getWorkerService,
} from "@/lib/server/scheduling";
import { isIsoDate, normalizeDurationToStep } from "@/lib/server/time";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locationId = (searchParams.get("locationId") || "").trim();
  const workerId = (searchParams.get("workerId") || "").trim();
  const serviceId = (searchParams.get("serviceId") || "").trim();
  const date = (searchParams.get("date") || "").trim();

  if (!locationId || !workerId || !serviceId || !date) {
    return jsonError("locationId, workerId, serviceId, and date are required.", 422);
  }
  if (!isIsoDate(date)) {
    return jsonError("date must be in YYYY-MM-DD format.", 422);
  }

  const workerService = await getWorkerService(workerId, serviceId);
  if (!workerService) {
    return jsonError("Service is not available for selected worker.", 404);
  }

  const shiftWindow = await getShiftWindowForDay(locationId, workerId, date);
  if (!shiftWindow) {
    return jsonOk({
      date,
      shiftType: "off",
      slots: [],
    });
  }

  const occupied = await getOccupiedByWorkerAndDate(locationId, workerId, date);
  const durationMin = normalizeDurationToStep(workerService.duration_min);
  const slots = buildAvailability({
    shiftStart: shiftWindow.start,
    shiftEnd: shiftWindow.end,
    durationMin,
    occupied,
  });

  return jsonOk({
    date,
    shiftType: shiftWindow.shiftType,
    shiftStart: shiftWindow.start,
    shiftEnd: shiftWindow.end,
    durationMin,
    slots,
  });
}

