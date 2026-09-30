-- Storage for photos users upload from their phone for a trip's cover or
-- an activity (src/app/api/photo-upload/route.ts).
--
-- Public bucket: a photo is shown straight from its public URL, which has
-- an unguessable random name. There are deliberately no policies on
-- storage.objects for it — anon can't list, upload or delete. Uploads go
-- only through the /api/photo-upload route (behind the /my-trip access
-- code), which uses the service-role key server-side.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trip-photos', 'trip-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
