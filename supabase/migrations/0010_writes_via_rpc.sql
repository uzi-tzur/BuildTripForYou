-- The actual, final root cause (confirmed with Prefer: count=exact, which
-- showed Content-Range: */0 — the PATCH genuinely matched zero rows, not
-- an error being swallowed): Postgres RLS requires a row to be visible
-- under a SELECT policy before an UPDATE's own USING clause is even
-- consulted for that row. mytrip_sync/mytrip_trip_list have no select
-- policy on purpose (0006 — closing the enumeration hole), which means
-- direct UPDATE can never affect anything on these tables, no matter what
-- the update policy says. There is no RLS policy shape that expresses
-- "writable, but only readable by exact id, never listable" — that's
-- exactly why reads already went through security-definer RPCs
-- (get_mytrip_sync / get_family_trips). This does the same for writes:
-- all inserts/updates/deletes now go through functions that run with the
-- function owner's privileges and bypass RLS internally, so the table
-- itself can go back to allowing nothing at all directly.

drop policy if exists "mytrip_sync insert" on public.mytrip_sync;
drop policy if exists "mytrip_sync update" on public.mytrip_sync;

drop policy if exists "mytrip_trip_list insert" on public.mytrip_trip_list;
drop policy if exists "mytrip_trip_list update" on public.mytrip_trip_list;
drop policy if exists "mytrip_trip_list delete" on public.mytrip_trip_list;

create or replace function public.save_mytrip_sync(
  p_trip_id text,
  p_custom_stops jsonb,
  p_stop_overrides jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.mytrip_sync (trip_id, custom_stops, stop_overrides, updated_at)
  values (p_trip_id, p_custom_stops, p_stop_overrides, now())
  on conflict (trip_id) do update
    set custom_stops = excluded.custom_stops,
        stop_overrides = excluded.stop_overrides,
        updated_at = excluded.updated_at;
$$;

grant execute on function public.save_mytrip_sync(text, jsonb, jsonb) to anon, authenticated;

create or replace function public.save_family_trip(
  p_id text,
  p_sync_code text,
  p_name text,
  p_subtitle text,
  p_start_date text,
  p_end_date text,
  p_hero_image text,
  p_hero_caption text,
  p_timezone_offset text,
  p_timezone_label text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.mytrip_trip_list
    (id, sync_code, name, subtitle, start_date, end_date, hero_image, hero_caption, timezone_offset, timezone_label)
  values
    (p_id, p_sync_code, p_name, p_subtitle, p_start_date, p_end_date, p_hero_image, p_hero_caption, p_timezone_offset, p_timezone_label)
  on conflict (id) do update
    set sync_code = excluded.sync_code,
        name = excluded.name,
        subtitle = excluded.subtitle,
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        hero_image = excluded.hero_image,
        hero_caption = excluded.hero_caption,
        timezone_offset = excluded.timezone_offset,
        timezone_label = excluded.timezone_label;
$$;

grant execute on function public.save_family_trip(text, text, text, text, text, text, text, text, text, text) to anon, authenticated;

create or replace function public.delete_family_trip(p_id text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.mytrip_trip_list where id = p_id;
$$;

grant execute on function public.delete_family_trip(text) to anon, authenticated;

-- Self-check: after running everything above, this should show ZERO rows
-- (no direct insert/update/delete/select policy left on either table —
-- all access from here on goes through the functions above and
-- get_mytrip_sync / get_family_trips).
select tablename, policyname, cmd
from pg_policies
where tablename in ('mytrip_sync', 'mytrip_trip_list');
