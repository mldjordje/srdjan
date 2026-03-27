import { PRIVATE_DASHBOARD_CACHE_HEADERS } from "@/lib/server/cache";
import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/rbac";
import { getSupabaseAdmin } from "@/lib/server/supabase";

type RevenueRow = {
  location_id: string;
  worker_id: string;
  price_snapshot: number;
  status: string;
  workers?: { name?: string | null; profile_image_url?: string | null } | null;
  locations?: { name?: string | null } | null;
};

type WorkerRow = {
  id: string;
  name: string;
  location_id: string;
  profile_image_url?: string | null;
};

type LocationRow = {
  id: string;
  name: string;
};

type WorkerRevenueSummary = {
  workerId: string;
  workerName: string;
  profileImageUrl: string | null;
  locationId: string;
  locationName: string;
  revenue: number;
  appointments: number;
};

type LocationRevenueSummary = {
  locationId: string;
  locationName: string;
  revenue: number;
  appointments: number;
  workers: WorkerRevenueSummary[];
};

type MonthRevenueSummary = {
  monthStart: string;
  monthEnd: string;
  monthLabel: string;
  totalRevenue: number;
  totalAppointments: number;
  locations: LocationRevenueSummary[];
  workers: WorkerRevenueSummary[];
  isSnapshot: boolean;
  savedAt: string | null;
};

type SnapshotRow = {
  month_start: string;
  month_end: string;
  month_label: string;
  summary: MonthRevenueSummary;
  updated_at: string;
};

const REVENUE_STATUSES = new Set(["confirmed", "completed", "no_show"]);
const APPOINTMENT_COUNT_STATUSES = new Set(["pending", "confirmed", "completed", "no_show"]);
const SNAPSHOT_TABLE_NAME = "monthly_revenue_snapshots";
const HISTORY_LIMIT = 6;

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);

const getMonthRange = (baseDate: Date) => {
  const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const monthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  return {
    monthStart,
    monthEnd,
    monthStartIso: toIsoDate(monthStart),
    monthEndIso: toIsoDate(monthEnd),
  };
};

const formatMonthLabel = (date: Date) =>
  new Intl.DateTimeFormat("sr-RS", {
    month: "long",
    year: "numeric",
  }).format(date);

const isMissingSnapshotTableError = (message?: string | null) =>
  (message || "").toLowerCase().includes(SNAPSHOT_TABLE_NAME);

const calculateMonthSummary = async (
  monthDate: Date,
  isSnapshot: boolean,
  savedAt: string | null
): Promise<MonthRevenueSummary> => {
  const db = getSupabaseAdmin();
  const { monthStart, monthStartIso, monthEndIso } = getMonthRange(monthDate);

  const [{ data: locations, error: locationsError }, { data: workers, error: workersError }, { data: rows, error: rowsError }] =
    await Promise.all([
      db.from("locations").select("id, name").order("name"),
      db.from("workers").select("id, name, location_id, profile_image_url").order("name"),
      db
        .from("appointments")
        .select(
          "location_id, worker_id, price_snapshot, status, workers(name, profile_image_url), locations(name)"
        )
        .gte("date", monthStartIso)
        .lte("date", monthEndIso),
    ]);

  const firstError = locationsError || workersError || rowsError;
  if (firstError) {
    throw new Error(firstError.message);
  }

  const locationRows = (locations || []) as LocationRow[];
  const workerRows = (workers || []) as WorkerRow[];
  const revenueRows = (rows || []) as RevenueRow[];

  const locationNameById = locationRows.reduce((acc, location) => {
    acc[location.id] = location.name;
    return acc;
  }, {} as Record<string, string>);

  const workerMap = new Map<string, WorkerRevenueSummary>();
  for (const worker of workerRows) {
    workerMap.set(worker.id, {
      workerId: worker.id,
      workerName: worker.name,
      profileImageUrl: worker.profile_image_url || null,
      locationId: worker.location_id,
      locationName: locationNameById[worker.location_id] || "Bez lokacije",
      revenue: 0,
      appointments: 0,
    });
  }

  for (const row of revenueRows) {
    const existing =
      workerMap.get(row.worker_id) ||
      ({
        workerId: row.worker_id,
        workerName: row.workers?.name || "Radnik",
        profileImageUrl: row.workers?.profile_image_url || null,
        locationId: row.location_id,
        locationName: row.locations?.name || locationNameById[row.location_id] || "Bez lokacije",
        revenue: 0,
        appointments: 0,
      } satisfies WorkerRevenueSummary);

    if (APPOINTMENT_COUNT_STATUSES.has(row.status)) {
      existing.appointments += 1;
    }
    if (REVENUE_STATUSES.has(row.status)) {
      existing.revenue += row.price_snapshot || 0;
    }

    workerMap.set(row.worker_id, existing);
  }

  const workersSummary = [...workerMap.values()].sort((a, b) => {
    if (b.revenue !== a.revenue) {
      return b.revenue - a.revenue;
    }
    if (b.appointments !== a.appointments) {
      return b.appointments - a.appointments;
    }
    return a.workerName.localeCompare(b.workerName, "sr");
  });

  const locationMap = new Map<string, LocationRevenueSummary>();
  for (const location of locationRows) {
    locationMap.set(location.id, {
      locationId: location.id,
      locationName: location.name,
      revenue: 0,
      appointments: 0,
      workers: [],
    });
  }

  for (const worker of workersSummary) {
    const location =
      locationMap.get(worker.locationId) ||
      ({
        locationId: worker.locationId,
        locationName: worker.locationName,
        revenue: 0,
        appointments: 0,
        workers: [],
      } satisfies LocationRevenueSummary);

    location.revenue += worker.revenue;
    location.appointments += worker.appointments;
    location.workers.push(worker);
    locationMap.set(worker.locationId, location);
  }

  const locationsSummary = [...locationMap.values()]
    .map((location) => ({
      ...location,
      workers: location.workers.sort((a, b) => {
        if (b.revenue !== a.revenue) {
          return b.revenue - a.revenue;
        }
        if (b.appointments !== a.appointments) {
          return b.appointments - a.appointments;
        }
        return a.workerName.localeCompare(b.workerName, "sr");
      }),
    }))
    .sort((a, b) => {
      if (b.revenue !== a.revenue) {
        return b.revenue - a.revenue;
      }
      if (b.appointments !== a.appointments) {
        return b.appointments - a.appointments;
      }
      return a.locationName.localeCompare(b.locationName, "sr");
    });

  return {
    monthStart: monthStartIso,
    monthEnd: monthEndIso,
    monthLabel: formatMonthLabel(monthStart),
    totalRevenue: workersSummary.reduce((sum, worker) => sum + worker.revenue, 0),
    totalAppointments: workersSummary.reduce((sum, worker) => sum + worker.appointments, 0),
    locations: locationsSummary,
    workers: workersSummary,
    isSnapshot,
    savedAt,
  };
};

const ensurePreviousMonthSnapshot = async (now: Date) => {
  const db = getSupabaseAdmin();
  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const { monthStartIso } = getMonthRange(previousMonthDate);

  const { data: existing, error: existingError } = await db
    .from(SNAPSHOT_TABLE_NAME)
    .select("month_start")
    .eq("month_start", monthStartIso)
    .maybeSingle<{ month_start: string }>();

  if (existingError) {
    if (isMissingSnapshotTableError(existingError.message)) {
      return false;
    }
    throw new Error(existingError.message);
  }
  if (existing?.month_start) {
    return true;
  }

  const summary = await calculateMonthSummary(previousMonthDate, true, new Date().toISOString());
  const { error: insertError } = await db.from(SNAPSHOT_TABLE_NAME).upsert({
    month_start: summary.monthStart,
    month_end: summary.monthEnd,
    month_label: summary.monthLabel,
    summary,
  });

  if (insertError) {
    if (isMissingSnapshotTableError(insertError.message)) {
      return false;
    }
    throw new Error(insertError.message);
  }

  return true;
};

const loadSavedSnapshots = async () => {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from(SNAPSHOT_TABLE_NAME)
    .select("month_start, month_end, month_label, summary, updated_at")
    .order("month_start", { ascending: false })
    .limit(HISTORY_LIMIT);

  if (error) {
    if (isMissingSnapshotTableError(error.message)) {
      return { historyStorageEnabled: false, savedMonths: [] as MonthRevenueSummary[] };
    }
    throw new Error(error.message);
  }

  const rows = (data || []) as SnapshotRow[];
  return {
    historyStorageEnabled: true,
    savedMonths: rows.map((row) => ({
      ...row.summary,
      isSnapshot: true,
      savedAt: row.updated_at,
      monthStart: row.month_start,
      monthEnd: row.month_end,
      monthLabel: row.month_label || row.summary.monthLabel,
    })),
  };
};

export async function GET(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const db = getSupabaseAdmin();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const { monthStartIso, monthEndIso } = getMonthRange(now);

  const [
    { count: totalAppointments, error: totalError },
    { count: upcomingAppointments, error: upcomingError },
    { count: cancelledAppointments, error: cancelledError },
    { count: totalClients, error: clientsError },
    currentMonthSummary,
  ] = await Promise.all([
    db.from("appointments").select("id", { count: "exact", head: true }),
    db
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .gte("date", today)
      .not("status", "eq", "cancelled"),
    db
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("status", "cancelled"),
    db.from("clients").select("id", { count: "exact", head: true }),
    calculateMonthSummary(now, false, null),
  ]);

  const firstError = totalError || upcomingError || cancelledError || clientsError;
  if (firstError) {
    return jsonError(firstError.message, 500);
  }

  let historyStorageEnabled = false;
  let savedMonths: MonthRevenueSummary[] = [];

  try {
    historyStorageEnabled = await ensurePreviousMonthSnapshot(now);
    const snapshotsPayload = await loadSavedSnapshots();
    historyStorageEnabled = snapshotsPayload.historyStorageEnabled;
    savedMonths = snapshotsPayload.savedMonths.filter(
      (item) => item.monthStart !== monthStartIso && item.monthEnd !== monthEndIso
    );
  } catch (snapshotError) {
    return jsonError(
      snapshotError instanceof Error ? snapshotError.message : "Ne mogu da ucitam istoriju zarade.",
      500
    );
  }

  return jsonOk(
    {
      kpi: {
        totalAppointments: totalAppointments || 0,
        upcomingAppointments: upcomingAppointments || 0,
        cancelledAppointments: cancelledAppointments || 0,
        monthlyRevenue: currentMonthSummary.totalRevenue,
        totalClients: totalClients || 0,
      },
      revenue: {
        currentMonth: currentMonthSummary,
        savedMonths,
        historyStorageEnabled,
      },
    },
    { headers: PRIVATE_DASHBOARD_CACHE_HEADERS }
  );
}
