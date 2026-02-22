create or replace function lock_worker_day_schedule(
  p_location_id uuid,
  p_worker_id uuid,
  p_date date
)
returns void
language plpgsql
as $$
begin
  perform pg_advisory_xact_lock(
    hashtext(coalesce(p_location_id::text, '')),
    hashtext(coalesce(p_worker_id::text, '') || '|' || coalesce(p_date::text, ''))
  );
end;
$$;

create or replace function prevent_appointment_overlap()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'cancelled' then
    return new;
  end if;

  perform lock_worker_day_schedule(new.location_id, new.worker_id, new.date);

  if exists (
    select 1
    from appointments a
    where a.location_id = new.location_id
      and a.worker_id = new.worker_id
      and a.date = new.date
      and a.status <> 'cancelled'
      and (tg_op = 'INSERT' or a.id <> new.id)
      and a.start_time < new.end_time
      and a.end_time > new.start_time
  ) then
    raise exception 'Selected slot is not available.'
      using errcode = '23P01';
  end if;

  if exists (
    select 1
    from calendar_blocks b
    where b.location_id = new.location_id
      and b.worker_id = new.worker_id
      and b.date = new.date
      and b.start_time < new.end_time
      and b.end_time > new.start_time
  ) then
    raise exception 'Selected slot is not available.'
      using errcode = '23P01';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_appointments_prevent_overlap on appointments;
create trigger trg_appointments_prevent_overlap
before insert or update of location_id, worker_id, date, start_time, end_time, status
on appointments
for each row execute procedure prevent_appointment_overlap();

create or replace function prevent_block_overlap()
returns trigger
language plpgsql
as $$
begin
  perform lock_worker_day_schedule(new.location_id, new.worker_id, new.date);

  if exists (
    select 1
    from calendar_blocks b
    where b.location_id = new.location_id
      and b.worker_id = new.worker_id
      and b.date = new.date
      and (tg_op = 'INSERT' or b.id <> new.id)
      and b.start_time < new.end_time
      and b.end_time > new.start_time
  ) then
    raise exception 'Block overlaps with existing appointment or block.'
      using errcode = '23P01';
  end if;

  if exists (
    select 1
    from appointments a
    where a.location_id = new.location_id
      and a.worker_id = new.worker_id
      and a.date = new.date
      and a.status <> 'cancelled'
      and a.start_time < new.end_time
      and a.end_time > new.start_time
  ) then
    raise exception 'Block overlaps with existing appointment or block.'
      using errcode = '23P01';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_calendar_blocks_prevent_overlap on calendar_blocks;
create trigger trg_calendar_blocks_prevent_overlap
before insert or update of location_id, worker_id, date, start_time, end_time
on calendar_blocks
for each row execute procedure prevent_block_overlap();
