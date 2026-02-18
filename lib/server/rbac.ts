import { jsonError } from "@/lib/server/http";
import { getAdminFromRequest } from "@/lib/server/auth";
import type { AdminRole } from "@/lib/server/types";

export const requireAdmin = async (request: Request, roles?: AdminRole[]) => {
  const admin = await getAdminFromRequest(request);
  if (!admin) {
    return { error: jsonError("Unauthorized", 401) as Response, admin: null };
  }
  if (roles && !roles.includes(admin.role)) {
    return { error: jsonError("Forbidden", 403) as Response, admin: null };
  }
  return { admin, error: null as Response | null };
};

