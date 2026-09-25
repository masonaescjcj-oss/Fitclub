-- FitClub · 0006 · leaderboards, teams and challenges
--
-- Each device publishes its athlete's daily activity: workouts finished,
-- personal records, a perfect checklist day, a day with food logged. The
-- server works out the XP from those counts with the app's own rules (20 a
-- workout, 50 a record, 10 a perfect day, 5 a food day), so a device can't
-- simply claim a score; each count is capped at what a day can hold.
--
--   - The friends board ranks you among the people you share a chat or a
--     list with. The global board lists only people who chose to be on it.
--   - A team is a group chat: its members' XP added up.
--   - A challenge lives in a chat: a goal (workouts, XP, perfect checklist
--     days or food days) over a few days, for every member of that chat,
--     posted there as a card.
--   - Activity and scores are read only through these functions; nobody
--     reads another person's rows directly.
--
-- The same corner as before: the fitclub_ prefix and nothing else touched.
-- Run after 0005. Safe to run again.

-- ─────────────────────────────── tables ───────────────────────────────

create table if not exists public.fitclub_activity (
  user_id    uuid not null references auth.users (id) on delete cascade,
  day        date not null,
  workouts   smallint not null default 0 check (workouts between 0 and 6),
  records    smallint not null default 0 check (records between 0 and 20),
  checklist  boolean not null default false,
  food       boolean not null default false,
  xp         int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
create index if not exists fitclub_activity_day on public.fitclub_activity (day);

create table if not exists public.fitclub_scores (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  streak      int not null default 0 check (streak between 0 and 3650),
  best_streak int not null default 0 check (best_streak between 0 and 3650),
  on_board    boolean not null default false,
  updated_at  timestamptz not null default now()
);

create table if not exists public.fitclub_challenges (
  id         uuid primary key default gen_random_uuid(),
  chat_id    uuid not null references public.fitclub_chats (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  metric     text not null check (metric in ('workouts', 'xp', 'checklist', 'food')),
  target     int check (target is null or target between 1 and 100000),
  title      text not null default '' check (char_length(title) <= 80),
  starts     date not null,
  ends       date not null,
  created_at timestamptz not null default now(),
  check (ends >= starts and ends <= starts + 62)
);
create index if not exists fitclub_challenges_chat on public.fitclub_challenges (chat_id);

-- A challenge posts a card into its chat.
alter table public.fitclub_messages drop constraint if exists fitclub_messages_kind_check;
alter table public.fitclub_messages add constraint fitclub_messages_kind_check
  check (kind in ('text', 'photo', 'voice', 'sticker', 'poll', 'file', 'system', 'challenge', 'checklist'));

alter table public.fitclub_activity enable row level security;
alter table public.fitclub_scores enable row level security;
alter table public.fitclub_challenges enable row level security;
revoke all on public.fitclub_activity, public.fitclub_scores, public.fitclub_challenges from anon, authenticated;
grant select, insert, update, delete on public.fitclub_activity, public.fitclub_scores, public.fitclub_challenges to service_role;

-- ─────────────────────────────── helpers ───────────────────────────────

-- Everyone the caller shares a chat (not a channel) or a list with, and the caller.
create or replace function public.fitclub_circle(p_me uuid) returns uuid[]
language sql stable security definer set search_path = public, pg_temp as $$
  select array_agg(distinct u) from (
    select p_me as u
    union
    select o.user_id from public.fitclub_chat_members mine
      join public.fitclub_chat_members o on o.chat_id = mine.chat_id
      join public.fitclub_chats c on c.id = mine.chat_id and c.type <> 'channel'
    where mine.user_id = p_me
    union
    select o.user_id from public.fitclub_list_members mine
      join public.fitclub_list_members o on o.list_id = mine.list_id
    where mine.user_id = p_me) s
$$;

-- A week's first day, if it is a sensible one (within two weeks of today); else null.
create or replace function public.fitclub_window(p_since date) returns date
language sql stable set search_path = public, pg_temp as $$
  select case when p_since between current_date - 14 and current_date + 1 then p_since end
$$;

-- One person's score for a metric over [p_from, p_to] (null p_from: all time).
create or replace function public.fitclub_metric(p_user uuid, p_metric text, p_from date, p_to date) returns int
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(sum(case p_metric
      when 'workouts' then a.workouts
      when 'checklist' then a.checklist::int
      when 'food' then a.food::int
      else a.xp end), 0)::int
  from public.fitclub_activity a
  where a.user_id = p_user and (p_from is null or a.day >= p_from) and (p_to is null or a.day <= p_to)
$$;

-- A challenge and where each member of its chat stands.
create or replace function public.fitclub_challenge_view(p_challenge uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'id', c.id, 'chatId', c.chat_id, 'createdBy', c.created_by, 'metric', c.metric, 'target', c.target, 'title', c.title,
    'starts', c.starts, 'ends', c.ends, 'createdAt', public.fitclub_iso(c.created_at),
    'rows', coalesce((
      select jsonb_agg(r order by (r->>'value')::int desc, r->'user'->>'name')
      from (
        select jsonb_build_object('user', jsonb_build_object('id', m.user_id, 'name', 'FitClub', 'username', '') || coalesce(public.fitclub_person(m.user_id), '{}'::jsonb),
          'value', public.fitclub_metric(m.user_id, c.metric, c.starts, c.ends)) as r
        from public.fitclub_chat_members m where m.chat_id = c.chat_id) s), '[]'::jsonb))
  from public.fitclub_challenges c where c.id = p_challenge
$$;

-- ─────────────────────────────── what the app calls ───────────────────────────────

-- The caller's daily activity (up to 120 days a call) and current streaks.
-- Returns how many days were stored.
create or replace function public.fitclub_publish_activity(p_days jsonb, p_streak int, p_best int) returns int
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  d jsonb;
  n int := 0;
  w int; r int; ck boolean; fd boolean;
begin
  if me is null then raise exception 'unauthorized'; end if;
  if jsonb_typeof(p_days) is distinct from 'array' or jsonb_array_length(p_days) > 120 then raise exception 'bad_days'; end if;
  for d in select * from jsonb_array_elements(p_days) loop
    continue when jsonb_typeof(d) <> 'object' or coalesce(d->>'day', '') !~ '^\d{4}-\d{2}-\d{2}$';
    continue when (d->>'day')::date not between current_date - 400 and current_date + 1;
    w := case when d->>'workouts' ~ '^\d{1,3}$' then least((d->>'workouts')::int, 6) else 0 end;
    r := case when d->>'records' ~ '^\d{1,3}$' then least((d->>'records')::int, 20) else 0 end;
    ck := coalesce((d->>'checklist')::boolean, false);
    fd := coalesce((d->>'food')::boolean, false);
    insert into public.fitclub_activity (user_id, day, workouts, records, checklist, food, xp)
    values (me, (d->>'day')::date, w, r, ck, fd, 20 * w + 50 * r + 10 * ck::int + 5 * fd::int)
    on conflict (user_id, day) do update set workouts = excluded.workouts, records = excluded.records,
      checklist = excluded.checklist, food = excluded.food, xp = excluded.xp, updated_at = now();
    n := n + 1;
  end loop;
  insert into public.fitclub_scores (user_id, streak, best_streak)
  values (me, least(greatest(coalesce(p_streak, 0), 0), 3650), least(greatest(coalesce(p_best, 0), 0), 3650))
  on conflict (user_id) do update set streak = excluded.streak, best_streak = excluded.best_streak, updated_at = now();
  return n;
end $$;

-- Whether the caller appears on the global board.
create or replace function public.fitclub_set_on_board(p_on boolean) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  insert into public.fitclub_scores (user_id, on_board) values (auth.uid(), coalesce(p_on, false))
  on conflict (user_id) do update set on_board = excluded.on_board, updated_at = now();
  return coalesce(p_on, false);
end $$;

-- A leaderboard: 'friends' or 'global', for the week starting p_since
-- (the device's own week start) or all time when p_since is null.
create or replace function public.fitclub_leaderboard(p_scope text, p_since date) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  since date := public.fitclub_window(p_since);
  upto date := case when public.fitclub_window(p_since) is null then null else public.fitclub_window(p_since) + 6 end;
  people uuid[];
begin
  if me is null then raise exception 'unauthorized'; end if;
  if p_since is not null and since is null then raise exception 'bad_window'; end if;
  if p_scope = 'global' then
    select array_agg(user_id) into people from public.fitclub_scores where on_board;
    people := array(select distinct u from unnest(coalesce(people, '{}') || me) u);
  else
    people := public.fitclub_circle(me);
  end if;
  return jsonb_build_object(
    'onBoard', coalesce((select on_board from public.fitclub_scores where user_id = me), false),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object('rank', rnk, 'user', person, 'xp', xp, 'workouts', workouts, 'streak', streak, 'me', uid = me) order by rnk, name)
      from (
        select s.*, rank() over (order by s.xp desc, s.streak desc) as rnk from (
          select u as uid,
            jsonb_build_object('id', u, 'name', 'FitClub', 'username', '') || coalesce(public.fitclub_person(u), '{}'::jsonb) as person,
            coalesce((select name from public.fitclub_profiles where id = u), '') as name,
            public.fitclub_metric(u, 'xp', since, upto) as xp,
            public.fitclub_metric(u, 'workouts', since, upto) as workouts,
            coalesce((select streak from public.fitclub_scores where user_id = u), 0) as streak
          from unnest(people) u) s
        where s.xp > 0 or s.uid = me
        order by s.xp desc limit 100) ranked), '[]'::jsonb));
end $$;

-- Teams: the caller's group chats by their members' XP for the week, and
-- the busiest public groups.
create or replace function public.fitclub_team_board(p_since date) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  since date := public.fitclub_window(p_since);
begin
  if me is null then raise exception 'unauthorized'; end if;
  if since is null then raise exception 'bad_window'; end if;
  return jsonb_build_object(
    'mine', coalesce((
      select jsonb_agg(t order by (t->>'xp')::int desc, t->>'title') from (
        select jsonb_build_object('id', c.id, 'title', c.title, 'emoji', c.emoji, 'color', c.color,
          'members', (select count(*) from public.fitclub_chat_members x where x.chat_id = c.id),
          'xp', (select coalesce(sum(public.fitclub_metric(x.user_id, 'xp', since, since + 6)), 0) from public.fitclub_chat_members x where x.chat_id = c.id)) as t
        from public.fitclub_chats c join public.fitclub_chat_members m on m.chat_id = c.id and m.user_id = me
        where c.type = 'group') s), '[]'::jsonb),
    'top', coalesce((
      select jsonb_agg(t order by (t->>'xp')::int desc) from (
        select jsonb_build_object('id', c.id, 'title', c.title, 'emoji', c.emoji, 'color', c.color, 'username', coalesce(c.username, ''),
          'members', (select count(*) from public.fitclub_chat_members x where x.chat_id = c.id),
          'xp', (select coalesce(sum(public.fitclub_metric(x.user_id, 'xp', since, since + 6)), 0) from public.fitclub_chat_members x where x.chat_id = c.id)) as t
        from public.fitclub_chats c where c.type = 'group' and c.is_public
        order by (select count(*) from public.fitclub_chat_members x where x.chat_id = c.id) desc limit 50) s
      where (t->>'xp')::int > 0 limit 10), '[]'::jsonb));
end $$;

-- A challenge for everyone in a chat, posted there as a card. p_starts is the
-- device's today; the challenge runs p_days days from it.
create or replace function public.fitclub_challenge_create(p_chat uuid, p_metric text, p_target int, p_days int, p_title text, p_starts date) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  chat_type text;
  cid uuid;
  st date := coalesce(public.fitclub_window(p_starts), current_date);
  msg public.fitclub_messages;
begin
  if me is null then raise exception 'unauthorized'; end if;
  select type into chat_type from public.fitclub_chats where id = p_chat;
  if chat_type is null or public.fitclub_role_in(p_chat) is null then raise exception 'chat_not_found'; end if;
  if chat_type = 'channel' then raise exception 'not_in_channels'; end if;
  if p_metric not in ('workouts', 'xp', 'checklist', 'food') then raise exception 'bad_metric'; end if;
  if coalesce(p_days, 0) not between 1 and 62 then raise exception 'bad_days'; end if;
  if (select count(*) from public.fitclub_challenges where chat_id = p_chat and ends >= current_date) >= 5 then raise exception 'too_many_challenges'; end if;
  insert into public.fitclub_challenges (chat_id, created_by, metric, target, title, starts, ends)
  values (p_chat, me, p_metric, case when p_target between 1 and 100000 then p_target end, left(btrim(coalesce(p_title, '')), 80), st, st + p_days - 1)
  returning id into cid;
  insert into public.fitclub_messages (chat_id, sender_id, kind, text, media)
  values (p_chat, me, 'challenge', left(btrim(coalesce(p_title, '')), 80), jsonb_build_object('challengeId', cid))
  returning * into msg;
  update public.fitclub_chat_members set last_read_at = msg.created_at where chat_id = p_chat and user_id = me;
  return jsonb_build_object('challenge', public.fitclub_challenge_view(cid), 'message', public.fitclub_message_view(msg));
end $$;

create or replace function public.fitclub_challenge_board(p_challenge uuid) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare chat uuid := (select chat_id from public.fitclub_challenges where id = p_challenge);
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if chat is null or public.fitclub_role_in(chat) is null then raise exception 'challenge_not_found'; end if;
  return public.fitclub_challenge_view(p_challenge);
end $$;

-- ─────────────────────────────── who may call what ───────────────────────────────

revoke all on function public.fitclub_circle(uuid), public.fitclub_window(date), public.fitclub_metric(uuid, text, date, date),
  public.fitclub_challenge_view(uuid)
  from public, anon, authenticated;
revoke all on function public.fitclub_publish_activity(jsonb, int, int), public.fitclub_set_on_board(boolean),
  public.fitclub_leaderboard(text, date), public.fitclub_team_board(date),
  public.fitclub_challenge_create(uuid, text, int, int, text, date), public.fitclub_challenge_board(uuid)
  from public, anon;
grant execute on function public.fitclub_publish_activity(jsonb, int, int), public.fitclub_set_on_board(boolean),
  public.fitclub_leaderboard(text, date), public.fitclub_team_board(date),
  public.fitclub_challenge_create(uuid, text, int, int, text, date), public.fitclub_challenge_board(uuid)
  to authenticated;
