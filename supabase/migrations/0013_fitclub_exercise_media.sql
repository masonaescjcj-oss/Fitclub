-- FitClub · 0013 · the exercise library's animations
--
-- The exercise library (scripts/build-exercises.mjs) loads its animations
-- from a public bucket of its own, fitclub-exercises, named by slug (0014
-- makes them animations only). Anyone may view them.
-- Only an account listed in fitclub_media_uploaders may add, replace or
-- remove files; the list is empty except while an import runs (an import
-- account is added, uploads, and is taken off again). Nothing else in the
-- project is touched.
--
-- Run after 0012. Safe to run again.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fitclub-exercises', 'fitclub-exercises', true, 1048576, array['video/mp4', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.fitclub_media_uploaders (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.fitclub_media_uploaders enable row level security;
revoke all on public.fitclub_media_uploaders from anon, authenticated;
grant select, insert, update, delete on public.fitclub_media_uploaders to service_role;

create or replace function public.fitclub_is_media_uploader() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.fitclub_media_uploaders where user_id = auth.uid())
$$;
revoke all on function public.fitclub_is_media_uploader() from public, anon;
grant execute on function public.fitclub_is_media_uploader() to authenticated;

drop policy if exists "fitclub: exercise media is public" on storage.objects;
create policy "fitclub: exercise media is public" on storage.objects
  for select using (bucket_id = 'fitclub-exercises');

drop policy if exists "fitclub: the importer adds exercise media" on storage.objects;
create policy "fitclub: the importer adds exercise media" on storage.objects
  for insert to authenticated with check (bucket_id = 'fitclub-exercises' and public.fitclub_is_media_uploader());

drop policy if exists "fitclub: the importer replaces exercise media" on storage.objects;
create policy "fitclub: the importer replaces exercise media" on storage.objects
  for update to authenticated using (bucket_id = 'fitclub-exercises' and public.fitclub_is_media_uploader());

drop policy if exists "fitclub: the importer removes exercise media" on storage.objects;
create policy "fitclub: the importer removes exercise media" on storage.objects
  for delete to authenticated using (bucket_id = 'fitclub-exercises' and public.fitclub_is_media_uploader());
