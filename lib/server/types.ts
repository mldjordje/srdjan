export type AdminRole = "owner" | "staff-admin";
export type ShiftType = "morning" | "afternoon" | "off";

export type ClientSessionRecord = {
  id: string;
  client_id: string;
  session_token_hash: string;
  expires_at: string;
};

export type ClientRecord = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminUserRecord = {
  id: string;
  username: string;
  password_hash: string;
  role: AdminRole;
  is_active: boolean;
  worker_id?: string | null;
};
