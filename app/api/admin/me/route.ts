import { getAdminFromRequest } from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/http";

export async function GET(request: Request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return jsonError("Unauthorized", 401);
  }
  return jsonOk({
    role: admin.role,
    username: admin.username,
    id: admin.id,
    workerId: admin.worker_id,
  });
}
