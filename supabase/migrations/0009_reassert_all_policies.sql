-- After 0008, testing the exact request the app sends (INSERT -> 23505
-- conflict -> PATCH) still resulted in the PATCH returning 204 while the
-- row's data was actually unchanged — the classic PostgREST signature of
-- an UPDATE that matched zero rows under RLS (return=minimal suppresses
-- any count, so a no-op update also reports success). That points at the
-- same failure mode already found once for mytrip_trip_list in 0007: a
-- policy that looks present in the migration files never actually took
-- effect on the live database, most likely because an earlier SQL Editor
-- run stopped partway through.
--
-- Rather than guess which specific policy is missing this time, this
-- re-asserts every insert/update/delete policy on both tables from
-- scratch. All idempotent (drop-if-exists + create), safe to run
-- regardless of whatever state the database is currently in.

drop policy if exists "mytrip_sync insert" on public.mytrip_sync;
create policy "mytrip_sync insert" on public.mytrip_sync
  for insert to anon, authenticated with check (true);

drop policy if exists "mytrip_sync update" on public.mytrip_sync;
create policy "mytrip_sync update" on public.mytrip_sync
  for update to anon, authenticated using (true) with check (true);

drop policy if exists "mytrip_trip_list insert" on public.mytrip_trip_list;
create policy "mytrip_trip_list insert" on public.mytrip_trip_list
  for insert to anon, authenticated with check (true);

drop policy if exists "mytrip_trip_list update" on public.mytrip_trip_list;
create policy "mytrip_trip_list update" on public.mytrip_trip_list
  for update to anon, authenticated using (true) with check (true);

drop policy if exists "mytrip_trip_list delete" on public.mytrip_trip_list;
create policy "mytrip_trip_list delete" on public.mytrip_trip_list
  for delete to anon, authenticated using (true);

-- Run this SELECT after the statements above (Supabase's SQL Editor shows
-- the last statement's result) to see exactly what's active — there
-- should be one row for each of: mytrip_sync/INSERT, mytrip_sync/UPDATE,
-- mytrip_trip_list/INSERT, mytrip_trip_list/UPDATE, mytrip_trip_list/DELETE.
select tablename, policyname, cmd, roles
from pg_policies
where tablename in ('mytrip_sync', 'mytrip_trip_list')
order by tablename, cmd;
