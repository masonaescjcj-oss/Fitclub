-- FitClub · 0002 · the messenger: chats, members, messages and live events
--
-- The same corner as 0001: every table and function carries the fitclub_
-- prefix and nothing else in the project is touched. The shapes mirror the
-- development server (server/index.js), so the client talks to either one
-- the same way.
--
--   - Tables are read under row-level security: a person reads the chats
--     they are in, those chats' members and messages, and their own inbox.
--     Public groups and channels are readable by anyone signed in, so they
--     can be found and joined.
--   - Every write goes through a function below. Each one checks who is
--     calling and what they may do (admins only, the owner only, members
--     only), writes the system message the others will see, and drops an
--     event into each affected person's inbox.
--   - New and changed messages reach members live through Realtime, which
--     applies the same row-level security. The inbox carries what is aimed
--     at one person: a chat to (re)load, a chat they were removed from, a
--     read receipt.
--
-- Run after 0001, once, in the SQL editor or through the Management API.
-- Safe to run again.

-- ─────────────────────────────── tables ───────────────────────────────

create table if not exists public.fitclub_chats (
  id            uuid primary key default gen_random_uuid(),
  type          text not null check (type in ('private', 'group', 'channel')),
  title         text not null default '' check (char_length(title) <= 64),
  description   text not null default '' check (char_length(description) <= 255),
  emoji         text not null default '' check (char_length(emoji) <= 16),
  color         text not null default '' check (char_length(color) <= 16),
  is_public     boolean not null default false,
  username      text unique check (username ~ '^[a-z][a-z0-9_]{4,31}$'),
  invite_token  text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  -- A private chat's two member ids, sorted, so each pair of people has one chat.
  pair_key      text unique,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.fitclub_chat_members (
  chat_id       uuid not null references public.fitclub_chats (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  role          text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at     timestamptz not null default now(),
  last_read_at  timestamptz,
  primary key (chat_id, user_id)
);
create index if not exists fitclub_chat_members_by_user on public.fitclub_chat_members (user_id);

create table if not exists public.fitclub_messages (
  id          uuid primary key default gen_random_uuid(),
  chat_id     uuid not null references public.fitclub_chats (id) on delete cascade,
  sender_id   uuid references auth.users (id) on delete set null,
  client_id   text check (char_length(client_id) <= 64),
  kind        text not null default 'text' check (kind in ('text', 'photo', 'voice', 'sticker', 'poll', 'file', 'system')),
  text        text not null default '' check (char_length(text) <= 4000),
  text_fa     text not null default '' check (char_length(text_fa) <= 4000),
  reply_to    text check (char_length(reply_to) <= 64),
  media       jsonb,
  poll        jsonb,
  voice       jsonb,
  reactions   jsonb not null default '{}'::jsonb,
  silent      boolean not null default false,
  deleted     boolean not null default false,
  edited_at   timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Photos travel inline for now; a megabyte keeps one message from filling the database.
  constraint fitclub_messages_size check (coalesce(pg_column_size(media), 0) + coalesce(pg_column_size(poll), 0) + coalesce(pg_column_size(voice), 0) <= 1048576)
);
create index if not exists fitclub_messages_by_chat on public.fitclub_messages (chat_id, created_at);
create index if not exists fitclub_messages_by_change on public.fitclub_messages (chat_id, updated_at);

-- Events aimed at one person. Rows older than two days are pruned.
create table if not exists public.fitclub_inbox (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('chat', 'removed', 'read')),
  chat_id     uuid,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists fitclub_inbox_by_user on public.fitclub_inbox (user_id, created_at);
create index if not exists fitclub_inbox_by_age on public.fitclub_inbox (created_at);

-- "Last seen" for the messenger.
alter table public.fitclub_profiles add column if not exists last_seen_at timestamptz;

-- ─────────────────────────────── helpers ───────────────────────────────
-- Internal: none of these are callable through the API.

-- Timestamps the way the client writes them (2026-09-25T18:40:00.123Z), so they compare as strings.
create or replace function public.fitclub_iso(ts timestamptz) returns text
language sql stable set search_path = public, pg_temp as $$
  select case when ts is null then null else to_char(ts at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end
$$;

create or replace function public.fitclub_person(p_id uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'id', p.id,
    'name', coalesce(nullif(p.name, ''), p.username, 'FitClub'),
    'nameFa', coalesce(nullif(p.name, ''), p.username, 'FitClub'),
    'username', coalesce(p.username, ''),
    'avatar', '', 'photo', p.avatar_url, 'color', '',
    'bio', p.bio, 'phone', '', 'online', false,
    'lastSeen', public.fitclub_iso(p.last_seen_at), 'verified', false, 'premium', false)
  from public.fitclub_profiles p where p.id = p_id
$$;

create or replace function public.fitclub_display_name(p_id uuid) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select coalesce(nullif(name, ''), '@' || username) from public.fitclub_profiles where id = p_id), 'Someone')
$$;

-- The chat as `p_me` sees it: their own read marker, the member and admin lists.
create or replace function public.fitclub_chat_view(p_chat uuid, p_me uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'id', c.id, 'type', c.type, 'title', c.title, 'titleFa', c.title, 'emoji', c.emoji, 'color', c.color,
    'description', c.description, 'isPublic', c.is_public, 'username', coalesce(c.username, ''),
    'inviteLink', case when c.type = 'private' then '' else 'fitclub.app/+' || c.invite_token end,
    'members', coalesce((select jsonb_agg(m.user_id order by m.joined_at, m.user_id) from public.fitclub_chat_members m where m.chat_id = c.id), '[]'::jsonb),
    'admins', coalesce((select jsonb_agg(m.user_id order by m.joined_at, m.user_id) from public.fitclub_chat_members m where m.chat_id = c.id and m.role <> 'member'), '[]'::jsonb),
    'createdBy', c.created_by, 'createdAt', public.fitclub_iso(c.created_at),
    'lastReadAt', public.fitclub_iso((select m.last_read_at from public.fitclub_chat_members m where m.chat_id = c.id and m.user_id = p_me)),
    'memberCount', (select count(*) from public.fitclub_chat_members m where m.chat_id = c.id),
    'subscribers', case when c.type = 'channel' then (select count(*) from public.fitclub_chat_members m where m.chat_id = c.id) else 0 end,
    'pinned', false, 'muted', false, 'archived', false, 'folders', '[]'::jsonb,
    'verified', false, 'premium', false, 'draft', '', 'pinnedMessageId', null)
  from public.fitclub_chats c where c.id = p_chat
$$;

create or replace function public.fitclub_message_view(m public.fitclub_messages, p_status text default 'sent') returns jsonb
language sql stable set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'id', m.id, 'clientId', m.client_id, 'chatId', m.chat_id, 'senderId', m.sender_id, 'kind', m.kind,
    'text', m.text, 'textFa', m.text_fa, 'replyTo', m.reply_to, 'media', m.media, 'poll', m.poll, 'voice', m.voice,
    'at', public.fitclub_iso(m.created_at), 'status', p_status, 'reactions', m.reactions, 'deleted', m.deleted,
    'editedAt', public.fitclub_iso(m.edited_at), 'silent', m.silent, 'views', 0)
$$;

create or replace function public.fitclub_emit(p_users uuid[], p_kind text, p_chat uuid, p_payload jsonb default '{}'::jsonb) returns void
language sql security definer set search_path = public, pg_temp as $$
  insert into public.fitclub_inbox (user_id, kind, chat_id, payload)
  select distinct u, p_kind, p_chat, coalesce(p_payload, '{}'::jsonb) from unnest(p_users) as u where u is not null
$$;

create or replace function public.fitclub_members_of(p_chat uuid, p_except uuid default null) returns uuid[]
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(array_agg(user_id), '{}') from public.fitclub_chat_members where chat_id = p_chat and user_id is distinct from p_except
$$;

create or replace function public.fitclub_system(p_chat uuid, p_sender uuid, p_text text, p_text_fa text) returns void
language sql security definer set search_path = public, pg_temp as $$
  insert into public.fitclub_messages (chat_id, sender_id, kind, text, text_fa) values (p_chat, p_sender, 'system', left(p_text, 4000), left(p_text_fa, 4000))
$$;

-- People named by id or by @username; only people with a FitClub profile.
create or replace function public.fitclub_resolve_people(p_refs text[]) returns uuid[]
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(array_agg(distinct p.id), '{}') from public.fitclub_profiles p
  where p.id::text = any(p_refs) or p.username = any(select lower(regexp_replace(btrim(r), '^@', '')) from unnest(p_refs) as r)
$$;

-- A link, @handle or #join= code, reduced to "+<token>" or a username.
create or replace function public.fitclub_code(p_code text) returns text
language sql immutable as $$
  select regexp_replace(regexp_replace(regexp_replace(regexp_replace(btrim(coalesce(p_code, '')),
    '^https?://[^/]+/', ''), '^[#?&]?join=', ''), '^fitclub\.app/', ''), '^@', '')
$$;

-- Why a username can't be used: short | long | chars | start | taken, or null when it's free.
create or replace function public.fitclub_username_problem(p_slug text, p_chat uuid default null) returns text
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare slug text := lower(btrim(coalesce(p_slug, '')));
begin
  if char_length(slug) < 5 then return 'short'; end if;
  if char_length(slug) > 32 then return 'long'; end if;
  if slug !~ '^[a-z0-9_]+$' then return 'chars'; end if;
  if slug !~ '^[a-z][a-z0-9_]{4,31}$' then return 'start'; end if;
  if slug = any (array['admin', 'fitclub', 'support', 'help', 'settings', 'me', 'saved']) then return 'taken'; end if;
  if exists (select 1 from public.fitclub_profiles where username = slug) then return 'taken'; end if;
  if exists (select 1 from public.fitclub_chats where username = slug and id is distinct from p_chat) then return 'taken'; end if;
  return null;
end $$;

-- Row-level security asks this: the caller's role in a chat, or null. Callable, and only ever about the caller.
create or replace function public.fitclub_role_in(p_chat uuid) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select role from public.fitclub_chat_members where chat_id = p_chat and user_id = auth.uid()
$$;

-- ─────────────────────────────── row-level security ───────────────────────────────

alter table public.fitclub_chats enable row level security;
alter table public.fitclub_chat_members enable row level security;
alter table public.fitclub_messages enable row level security;
alter table public.fitclub_inbox enable row level security;

drop policy if exists "fitclub: members and the public read chats" on public.fitclub_chats;
create policy "fitclub: members and the public read chats" on public.fitclub_chats
  for select to authenticated using (is_public or public.fitclub_role_in(id) is not null);

drop policy if exists "fitclub: members read who else is in their chats" on public.fitclub_chat_members;
create policy "fitclub: members read who else is in their chats" on public.fitclub_chat_members
  for select to authenticated using (public.fitclub_role_in(chat_id) is not null);

drop policy if exists "fitclub: members read their chats' messages" on public.fitclub_messages;
create policy "fitclub: members read their chats' messages" on public.fitclub_messages
  for select to authenticated using (public.fitclub_role_in(chat_id) is not null);

drop policy if exists "fitclub: a person reads their own inbox" on public.fitclub_inbox;
create policy "fitclub: a person reads their own inbox" on public.fitclub_inbox
  for select to authenticated using (user_id = auth.uid());

-- Reads only, under the policies above; every write goes through the functions below.
revoke all on public.fitclub_chats, public.fitclub_chat_members, public.fitclub_messages, public.fitclub_inbox from anon, authenticated;
grant select on public.fitclub_chats, public.fitclub_chat_members, public.fitclub_messages, public.fitclub_inbox to authenticated;
grant select, insert, update, delete on public.fitclub_chats, public.fitclub_chat_members, public.fitclub_messages, public.fitclub_inbox to service_role;

-- ─────────────────────────────── actions ───────────────────────────────
-- One function per server route. Errors are raised as the route's error code.

-- GET /api/sync: me, the people in my chats, my chats, recent (or changed) messages.
create or replace function public.fitclub_sync(p_since timestamptz default null) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  chat_ids uuid[];
  chats jsonb;
  msgs jsonb;
  people jsonb;
begin
  if me is null then raise exception 'unauthorized'; end if;
  select coalesce(array_agg(chat_id), '{}') into chat_ids from public.fitclub_chat_members where user_id = me;
  select coalesce(jsonb_agg(public.fitclub_chat_view(c, me)), '[]'::jsonb) into chats from unnest(chat_ids) as c;
  -- The last 200 per chat on a first sync; everything new or changed since, after that.
  with recent as (
    select id, row_number() over (partition by chat_id order by created_at desc) as n
    from public.fitclub_messages where chat_id = any (chat_ids) and (p_since is null or updated_at > p_since)
  )
  select coalesce(jsonb_agg(public.fitclub_message_view(m,
      case when m.sender_id = me and exists (
        select 1 from public.fitclub_chat_members o where o.chat_id = m.chat_id and o.user_id <> me and o.last_read_at >= m.created_at)
      then 'read' else 'sent' end) order by m.created_at), '[]'::jsonb)
  into msgs
  from public.fitclub_messages m where m.id in (select id from recent where n <= 200);
  select coalesce(jsonb_agg(p), '[]'::jsonb) into people from (
    select public.fitclub_person(u) as p from (
      select user_id as u from public.fitclub_chat_members where chat_id = any (chat_ids)
      union select sender_id from public.fitclub_messages where chat_id = any (chat_ids) and sender_id is not null
      union select me
    ) ids
  ) s where p is not null;
  return jsonb_build_object('me', public.fitclub_person(me), 'users', people, 'chats', chats, 'messages', msgs, 'now', public.fitclub_iso(now()));
end $$;

-- One chat and its members' profiles: what the client loads when its inbox says a chat changed.
create or replace function public.fitclub_chat_bundle(p_chat uuid) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'unauthorized'; end if;
  if public.fitclub_role_in(p_chat) is null then raise exception 'chat_not_found'; end if;
  return jsonb_build_object(
    'chat', public.fitclub_chat_view(p_chat, me),
    'users', (select coalesce(jsonb_agg(public.fitclub_person(user_id)), '[]'::jsonb) from public.fitclub_chat_members where chat_id = p_chat));
end $$;

-- GET /api/chats/:id/messages?before=
create or replace function public.fitclub_history(p_chat uuid, p_before timestamptz default null) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if public.fitclub_role_in(p_chat) is null then raise exception 'chat_not_found'; end if;
  return (select coalesce(jsonb_agg(public.fitclub_message_view(m) order by m.created_at), '[]'::jsonb)
    from public.fitclub_messages m where m.id in (
      select id from public.fitclub_messages where chat_id = p_chat and (p_before is null or created_at < p_before) order by created_at desc limit 100));
end $$;

-- GET /api/users?q=
create or replace function public.fitclub_search_people(p_query text) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare q text := lower(regexp_replace(btrim(coalesce(p_query, '')), '^@', ''));
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if q = '' then return '[]'::jsonb; end if;
  return (select coalesce(jsonb_agg(public.fitclub_person(id)), '[]'::jsonb) from (
    select id from public.fitclub_profiles
    where id <> auth.uid() and username is not null
      and (strpos(username, q) > 0 or strpos(lower(name), q) > 0)
    order by (username = q) desc, username limit 20) s);
end $$;

-- GET /api/chats/public?q=
create or replace function public.fitclub_search_public(p_query text) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare q text := lower(regexp_replace(btrim(coalesce(p_query, '')), '^@', ''));
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if q = '' then return '[]'::jsonb; end if;
  return (select coalesce(jsonb_agg(public.fitclub_chat_view(id, auth.uid()) || jsonb_build_object('members', '[]'::jsonb)), '[]'::jsonb) from (
    select c.id from public.fitclub_chats c
    where c.is_public and public.fitclub_role_in(c.id) is null
      and (strpos(coalesce(c.username, ''), q) > 0 or strpos(lower(c.title), q) > 0)
    order by c.created_at desc limit 20) s);
end $$;

-- GET /api/resolve?code= : a public chat, an invite link or a person, without joining.
create or replace function public.fitclub_resolve(p_code text) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  code text := public.fitclub_code(p_code);
  chat uuid;
  person uuid;
begin
  if me is null then raise exception 'unauthorized'; end if;
  if code like '+%' then
    select id into chat from public.fitclub_chats where invite_token = substr(code, 2) and type <> 'private';
  elsif code <> '' then
    select id into chat from public.fitclub_chats where is_public and username = lower(code);
  end if;
  if chat is not null then
    return jsonb_build_object(
      'chat', public.fitclub_chat_view(chat, me) || case when public.fitclub_role_in(chat) is null then jsonb_build_object('members', '[]'::jsonb) else '{}'::jsonb end,
      'joined', public.fitclub_role_in(chat) is not null);
  end if;
  if code not like '+%' and code <> '' then
    select id into person from public.fitclub_profiles where username = lower(code);
    if person is not null then return jsonb_build_object('user', public.fitclub_person(person)); end if;
  end if;
  return '{}'::jsonb;
end $$;

-- POST /api/join {code}
create or replace function public.fitclub_join(p_code text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  code text := public.fitclub_code(p_code);
  chat uuid;
  person uuid;
begin
  if me is null then raise exception 'unauthorized'; end if;
  if code like '+%' then
    select id into chat from public.fitclub_chats where invite_token = substr(code, 2) and type <> 'private';
  elsif code <> '' then
    select id into chat from public.fitclub_chats where is_public and username = lower(code);
  end if;
  if chat is null then
    if code not like '+%' and code <> '' then
      select id into person from public.fitclub_profiles where username = lower(code);
      if person is not null then return jsonb_build_object('user', public.fitclub_person(person)); end if;
    end if;
    raise exception 'link_not_found';
  end if;
  if public.fitclub_role_in(chat) is null then
    insert into public.fitclub_chat_members (chat_id, user_id, last_read_at) values (chat, me, now()) on conflict do nothing;
    perform public.fitclub_system(chat, me, public.fitclub_display_name(me) || ' joined', public.fitclub_display_name(me) || ' پیوست');
    perform public.fitclub_emit(public.fitclub_members_of(chat, me), 'chat', chat);
  end if;
  return jsonb_build_object('chat', public.fitclub_chat_view(chat, me));
end $$;

-- POST /api/chats: a group or a channel.
create or replace function public.fitclub_create_chat(p_type text, p_title text, p_description text default '', p_emoji text default '',
  p_color text default '', p_is_public boolean default false, p_username text default null, p_members text[] default '{}') returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  kind text := case when p_type = 'channel' then 'channel' else 'group' end;
  title text := left(btrim(coalesce(p_title, '')), 64);
  handle text := null;
  problem text;
  chat uuid;
begin
  if me is null then raise exception 'unauthorized'; end if;
  if title = '' then raise exception 'title_required'; end if;
  if coalesce(p_is_public, false) then
    problem := public.fitclub_username_problem(p_username);
    if problem is not null then raise exception 'username_%', problem; end if;
    handle := lower(btrim(p_username));
  end if;
  insert into public.fitclub_chats (type, title, description, emoji, color, is_public, username, created_by)
  values (kind, title, left(btrim(coalesce(p_description, '')), 255),
    left(coalesce(nullif(p_emoji, ''), case when kind = 'channel' then '📣' else '👥' end), 16),
    left(coalesce(nullif(p_color, ''), case when kind = 'channel' then '#f59e0b' else '#2fa6ff' end), 16),
    coalesce(p_is_public, false), handle, me)
  returning id into chat;
  insert into public.fitclub_chat_members (chat_id, user_id, role, last_read_at) values (chat, me, 'owner', now());
  insert into public.fitclub_chat_members (chat_id, user_id)
    select chat, u from unnest(public.fitclub_resolve_people(p_members)) as u where u <> me on conflict do nothing;
  perform public.fitclub_system(chat, me,
    case when kind = 'channel' then 'Channel created' else 'Group created' end,
    case when kind = 'channel' then 'کانال ساخته شد' else 'گروه ساخته شد' end);
  perform public.fitclub_emit(public.fitclub_members_of(chat, me), 'chat', chat);
  return public.fitclub_chat_view(chat, me);
end $$;

-- POST /api/private {userId | username}: the one-to-one chat, created once per pair.
create or replace function public.fitclub_private_chat(p_other text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  other uuid;
  pair text;
  chat uuid;
begin
  if me is null then raise exception 'unauthorized'; end if;
  select u into other from unnest(public.fitclub_resolve_people(array[p_other])) as u limit 1;
  if other is null then raise exception 'user_not_found'; end if;
  if other = me then raise exception 'self'; end if;
  pair := least(me::text, other::text) || ':' || greatest(me::text, other::text);
  select id into chat from public.fitclub_chats where pair_key = pair;
  if chat is null then
    insert into public.fitclub_chats (type, pair_key, created_by) values ('private', pair, me) on conflict (pair_key) do nothing returning id into chat;
    if chat is null then select id into chat from public.fitclub_chats where pair_key = pair; end if;
    insert into public.fitclub_chat_members (chat_id, user_id, last_read_at) values (chat, me, now()), (chat, other, null) on conflict do nothing;
    perform public.fitclub_emit(array[other], 'chat', chat);
  end if;
  return public.fitclub_chat_view(chat, me);
end $$;

-- PATCH /api/chats/:id : title, description, picture, public link, a fresh invite link. Admins only.
create or replace function public.fitclub_update_chat(p_chat uuid, p_patch jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  c public.fitclub_chats;
  problem text;
  new_title text;
begin
  if me is null then raise exception 'unauthorized'; end if;
  select * into c from public.fitclub_chats where id = p_chat;
  if c.id is null or public.fitclub_role_in(p_chat) is null then raise exception 'chat_not_found'; end if;
  if public.fitclub_role_in(p_chat) = 'member' or c.type = 'private' then raise exception 'admins_only'; end if;
  if p_patch ? 'isPublic' then
    if (p_patch->>'isPublic')::boolean then
      problem := public.fitclub_username_problem(p_patch->>'username', p_chat);
      if problem is not null then raise exception 'username_%', problem; end if;
      update public.fitclub_chats set is_public = true, username = lower(btrim(p_patch->>'username')) where id = p_chat;
    else
      update public.fitclub_chats set is_public = false, username = null where id = p_chat;
    end if;
  end if;
  new_title := left(btrim(coalesce(p_patch->>'title', '')), 64);
  if new_title <> '' and new_title <> c.title then
    update public.fitclub_chats set title = new_title where id = p_chat;
    perform public.fitclub_system(p_chat, me, 'Name changed to “' || new_title || '”', 'نام به «' || new_title || '» تغییر کرد');
  end if;
  update public.fitclub_chats set
    description = case when p_patch ? 'description' then left(coalesce(p_patch->>'description', ''), 255) else description end,
    emoji = case when p_patch ? 'emoji' then left(coalesce(p_patch->>'emoji', ''), 16) else emoji end,
    color = case when p_patch ? 'color' then left(coalesce(p_patch->>'color', ''), 16) else color end,
    invite_token = case when coalesce((p_patch->>'revokeLink')::boolean, false) then substr(replace(gen_random_uuid()::text, '-', ''), 1, 16) else invite_token end,
    updated_at = now()
  where id = p_chat;
  perform public.fitclub_emit(public.fitclub_members_of(p_chat, me), 'chat', p_chat);
  return public.fitclub_chat_view(p_chat, me);
end $$;

-- POST /api/chats/:id/members {userIds}. Admins only.
create or replace function public.fitclub_add_members(p_chat uuid, p_users text[]) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  added uuid[];
begin
  if me is null then raise exception 'unauthorized'; end if;
  if public.fitclub_role_in(p_chat) is null then raise exception 'chat_not_found'; end if;
  if public.fitclub_role_in(p_chat) = 'member' or (select type from public.fitclub_chats where id = p_chat) = 'private' then raise exception 'admins_only'; end if;
  with fresh as (
    insert into public.fitclub_chat_members (chat_id, user_id)
    select p_chat, u from unnest(public.fitclub_resolve_people(p_users)) as u
    on conflict do nothing returning user_id
  ) select coalesce(array_agg(user_id), '{}') into added from fresh;
  if cardinality(added) > 0 then
    perform public.fitclub_system(p_chat, me,
      public.fitclub_display_name(me) || ' added ' || (select string_agg(public.fitclub_display_name(u), ', ') from unnest(added) u),
      public.fitclub_display_name(me) || ' ' || (select string_agg(public.fitclub_display_name(u), '، ') from unnest(added) u) || ' را اضافه کرد');
    perform public.fitclub_emit(public.fitclub_members_of(p_chat, me), 'chat', p_chat);
  end if;
  return public.fitclub_chat_view(p_chat, me);
end $$;

-- DELETE /api/chats/:id/members/:uid. Admins only; the owner stays.
create or replace function public.fitclub_remove_member(p_chat uuid, p_user uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'unauthorized'; end if;
  if public.fitclub_role_in(p_chat) is null then raise exception 'chat_not_found'; end if;
  if public.fitclub_role_in(p_chat) = 'member' then raise exception 'admins_only'; end if;
  if (select role from public.fitclub_chat_members where chat_id = p_chat and user_id = p_user) = 'owner' then raise exception 'owner'; end if;
  delete from public.fitclub_chat_members where chat_id = p_chat and user_id = p_user;
  if found then
    perform public.fitclub_system(p_chat, me, public.fitclub_display_name(p_user) || ' was removed', public.fitclub_display_name(p_user) || ' حذف شد');
    perform public.fitclub_emit(public.fitclub_members_of(p_chat, me), 'chat', p_chat);
    perform public.fitclub_emit(array[p_user], 'removed', p_chat);
  end if;
  return public.fitclub_chat_view(p_chat, me);
end $$;

-- POST /api/chats/:id/admins/:uid : makes or unmakes an admin. Admins only.
create or replace function public.fitclub_toggle_admin(p_chat uuid, p_user uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  was text;
begin
  if me is null then raise exception 'unauthorized'; end if;
  if public.fitclub_role_in(p_chat) is null then raise exception 'chat_not_found'; end if;
  if public.fitclub_role_in(p_chat) = 'member' then raise exception 'admins_only'; end if;
  select role into was from public.fitclub_chat_members where chat_id = p_chat and user_id = p_user;
  if was is null or was = 'owner' then raise exception 'not_applicable'; end if;
  update public.fitclub_chat_members set role = case when was = 'admin' then 'member' else 'admin' end where chat_id = p_chat and user_id = p_user;
  perform public.fitclub_system(p_chat, me,
    public.fitclub_display_name(p_user) || case when was = 'admin' then ' is no longer an admin' else ' is now an admin' end,
    public.fitclub_display_name(p_user) || case when was = 'admin' then ' دیگر مدیر نیست' else ' مدیر شد' end);
  perform public.fitclub_emit(public.fitclub_members_of(p_chat, me), 'chat', p_chat);
  return public.fitclub_chat_view(p_chat, me);
end $$;

-- POST /api/chats/:id/leave : the last one out deletes the chat; a chat never loses its last admin.
create or replace function public.fitclub_leave_chat(p_chat uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'unauthorized'; end if;
  if public.fitclub_role_in(p_chat) is null then raise exception 'chat_not_found'; end if;
  delete from public.fitclub_chat_members where chat_id = p_chat and user_id = me;
  if not exists (select 1 from public.fitclub_chat_members where chat_id = p_chat) then
    delete from public.fitclub_chats where id = p_chat;
  else
    if not exists (select 1 from public.fitclub_chat_members where chat_id = p_chat and role <> 'member') then
      update public.fitclub_chat_members set role = 'admin'
      where chat_id = p_chat and user_id = (select user_id from public.fitclub_chat_members where chat_id = p_chat order by joined_at, user_id limit 1);
    end if;
    perform public.fitclub_system(p_chat, me, public.fitclub_display_name(me) || ' left', public.fitclub_display_name(me) || ' رفت');
    perform public.fitclub_emit(public.fitclub_members_of(p_chat), 'chat', p_chat);
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- DELETE /api/chats/:id : the owner, or either side of a private chat.
create or replace function public.fitclub_delete_chat(p_chat uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'unauthorized'; end if;
  if public.fitclub_role_in(p_chat) is null then raise exception 'chat_not_found'; end if;
  if public.fitclub_role_in(p_chat) <> 'owner' and (select type from public.fitclub_chats where id = p_chat) <> 'private' then raise exception 'owner_only'; end if;
  perform public.fitclub_emit(public.fitclub_members_of(p_chat, me), 'removed', p_chat);
  delete from public.fitclub_chats where id = p_chat;
  return jsonb_build_object('ok', true);
end $$;

-- POST /api/chats/:id/messages. In a channel only admins post.
create or replace function public.fitclub_send(p_chat uuid, p_body jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  my_role text := public.fitclub_role_in(p_chat);
  chat_type text;
  k text := coalesce(p_body->>'kind', 'text');
  t text := left(coalesce(p_body->>'text', ''), 4000);
  msg public.fitclub_messages;
begin
  if me is null then raise exception 'unauthorized'; end if;
  select type into chat_type from public.fitclub_chats where id = p_chat;
  if chat_type is null or my_role is null then raise exception 'chat_not_found'; end if;
  if chat_type = 'channel' and my_role = 'member' then raise exception 'admins_only'; end if;
  if k not in ('text', 'photo', 'voice', 'sticker', 'poll', 'file') then k := 'text'; end if;
  if k = 'text' and btrim(t) = '' then raise exception 'empty'; end if;
  insert into public.fitclub_messages (chat_id, sender_id, client_id, kind, text, reply_to, media, poll, voice, silent)
  values (p_chat, me, left(p_body->>'clientId', 64), k, t, left(p_body->>'replyTo', 64),
    nullif(p_body->'media', 'null'::jsonb), nullif(p_body->'poll', 'null'::jsonb), nullif(p_body->'voice', 'null'::jsonb),
    coalesce((p_body->>'silent')::boolean, false))
  returning * into msg;
  update public.fitclub_chat_members set last_read_at = msg.created_at where chat_id = p_chat and user_id = me;
  return public.fitclub_message_view(msg);
end $$;

-- PATCH /api/messages/:id : the sender edits.
create or replace function public.fitclub_edit_message(p_message uuid, p_text text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare msg public.fitclub_messages;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  select * into msg from public.fitclub_messages where id = p_message;
  if msg.id is null or public.fitclub_role_in(msg.chat_id) is null then raise exception 'message_not_found'; end if;
  if msg.sender_id is distinct from auth.uid() or msg.kind = 'system' then raise exception 'not_yours'; end if;
  update public.fitclub_messages set text = left(coalesce(p_text, ''), 4000), edited_at = now(), updated_at = now() where id = p_message returning * into msg;
  return public.fitclub_message_view(msg);
end $$;

-- DELETE /api/messages/:id : the sender, or an admin. Leaves a tombstone.
create or replace function public.fitclub_delete_message(p_message uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare msg public.fitclub_messages;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  select * into msg from public.fitclub_messages where id = p_message;
  if msg.id is null or public.fitclub_role_in(msg.chat_id) is null then raise exception 'message_not_found'; end if;
  if msg.sender_id is distinct from auth.uid() and public.fitclub_role_in(msg.chat_id) = 'member' then raise exception 'not_yours'; end if;
  update public.fitclub_messages set deleted = true, text = '', text_fa = '', media = null, poll = null, voice = null, reactions = '{}'::jsonb, updated_at = now()
  where id = p_message returning * into msg;
  return public.fitclub_message_view(msg);
end $$;

-- POST /api/messages/:id/react {emoji} : toggles mine.
create or replace function public.fitclub_react(p_message uuid, p_emoji text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me text := auth.uid()::text;
  e text := left(coalesce(p_emoji, ''), 8);
  msg public.fitclub_messages;
  who jsonb;
begin
  if me is null then raise exception 'unauthorized'; end if;
  select * into msg from public.fitclub_messages where id = p_message;
  if msg.id is null or public.fitclub_role_in(msg.chat_id) is null then raise exception 'message_not_found'; end if;
  if e = '' then raise exception 'empty'; end if;
  who := coalesce(msg.reactions -> e, '[]'::jsonb);
  if who ? me then
    who := coalesce((select jsonb_agg(x) from jsonb_array_elements_text(who) as x where x <> me), '[]'::jsonb);
  else
    who := who || to_jsonb(me);
  end if;
  update public.fitclub_messages
  set reactions = case when jsonb_array_length(who) = 0 then reactions - e else jsonb_set(reactions, array[e], who) end, updated_at = now()
  where id = p_message returning * into msg;
  return public.fitclub_message_view(msg);
end $$;

-- POST /api/messages/:id/vote {option}
create or replace function public.fitclub_vote(p_message uuid, p_option int) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me text := auth.uid()::text;
  msg public.fitclub_messages;
  multiple boolean;
  opts jsonb;
begin
  if me is null then raise exception 'unauthorized'; end if;
  select * into msg from public.fitclub_messages where id = p_message;
  if msg.id is null or msg.poll is null or msg.deleted or public.fitclub_role_in(msg.chat_id) is null then raise exception 'poll_not_found'; end if;
  multiple := coalesce((msg.poll->>'multiple')::boolean, false);
  select jsonb_agg(
    case
      when o.idx - 1 = p_option and multiple and coalesce(o.v->'votes', '[]'::jsonb) ? me
        then jsonb_set(o.v, '{votes}', coalesce((select jsonb_agg(x) from jsonb_array_elements_text(coalesce(o.v->'votes', '[]'::jsonb)) as x where x <> me), '[]'::jsonb))
      when o.idx - 1 = p_option
        then jsonb_set(o.v, '{votes}', coalesce((select jsonb_agg(x) from jsonb_array_elements_text(coalesce(o.v->'votes', '[]'::jsonb)) as x where x <> me), '[]'::jsonb) || to_jsonb(me))
      when multiple then o.v
      else jsonb_set(o.v, '{votes}', coalesce((select jsonb_agg(x) from jsonb_array_elements_text(coalesce(o.v->'votes', '[]'::jsonb)) as x where x <> me), '[]'::jsonb))
    end order by o.idx)
  into opts from jsonb_array_elements(coalesce(msg.poll->'options', '[]'::jsonb)) with ordinality as o(v, idx);
  update public.fitclub_messages set poll = jsonb_set(poll, '{options}', coalesce(opts, '[]'::jsonb)), updated_at = now()
  where id = p_message returning * into msg;
  return public.fitclub_message_view(msg);
end $$;

-- POST /api/chats/:id/read : moves my read marker; the others' ticks turn read.
create or replace function public.fitclub_mark_read(p_chat uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  at_ timestamptz;
begin
  if me is null then raise exception 'unauthorized'; end if;
  update public.fitclub_chat_members set last_read_at = now() where chat_id = p_chat and user_id = me returning last_read_at into at_;
  if at_ is null then raise exception 'chat_not_found'; end if;
  -- A channel's readers don't send receipts.
  if (select type from public.fitclub_chats where id = p_chat) <> 'channel' then
    perform public.fitclub_emit(public.fitclub_members_of(p_chat, me), 'read', p_chat, jsonb_build_object('userId', me, 'at', public.fitclub_iso(at_)));
  end if;
  delete from public.fitclub_inbox where created_at < now() - interval '2 days';
  return jsonb_build_object('ok', true, 'at', public.fitclub_iso(at_));
end $$;

-- The messenger's "last seen".
create or replace function public.fitclub_seen() returns void
language sql security definer set search_path = public, pg_temp as $$
  update public.fitclub_profiles set last_seen_at = now() where id = auth.uid()
$$;

-- A username is free when no person, chat or reserved word has it.
create or replace function public.fitclub_username_available(candidate text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select candidate ~ '^[a-z][a-z0-9_]{4,31}$'
     and candidate <> all (array['admin', 'fitclub', 'support', 'help', 'settings', 'me', 'saved'])
     and not exists (
       select 1 from public.fitclub_profiles
       where username = candidate and id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid))
     and not exists (select 1 from public.fitclub_chats where username = candidate);
$$;

-- ─────────────────────────────── who may call what ───────────────────────────────

revoke all on function public.fitclub_iso(timestamptz), public.fitclub_person(uuid), public.fitclub_display_name(uuid),
  public.fitclub_chat_view(uuid, uuid), public.fitclub_message_view(public.fitclub_messages, text),
  public.fitclub_emit(uuid[], text, uuid, jsonb), public.fitclub_members_of(uuid, uuid), public.fitclub_system(uuid, uuid, text, text),
  public.fitclub_resolve_people(text[]), public.fitclub_code(text), public.fitclub_username_problem(text, uuid)
  from public, anon, authenticated;

revoke all on function public.fitclub_role_in(uuid), public.fitclub_sync(timestamptz), public.fitclub_chat_bundle(uuid),
  public.fitclub_history(uuid, timestamptz), public.fitclub_search_people(text), public.fitclub_search_public(text),
  public.fitclub_resolve(text), public.fitclub_join(text),
  public.fitclub_create_chat(text, text, text, text, text, boolean, text, text[]), public.fitclub_private_chat(text),
  public.fitclub_update_chat(uuid, jsonb), public.fitclub_add_members(uuid, text[]), public.fitclub_remove_member(uuid, uuid),
  public.fitclub_toggle_admin(uuid, uuid), public.fitclub_leave_chat(uuid), public.fitclub_delete_chat(uuid),
  public.fitclub_send(uuid, jsonb), public.fitclub_edit_message(uuid, text), public.fitclub_delete_message(uuid),
  public.fitclub_react(uuid, text), public.fitclub_vote(uuid, int), public.fitclub_mark_read(uuid), public.fitclub_seen()
  from public, anon;
grant execute on function public.fitclub_role_in(uuid), public.fitclub_sync(timestamptz), public.fitclub_chat_bundle(uuid),
  public.fitclub_history(uuid, timestamptz), public.fitclub_search_people(text), public.fitclub_search_public(text),
  public.fitclub_resolve(text), public.fitclub_join(text),
  public.fitclub_create_chat(text, text, text, text, text, boolean, text, text[]), public.fitclub_private_chat(text),
  public.fitclub_update_chat(uuid, jsonb), public.fitclub_add_members(uuid, text[]), public.fitclub_remove_member(uuid, uuid),
  public.fitclub_toggle_admin(uuid, uuid), public.fitclub_leave_chat(uuid), public.fitclub_delete_chat(uuid),
  public.fitclub_send(uuid, jsonb), public.fitclub_edit_message(uuid, text), public.fitclub_delete_message(uuid),
  public.fitclub_react(uuid, text), public.fitclub_vote(uuid, int), public.fitclub_mark_read(uuid), public.fitclub_seen()
  to authenticated;

revoke all on function public.fitclub_username_available(text) from public;
grant execute on function public.fitclub_username_available(text) to anon, authenticated;

-- ─────────────────────────────── realtime ───────────────────────────────
-- New and changed messages, and each person's inbox, reach devices live.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'fitclub_messages') then
      execute 'alter publication supabase_realtime add table public.fitclub_messages';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'fitclub_inbox') then
      execute 'alter publication supabase_realtime add table public.fitclub_inbox';
    end if;
  end if;
end $$;
