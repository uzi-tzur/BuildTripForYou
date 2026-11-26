-- Storage for documents attached to an activity (insurance policy PDF,
-- tickets, booking confirmations) — src/app/api/mytrip-documents/route.ts.
--
-- PRIVATE bucket, unlike trip-photos: these can hold personal details, so
-- a file has no public URL. It's opened only through the documents route
-- (behind the /my-trip access code), which hands out a link that expires
-- after a few minutes. There are deliberately no policies on
-- storage.objects for it — anon can't list, read, upload or delete; only
-- the service-role key, server-side, can.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trip-documents', 'trip-documents', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
