alter table workers
add column if not exists notification_email text null;

update workers
set notification_email = null
where notification_email = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_workers_notification_email_format'
  ) then
    alter table workers
    add constraint chk_workers_notification_email_format
    check (
      notification_email is null
      or notification_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    );
  end if;
end $$;

create index if not exists idx_workers_notification_email
on workers(notification_email)
where notification_email is not null;
