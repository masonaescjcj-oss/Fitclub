-- FitClub · 0005 · automatic error reports
--
-- When the app hits an error it didn't expect, it sends a short report: the
-- message, where in the code, the page (never its query or hash), the
-- browser, the app build and, when signed in, the account. The same corner
-- as before: the fitclub_ prefix and nothing else in the project touched.
--
--   - Nobody reads reports through the app: the table has no read policy
--     and no grants. The team reads them in the Supabase dashboard.
--   - One function writes them, for signed-in people and visitors alike,
--     each text cut to size. The same error from the same person within an
--     hour is counted, not stored again; a person sends at most 30 reports
--     an hour and everyone together at most 600 every ten minutes, so a
--     loop or a flood can't fill the table.
--   - Reports older than 30 days are deleted as new ones arrive.
--
-- Run after 0004. Safe to run again.

create table if not exists public.fitclub_error_reports (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  last_at     timestamptz not null default now(),
  times       int not null default 1,
  user_id     uuid references auth.users (id) on delete set null,
  kind        text not null default 'error' check (kind in ('error', 'rejection', 'render', 'console')),
  message     text not null default '' check (char_length(message) <= 500),
  stack       text not null default '' check (char_length(stack) <= 4000),
  page        text not null default '' check (char_length(page) <= 200),
  build       text not null default '' check (char_length(build) <= 40),
  agent       text not null default '' check (char_length(agent) <= 300),
  fingerprint text not null
);
create index if not exists fitclub_error_reports_at on public.fitclub_error_reports (at);
create index if not exists fitclub_error_reports_fp on public.fitclub_error_reports (fingerprint, last_at);

alter table public.fitclub_error_reports enable row level security;
revoke all on public.fitclub_error_reports from anon, authenticated;
revoke all on sequence public.fitclub_error_reports_id_seq from anon, authenticated;
grant select, insert, update, delete on public.fitclub_error_reports to service_role;

-- Files one report. Returns true when it was kept or counted, false when a cap dropped it.
create or replace function public.fitclub_report_error(p_report jsonb) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  k text := case when p_report->>'kind' in ('error', 'rejection', 'render', 'console') then p_report->>'kind' else 'error' end;
  msg text := left(coalesce(p_report->>'message', ''), 500);
  st text := left(coalesce(p_report->>'stack', ''), 4000);
  -- The page's path only: a query or a hash can hold a sign-in token.
  pg text := left(split_part(split_part(coalesce(p_report->>'page', ''), '?', 1), '#', 1), 200);
  b text := left(coalesce(p_report->>'build', ''), 40);
  fp text;
  hit bigint;
begin
  if jsonb_typeof(p_report) is distinct from 'object' or btrim(msg) = '' then return false; end if;
  fp := md5(k || '|' || msg || '|' || split_part(st, E'\n', 1) || '|' || b || '|' || coalesce(me::text, 'visitor'));
  -- Two copies of one error arriving together are counted, not both stored.
  perform pg_advisory_xact_lock(hashtext('fitclub_error_reports:' || fp));

  select id into hit from public.fitclub_error_reports
  where fingerprint = fp and last_at > now() - interval '1 hour'
  order by last_at desc limit 1;
  if hit is not null then
    update public.fitclub_error_reports set times = times + 1, last_at = now() where id = hit;
    return true;
  end if;

  if (select count(*) from public.fitclub_error_reports where at > now() - interval '10 minutes') >= 600 then return false; end if;
  if me is not null and (select count(*) from public.fitclub_error_reports where user_id = me and at > now() - interval '1 hour') >= 30 then
    return false;
  end if;

  insert into public.fitclub_error_reports (user_id, kind, message, stack, page, build, agent, fingerprint)
  values (me, k, msg, st, pg, b, left(coalesce(p_report->>'agent', ''), 300), fp);
  delete from public.fitclub_error_reports where id in (
    select id from public.fitclub_error_reports where at < now() - interval '30 days' order by at limit 200);
  return true;
end $$;

revoke all on function public.fitclub_report_error(jsonb) from public;
grant execute on function public.fitclub_report_error(jsonb) to anon, authenticated;
