-- FitClub · 0001 · accounts, profiles, per-user sync and avatars
--
-- FitClub shares its Supabase project with other apps, so everything it owns
-- lives apart and is named after it:
--   - tables and functions in the `fitclub` schema (never `public`);
--   - photos in the `fitclub-avatars` bucket, under policies named "fitclub: …";
--   - no triggers on auth.users and no change to shared auth settings. A
--     FitClub account marks itself with user metadata app = "fitclub", and
--     the app creates its own profile row on first sign-in.
--
-- Run once in the SQL editor (or through the Management API). Safe to run
-- again. The `fitclub` schema must also be listed under Settings → API →
-- Exposed schemas; docs/SUPABASE.md has the steps.

create schema if not exists fitclub;
grant usage on schema fitclub to anon, authenticated, service_role;

-- ─────────────────────────────── profiles ───────────────────────────────
-- One row per FitClub account. The username rules match validateUsername in
-- src/lib/chat/chatModel.js: 5–32 characters, a–z 0–9 _, starting with a
-- letter. Only lowercase is allowed, so the unique index is case-insensitive
-- without an extension.

create table if not exists fitclub.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text unique check (username ~ '^[a-z][a-z0-9_]{4,31}$'),
  name        text not null default '' check (char_length(name) <= 64),
  bio         text not null default '' check (char_length(bio) <= 280),
  avatar_url  text,
  lang        text not null default 'fa' check (lang in ('fa', 'en')),
  onboarded   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table fitclub.profiles enable row level security;

drop policy if exists "fitclub: profiles are readable when signed in" on fitclub.profiles;
create policy "fitclub: profiles are readable when signed in" on fitclub.profiles
  for select to authenticated using (true);

drop policy if exists "fitclub: a person creates their own profile" on fitclub.profiles;
create policy "fitclub: a person creates their own profile" on fitclub.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "fitclub: a person edits their own profile" on fitclub.profiles;
create policy "fitclub: a person edits their own profile" on fitclub.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Reserved names can never be claimed; updated_at follows every change.
create or replace function fitclub.guard_profile() returns trigger
language plpgsql set search_path = fitclub, pg_temp as $$
begin
  if new.username is not null and new.username = any (array['admin', 'fitclub', 'support', 'help', 'settings', 'me', 'saved']) then
    raise exception 'username % is reserved', new.username using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists fitclub_profiles_guard on fitclub.profiles;
create trigger fitclub_profiles_guard before insert or update on fitclub.profiles
  for each row execute function fitclub.guard_profile();

-- Is a username free? Callable before sign-up finishes, without exposing the
-- profiles table to anonymous visitors.
create or replace function fitclub.username_available(candidate text) returns boolean
language sql stable security definer set search_path = fitclub, pg_temp as $$
  select candidate ~ '^[a-z][a-z0-9_]{4,31}$'
     and candidate <> all (array['admin', 'fitclub', 'support', 'help', 'settings', 'me', 'saved'])
     and not exists (
       select 1 from fitclub.profiles
       where username = candidate and id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
     );
$$;

revoke all on function fitclub.username_available(text) from public;
grant execute on function fitclub.username_available(text) to anon, authenticated;

-- ─────────────────────────────── user_state ───────────────────────────────
-- The personal stores the app keeps in localStorage (training, diary,
-- nutrition profile, checklists, coach, inbox), one JSON document per key,
-- so one account shows the same data on every device. src/lib/backend/sync.js
-- reads and writes it: last write wins per key, by updated_at.

create table if not exists fitclub.user_state (
  user_id     uuid not null references auth.users (id) on delete cascade,
  key         text not null check (key ~ '^[a-z][a-z0-9_.-]{1,63}$'),
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  device      text not null default '' check (char_length(device) <= 64),
  primary key (user_id, key)
);

alter table fitclub.user_state enable row level security;

drop policy if exists "fitclub: a person reads their own state" on fitclub.user_state;
create policy "fitclub: a person reads their own state" on fitclub.user_state
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "fitclub: a person writes their own state" on fitclub.user_state;
create policy "fitclub: a person writes their own state" on fitclub.user_state
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "fitclub: a person updates their own state" on fitclub.user_state;
create policy "fitclub: a person updates their own state" on fitclub.user_state
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "fitclub: a person clears their own state" on fitclub.user_state;
create policy "fitclub: a person clears their own state" on fitclub.user_state
  for delete to authenticated using (user_id = auth.uid());

-- A document is capped at 2 MB so one runaway store can't fill the database.
alter table fitclub.user_state drop constraint if exists user_state_size;
alter table fitclub.user_state add constraint user_state_size check (pg_column_size(data) <= 2097152);

-- The API roles reach these tables only through the policies above.
grant select, insert, update, delete on fitclub.profiles, fitclub.user_state to authenticated;
grant select, insert, update, delete on fitclub.profiles, fitclub.user_state to service_role;

-- ─────────────────────────────── avatars ───────────────────────────────
-- Public bucket: anyone may view a photo, only its owner may add or replace
-- it. Files live at fitclub-avatars/<user id>/<file>. Every policy names the
-- bucket, so other apps' buckets are untouched.

insert into storage.buckets (id, name, public)
values ('fitclub-avatars', 'fitclub-avatars', true)
on conflict (id) do nothing;

drop policy if exists "fitclub: avatars are public" on storage.objects;
create policy "fitclub: avatars are public" on storage.objects
  for select using (bucket_id = 'fitclub-avatars');

drop policy if exists "fitclub: a person uploads their own avatar" on storage.objects;
create policy "fitclub: a person uploads their own avatar" on storage.objects
  for insert to authenticated with check (bucket_id = 'fitclub-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "fitclub: a person replaces their own avatar" on storage.objects;
create policy "fitclub: a person replaces their own avatar" on storage.objects
  for update to authenticated using (bucket_id = 'fitclub-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "fitclub: a person removes their own avatar" on storage.objects;
create policy "fitclub: a person removes their own avatar" on storage.objects
  for delete to authenticated using (bucket_id = 'fitclub-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Realtime: another device's writes arrive live. Adding a table to the
-- publication leaves the tables already in it as they are.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'fitclub' and tablename = 'user_state') then
    execute 'alter publication supabase_realtime add table fitclub.user_state';
  end if;
end $$;
