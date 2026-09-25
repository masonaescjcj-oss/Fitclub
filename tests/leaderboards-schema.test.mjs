// Leaderboards, teams and challenges (supabase/migrations/0006) on PGlite:
// published activity scored on the server, boards seen from each side.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..", "supabase", "migrations");
const migrations = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort().map((f) => readFileSync(join(dir, f), "utf8"));

let passed = 0;
let failed = 0;
const check = (name, cond, got) => {
  if (cond) passed += 1;
  else { failed += 1; console.log("FAIL:", name, got !== undefined ? JSON.stringify(got).slice(0, 400) : ""); }
};

const db = new PGlite();
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid default auth.uid());
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  grant usage on schema public, auth, storage to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  -- Another app in the same project.
  create table public.todo_items (id serial primary key, owner uuid, done boolean);
  alter table public.todo_items enable row level security;
  create policy "own todos" on public.todo_items for select using (owner = auth.uid());
`);
const FINGERPRINT = `select
  (select string_agg(table_name, ',' order by table_name) from information_schema.tables where table_schema = 'public' and table_name not like 'fitclub\\_%') as tables,
  (select string_agg(polname, ',' order by polname) from pg_policy p join pg_class c on c.oid = p.polrelid where c.relname not like 'fitclub\\_%' and polname not like 'fitclub:%') as policies,
  (select string_agg(proname, ',' order by proname) from pg_proc where pronamespace = 'public'::regnamespace and proname not like 'fitclub\\_%') as functions`;
const before = (await db.query(FINGERPRINT)).rows[0];
for (const sql of migrations) await db.exec(sql);
let rerun = true;
try { for (const sql of migrations) await db.exec(sql); } catch (e) { rerun = false; console.log(e.message); }
check("the migrations run twice without trouble", rerun);
check("other apps' tables, policies and functions are untouched", JSON.stringify(before) === JSON.stringify((await db.query(FINGERPRINT)).rows[0]));

const A = "aaaaaaaa-0000-0000-0000-000000000001"; // anna
const B = "bbbbbbbb-0000-0000-0000-000000000002"; // ben, chats with anna
const C = "cccccccc-0000-0000-0000-000000000003"; // cara, on the global board
const D = "dddddddd-0000-0000-0000-000000000004"; // dan, nobody's friend
await db.exec(`
  insert into auth.users (id, email) values ('${A}', 'a@x.test'), ('${B}', 'b@x.test'), ('${C}', 'c@x.test'), ('${D}', 'd@x.test');
  insert into public.fitclub_profiles (id, username, name) values ('${A}', 'anna_lifts', 'Anna'), ('${B}', 'ben_runs', 'Ben'), ('${C}', 'cara_flow', 'Cara'), ('${D}', 'dan_moves', 'Dan');
`);
async function as(uid, sql, params = []) {
  try {
    await db.exec(`set role ${uid ? "authenticated" : "anon"}; select set_config('request.jwt.claim.sub', '${uid || ""}', false);`);
    return { ok: true, rows: (await db.query(sql, params)).rows };
  } catch (error) { return { ok: false, error: error.message }; }
  finally { await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);"); }
}
async function rpc(uid, fn, ...args) {
  const r = await as(uid, `select public.fitclub_${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as v`, args);
  return r.ok ? { ok: true, value: r.rows[0].v } : r;
}
const iso = (d) => d.toISOString().slice(0, 10);
const today = new Date();
const ago = (n) => iso(new Date(today.getTime() - n * 86400000));
const weekStart = ago(3);

// ── publishing ──
let r = await rpc(A, "publish_activity", [
  { day: ago(0), workouts: 1, records: 1, checklist: true, food: true, xp: 999999 },
  { day: ago(1), workouts: 2, records: 0, checklist: false, food: true },
  { day: ago(20), workouts: 1 },
  { day: "2099-01-01", workouts: 5 }, { day: "nonsense", workouts: 1 }, "x",
], 4, 9);
check("Anna publishes her days; the future and junk are skipped", r.ok && r.value === 3, r);
const mine = (await db.query(`select day::text, xp from public.fitclub_activity where user_id = '${A}' order by day desc`)).rows;
check("…and the server works out the XP itself: 20 + 50 + 10 + 5", mine[0].xp === 85 && mine[1].xp === 45, mine);
r = await rpc(B, "publish_activity", [{ day: ago(0), workouts: 99, records: 99, checklist: true, food: true }], 30, 30);
check("a day's counts are capped at what a day can hold", (await db.query(`select workouts, records, xp from public.fitclub_activity where user_id = '${B}'`)).rows[0].xp === 20 * 6 + 50 * 20 + 15);
await rpc(C, "publish_activity", [{ day: ago(0), workouts: 1 }], 1, 1);
await rpc(D, "publish_activity", [{ day: ago(0), workouts: 3 }], 2, 2);
check("nobody reads the tables directly", !(await as(A, "select * from public.fitclub_activity")).ok && !(await as(A, "select * from public.fitclub_scores")).ok);
check("more than 120 days in one go is refused", (await rpc(A, "publish_activity", Array.from({ length: 121 }, (_, i) => ({ day: ago(i) })), 0, 0)).error?.includes("bad_days"));

// ── the friends board ──
const chat = (await rpc(A, "private_chat", "ben_runs")).value;
r = await rpc(A, "leaderboard", "friends", weekStart);
check("Anna's friends board: Ben (who she chats with) and her, not Dan", r.ok && r.value.rows.map((x) => x.user.id).join() === [B, A].join(), r.value?.rows);
check("…ranked, with this week's XP and her own row marked", r.value.rows[0].rank === 1 && r.value.rows[1].me === true && r.value.rows[1].xp === 130 && r.value.rows[1].workouts === 3 && r.value.rows[1].streak === 4);
r = await rpc(A, "leaderboard", "friends", null);
check("all time counts older days too", r.value.rows.find((x) => x.me).xp === 150);
check("a made-up week is refused", (await rpc(A, "leaderboard", "friends", "2020-01-01")).error?.includes("bad_window"));

// ── the global board: only those who chose it ──
r = await rpc(A, "leaderboard", "global", weekStart);
check("the global board starts with just me", r.value.rows.length === 1 && r.value.rows[0].me && r.value.onBoard === false);
await rpc(C, "set_on_board", true);
r = await rpc(A, "leaderboard", "global", weekStart);
check("Cara chose to be on it; Ben and Dan didn't", r.value.rows.map((x) => x.user.id).sort().join() === [A, C].sort().join());
check("…and she sees herself on it", (await rpc(C, "leaderboard", "global", weekStart)).value.onBoard === true);

// ── teams ──
const g = (await rpc(A, "create_chat", "group", "Leg Day", "", "🦵", "", true, "leg_day_crew", ["ben_runs"])).value;
r = await rpc(A, "team_board", weekStart);
check("Anna's group scores its members' week", r.ok && r.value.mine.length === 1 && r.value.mine[0].id === g.id && r.value.mine[0].xp === 130 + 1135 && r.value.mine[0].members === 2, r.value);
check("…and as a public group it's among the top", r.value.top.some((t) => t.id === g.id));
check("Dan sees the public group, not as his own", (await rpc(D, "team_board", weekStart)).value.mine.length === 0 && (await rpc(D, "team_board", weekStart)).value.top.length === 1);

// ── a challenge ──
r = await rpc(A, "challenge_create", g.id, "workouts", 5, 7, "Five this week", ago(0));
check("Anna starts a challenge in the group", r.ok && r.value.challenge.metric === "workouts" && r.value.challenge.target === 5 && r.value.message.kind === "challenge", r);
const ch = r.value.challenge;
check("…posted as a card that names it", r.value.message.media.challengeId === ch.id && (await rpc(B, "history", g.id, null)).value.some((m) => m.kind === "challenge"));
check("…counting from today", ch.rows.find((x) => x.user.id === A).value === 1 && ch.rows.find((x) => x.user.id === B).value === 6);
await rpc(A, "publish_activity", [{ day: ago(0), workouts: 3 }], 4, 9);
check("new workouts move the board", (await rpc(B, "challenge_board", ch.id)).value.rows.find((x) => x.user.id === A).value === 3);
check("Dan, outside the group, can't see it", (await rpc(D, "challenge_board", ch.id)).error?.includes("challenge_not_found"));
check("a challenge can't be longer than 62 days", (await rpc(A, "challenge_create", g.id, "xp", null, 90, "", ago(0))).error?.includes("bad_days"));
check("…or on a made-up metric", (await rpc(A, "challenge_create", g.id, "steps", null, 7, "", ago(0))).error?.includes("bad_metric"));
check("a private chat can hold one too", (await rpc(B, "challenge_create", chat.id, "xp", 500, 14, "", ago(0))).ok);
check("people can't post a challenge card themselves", (await rpc(A, "send", g.id, { kind: "challenge", text: "fake" })).value.kind === "text");

console.log(`leaderboards schema: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
