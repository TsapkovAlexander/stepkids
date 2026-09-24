-- Migration: 00005_storage
-- Date: 2026-09-24
-- Affects: storage, rls
-- -------------------------------------------------------
-- Two buckets: `content` — platform art and voice files, readable by everyone;
-- `family` — private recordings, drawings and thumbnails under `<family_id>/...`,
-- served only through short-lived signed URLs.

insert into storage.buckets (id, name, public)
values ('content', 'content', true), ('family', 'family', false)
on conflict (id) do nothing;

create policy "content bucket is public" on storage.objects
  for select using (bucket_id = 'content');

create policy "editors upload content" on storage.objects
  for insert to authenticated with check (bucket_id = 'content' and public._is_editor());

create policy "editors change content" on storage.objects
  for update to authenticated using (bucket_id = 'content' and public._is_editor())
  with check (bucket_id = 'content' and public._is_editor());

create policy "editors delete content" on storage.objects
  for delete to authenticated using (bucket_id = 'content' and public._is_editor());

create policy "family reads own files" on storage.objects
  for select to authenticated using (
    bucket_id = 'family' and public._is_family_member(public._family_folder(name))
  );

create policy "family uploads own files" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'family' and public._is_family_member(public._family_folder(name))
  );

create policy "family changes own files" on storage.objects
  for update to authenticated using (
    bucket_id = 'family' and public._is_family_member(public._family_folder(name))
  ) with check (
    bucket_id = 'family' and public._is_family_member(public._family_folder(name))
  );

create policy "family deletes own files" on storage.objects
  for delete to authenticated using (
    bucket_id = 'family' and public._is_family_member(public._family_folder(name))
  );
