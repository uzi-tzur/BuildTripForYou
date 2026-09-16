-- Two fixes:
--
-- 1) Security: 0005's "select ... using (true)" on mytrip_sync let anyone
--    with the public anon key list EVERY trip's row (phone numbers,
--    confirmation codes, addresses) via a plain unfiltered select, not just
--    the trip they already had the link to — a client-side .eq("trip_id",
--    ...) filter is not a security boundary. Direct table reads are now
--    blocked; the app reads through get_mytrip_sync(trip_id), which can
--    only ever return the one row asked for by its exact id, preserving
--    the "you need the link" trust model without allowing enumeration.
--
-- 2) Trip list sync: creating a trip on /my-trip only ever lived in that
--    device's localStorage, so the same trip made on a phone never showed
--    up anywhere else (each device even minted its own random id for "the
--    same" trip). mytrip_trip_list stores user-created trips, scoped by a
--    short "sync code" (src/lib/syncCode.ts) the user copies between their
--    own devices instead of logging in. Reads only go through
--    get_family_trips(sync_code) — never a plain table select — so one
--    family's trip names aren't visible to another; the code is the shared
--    secret, same trust model as a trip link.

drop policy if exists "mytrip_sync select" on public.mytrip_sync;

create or replace function public.get_mytrip_sync(p_trip_id text)
returns setof public.mytrip_sync
language sql
security definer
set search_path = public
as $$
  select * from public.mytrip_sync where trip_id = p_trip_id;
$$;

grant execute on function public.get_mytrip_sync(text) to anon, authenticated;

create table if not exists public.mytrip_trip_list (
  id text primary key,
  sync_code text not null,
  name text not null,
  subtitle text not null default '',
  start_date text not null,
  end_date text not null,
  hero_image text,
  hero_caption text,
  timezone_offset text not null default '-06:00',
  timezone_label text not null default 'local time',
  created_at timestamptz not null default now()
);

create index if not exists mytrip_trip_list_sync_code_idx on public.mytrip_trip_list (sync_code);

alter table public.mytrip_trip_list enable row level security;

create policy "mytrip_trip_list insert" on public.mytrip_trip_list
  for insert to anon, authenticated with check (true);

create policy "mytrip_trip_list delete" on public.mytrip_trip_list
  for delete to anon, authenticated using (true);

create or replace function public.get_family_trips(p_sync_code text)
returns setof public.mytrip_trip_list
language sql
security definer
set search_path = public
as $$
  select * from public.mytrip_trip_list where sync_code = p_sync_code;
$$;

grant execute on function public.get_family_trips(text) to anon, authenticated;
