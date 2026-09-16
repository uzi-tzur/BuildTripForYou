-- Destinations are shared reference data (from Google Places / mock
-- providers), not personal data — allow anonymous browsing (PRD's
-- "Explore Demo Trip" landing CTA) and let the destination cache be
-- written by any request that searches, not just logged-in ones.
drop policy if exists "destinations_read_all" on destinations;
drop policy if exists "destinations_insert_authenticated" on destinations;

create policy "destinations_read_all" on destinations for select using (true);
create policy "destinations_insert_all" on destinations for insert with check (true);
create policy "destinations_update_all" on destinations for update using (true) with check (true);
