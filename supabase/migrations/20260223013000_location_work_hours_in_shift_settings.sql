alter table shift_settings
add column if not exists work_start time null;

alter table shift_settings
add column if not exists work_end time null;

update shift_settings
set
  work_start = coalesce(work_start, morning_start),
  work_end = coalesce(work_end, afternoon_end);

alter table shift_settings
alter column work_start set not null;

alter table shift_settings
alter column work_end set not null;
