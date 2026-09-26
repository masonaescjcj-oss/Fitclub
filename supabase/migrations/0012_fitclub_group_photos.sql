-- FitClub · 0012 · a photo for groups and channels
--
-- A group or channel can carry a photo, set by its owner or an admin. The
-- file lives in the public fitclub-avatars bucket (0001), next to profile
-- photos, at chats/<chat id>/<file>, and inherits that bucket's limits
-- (0010: images only, 2 MB at most). The chat keeps the file's path; the
-- app turns it into the public address. Every member's device hears about
-- the change like any other edit, and the chat says the photo changed.
--
-- Run after 0011. Safe to run again.

alter table public.fitclub_chats add column if not exists photo text check (photo is null or char_length(photo) <= 200);

-- Whether the caller may put or take down a photo at this path:
-- chats/<chat id>/<file>, as an owner or admin of that group or channel.
create or replace function public.fitclub_manages_chat_photo(p_name text) returns boolean
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  parts text[] := storage.foldername(p_name);
  chat uuid;
begin
  if coalesce(array_length(parts, 1), 0) <> 2 or parts[1] <> 'chats'
     or parts[2] !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  chat := parts[2]::uuid;
  return public.fitclub_role_in(chat) in ('owner', 'admin')
    and exists (select 1 from public.fitclub_chats where id = chat and type in ('group', 'channel'));
end $$;
revoke all on function public.fitclub_manages_chat_photo(text) from public, anon;
grant execute on function public.fitclub_manages_chat_photo(text) to authenticated;

-- Anyone may see them, like profile photos ("fitclub: avatars are public", 0001).
drop policy if exists "fitclub: admins add a chat's photo" on storage.objects;
create policy "fitclub: admins add a chat's photo" on storage.objects
  for insert to authenticated with check (bucket_id = 'fitclub-avatars' and public.fitclub_manages_chat_photo(name));

drop policy if exists "fitclub: admins replace a chat's photo" on storage.objects;
create policy "fitclub: admins replace a chat's photo" on storage.objects
  for update to authenticated using (bucket_id = 'fitclub-avatars' and public.fitclub_manages_chat_photo(name));

drop policy if exists "fitclub: admins remove a chat's photo" on storage.objects;
create policy "fitclub: admins remove a chat's photo" on storage.objects
  for delete to authenticated using (bucket_id = 'fitclub-avatars' and public.fitclub_manages_chat_photo(name));

-- The chat as `p_me` sees it (0002), now with its photo.
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
    'verified', false, 'premium', false, 'draft', '', 'pinnedMessageId', null,
    'photo', c.photo)
  from public.fitclub_chats c where c.id = p_chat
$$;

-- PATCH /api/chats/:id (0002), now taking "photo": a path under
-- chats/<this chat>/, or null to take it down. Admins only.
create or replace function public.fitclub_update_chat(p_chat uuid, p_patch jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  c public.fitclub_chats;
  problem text;
  new_title text;
  new_photo text;
  noun_en text;
  noun_fa text;
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
  if p_patch ? 'photo' then
    new_photo := nullif(btrim(coalesce(p_patch->>'photo', '')), '');
    if new_photo is not null and new_photo !~ ('^chats/' || p_chat::text || '/[A-Za-z0-9_.-]{1,64}(\?v=[0-9]{1,15})?$') then
      raise exception 'bad_photo';
    end if;
    if new_photo is distinct from c.photo then
      update public.fitclub_chats set photo = new_photo where id = p_chat;
      noun_en := case when c.type = 'channel' then 'Channel' else 'Group' end;
      noun_fa := case when c.type = 'channel' then 'کانال' else 'گروه' end;
      perform public.fitclub_system(p_chat, me,
        noun_en || case when new_photo is null then ' photo removed' else ' photo updated' end,
        'عکس ' || noun_fa || case when new_photo is null then ' حذف شد' else ' عوض شد' end);
    end if;
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

-- The caller's photos before deleting the account (0011), now also the
-- photos of groups and channels that go with them (only they are in them).
create or replace function public.fitclub_my_photos() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'unauthorized'; end if;
  return jsonb_build_object(
    'avatars', coalesce((
      select jsonb_agg(o.name order by o.name) from storage.objects o
      where o.bucket_id = 'fitclub-avatars' and ((storage.foldername(o.name))[1] = me::text
        or ((storage.foldername(o.name))[1] = 'chats' and (storage.foldername(o.name))[2] in (
          select c.id::text from public.fitclub_chat_members m join public.fitclub_chats c on c.id = m.chat_id
          where m.user_id = me and c.type in ('group', 'channel')
            and not exists (select 1 from public.fitclub_chat_members x where x.chat_id = c.id and x.user_id <> me))))), '[]'::jsonb),
    'chat', coalesce((
      select jsonb_agg(o.name order by o.name) from storage.objects o
      where o.bucket_id = 'fitclub-chat-media' and (o.owner = me or (storage.foldername(o.name))[1] in (
        select c.id::text from public.fitclub_chat_members m join public.fitclub_chats c on c.id = m.chat_id
        where m.user_id = me and (c.type = 'private'
          or not exists (select 1 from public.fitclub_chat_members x where x.chat_id = c.id and x.user_id <> me))))), '[]'::jsonb));
end $$;
revoke all on function public.fitclub_my_photos() from public, anon;
grant execute on function public.fitclub_my_photos() to authenticated;
