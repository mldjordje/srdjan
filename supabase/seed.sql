-- Seed data for Srdjan Salon Scheduler v1

insert into locations (id, name, is_active)
values ('11111111-1111-1111-1111-111111111111', 'Srdjan - Lokacija 1', true)
on conflict (id) do update set name = excluded.name, is_active = excluded.is_active;

insert into shift_settings (
  location_id,
  morning_start,
  morning_end,
  afternoon_start,
  afternoon_end
)
values (
  '11111111-1111-1111-1111-111111111111',
  '11:00',
  '15:00',
  '15:00',
  '19:00'
)
on conflict (location_id) do update
set
  morning_start = excluded.morning_start,
  morning_end = excluded.morning_end,
  afternoon_start = excluded.afternoon_start,
  afternoon_end = excluded.afternoon_end;

insert into workers (id, location_id, name, is_active)
values
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'Jasmina', true),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Denis', true),
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 'Marko', true),
  ('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111111', 'Ana', true)
on conflict (id) do update
set name = excluded.name, is_active = excluded.is_active;

insert into services (id, name, is_active)
values
  ('33333333-3333-3333-3333-333333333331', 'Sisanje', true),
  ('33333333-3333-3333-3333-333333333332', 'Pranje + Sisanje', true),
  ('33333333-3333-3333-3333-333333333333', 'Fade', true),
  ('33333333-3333-3333-3333-333333333334', 'Brada', true)
on conflict (id) do update
set name = excluded.name, is_active = excluded.is_active;

insert into worker_services (worker_id, service_id, duration_min, price, is_active)
values
  ('22222222-2222-2222-2222-222222222221', '33333333-3333-3333-3333-333333333331', 30, 900, true),
  ('22222222-2222-2222-2222-222222222221', '33333333-3333-3333-3333-333333333334', 20, 600, true),
  ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333331', 25, 850, true),
  ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 35, 1200, true),
  ('22222222-2222-2222-2222-222222222223', '33333333-3333-3333-3333-333333333332', 45, 1500, true),
  ('22222222-2222-2222-2222-222222222223', '33333333-3333-3333-3333-333333333334', 20, 650, true),
  ('22222222-2222-2222-2222-222222222224', '33333333-3333-3333-3333-333333333331', 30, 900, true),
  ('22222222-2222-2222-2222-222222222224', '33333333-3333-3333-3333-333333333333', 40, 1300, true)
on conflict (worker_id, service_id) do update
set
  duration_min = excluded.duration_min,
  price = excluded.price,
  is_active = excluded.is_active;

-- Seed shifts for next 21 days (Mon-Fri), alternating morning/afternoon.
with dates as (
  select (current_date + offs)::date as d
  from generate_series(0, 20) as offs
  where extract(isodow from current_date + offs) between 1 and 5
),
workers_seed as (
  select
    w.id as worker_id,
    w.location_id,
    row_number() over(order by w.id) as worker_index
  from workers w
  where w.location_id = '11111111-1111-1111-1111-111111111111'
),
planned as (
  select
    ws.location_id,
    ws.worker_id,
    d.d as date,
    case
      when ((extract(day from d.d)::int + ws.worker_index) % 2 = 0)
        then 'morning'::shift_type_enum
      else 'afternoon'::shift_type_enum
    end as shift_type
  from workers_seed ws
  cross join dates d
)
insert into worker_shifts (location_id, worker_id, date, shift_type)
select location_id, worker_id, date, shift_type from planned
on conflict (worker_id, date) do update set shift_type = excluded.shift_type;

insert into admin_users (id, username, password_hash, role, is_active)
values
  (
    '44444444-4444-4444-4444-444444444441',
    'owner',
    '$2b$10$SyXDK1i/bNx.CD/pN7rGE.DgHMAGr6r5eZEbT97S3v/ZQmbzN7eLe',
    'owner',
    true
  ),
  (
    '44444444-4444-4444-4444-444444444442',
    'staff',
    '$2b$10$RB0UyKcNrEJ8JBh8/gCdCObapruQWdrLbnbe8lLeIerqEoevH1.d.',
    'staff-admin',
    true
  )
on conflict (username) do update
set
  password_hash = excluded.password_hash,
  role = excluded.role,
  is_active = excluded.is_active;

