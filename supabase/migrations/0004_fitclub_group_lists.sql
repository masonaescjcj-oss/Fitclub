-- FitClub · 0004 · group checklists shared between real accounts
--
-- A group list lives here, with its members, its items and every member's
-- ticks; personal lists stay in each account's own synced data (0001). The
-- same corner as before: every table and function carries the fitclub_
-- prefix and nothing else in the project is touched.
--
--   - Tables are read under row-level security: a person reads the lists
--     they are in. Every write goes through a function below.
--   - Any member can edit the list and its items and add people, as in a
--     shared note. Only the owner removes others or deletes the list; anyone
--     can leave. When the owner leaves, the longest-standing member takes
--     over, and the last one out deletes the list.
--   - A tick is one member's own: the functions only write the caller's entry,
--     in one statement, so two people ticking at once never undo each other.
--   - A period rolls over once. The first device to see it ended asks, and
--     the list moves only if it is still on the period that device saw. The
--     finished period is scored here, from the ticks, so every member's
--     history and streak agree.
--   - Every change touches the list's row; Realtime tells the members'
--     devices, which reload it.
--
-- Run after 0002. Safe to run again.

-- ─────────────────────────────── tables ───────────────────────────────

create table if not exists public.fitclub_lists (
  id            uuid primary key default gen_random_uuid(),
  name          text not null default '' check (char_length(name) <= 80),
  emoji         text not null default '✅' check (char_length(emoji) <= 16),
  color         text not null default '' check (char_length(color) <= 16),
  group_rule    text not null default 'everyone' check (group_rule in ('everyone', 'anyone')),
  reset         jsonb not null default '{"mode": "daily", "resetHour": 0}'::jsonb,
  period_key    text not null default 'static' check (char_length(period_key) <= 40),
  last_reset_at timestamptz,
  streak        int not null default 0,
  best_streak   int not null default 0,
  history       jsonb not null default '[]'::jsonb,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.fitclub_list_members (
  list_id   uuid not null references public.fitclub_lists (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (list_id, user_id)
);
create index if not exists fitclub_list_members_user on public.fitclub_list_members (user_id);

create table if not exists public.fitclub_list_items (
  list_id    uuid not null references public.fitclub_lists (id) on delete cascade,
  id         text not null check (char_length(id) between 1 and 40),
  position   int not null default 0,
  text       text not null default '' check (char_length(text) <= 300),
  note       text not null default '' check (char_length(note) <= 1000),
  emoji      text not null default '' check (char_length(emoji) <= 16),
  priority   text not null default 'none' check (priority in ('none', 'low', 'medium', 'high')),
  due        text check (due is null or due ~ '^\d{4}-\d{2}-\d{2}$'),
  assignees  uuid[] not null default '{}',
  done_by    jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (list_id, id)
);

-- ─────────────────────────────── helpers ───────────────────────────────

-- The caller's role in a list: 'owner', 'member', or null when they're not in it.
create or replace function public.fitclub_list_role(p_list uuid) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select role from public.fitclub_list_members where list_id = p_list and user_id = auth.uid()
$$;

-- A reset schedule with only the fields the app uses, each in range.
create or replace function public.fitclub_list_clean_reset(r jsonb) returns jsonb
language plpgsql immutable set search_path = public, pg_temp as $$
declare
  m text := coalesce(r->>'mode', 'daily');
  num text := '^\d{1,15}(\.\d+)?$';
begin
  if jsonb_typeof(r) is distinct from 'object' or m not in ('none', 'daily', 'weekly', 'monthly', 'interval') then
    raise exception 'bad_reset';
  end if;
  return jsonb_strip_nulls(jsonb_build_object(
    'mode', m,
    'resetHour', case when r->>'resetHour' ~ num then least(greatest((r->>'resetHour')::numeric::int, 0), 23) else 0 end,
    'weekStart', case when r->>'weekStart' ~ num then least(greatest((r->>'weekStart')::numeric::int, 0), 6) else 6 end,
    'monthDay', case when r->>'monthDay' ~ num then least(greatest((r->>'monthDay')::numeric::int, 1), 28) else 1 end,
    'every', case when r->>'every' ~ num then least(greatest((r->>'every')::numeric::int, 1), 365) else 2 end,
    'anchor', case when r->>'anchor' ~ num then (r->>'anchor')::numeric::bigint end));
end $$;

-- A period history as the app keeps it: the last 30 of {key, done, total}.
create or replace function public.fitclub_list_clean_history(h jsonb) returns jsonb
language sql immutable set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(e order by n), '[]'::jsonb) from (
    select jsonb_build_object(
        'key', left(coalesce(x->>'key', ''), 40),
        'done', case when x->>'done' ~ '^\d{1,4}$' then (x->>'done')::int else 0 end,
        'total', case when x->>'total' ~ '^\d{1,4}$' then (x->>'total')::int else 0 end) as e, n
    from jsonb_array_elements(case when jsonb_typeof(h) = 'array' then h else '[]'::jsonb end) with ordinality as a(x, n)
    where jsonb_typeof(x) = 'object'
    order by n desc limit 30) s
$$;

-- The list as its members see it, with its people and items.
create or replace function public.fitclub_list_view(p_list uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'id', l.id, 'name', l.name, 'emoji', l.emoji, 'color', l.color, 'type', 'group', 'groupRule', l.group_rule,
    'reset', l.reset, 'periodKey', l.period_key, 'lastResetAt', public.fitclub_iso(l.last_reset_at),
    'streak', l.streak, 'bestStreak', l.best_streak, 'history', l.history,
    'createdAt', public.fitclub_iso(l.created_at), 'updatedAt', public.fitclub_iso(l.updated_at),
    'ownerId', (select m.user_id from public.fitclub_list_members m where m.list_id = l.id and m.role = 'owner' limit 1),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.user_id, 'name', 'FitClub', 'username', '') || coalesce(public.fitclub_person(m.user_id), '{}'::jsonb)
        order by m.joined_at, m.user_id)
      from public.fitclub_list_members m where m.list_id = l.id), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', i.id, 'text', i.text, 'note', i.note, 'emoji', i.emoji, 'priority', i.priority, 'due', i.due,
          'assignees', to_jsonb(i.assignees), 'doneBy', i.done_by, 'createdAt', public.fitclub_iso(i.created_at))
        order by i.position, i.created_at, i.id)
      from public.fitclub_list_items i where i.list_id = l.id), '[]'::jsonb))
  from public.fitclub_lists l where l.id = p_list
$$;

-- Tells the members' devices the list changed.
create or replace function public.fitclub_list_touch(p_list uuid) returns void
language sql security definer set search_path = public, pg_temp as $$
  update public.fitclub_lists set updated_at = now() where id = p_list
$$;

-- Writes one item from the app's JSON, as the caller: a new one whole, an
-- existing one only in the fields sent. Ticks are left alone, except on a
-- brand-new list, where the creator's own ticks come along.
create or replace function public.fitclub_list_put(p_list uuid, p_item jsonb, p_with_ticks boolean default false) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  members uuid[] := (select array_agg(user_id) from public.fitclub_list_members where list_id = p_list);
  item_id text := left(coalesce(p_item->>'id', ''), 40);
  who uuid[];
  ticks jsonb := '{}'::jsonb;
begin
  if item_id = '' then raise exception 'bad_item'; end if;
  select coalesce(array_agg(distinct a::uuid), '{}') into who
  from jsonb_array_elements_text(case when jsonb_typeof(p_item->'assignees') = 'array' then p_item->'assignees' else '[]'::jsonb end) a
  where a ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and a::uuid = any(members);
  if p_with_ticks and (p_item->'doneBy'->>(me::text)) is not null then
    ticks := jsonb_build_object(me::text, left(p_item->'doneBy'->>(me::text), 40));
  end if;
  insert into public.fitclub_list_items as i (list_id, id, position, text, note, emoji, priority, due, assignees, done_by, created_by)
  values (p_list, item_id,
    coalesce((select max(position) + 1 from public.fitclub_list_items where list_id = p_list), 0),
    left(coalesce(p_item->>'text', ''), 300), left(coalesce(p_item->>'note', ''), 1000), left(coalesce(p_item->>'emoji', ''), 16),
    case when p_item->>'priority' in ('none', 'low', 'medium', 'high') then p_item->>'priority' else 'none' end,
    case when p_item->>'due' ~ '^\d{4}-\d{2}-\d{2}$' then p_item->>'due' end,
    who, ticks, me)
  on conflict (list_id, id) do update set
    text = case when p_item ? 'text' then excluded.text else i.text end,
    note = case when p_item ? 'note' then excluded.note else i.note end,
    emoji = case when p_item ? 'emoji' then excluded.emoji else i.emoji end,
    priority = case when p_item ? 'priority' then excluded.priority else i.priority end,
    due = case when p_item ? 'due' then excluded.due else i.due end,
    assignees = case when p_item ? 'assignees' then excluded.assignees else i.assignees end,
    updated_at = now();
end $$;

-- Hands the list on when its owner goes, or deletes it when nobody is left.
create or replace function public.fitclub_list_settle(p_list uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from public.fitclub_list_members where list_id = p_list) then
    delete from public.fitclub_lists where id = p_list;
  elsif not exists (select 1 from public.fitclub_list_members where list_id = p_list and role = 'owner') then
    update public.fitclub_list_members set role = 'owner'
    where list_id = p_list and user_id = (
      select user_id from public.fitclub_list_members where list_id = p_list order by joined_at, user_id limit 1);
  end if;
end $$;

-- ─────────────────────────────── row-level security ───────────────────────────────

alter table public.fitclub_lists enable row level security;
alter table public.fitclub_list_members enable row level security;
alter table public.fitclub_list_items enable row level security;

drop policy if exists "fitclub: members read their lists" on public.fitclub_lists;
create policy "fitclub: members read their lists" on public.fitclub_lists
  for select to authenticated using (public.fitclub_list_role(id) is not null);

drop policy if exists "fitclub: members see who is in their lists" on public.fitclub_list_members;
create policy "fitclub: members see who is in their lists" on public.fitclub_list_members
  for select to authenticated using (user_id = auth.uid() or public.fitclub_list_role(list_id) is not null);

drop policy if exists "fitclub: members read their lists' items" on public.fitclub_list_items;
create policy "fitclub: members read their lists' items" on public.fitclub_list_items
  for select to authenticated using (public.fitclub_list_role(list_id) is not null);

revoke all on public.fitclub_lists, public.fitclub_list_members, public.fitclub_list_items from anon, authenticated;
grant select on public.fitclub_lists, public.fitclub_list_members, public.fitclub_list_items to authenticated;
grant select, insert, update, delete on public.fitclub_lists, public.fitclub_list_members, public.fitclub_list_items to service_role;

-- ─────────────────────────────── what the app calls ───────────────────────────────

-- Every list the caller is in.
create or replace function public.fitclub_lists_sync() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  return (select coalesce(jsonb_agg(public.fitclub_list_view(m.list_id) order by m.joined_at), '[]'::jsonb)
          from public.fitclub_list_members m where m.user_id = auth.uid());
end $$;

create or replace function public.fitclub_list_bundle(p_list uuid) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if public.fitclub_list_role(p_list) is null then raise exception 'list_not_found'; end if;
  return public.fitclub_list_view(p_list);
end $$;

-- A new group list (or a personal one turned into a group), with its items,
-- its history so far and the people in it (ids or @usernames).
create or replace function public.fitclub_list_create(p_list jsonb, p_items jsonb, p_members text[]) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  me uuid := auth.uid();
  new_id uuid;
  item jsonb;
begin
  if me is null then raise exception 'unauthorized'; end if;
  if (select count(*) from public.fitclub_list_members where user_id = me) >= 100 then raise exception 'too_many_lists'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 200 then raise exception 'too_many_items'; end if;
  insert into public.fitclub_lists (name, emoji, color, group_rule, reset, period_key, streak, best_streak, history, created_by)
  values (
    left(btrim(coalesce(p_list->>'name', '')), 80),
    left(coalesce(nullif(p_list->>'emoji', ''), '✅'), 16),
    left(coalesce(p_list->>'color', ''), 16),
    case when p_list->>'groupRule' = 'anyone' then 'anyone' else 'everyone' end,
    public.fitclub_list_clean_reset(coalesce(p_list->'reset', '{}'::jsonb)),
    left(coalesce(nullif(p_list->>'periodKey', ''), 'static'), 40),
    case when p_list->>'streak' ~ '^\d{1,4}$' then (p_list->>'streak')::int else 0 end,
    case when p_list->>'bestStreak' ~ '^\d{1,4}$' then (p_list->>'bestStreak')::int else 0 end,
    public.fitclub_list_clean_history(p_list->'history'),
    me)
  returning id into new_id;
  insert into public.fitclub_list_members (list_id, user_id, role) values (new_id, me, 'owner');
  insert into public.fitclub_list_members (list_id, user_id)
  select new_id, u from unnest(public.fitclub_resolve_people(coalesce(p_members, '{}'))) as u where u <> me limit 49
  on conflict do nothing;
  for item in select * from jsonb_array_elements(p_items) loop
    perform public.fitclub_list_put(new_id, item, true);
  end loop;
  return public.fitclub_list_view(new_id);
end $$;

-- The list's own settings: name, emoji, colour, rule, schedule.
create or replace function public.fitclub_list_update(p_list uuid, p_patch jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if public.fitclub_list_role(p_list) is null then raise exception 'list_not_found'; end if;
  update public.fitclub_lists set
    name = case when p_patch ? 'name' then left(btrim(coalesce(p_patch->>'name', '')), 80) else name end,
    emoji = case when p_patch ? 'emoji' then left(coalesce(nullif(p_patch->>'emoji', ''), '✅'), 16) else emoji end,
    color = case when p_patch ? 'color' then left(coalesce(p_patch->>'color', ''), 16) else color end,
    group_rule = case when p_patch->>'groupRule' in ('everyone', 'anyone') then p_patch->>'groupRule' else group_rule end,
    reset = case when p_patch ? 'reset' then public.fitclub_list_clean_reset(p_patch->'reset') else reset end,
    period_key = case when coalesce(p_patch->>'periodKey', '') <> '' then left(p_patch->>'periodKey', 40) else period_key end,
    updated_at = now()
  where id = p_list;
  return public.fitclub_list_view(p_list);
end $$;

create or replace function public.fitclub_list_add_members(p_list uuid, p_people text[]) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare room int;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if public.fitclub_list_role(p_list) is null then raise exception 'list_not_found'; end if;
  room := 50 - (select count(*) from public.fitclub_list_members where list_id = p_list);
  insert into public.fitclub_list_members (list_id, user_id)
  select p_list, u from unnest(public.fitclub_resolve_people(coalesce(p_people, '{}'))) as u
  where not exists (select 1 from public.fitclub_list_members where list_id = p_list and user_id = u)
  limit greatest(room, 0)
  on conflict do nothing;
  perform public.fitclub_list_touch(p_list);
  return public.fitclub_list_view(p_list);
end $$;

-- Takes someone out of the list: the owner removes others; anyone can leave.
-- Their ticks and assignments go with them. Returns the list, or {left: true}.
create or replace function public.fitclub_list_remove_member(p_list uuid, p_user uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'unauthorized'; end if;
  if public.fitclub_list_role(p_list) is null then raise exception 'list_not_found'; end if;
  if p_user is distinct from me and public.fitclub_list_role(p_list) <> 'owner' then raise exception 'owner_only'; end if;
  delete from public.fitclub_list_members where list_id = p_list and user_id = p_user;
  update public.fitclub_list_items set done_by = done_by - p_user::text, assignees = array_remove(assignees, p_user)
  where list_id = p_list;
  perform public.fitclub_list_settle(p_list);
  perform public.fitclub_list_touch(p_list);
  if p_user = me then return jsonb_build_object('left', true); end if;
  return public.fitclub_list_view(p_list);
end $$;

create or replace function public.fitclub_list_delete(p_list uuid) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if public.fitclub_list_role(p_list) is null then raise exception 'list_not_found'; end if;
  if public.fitclub_list_role(p_list) <> 'owner' then raise exception 'owner_only'; end if;
  delete from public.fitclub_lists where id = p_list;
  return jsonb_build_object('ok', true);
end $$;

-- Adds or edits one item.
create or replace function public.fitclub_list_put_item(p_list uuid, p_item jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if public.fitclub_list_role(p_list) is null then raise exception 'list_not_found'; end if;
  if jsonb_typeof(p_item) is distinct from 'object' then raise exception 'bad_item'; end if;
  if not exists (select 1 from public.fitclub_list_items where list_id = p_list and id = p_item->>'id')
     and (select count(*) from public.fitclub_list_items where list_id = p_list) >= 200 then
    raise exception 'too_many_items';
  end if;
  perform public.fitclub_list_put(p_list, p_item);
  perform public.fitclub_list_touch(p_list);
  return public.fitclub_list_view(p_list);
end $$;

create or replace function public.fitclub_list_remove_item(p_list uuid, p_item text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if public.fitclub_list_role(p_list) is null then raise exception 'list_not_found'; end if;
  delete from public.fitclub_list_items where list_id = p_list and id = p_item;
  perform public.fitclub_list_touch(p_list);
  return public.fitclub_list_view(p_list);
end $$;

-- The items in a new order; any not named keep their place after those that are.
create or replace function public.fitclub_list_reorder(p_list uuid, p_ids text[]) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if public.fitclub_list_role(p_list) is null then raise exception 'list_not_found'; end if;
  update public.fitclub_list_items i set position = cardinality(coalesce(p_ids, '{}')) + r.n
  from (select id, row_number() over (order by position, created_at, id) as n from public.fitclub_list_items
        where list_id = p_list and not (id = any(coalesce(p_ids, '{}')))) r
  where i.list_id = p_list and i.id = r.id;
  update public.fitclub_list_items i set position = o.n - 1
  from unnest(coalesce(p_ids, '{}')) with ordinality as o(id, n)
  where i.list_id = p_list and i.id = o.id;
  perform public.fitclub_list_touch(p_list);
  return public.fitclub_list_view(p_list);
end $$;

-- Ticks or unticks an item for the caller alone.
create or replace function public.fitclub_list_tick(p_list uuid, p_item text, p_done boolean) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare me text := auth.uid()::text;
begin
  if me is null then raise exception 'unauthorized'; end if;
  if public.fitclub_list_role(p_list) is null then raise exception 'list_not_found'; end if;
  update public.fitclub_list_items
  set done_by = case when p_done then done_by || jsonb_build_object(me, public.fitclub_iso(now())) else done_by - me end,
      updated_at = now()
  where list_id = p_list and id = p_item;
  if not found then raise exception 'item_not_found'; end if;
  perform public.fitclub_list_touch(p_list);
  return public.fitclub_list_view(p_list);
end $$;

-- "Reset now": every tick cleared, the schedule kept.
create or replace function public.fitclub_list_clear(p_list uuid, p_period text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if public.fitclub_list_role(p_list) is null then raise exception 'list_not_found'; end if;
  update public.fitclub_list_items set done_by = '{}'::jsonb, updated_at = now() where list_id = p_list;
  update public.fitclub_lists set last_reset_at = now(),
    period_key = case when coalesce(p_period, '') <> '' then left(p_period, 40) else period_key end, updated_at = now()
  where id = p_list;
  return public.fitclub_list_view(p_list);
end $$;

-- Rolls the list from period p_from to p_to, once. p_prev is the period just
-- before p_to: the streak carries on only if the list was on it. A device
-- whose clock is behind (a p_to earlier than p_from) changes nothing.
create or replace function public.fitclub_list_roll(p_list uuid, p_from text, p_to text, p_prev text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  l public.fitclub_lists;
  member_ids text[];
  v_done int;
  v_total int;
  perfect boolean;
  run int;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if public.fitclub_list_role(p_list) is null then raise exception 'list_not_found'; end if;
  select * into l from public.fitclub_lists where id = p_list for update;
  if l.period_key is distinct from p_from or coalesce(p_to, '') = '' or p_to = p_from
     or (split_part(p_to, ':', 1) = split_part(p_from, ':', 1) and p_to < p_from) then
    return public.fitclub_list_view(p_list);
  end if;
  select array_agg(user_id::text) into member_ids from public.fitclub_list_members where list_id = p_list;
  select count(*) filter (where done), count(*) into v_done, v_total from (
    select case
      when cardinality(t.targets) = 0 then false
      when l.group_rule = 'everyone' then not exists (select 1 from unnest(t.targets) x where not (i.done_by ? x))
      else exists (select 1 from unnest(t.targets) x where i.done_by ? x)
    end as done
    from public.fitclub_list_items i
    cross join lateral (
      select coalesce(nullif(array(select a::text from unnest(i.assignees) a where a::text = any(member_ids)), '{}'), member_ids) as targets
    ) t
    where i.list_id = p_list) s;
  perfect := v_total > 0 and v_done = v_total;
  run := case when not perfect then 0 when l.period_key = p_prev then l.streak + 1 else 1 end;
  update public.fitclub_list_items set done_by = '{}'::jsonb where list_id = p_list;
  update public.fitclub_lists set
    period_key = left(p_to, 40), last_reset_at = now(), streak = run, best_streak = greatest(best_streak, run),
    history = public.fitclub_list_clean_history(history || jsonb_build_array(jsonb_build_object('key', l.period_key, 'done', v_done, 'total', v_total))),
    updated_at = now()
  where id = p_list;
  return public.fitclub_list_view(p_list);
end $$;

-- People to add to a list: whoever shares a chat or a list with the caller.
create or replace function public.fitclub_list_contacts() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'unauthorized'; end if;
  return (select coalesce(jsonb_agg(public.fitclub_person(id)), '[]'::jsonb) from (
    select distinct p.id, p.name from public.fitclub_profiles p
    where p.id <> me and p.id in (
      select o.user_id from public.fitclub_chat_members mine join public.fitclub_chat_members o on o.chat_id = mine.chat_id
      join public.fitclub_chats c on c.id = mine.chat_id and c.type <> 'channel'
      where mine.user_id = me
      union
      select o.user_id from public.fitclub_list_members mine join public.fitclub_list_members o on o.list_id = mine.list_id
      where mine.user_id = me)
    order by p.name limit 100) s);
end $$;

-- ─────────────────────────────── who may call what ───────────────────────────────

revoke all on function public.fitclub_list_clean_reset(jsonb), public.fitclub_list_clean_history(jsonb),
  public.fitclub_list_view(uuid), public.fitclub_list_touch(uuid), public.fitclub_list_put(uuid, jsonb, boolean),
  public.fitclub_list_settle(uuid)
  from public, anon, authenticated;

revoke all on function public.fitclub_list_role(uuid), public.fitclub_lists_sync(), public.fitclub_list_bundle(uuid),
  public.fitclub_list_create(jsonb, jsonb, text[]), public.fitclub_list_update(uuid, jsonb),
  public.fitclub_list_add_members(uuid, text[]), public.fitclub_list_remove_member(uuid, uuid), public.fitclub_list_delete(uuid),
  public.fitclub_list_put_item(uuid, jsonb), public.fitclub_list_remove_item(uuid, text), public.fitclub_list_reorder(uuid, text[]),
  public.fitclub_list_tick(uuid, text, boolean), public.fitclub_list_clear(uuid, text), public.fitclub_list_roll(uuid, text, text, text),
  public.fitclub_list_contacts()
  from public, anon;
grant execute on function public.fitclub_list_role(uuid), public.fitclub_lists_sync(), public.fitclub_list_bundle(uuid),
  public.fitclub_list_create(jsonb, jsonb, text[]), public.fitclub_list_update(uuid, jsonb),
  public.fitclub_list_add_members(uuid, text[]), public.fitclub_list_remove_member(uuid, uuid), public.fitclub_list_delete(uuid),
  public.fitclub_list_put_item(uuid, jsonb), public.fitclub_list_remove_item(uuid, text), public.fitclub_list_reorder(uuid, text[]),
  public.fitclub_list_tick(uuid, text, boolean), public.fitclub_list_clear(uuid, text), public.fitclub_list_roll(uuid, text, text, text),
  public.fitclub_list_contacts()
  to authenticated;

-- ─────────────────────────────── realtime ───────────────────────────────
-- A changed list, and a list someone was just added to, reach devices live.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'fitclub_lists') then
      execute 'alter publication supabase_realtime add table public.fitclub_lists';
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'fitclub_list_members') then
      execute 'alter publication supabase_realtime add table public.fitclub_list_members';
    end if;
  end if;
end $$;
