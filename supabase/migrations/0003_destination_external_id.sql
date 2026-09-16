-- Destinations from a PlacesProvider (Google Place ID, or a mock id) need
-- a stable, idempotent upsert key distinct from our internal uuid PK.
-- A plain unique index (not partial) so Postgres can use it as an
-- ON CONFLICT (external_id) target for upserts; standard SQL treats every
-- NULL as distinct, so multiple destinations without an external_id are
-- still allowed.
alter table destinations add column if not exists external_id text;
create unique index if not exists destinations_external_id_key on destinations (external_id);
