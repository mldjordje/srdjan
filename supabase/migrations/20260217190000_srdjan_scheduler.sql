create extension if not exists pgcrypto;

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workers (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_workers_location on workers(location_id);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists worker_services (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  duration_min int not null,
  price int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_worker_service unique(worker_id, service_id),
  constraint chk_duration_positive check (duration_min > 0),
  constraint chk_price_non_negative check (price >= 0)
);
create index if not exists idx_worker_services_worker on worker_services(worker_id);

create table if not exists shift_settings (
  location_id uuid primary key references locations(id) on delete cascade,
  morning_start time not null,
  morning_end time not null,
  afternoon_start time not null,
  afternoon_end time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'shift_type_enum') then
    create type shift_type_enum as enum ('morning', 'afternoon', 'off');
  end if;
end $$;

create table if not exists worker_shifts (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  worker_id uuid not null references workers(id) on delete cascade,
  date date not null,
  shift_type shift_type_enum not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_worker_shift_date unique(worker_id, date)
);
create index if not exists idx_worker_shifts_date on worker_shifts(location_id, date);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null unique,
  email text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists client_sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  session_token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_client_sessions_client on client_sessions(client_id);
create index if not exists idx_client_sessions_expires on client_sessions(expires_at);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'appointment_status_enum') then
    create type appointment_status_enum as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
  end if;
end $$;

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  worker_id uuid not null references workers(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  service_id uuid not null references services(id),
  service_name_snapshot text not null,
  duration_min_snapshot int not null,
  price_snapshot int not null default 0,
  date date not null,
  start_time time not null,
  end_time time not null,
  note text null,
  status appointment_status_enum not null default 'pending',
  cancelled_by text null,
  cancellation_reason text null,
  cancelled_at timestamptz null,
  source text not null default 'web',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_duration_snapshot check (duration_min_snapshot > 0),
  constraint chk_price_snapshot_non_negative check (price_snapshot >= 0),
  constraint chk_time_order check (end_time > start_time)
);
create index if not exists idx_appointments_worker_day on appointments(location_id, worker_id, date);
create index if not exists idx_appointments_client on appointments(client_id, date);
create index if not exists idx_appointments_status on appointments(status);

create table if not exists calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  worker_id uuid not null references workers(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  duration_min int not null,
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_block_duration check (duration_min > 0),
  constraint chk_block_time_order check (end_time > start_time)
);
create index if not exists idx_calendar_blocks_worker_day on calendar_blocks(location_id, worker_id, date);

create table if not exists client_notifications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  appointment_id uuid null references appointments(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_client_notifications_client_created on client_notifications(client_id, created_at desc);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_push_subscriptions_client on push_subscriptions(client_id);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'admin_role_enum') then
    create type admin_role_enum as enum ('owner', 'staff-admin');
  end if;
end $$;

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  role admin_role_enum not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_locations_updated_at on locations;
create trigger trg_locations_updated_at before update on locations
for each row execute procedure set_updated_at_column();

drop trigger if exists trg_workers_updated_at on workers;
create trigger trg_workers_updated_at before update on workers
for each row execute procedure set_updated_at_column();

drop trigger if exists trg_services_updated_at on services;
create trigger trg_services_updated_at before update on services
for each row execute procedure set_updated_at_column();

drop trigger if exists trg_worker_services_updated_at on worker_services;
create trigger trg_worker_services_updated_at before update on worker_services
for each row execute procedure set_updated_at_column();

drop trigger if exists trg_shift_settings_updated_at on shift_settings;
create trigger trg_shift_settings_updated_at before update on shift_settings
for each row execute procedure set_updated_at_column();

drop trigger if exists trg_worker_shifts_updated_at on worker_shifts;
create trigger trg_worker_shifts_updated_at before update on worker_shifts
for each row execute procedure set_updated_at_column();

drop trigger if exists trg_clients_updated_at on clients;
create trigger trg_clients_updated_at before update on clients
for each row execute procedure set_updated_at_column();

drop trigger if exists trg_appointments_updated_at on appointments;
create trigger trg_appointments_updated_at before update on appointments
for each row execute procedure set_updated_at_column();

drop trigger if exists trg_calendar_blocks_updated_at on calendar_blocks;
create trigger trg_calendar_blocks_updated_at before update on calendar_blocks
for each row execute procedure set_updated_at_column();

drop trigger if exists trg_push_subscriptions_updated_at on push_subscriptions;
create trigger trg_push_subscriptions_updated_at before update on push_subscriptions
for each row execute procedure set_updated_at_column();

drop trigger if exists trg_admin_users_updated_at on admin_users;
create trigger trg_admin_users_updated_at before update on admin_users
for each row execute procedure set_updated_at_column();

