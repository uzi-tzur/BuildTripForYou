-- Lets a trip carry the place its weather is shown for (e.g. Tokyo) — set
-- from "📍 Weather for …" on the trip page (src/lib/weatherPlace.ts).
-- Trips built from "+ Add activity" have no hand-entered weather stops, so
-- without this they never showed any weather.
--
-- Stored as { "name": text, "latitude": number, "longitude": number }.
-- Written through its own function, so save_family_trip (0011) is left
-- exactly as it was: an app version that sends this field keeps working
-- on a database where this migration hasn't been run yet (only the
-- weather location then stays on that one device).

alter table public.mytrip_trip_list add column if not exists weather_location jsonb;

create or replace function public.save_family_trip_weather(
  p_id text,
  p_sync_code text,
  p_weather_location jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.mytrip_trip_list
     set weather_location = p_weather_location
   where id = p_id and sync_code = p_sync_code;
$$;

grant execute on function public.save_family_trip_weather(text, text, jsonb) to anon, authenticated;

-- get_family_trips (0006) does `select *`, so it returns the new column
-- automatically — no change needed there.
