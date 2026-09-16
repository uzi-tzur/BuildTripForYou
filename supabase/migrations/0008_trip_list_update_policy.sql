-- The actual root cause of the "row violates row-level security policy"
-- errors on mytrip_trip_list, confirmed by testing the exact requests the
-- app makes: it always calls .upsert(), which PostgREST compiles to
-- INSERT ... ON CONFLICT (id) DO UPDATE. That requires an UPDATE policy to
-- exist — checked at plan time, even for a brand-new id where no conflict
-- ever actually happens — and 0006 only added insert/delete policies for
-- this table, missing update entirely (mytrip_sync had this right from
-- 0005: it has both). A plain single-row insert without ON CONFLICT always
-- worked fine, which is what made this easy to misdiagnose the first time.

drop policy if exists "mytrip_trip_list update" on public.mytrip_trip_list;
create policy "mytrip_trip_list update" on public.mytrip_trip_list
  for update to anon, authenticated using (true) with check (true);
