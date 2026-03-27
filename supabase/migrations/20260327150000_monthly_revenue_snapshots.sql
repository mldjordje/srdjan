create table if not exists monthly_revenue_snapshots (
  month_start date primary key,
  month_end date not null,
  month_label text not null,
  summary jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_monthly_revenue_snapshots_updated_at on monthly_revenue_snapshots;
create trigger trg_monthly_revenue_snapshots_updated_at
before update on monthly_revenue_snapshots
for each row execute procedure set_updated_at_column();
