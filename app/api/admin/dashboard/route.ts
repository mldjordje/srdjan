import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/rbac";
import { getSupabaseAdmin } from "@/lib/server/supabase";

type RevenueRow = {
  price_snapshot: number;
  status: string;
};

export async function GET(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const db = getSupabaseAdmin();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [
    { count: totalAppointments, error: totalError },
    { count: upcomingAppointments, error: upcomingError },
    { count: cancelledAppointments, error: cancelledError },
    { data: monthAppointments, error: monthError },
    { count: totalClients, error: clientsError },
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
    db
      .from("appointments")
      .select("price_snapshot, status")
      .gte("date", monthStart)
      .lte("date", monthEnd),
    db.from("clients").select("id", { count: "exact", head: true }),
  ]);

  const firstError =
    totalError || upcomingError || cancelledError || monthError || clientsError;
  if (firstError) {
    return jsonError(firstError.message, 500);
  }

  const revenueStatuses = new Set(["confirmed", "completed", "no_show"]);
  const revenueRows = (monthAppointments || []) as RevenueRow[];
  const monthlyRevenue = revenueRows.reduce((sum, item) => {
    if (!revenueStatuses.has(item.status)) {
      return sum;
    }
    return sum + (item.price_snapshot || 0);
  }, 0);

  return jsonOk({
    kpi: {
      totalAppointments: totalAppointments || 0,
      upcomingAppointments: upcomingAppointments || 0,
      cancelledAppointments: cancelledAppointments || 0,
      monthlyRevenue,
      totalClients: totalClients || 0,
    },
  });
}
