-- FitClub · 0001 · accounts, profiles, per-user sync and avatars
--
-- Run once in Supabase → SQL Editor (or `supabase db push`). Every table has
-- row-level security on: the anon key in the browser can reach only what the
-- policies below allow.

create extension if not exists citext;

-- ─────────────────────────────── profiles ───────────────────────────────
-- One row per account. The username rules match validateUsername in
-- src/lib/chat/chatModel.js: 5–32 characters, a–z 0–9 _, starting with a
-- letter.

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    citext unique check (username ~ '^[a-z][a-z0-9_]{4,31}$'),
  name        text not null default '' check (char_length(name) <= 64),
  bio         text not null default '' check (char_length(bio) <= 280),
  avatar_url  text,
  lang        text not null default 'fa' check (lang in ('fa', 'en')),
  onboarded   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Signed-in people can look each other up (search, mentions, chats).
drop policy if exists "profiles are readable when signed in" on public.profiles;
create policy "profiles are readable when signed in" on public.profiles
  for select to authenticated using (true);

drop policy if exists "a person creates their own profile" on public.profiles;
create policy "a person creates their own profile" on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "a person edits their own profile" on public.profiles;
create policy "a person edits their own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Reserved names can never be claimed.
create or replace function public.reject_reserved_username() returns trigger
language plpgsql as $$
begin
  if new.username is not null and lower(new.username::text) = any (array['admin', 'fitclub', 'support', 'help', 'settings', 'me', 'saved']) then
    raise exception 'username % is reserved', new.username using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before insert or update on public.profiles
  for each row execute function public.reject_reserved_username();

-- A new account gets an empty profile straight away, so the app can always
-- update it instead of guessing whether to insert.
create or replace function public.create_profile_for_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

-- Is a username free? Callable before sign-up finishes, without exposing the
-- profiles table to anonymous visitors.
create or replace function public.username_available(candidate text) returns boolean
language sql stable security definer set search_path = public as $$
  select candidate ~ '^[a-z][a-z0-9_]{4,31}$'
     and lower(candidate) <> all (array['admin', 'fitclub', 'support', 'help', 'settings', 'me', 'saved'])
     and not exists (select 1 from public.profiles where username = candidate::citext and id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid));
$$;

grant execute on function public.username_available(text) to anon, authenticated;

-- ─────────────────────────────── user_state ───────────────────────────────
-- The personal stores the app keeps in localStorage (training, diary,
-- nutrition profile, checklists, coach, inbox), one JSON document per key,
-- so one account shows the same data on every device. src/lib/backend/sync.js
-- reads and writes it: last write wins per key, by updated_at.

create table if not exists public.user_state (
  user_id     uuid not null references auth.users (id) on delete cascade,
  key         text not null check (key ~ '^[a-z][a-z0-9_.-]{1,63}$'),
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  device      text not null default '' check (char_length(device) <= 64),
  primary key (user_id, key)
);

alter table public.user_state enable row level security;

drop policy if exists "a person reads their own state" on public.user_state;
create policy "a person reads their own state" on public.user_state
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "a person writes their own state" on public.user_state;
create policy "a person writes their own state" on public.user_state
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "a person updates their own state" on public.user_state;
create policy "a person updates their own state" on public.user_state
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "a person clears their own state" on public.user_state;
create policy "a person clears their own state" on public.user_state
  for delete to authenticated using (user_id = auth.uid());

-- A document is capped at 2 MB so one runaway store can't fill the database.
alter table public.user_state drop constraint if exists user_state_size;
alter table public.user_state add constraint user_state_size check (pg_column_size(data) <= 2097152);

-- ─────────────────────────────── avatars ───────────────────────────────
-- Public bucket: anyone may view a photo, only its owner may add or replace
-- it. Files live at avatars/<user id>/<file>.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars are public" on storage.objects;
create policy "avatars are public" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "a person uploads their own avatar" on storage.objects;
create policy "a person uploads their own avatar" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "a person replaces their own avatar" on storage.objects;
create policy "a person replaces their own avatar" on storage.objects
  for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "a person removes their own avatar" on storage.objects;
create policy "a person removes their own avatar" on storage.objects
  for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Realtime: another device's writes arrive live.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'user_state') then
    execute 'alter publication supabase_realtime add table public.user_state';
  end if;
end $$;
