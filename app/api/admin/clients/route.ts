import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/rbac";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export async function GET(request: Request) {
  const { admin, error } = await requireAdmin(request, ["owner", "staff-admin"]);
  if (error || !admin) {
    return error || jsonError("Unauthorized", 401);
  }

  const db = getSupabaseAdmin();
  const { data: clients, error: clientsError } = await db
    .from("clients")
    .select("id, full_name, phone, email, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (clientsError) {
    return jsonError(clientsError.message, 500);
  }

  const clientIds = (clients || []).map((client) => client.id);
  let byClient: Record<string, number> = {};
  if (clientIds.length > 0) {
    const { data: appointments, error: appointmentError } = await db
      .from("appointments")
      .select("client_id")
      .in("client_id", clientIds);
    if (appointmentError) {
      return jsonError(appointmentError.message, 500);
    }
    byClient = (appointments || []).reduce((acc, item) => {
      const key = item.client_id as string;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  return jsonOk({
    clients: (clients || []).map((client) => ({
      ...client,
      appointmentsCount: byClient[client.id as string] || 0,
    })),
  });
}

