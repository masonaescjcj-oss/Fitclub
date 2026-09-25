-- FitClub · 0007 · checklists in chats
--
-- A checklist message, as in Telegram: a title and up to 30 tasks. The
-- sender decides whether the others in the chat may tick tasks and whether
-- they may add tasks. A ticked task shows who ticked it and when; it can be
-- unticked by that person or by the sender.
--
--   checklist = { title, othersCanMark, othersCanAdd,
--                 items: [{ id, text, addedBy, doneBy, doneAt }] }
--
-- Ticks and new tasks go through the two functions below, which check those
-- settings; the change reaches the chat live like any edited message. The
-- same corner as before: only FitClub's own table and functions change.
-- Run after 0006. Safe to run again.

alter table public.fitclub_messages add column if not exists checklist jsonb;
alter table public.fitclub_messages drop constraint if exists fitclub_messages_checklist_size;
alter table public.fitclub_messages add constraint fitclub_messages_checklist_size
  check (checklist is null or pg_column_size(checklist) <= 65536);
alter table public.fitclub_messages drop constraint if exists fitclub_messages_kind_check;
alter table public.fitclub_messages add constraint fitclub_messages_kind_check
  check (kind in ('text', 'photo', 'voice', 'sticker', 'poll', 'file', 'system', 'challenge', 'checklist'));

-- The message as the app sees it, now with its checklist.
create or replace function public.fitclub_message_view(m public.fitclub_messages, p_status text default 'sent') returns jsonb
language sql stable set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'id', m.id, 'clientId', m.client_id, 'chatId', m.chat_id, 'senderId', m.sender_id, 'kind', m.kind,
    'text', m.text, 'textFa', m.text_fa, 'replyTo', m.reply_to, 'media', m.media, 'poll', m.poll, 'voice', m.voice,
    'checklist', m.checklist,
    'at', public.fitclub_iso(m.created_at), 'status', p_status, 'reactions', m.reactions, 'deleted', m.deleted,
    'editedAt', public.fitclub_iso(m.edited_at), 'silent', m.silent, 'views', 0)
$$;

-- A checklist from the app's JSON, cleaned: a title, 1–30 tasks of up to
-- 200 characters, both settings, every task added by the sender and open.
create or replace function public.fitclub_clean_checklist(p jsonb, p_me uuid) returns jsonb
language plpgsql immutable set search_path = public, pg_temp as $$
declare
  items jsonb;
begin
  if jsonb_typeof(p) is distinct from 'object' then raise exception 'bad_checklist'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', 't' || n, 'text', txt, 'addedBy', p_me, 'doneBy', null, 'doneAt', null) order by n), '[]'::jsonb)
  into items
  from (
    select row_number() over (order by ord) as n, txt from (
      select ord, left(btrim(case when jsonb_typeof(x) = 'string' then x #>> '{}' else x->>'text' end), 200) as txt
      from jsonb_array_elements(case when jsonb_typeof(p->'items') = 'array' then p->'items' else '[]'::jsonb end) with ordinality as a(x, ord)) s
    where coalesce(txt, '') <> '') k
  where n <= 30;
  if jsonb_array_length(items) = 0 then raise exception 'empty_checklist'; end if;
  return jsonb_build_object(
    'title', left(btrim(coalesce(p->>'title', '')), 120),
    'othersCanMark', coalesce((p->>'othersCanMark')::boolean, true),
    'othersCanAdd', coalesce((p->>'othersCanAdd')::boolean, true),
    'items', items);
end $$;
revoke all on function public.fitclub_clean_checklist(jsonb, uuid) from public, anon, authenticated;

-- POST /api/chats/:id/messages, now also taking a checklist.
create or replace function public.fitclub_send(p_chat uuid, p_body jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  my_role text := public.fitclub_role_in(p_chat);
  chat_type text;
  k text := coalesce(p_body->>'kind', 'text');
  t text := left(coalesce(p_body->>'text', ''), 4000);
  list jsonb;
  msg public.fitclub_messages;
begin
  if me is null then raise exception 'unauthorized'; end if;
  select type into chat_type from public.fitclub_chats where id = p_chat;
  if chat_type is null or my_role is null then raise exception 'chat_not_found'; end if;
  if chat_type = 'channel' and my_role = 'member' then raise exception 'admins_only'; end if;
  if k not in ('text', 'photo', 'voice', 'sticker', 'poll', 'file', 'checklist') then k := 'text'; end if;
  if k = 'checklist' then
    list := public.fitclub_clean_checklist(p_body->'checklist', me);
    t := list->>'title';
  end if;
  if k = 'text' and btrim(t) = '' then raise exception 'empty'; end if;
  insert into public.fitclub_messages (chat_id, sender_id, client_id, kind, text, reply_to, media, poll, voice, checklist, silent)
  values (p_chat, me, left(p_body->>'clientId', 64), k, t, left(p_body->>'replyTo', 64),
    case when k = 'checklist' then null else nullif(p_body->'media', 'null'::jsonb) end,
    case when k = 'checklist' then null else nullif(p_body->'poll', 'null'::jsonb) end,
    case when k = 'checklist' then null else nullif(p_body->'voice', 'null'::jsonb) end,
    list, coalesce((p_body->>'silent')::boolean, false))
  returning * into msg;
  update public.fitclub_chat_members set last_read_at = msg.created_at where chat_id = p_chat and user_id = me;
  return public.fitclub_message_view(msg);
end $$;

-- A deleted message keeps nothing, its checklist included.
create or replace function public.fitclub_delete_message(p_message uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare msg public.fitclub_messages;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  select * into msg from public.fitclub_messages where id = p_message;
  if msg.id is null or public.fitclub_role_in(msg.chat_id) is null then raise exception 'message_not_found'; end if;
  if msg.sender_id is distinct from auth.uid() and public.fitclub_role_in(msg.chat_id) = 'member' then raise exception 'not_yours'; end if;
  update public.fitclub_messages set deleted = true, text = '', text_fa = '', media = null, poll = null, voice = null, checklist = null,
    reactions = '{}'::jsonb, updated_at = now()
  where id = p_message returning * into msg;
  return public.fitclub_message_view(msg);
end $$;

-- Ticks or unticks one task. Ticking needs the sender, or "others can mark";
-- unticking, the person who ticked it or the sender.
create or replace function public.fitclub_checklist_mark(p_message uuid, p_item text, p_done boolean) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  msg public.fitclub_messages;
  item jsonb;
  owner boolean;
begin
  if me is null then raise exception 'unauthorized'; end if;
  select * into msg from public.fitclub_messages where id = p_message for update;
  if msg.id is null or msg.checklist is null or msg.deleted or public.fitclub_role_in(msg.chat_id) is null then raise exception 'checklist_not_found'; end if;
  owner := msg.sender_id = me;
  select x into item from jsonb_array_elements(msg.checklist->'items') x where x->>'id' = p_item;
  if item is null then raise exception 'task_not_found'; end if;
  if p_done then
    if not owner and not coalesce((msg.checklist->>'othersCanMark')::boolean, false) then raise exception 'not_allowed'; end if;
    if item->>'doneBy' is not null then return public.fitclub_message_view(msg); end if;
  else
    if item->>'doneBy' is null then return public.fitclub_message_view(msg); end if;
    if not owner and item->>'doneBy' is distinct from me::text then raise exception 'not_yours'; end if;
  end if;
  update public.fitclub_messages set checklist = jsonb_set(checklist, '{items}', (
      select jsonb_agg(case when x->>'id' = p_item
        then x || jsonb_build_object('doneBy', case when p_done then to_jsonb(me) else 'null'::jsonb end,
                                     'doneAt', case when p_done then to_jsonb(public.fitclub_iso(now())) else 'null'::jsonb end)
        else x end order by n)
      from jsonb_array_elements(checklist->'items') with ordinality as a(x, n))),
    updated_at = now()
  where id = p_message returning * into msg;
  return public.fitclub_message_view(msg);
end $$;

-- Adds a task at the end. Needs the sender, or "others can add"; 30 at most.
create or replace function public.fitclub_checklist_add(p_message uuid, p_text text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  msg public.fitclub_messages;
  txt text := left(btrim(coalesce(p_text, '')), 200);
  next_n int;
begin
  if me is null then raise exception 'unauthorized'; end if;
  select * into msg from public.fitclub_messages where id = p_message for update;
  if msg.id is null or msg.checklist is null or msg.deleted or public.fitclub_role_in(msg.chat_id) is null then raise exception 'checklist_not_found'; end if;
  if msg.sender_id is distinct from me and not coalesce((msg.checklist->>'othersCanAdd')::boolean, false) then raise exception 'not_allowed'; end if;
  if txt = '' then raise exception 'empty'; end if;
  if jsonb_array_length(msg.checklist->'items') >= 30 then raise exception 'too_many_tasks'; end if;
  select coalesce(max(nullif(regexp_replace(x->>'id', '\D', '', 'g'), '')::int), 0) + 1 into next_n
  from jsonb_array_elements(msg.checklist->'items') x;
  update public.fitclub_messages set checklist = jsonb_set(checklist, '{items}', checklist->'items' ||
      jsonb_build_array(jsonb_build_object('id', 't' || next_n, 'text', txt, 'addedBy', me, 'doneBy', null, 'doneAt', null))),
    updated_at = now()
  where id = p_message returning * into msg;
  return public.fitclub_message_view(msg);
end $$;

revoke all on function public.fitclub_checklist_mark(uuid, text, boolean), public.fitclub_checklist_add(uuid, text) from public, anon;
grant execute on function public.fitclub_checklist_mark(uuid, text, boolean), public.fitclub_checklist_add(uuid, text) to authenticated;
