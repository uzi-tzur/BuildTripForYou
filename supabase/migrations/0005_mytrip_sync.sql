-- Cloud sync for the no-login trip companion (/my-trip). Custom activities
-- and date/time edits were previously localStorage-only, so they never
-- showed up on a second device and could disappear if the browser cleared
-- storage. This table is keyed by trip_id (not user_id) on purpose: /my-trip
-- has no login, a trip is just a shared link (see src/lib/trips.ts), so
-- anyone with that link can read and write its saved state — same trust
-- model the page already has, just no longer stuck on one device.

create table if not exists public.mytrip_sync (
  trip_id text primary key,
  custom_stops jsonb not null default '[]'::jsonb,
  stop_overrides jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.mytrip_sync enable row level security;

create policy "mytrip_sync select" on public.mytrip_sync
  for select to anon, authenticated using (true);

create policy "mytrip_sync insert" on public.mytrip_sync
  for insert to anon, authenticated with check (true);

create policy "mytrip_sync update" on public.mytrip_sync
  for update to anon, authenticated using (true) with check (true);
