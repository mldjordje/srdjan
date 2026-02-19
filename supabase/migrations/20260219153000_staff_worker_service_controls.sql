alter table if exists locations
add column if not exists max_active_workers int not null default 4;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_locations_max_active_workers'
  ) then
    alter table locations
    add constraint chk_locations_max_active_workers
    check (max_active_workers > 0);
  end if;
end $$;

alter table if exists worker_services
add column if not exists color text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_worker_services_color_hex'
  ) then
    alter table worker_services
    add constraint chk_worker_services_color_hex
    check (color is null or color ~ '^#[0-9A-Fa-f]{6}$');
  end if;
end $$;

alter table if exists admin_users
add column if not exists worker_id uuid null references workers(id) on delete set null;

create unique index if not exists idx_admin_users_worker_unique
on admin_users(worker_id)
where worker_id is not null;

update admin_users
set worker_id = null
where role = 'owner';

update admin_users au
set worker_id = w.id
from workers w
where au.role = 'staff-admin'
  and au.worker_id is null
  and lower(trim(au.username)) = lower(trim(w.name));

delete from admin_users
where role = 'staff-admin'
  and worker_id is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_admin_users_role_worker'
  ) then
    alter table admin_users
    add constraint chk_admin_users_role_worker
    check (
      (role = 'owner' and worker_id is null)
      or (role = 'staff-admin' and worker_id is not null)
    );
  end if;
end $$;

create or replace function enforce_location_worker_limit()
returns trigger
language plpgsql
as $$
declare
  max_allowed int;
  active_count int;
begin
  if new.is_active is true then
    select l.max_active_workers into max_allowed
    from locations l
    where l.id = new.location_id;

    if max_allowed is not null then
      select count(*) into active_count
      from workers w
      where w.location_id = new.location_id
        and w.is_active = true
        and w.id <> new.id;

      if active_count >= max_allowed then
        raise exception 'Active worker limit reached for location % (max %).', new.location_id, max_allowed
          using errcode = 'check_violation';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_workers_limit on workers;
create trigger trg_workers_limit
before insert or update of is_active, location_id
on workers
for each row execute procedure enforce_location_worker_limit();
