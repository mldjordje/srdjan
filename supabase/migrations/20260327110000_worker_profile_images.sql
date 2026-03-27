alter table workers
add column if not exists profile_image_url text null;

update workers
set profile_image_url = null
where profile_image_url = '';

create index if not exists idx_workers_profile_image_url
on workers(profile_image_url)
where profile_image_url is not null;
