-- Pictures for tracks (maps) and cars (photos).
-- Seeded images live in /public/catalog; user uploads go to the "catalog" bucket.
alter table public.tracks
  add column image_url text check (image_url ~ '^(/|https://)'),
  add column image_credit text check (char_length(image_credit) <= 200),
  add column image_source_url text check (image_source_url ~ '^https?://');
alter table public.cars
  add column image_url text check (image_url ~ '^(/|https://)'),
  add column image_credit text check (char_length(image_credit) <= 200),
  add column image_source_url text check (image_source_url ~ '^https?://');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog', 'catalog', true, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

create policy catalog_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'catalog' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy catalog_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'catalog' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy catalog_remove on storage.objects for delete to authenticated
  using (bucket_id = 'catalog' and (storage.foldername(name))[1] = (select auth.uid())::text);
