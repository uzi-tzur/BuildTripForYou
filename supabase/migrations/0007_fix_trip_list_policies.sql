-- Testing after 0006 found that inserts into mytrip_trip_list were being
-- rejected with "new row violates row-level security policy" — meaning no
-- insert/delete policy was actually active for anon/authenticated on that
-- table (most likely 0006 didn't finish running to the end in one pass).
-- This re-asserts both policies idempotently so it's safe to run even if
-- they already exist.

drop policy if exists "mytrip_trip_list insert" on public.mytrip_trip_list;
create policy "mytrip_trip_list insert" on public.mytrip_trip_list
  for insert to anon, authenticated with check (true);

drop policy if exists "mytrip_trip_list delete" on public.mytrip_trip_list;
create policy "mytrip_trip_list delete" on public.mytrip_trip_list
  for delete to anon, authenticated using (true);
