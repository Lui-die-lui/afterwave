-- AFTERWAVE (T04) — Failure Lab synthetic state (records + meta).
-- Completely separate table from `afterwave_daily_records` (real records) —
-- the synthetic store must never share storage or rows with real data. This
-- file is not executed automatically; run it once, manually, in the
-- Supabase SQL Editor. It never touches any existing table (e.g.
-- `lui-archive` or `afterwave_daily_records`), and is safely re-runnable
-- (`if not exists`, no destructive statements).
--
-- Why this table exists: the synthetic store originally used a local JSON
-- file (`src/lib/jsonFileStore.ts`). That works on a single long-running
-- process, but Vercel's serverless functions have a read-only deployment
-- filesystem at runtime — every Failure Lab button click would have thrown
-- there. This is a tiny key/value table (one row per blob: "records",
-- "meta") purely so the Failure Lab keeps working once deployed; it is not
-- part of the real-data invariants the daily_records table exists for.

create table if not exists public.afterwave_synthetic_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.afterwave_synthetic_state
enable row level security;

revoke all on public.afterwave_synthetic_state
from anon, authenticated;

grant all on public.afterwave_synthetic_state
to service_role;
