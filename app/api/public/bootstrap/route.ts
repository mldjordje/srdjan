import { env } from "@/lib/server/env";
import { jsonError, jsonOk } from "@/lib/server/http";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export async function GET() {
  const db = getSupabaseAdmin();

  const [{ data: locations, error: locationsError }, { data: workers, error: workersError }] =
    await Promise.all([
      db
        .from("locations")
        .select("id, name, is_active")
        .eq("is_active", true)
        .order("name"),
      db
        .from("workers")
        .select("id, location_id, name, is_active")
        .eq("is_active", true)
        .order("name"),
    ]);

  if (locationsError || workersError) {
    return jsonError(locationsError?.message || workersError?.message || "Bootstrap failed.", 500);
  }

  const defaultLocationId =
    env.defaultLocationId() || (locations?.length ? (locations[0].id as string) : "");

  const selectedWorkers = (workers || []).filter(
    (worker) => worker.location_id === defaultLocationId
  );

  const workerIds = selectedWorkers.map((worker) => worker.id);

  const [{ data: workerServices, error: workerServicesError }, { data: shifts, error: shiftsError }] =
    await Promise.all([
      workerIds.length
        ? db
            .from("worker_services")
            .select(
              "id, worker_id, service_id, duration_min, price, is_active, services(id, name, is_active)"
            )
            .in("worker_id", workerIds)
            .eq("is_active", true)
        : Promise.resolve({ data: [], error: null }),
      defaultLocationId
        ? db
            .from("shift_settings")
            .select(
              "location_id, morning_start, morning_end, afternoon_start, afternoon_end"
            )
            .eq("location_id", defaultLocationId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

  if (workerServicesError || shiftsError) {
    return jsonError(
      workerServicesError?.message || shiftsError?.message || "Bootstrap failed.",
      500
    );
  }

  return jsonOk({
    defaultLocationId,
    locations: locations || [],
    workers: selectedWorkers,
    workerServices: workerServices || [],
    shiftSettings: shifts,
  });
}

