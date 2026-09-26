-- FitClub · 0008 · push notifications
--
-- A device that turns notifications on leaves its Web Push subscription
-- here, with what it wants: new messages, and an evening reminder on days
-- nothing was logged. FitClub's own server functions (api/push-*.js) read
-- them to send; nothing else can.
--
--   - People save and remove only their own subscriptions, through the
--     functions below; the table has no read policy and no grants.
--   - The server functions prove who they are with a secret of FitClub's
--     own, not the project's service key: only its SHA-256 is stored here
--     (inserted when the project is set up, never in this file), and each
--     function checks it before answering.
--   - A message is announced once, only within a few minutes of being sent,
--     only by its sender's request, and only to the other members of its chat.
--   - A reminder goes at most once a day, in the person's evening.
--
-- The same corner as before: the fitclub_ prefix and nothing else touched.
-- Run after 0007. Safe to run again.

create table if not exists public.fitclub_push_subscriptions (
  endpoint     text primary key check (char_length(endpoint) between 20 and 1000 and endpoint ~ '^https://'),
  user_id      uuid not null references auth.users (id) on delete cascade,
  p256dh       text not null check (char_length(p256dh) between 20 and 200),
  auth         text not null check (char_length(auth) between 8 and 100),
  lang         text not null default 'fa' check (lang in ('fa', 'en')),
  tz_offset    int not null default 210 check (tz_offset between -720 and 840), -- minutes east of UTC
  messages     boolean not null default true,
  reminders    boolean not null default true,
  reminded_on  date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists fitclub_push_by_user on public.fitclub_push_subscriptions (user_id);

create table if not exists public.fitclub_push_sent (
  message_id uuid primary key,
  sent_at    timestamptz not null default now()
);

create table if not exists public.fitclub_push_config (
  key   text primary key,
  value text not null
);

alter table public.fitclub_push_subscriptions enable row level security;
alter table public.fitclub_push_sent enable row level security;
alter table public.fitclub_push_config enable row level security;
revoke all on public.fitclub_push_subscriptions, public.fitclub_push_sent, public.fitclub_push_config from anon, authenticated;
grant select, insert, update, delete on public.fitclub_push_subscriptions, public.fitclub_push_sent, public.fitclub_push_config to service_role;

-- Whether p_secret is FitClub's server secret.
create or replace function public.fitclub_push_trusted(p_secret text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(p_secret, '') <> '' and exists (
    select 1 from public.fitclub_push_config where key = 'server_secret_sha256' and value = encode(sha256(convert_to(p_secret, 'utf8')), 'hex'))
$$;
revoke all on function public.fitclub_push_trusted(text) from public, anon, authenticated;

-- ─────────────────────────────── the app ───────────────────────────────

-- Saves this device's subscription and what it wants. A device that signs in
-- to another account moves over with it.
create or replace function public.fitclub_push_save(p_sub jsonb, p_prefs jsonb) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'unauthorized'; end if;
  if (select count(*) from public.fitclub_push_subscriptions where user_id = me and endpoint <> coalesce(p_sub->>'endpoint', '')) >= 10 then
    raise exception 'too_many_devices';
  end if;
  insert into public.fitclub_push_subscriptions (endpoint, user_id, p256dh, auth, lang, tz_offset, messages, reminders)
  values (p_sub->>'endpoint', me, p_sub->'keys'->>'p256dh', p_sub->'keys'->>'auth',
    case when p_prefs->>'lang' = 'en' then 'en' else 'fa' end,
    case when p_prefs->>'tzOffset' ~ '^-?\d{1,4}$' then least(greatest((p_prefs->>'tzOffset')::int, -720), 840) else 210 end,
    coalesce((p_prefs->>'messages')::boolean, true), coalesce((p_prefs->>'reminders')::boolean, true))
  on conflict (endpoint) do update set user_id = me, p256dh = excluded.p256dh, auth = excluded.auth, lang = excluded.lang,
    tz_offset = excluded.tz_offset, messages = excluded.messages, reminders = excluded.reminders, updated_at = now();
  return true;
end $$;

create or replace function public.fitclub_push_remove(p_endpoint text) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  delete from public.fitclub_push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
  return found;
end $$;

-- ─────────────────────────────── the server ───────────────────────────────

-- Who to tell about a message, and what to say: its chat's other members who
-- want messages. Once per message, within 5 minutes, and only when p_sender
-- (checked by the server from the caller's sign-in) sent it.
create or replace function public.fitclub_push_for_message(p_secret text, p_message uuid, p_sender uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  m public.fitclub_messages;
  c public.fitclub_chats;
  who text;
  preview text;
begin
  if not public.fitclub_push_trusted(p_secret) then raise exception 'unauthorized'; end if;
  select * into m from public.fitclub_messages where id = p_message;
  if m.id is null or m.sender_id is distinct from p_sender or m.deleted or m.kind = 'system' or m.created_at < now() - interval '5 minutes' then
    return jsonb_build_object('targets', '[]'::jsonb);
  end if;
  insert into public.fitclub_push_sent (message_id) values (p_message) on conflict do nothing;
  if not found then return jsonb_build_object('targets', '[]'::jsonb); end if;
  delete from public.fitclub_push_sent where sent_at < now() - interval '1 day';
  select * into c from public.fitclub_chats where id = m.chat_id;
  who := public.fitclub_display_name(m.sender_id);
  preview := left(case m.kind
    when 'photo' then '📷'
    when 'poll' then '📊 ' || coalesce(m.poll->>'question', '')
    when 'checklist' then '☑️ ' || coalesce(m.checklist->>'title', '')
    when 'challenge' then '🎯 ' || coalesce(nullif(m.text, ''), '')
    when 'voice' then '🎤'
    else m.text end, 140);
  return jsonb_build_object(
    'chatId', c.id,
    'title', case when c.type = 'private' then who else coalesce(nullif(c.title, ''), 'FitClub') end,
    'body', case when c.type = 'private' or c.type = 'channel' then preview else who || ': ' || preview end,
    'targets', coalesce((
      select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'keys', jsonb_build_object('p256dh', s.p256dh, 'auth', s.auth), 'lang', s.lang))
      from public.fitclub_push_subscriptions s
      join public.fitclub_chat_members x on x.user_id = s.user_id and x.chat_id = c.id
      where s.messages and s.user_id <> m.sender_id), '[]'::jsonb));
end $$;

-- Who to remind this evening: reminders on, between 17:00 and 23:00 their
-- time, nothing logged today, not reminded today. Marks them reminded.
create or replace function public.fitclub_push_due_reminders(p_secret text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare picked jsonb;
begin
  if not public.fitclub_push_trusted(p_secret) then raise exception 'unauthorized'; end if;
  with due as (
    select s.endpoint, s.p256dh, s.auth, s.lang, (now() at time zone 'UTC' + make_interval(mins => s.tz_offset))::date as local_day
    from public.fitclub_push_subscriptions s
    where s.reminders
      and extract(hour from (now() at time zone 'UTC' + make_interval(mins => s.tz_offset))) between 17 and 22
      and (s.reminded_on is null or s.reminded_on < (now() at time zone 'UTC' + make_interval(mins => s.tz_offset))::date)
      and not exists (select 1 from public.fitclub_activity a where a.user_id = s.user_id
        and a.day = (now() at time zone 'UTC' + make_interval(mins => s.tz_offset))::date)
    limit 5000
  ), marked as (
    update public.fitclub_push_subscriptions s set reminded_on = due.local_day from due where s.endpoint = due.endpoint returning s.endpoint
  )
  select coalesce(jsonb_agg(jsonb_build_object('endpoint', d.endpoint, 'keys', jsonb_build_object('p256dh', d.p256dh, 'auth', d.auth), 'lang', d.lang)), '[]'::jsonb)
  into picked from due d join marked k on k.endpoint = d.endpoint;
  return jsonb_build_object('targets', picked);
end $$;

-- A subscription the push service says is gone (404/410): forget it.
create or replace function public.fitclub_push_gone(p_secret text, p_endpoint text) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.fitclub_push_trusted(p_secret) then raise exception 'unauthorized'; end if;
  delete from public.fitclub_push_subscriptions where endpoint = p_endpoint;
  return found;
end $$;

revoke all on function public.fitclub_push_save(jsonb, jsonb), public.fitclub_push_remove(text) from public, anon;
grant execute on function public.fitclub_push_save(jsonb, jsonb), public.fitclub_push_remove(text) to authenticated;
-- The server calls these with the anon key and its secret.
revoke all on function public.fitclub_push_for_message(text, uuid, uuid), public.fitclub_push_due_reminders(text), public.fitclub_push_gone(text, text) from public;
grant execute on function public.fitclub_push_for_message(text, uuid, uuid), public.fitclub_push_due_reminders(text), public.fitclub_push_gone(text, text) to anon, authenticated;
