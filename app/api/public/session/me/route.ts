import { getClientFromRequest } from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/http";

export async function GET(request: Request) {
  const client = await getClientFromRequest(request);
  if (!client) {
    return jsonError("Unauthorized", 401);
  }
  return jsonOk({
    client: {
      id: client.id,
      fullName: client.full_name,
      phone: client.phone,
      email: client.email,
    },
  });
}

