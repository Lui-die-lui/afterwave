-- AFTERWAVE (T04) — real daily earthquake records.
-- This project has no migration runner wired up yet, so this file is not
-- executed automatically. Run it once, manually, in the Supabase SQL Editor
-- for this project (see the completion report for exact steps). It never
-- touches any existing table (e.g. `lui-archive`), and it is written to be
-- safely re-runnable (`if not exists`, no destructive statements).

create table if not exists public.afterwave_daily_records (
  record_date date primary key,

  earthquake_id text not null,
  magnitude numeric not null,
  unit text not null default 'M',
  place text not null,

  depth_km numeric,
  latitude numeric not null,
  longitude numeric not null,

  observed_at timestamptz not null,
  source_updated_at timestamptz,
  source_generated_at timestamptz not null,
  requested_at timestamptz not null,

  source_url text not null,
  feed_url text not null,
  raw_payload jsonb not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint afterwave_unit_check check (unit = 'M')
);

alter table public.afterwave_daily_records
enable row level security;

revoke all on public.afterwave_daily_records
from anon, authenticated;

grant all on public.afterwave_daily_records
to service_role;
