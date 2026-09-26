-- FitClub · 0009 · help and feedback from inside the app
--
-- A signed-in person writes to the FitClub team: a bug, an idea, a question.
-- The team reads them in the Supabase dashboard and answers by email (the
-- account's own address, which stays in auth and is not copied here).
--
--   - People send and read back only their own messages, through the two
--     functions below; the table has no read policy and no grants.
--   - At most 10 an hour per person, 2,000 characters each.
--
-- The same corner as before: the fitclub_ prefix and nothing else touched.
-- Run after 0008. Safe to run again.

create table if not exists public.fitclub_feedback (
  id         bigserial primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  at         timestamptz not null default now(),
  kind       text not null default 'other' check (kind in ('bug', 'idea', 'question', 'other')),
  message    text not null check (char_length(message) between 1 and 2000),
  page       text not null default '' check (char_length(page) <= 200),
  build      text not null default '' check (char_length(build) <= 40),
  lang       text not null default 'fa' check (lang in ('fa', 'en')),
  agent      text not null default '' check (char_length(agent) <= 300),
  status     text not null default 'new' check (status in ('new', 'read', 'answered', 'closed'))
);
create index if not exists fitclub_feedback_by_user on public.fitclub_feedback (user_id, at);

alter table public.fitclub_feedback enable row level security;
revoke all on public.fitclub_feedback from anon, authenticated;
revoke all on sequence public.fitclub_feedback_id_seq from anon, authenticated;
grant select, insert, update, delete on public.fitclub_feedback to service_role;

create or replace function public.fitclub_send_feedback(p_kind text, p_message text, p_meta jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  msg text := left(btrim(coalesce(p_message, '')), 2000);
  row public.fitclub_feedback;
begin
  if me is null then raise exception 'unauthorized'; end if;
  if msg = '' then raise exception 'empty'; end if;
  if (select count(*) from public.fitclub_feedback where user_id = me and at > now() - interval '1 hour') >= 10 then raise exception 'too_many'; end if;
  insert into public.fitclub_feedback (user_id, kind, message, page, build, lang, agent)
  values (me, case when p_kind in ('bug', 'idea', 'question', 'other') then p_kind else 'other' end, msg,
    left(split_part(split_part(coalesce(p_meta->>'page', ''), '?', 1), '#', 1), 200), left(coalesce(p_meta->>'build', ''), 40),
    case when p_meta->>'lang' = 'en' then 'en' else 'fa' end, left(coalesce(p_meta->>'agent', ''), 300))
  returning * into row;
  return jsonb_build_object('id', row.id, 'at', public.fitclub_iso(row.at), 'kind', row.kind, 'message', row.message, 'status', row.status);
end $$;

-- The caller's own messages, newest first, with where each one stands.
create or replace function public.fitclub_my_feedback() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'at', public.fitclub_iso(at), 'kind', kind, 'message', message, 'status', status) order by at desc), '[]'::jsonb)
          from (select * from public.fitclub_feedback where user_id = auth.uid() order by at desc limit 50) f);
end $$;

revoke all on function public.fitclub_send_feedback(text, text, jsonb), public.fitclub_my_feedback() from public, anon;
grant execute on function public.fitclub_send_feedback(text, text, jsonb), public.fitclub_my_feedback() to authenticated;
