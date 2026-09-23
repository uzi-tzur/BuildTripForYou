-- Extends the family trip list (0006/0010) with the fields whole-trip
-- rename/reschedule/duplicate/delete needs (see src/lib/trips.ts):
--
--   - source_content: which itinerary a trip renders — 'colorado-seed' for
--     the built-in Colorado trip and any duplicate of it, null for a plain
--     trip. Without this column, renaming/rescheduling the Colorado trip,
--     or duplicating it, would sync to the cloud and round-trip back
--     missing this marker — rendering as an empty trip on another device.
--   - hidden: true once a trip has been deleted. The built-in trip's
--     content can't be erased from the app bundle, so deleting it stores
--     this flag instead of removing the row — this column lets that
--     deletion (and its "hidden" status) reach the user's other devices
--     too, instead of only ever deleting locally.

alter table public.mytrip_trip_list add column if not exists source_content text;
alter table public.mytrip_trip_list add column if not exists hidden boolean not null default false;

drop function if exists public.save_family_trip(text, text, text, text, text, text, text, text, text, text);

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
  p_timezone_label text,
  p_source_content text,
  p_hidden boolean
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.mytrip_trip_list
    (id, sync_code, name, subtitle, start_date, end_date, hero_image, hero_caption, timezone_offset, timezone_label, source_content, hidden)
  values
    (p_id, p_sync_code, p_name, p_subtitle, p_start_date, p_end_date, p_hero_image, p_hero_caption, p_timezone_offset, p_timezone_label, p_source_content, p_hidden)
  on conflict (id) do update
    set sync_code = excluded.sync_code,
        name = excluded.name,
        subtitle = excluded.subtitle,
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        hero_image = excluded.hero_image,
        hero_caption = excluded.hero_caption,
        timezone_offset = excluded.timezone_offset,
        timezone_label = excluded.timezone_label,
        source_content = excluded.source_content,
        hidden = excluded.hidden;
$$;

grant execute on function public.save_family_trip(text, text, text, text, text, text, text, text, text, text, text, boolean) to anon, authenticated;

-- get_family_trips (0006) already does `select *`, so it picks up the new
-- columns automatically — no change needed there.
