-- FitClub · 0003 · photos in chats
--
-- A private bucket, fitclub-chat-media, with one folder per chat:
-- fitclub-chat-media/<chat id>/<file>. A chat's members can see and add its
-- photos and nobody else can; the person who added one can take it down.
-- The app shrinks photos before uploading (a long side of 1600 px), so the
-- 5 MB cap is only a backstop. Every policy is named "fitclub: …" and names
-- this bucket, so other apps' buckets and policies are untouched.
--
-- Run after 0002. Safe to run again.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fitclub-chat-media', 'fitclub-chat-media', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Whether the caller is in the chat an object's folder names.
create or replace function public.fitclub_member_of_folder(p_name text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select case
    when (storage.foldername(p_name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.fitclub_role_in(((storage.foldername(p_name))[1])::uuid) is not null
    else false
  end
$$;
revoke all on function public.fitclub_member_of_folder(text) from public, anon;
grant execute on function public.fitclub_member_of_folder(text) to authenticated;

drop policy if exists "fitclub: chat members see its photos" on storage.objects;
create policy "fitclub: chat members see its photos" on storage.objects
  for select to authenticated using (bucket_id = 'fitclub-chat-media' and public.fitclub_member_of_folder(name));

drop policy if exists "fitclub: chat members add photos" on storage.objects;
create policy "fitclub: chat members add photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'fitclub-chat-media' and public.fitclub_member_of_folder(name));

drop policy if exists "fitclub: a person removes photos they added" on storage.objects;
create policy "fitclub: a person removes photos they added" on storage.objects
  for delete to authenticated using (bucket_id = 'fitclub-chat-media' and owner = auth.uid());
