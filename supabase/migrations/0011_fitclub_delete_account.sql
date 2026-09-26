-- FitClub · 0011 · deleting your account from inside the app
--
-- Deleting an account removes everything FitClub keeps about the person:
-- their profile, synced data, activity and scores, push addresses,
-- feedback and error reports. What they sent in chats is emptied and no
-- longer carries their id, and their reactions, votes and ticks come off
-- everyone else's messages. They leave every chat and list: a private chat
-- is deleted for both sides, a group or list they owned passes to its
-- longest-standing admin or member, and one left empty is deleted.
-- Photos live in Storage, which SQL can't clear, so the app first asks
-- fitclub_my_photos for the files and removes them through the Storage API.
--
-- The sign-in (auth.users) is shared with other apps in this project and
-- stays. A note of when the account was deleted stays with it, so a phone
-- still signed in from before can't write the data back: writes made with
-- a sign-in from before that moment are refused. Signing in again starts
-- over with an empty account.
--
-- Run after 0010. Safe to run again.

-- ─────────────────────────────── tables ───────────────────────────────

create table if not exists public.fitclub_deleted_accounts (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  at       timestamptz not null default now()
);
alter table public.fitclub_deleted_accounts enable row level security;
revoke all on public.fitclub_deleted_accounts from anon, authenticated;
grant select, insert, update, delete on public.fitclub_deleted_accounts to service_role;

-- ─────────────────────────────── helpers ───────────────────────────────

-- Whether the caller signed in before deleting their account: their token
-- was issued, or its session began, before then.
create or replace function public.fitclub_token_stale() returns boolean
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  gone timestamptz;
  claims jsonb;
  began timestamptz;
begin
  if me is null then return false; end if;
  select at into gone from public.fitclub_deleted_accounts where user_id = me;
  if gone is null then return false; end if;
  claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  if claims is null then return false; end if;
  if claims->>'iat' ~ '^\d{1,12}$' and to_timestamp((claims->>'iat')::bigint) < gone then return true; end if;
  if claims->>'session_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select created_at into began from auth.sessions where id = (claims->>'session_id')::uuid;
    if began is not null and began < gone then return true; end if;
  end if;
  return false;
end $$;
revoke all on function public.fitclub_token_stale() from public, anon, authenticated;

create or replace function public.fitclub_refuse_stale() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if public.fitclub_token_stale() then raise exception 'account_deleted'; end if;
  return null;
end $$;
revoke all on function public.fitclub_refuse_stale() from public, anon, authenticated;

-- Every table a person's own writes land in.
do $$
declare t text;
begin
  foreach t in array array['fitclub_profiles', 'fitclub_user_state', 'fitclub_activity', 'fitclub_scores',
    'fitclub_push_subscriptions', 'fitclub_feedback', 'fitclub_chat_members', 'fitclub_list_members'] loop
    execute format('drop trigger if exists fitclub_refuse_stale on public.%I', t);
    execute format('create trigger fitclub_refuse_stale before insert or update on public.%I for each statement execute function public.fitclub_refuse_stale()', t);
  end loop;
end $$;

-- ─────────────────────────────── what the app calls ───────────────────────────────

-- The caller's photos, for the app to remove before deleting the account:
-- their profile photos, the chat photos they sent, and every photo in a
-- chat that goes with them (their private chats, and chats only they are in).
create or replace function public.fitclub_my_photos() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'unauthorized'; end if;
  return jsonb_build_object(
    'avatars', coalesce((
      select jsonb_agg(o.name order by o.name) from storage.objects o
      where o.bucket_id = 'fitclub-avatars' and (storage.foldername(o.name))[1] = me::text), '[]'::jsonb),
    'chat', coalesce((
      select jsonb_agg(o.name order by o.name) from storage.objects o
      where o.bucket_id = 'fitclub-chat-media' and (o.owner = me or (storage.foldername(o.name))[1] in (
        select c.id::text from public.fitclub_chat_members m join public.fitclub_chats c on c.id = m.chat_id
        where m.user_id = me and (c.type = 'private'
          or not exists (select 1 from public.fitclub_chat_members x where x.chat_id = c.id and x.user_id <> me))))), '[]'::jsonb));
end $$;

-- Deletes everything FitClub keeps about the caller. p_confirm must be
-- 'delete', so no stray call can do it.
create or replace function public.fitclub_delete_me(p_confirm text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  c record;
  l record;
  heir uuid;
  chats_deleted int := 0;
  chats_left int := 0;
  lists_left int := 0;
begin
  if me is null then raise exception 'unauthorized'; end if;
  if p_confirm is distinct from 'delete' then raise exception 'not_confirmed'; end if;

  -- What they sent: emptied like a deleted message, and no longer theirs.
  -- The lines the app wrote for them (joined, left, removed…) go entirely.
  delete from public.fitclub_messages where sender_id = me and kind = 'system';
  update public.fitclub_messages
  set deleted = true, text = '', text_fa = '', media = null, poll = null, voice = null, checklist = null,
      reactions = '{}'::jsonb, sender_id = null, updated_at = now()
  where sender_id = me;

  -- Their reactions, votes and ticks come off everyone else's messages.
  update public.fitclub_messages m
  set reactions = coalesce((
        select jsonb_object_agg(e.k, e.who) from (
          select r.k, (select jsonb_agg(x) from jsonb_array_elements_text(r.v) as x where x <> me::text) as who
          from jsonb_each(m.reactions) as r(k, v) where jsonb_typeof(r.v) = 'array') e
        where e.who is not null), '{}'::jsonb),
      updated_at = now()
  where jsonb_typeof(m.reactions) = 'object' and m.reactions::text like '%' || me::text || '%';

  update public.fitclub_messages m
  set poll = jsonb_set(m.poll, '{options}', coalesce((
        select jsonb_agg(case when jsonb_typeof(o->'votes') = 'array'
            then jsonb_set(o, '{votes}', coalesce((select jsonb_agg(x) from jsonb_array_elements_text(o->'votes') as x where x <> me::text), '[]'::jsonb))
            else o end order by n)
        from jsonb_array_elements(m.poll->'options') with ordinality as a(o, n)), '[]'::jsonb)),
      updated_at = now()
  where jsonb_typeof(m.poll->'options') = 'array' and m.poll::text like '%' || me::text || '%';

  update public.fitclub_messages m
  set checklist = jsonb_set(m.checklist, '{items}', coalesce((
        select jsonb_agg(case when jsonb_typeof(x) <> 'object' then x
            else x
              || case when x->>'doneBy' = me::text then jsonb_build_object('doneBy', null, 'doneAt', null) else '{}'::jsonb end
              || case when x->>'addedBy' = me::text then jsonb_build_object('addedBy', null) else '{}'::jsonb end
            end order by n)
        from jsonb_array_elements(m.checklist->'items') with ordinality as a(x, n)), '[]'::jsonb)),
      updated_at = now()
  where jsonb_typeof(m.checklist->'items') = 'array' and m.checklist::text like '%' || me::text || '%';

  -- Chats. A private chat, or one only they are in, is deleted; from the
  -- rest they leave, and a group or channel they owned passes on.
  for c in
    select m.chat_id, m.role, ch.type from public.fitclub_chat_members m join public.fitclub_chats ch on ch.id = m.chat_id
    where m.user_id = me
  loop
    if c.type = 'private' or not exists (select 1 from public.fitclub_chat_members where chat_id = c.chat_id and user_id <> me) then
      perform public.fitclub_emit(public.fitclub_members_of(c.chat_id, me), 'removed', c.chat_id);
      delete from public.fitclub_chats where id = c.chat_id;
      chats_deleted := chats_deleted + 1;
    else
      delete from public.fitclub_chat_members where chat_id = c.chat_id and user_id = me;
      if not exists (select 1 from public.fitclub_chat_members where chat_id = c.chat_id and role = 'owner') then
        select user_id into heir from public.fitclub_chat_members where chat_id = c.chat_id
        order by (role = 'admin') desc, joined_at, user_id limit 1;
        update public.fitclub_chat_members set role = 'owner' where chat_id = c.chat_id and user_id = heir;
        update public.fitclub_chats set created_by = heir where id = c.chat_id;
      end if;
      if c.type = 'group' then
        perform public.fitclub_system(c.chat_id, null, 'A member deleted their account', 'یکی از اعضا حسابش را حذف کرد');
      end if;
      perform public.fitclub_emit(public.fitclub_members_of(c.chat_id), 'chat', c.chat_id);
      chats_left := chats_left + 1;
    end if;
  end loop;
  update public.fitclub_chats set created_by = null where created_by = me;
  update public.fitclub_challenges set created_by = null where created_by = me;

  -- Lists: they leave each one with their ticks and assignments; a list
  -- they owned passes on, and one left empty is deleted.
  for l in select list_id from public.fitclub_list_members where user_id = me loop
    delete from public.fitclub_list_members where list_id = l.list_id and user_id = me;
    update public.fitclub_list_items set done_by = done_by - me::text, assignees = array_remove(assignees, me)
    where list_id = l.list_id;
    perform public.fitclub_list_settle(l.list_id);
    perform public.fitclub_list_touch(l.list_id);
    lists_left := lists_left + 1;
  end loop;
  update public.fitclub_lists set created_by = null where created_by = me;
  update public.fitclub_list_items set created_by = null where created_by = me;

  -- Everything that was theirs alone.
  delete from public.fitclub_inbox where user_id = me or payload->>'userId' = me::text;
  delete from public.fitclub_push_subscriptions where user_id = me;
  delete from public.fitclub_activity where user_id = me;
  delete from public.fitclub_scores where user_id = me;
  delete from public.fitclub_feedback where user_id = me;
  delete from public.fitclub_error_reports where user_id = me;
  delete from public.fitclub_user_state where user_id = me;
  delete from public.fitclub_profiles where id = me;

  -- Last, so the steps above ran as a live account.
  insert into public.fitclub_deleted_accounts (user_id, at) values (me, now())
  on conflict (user_id) do update set at = excluded.at;

  return jsonb_build_object('ok', true, 'chatsDeleted', chats_deleted, 'chatsLeft', chats_left, 'listsLeft', lists_left);
end $$;

revoke all on function public.fitclub_my_photos(), public.fitclub_delete_me(text) from public, anon;
grant execute on function public.fitclub_my_photos(), public.fitclub_delete_me(text) to authenticated;
