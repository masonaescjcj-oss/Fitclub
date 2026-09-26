// Push notifications (supabase/migrations/0008) on PGlite: people keep their
// own subscriptions; only the server, with its secret, learns who to tell.

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

const A = "aaaaaaaa-0000-0000-0000-000000000001"; // anna, writes
const B = "bbbbbbbb-0000-0000-0000-000000000002"; // ben, in the chat
const C = "cccccccc-0000-0000-0000-000000000003"; // cara, in the chat, messages off
const D = "dddddddd-0000-0000-0000-000000000004"; // dan, outside
await db.exec(`
  insert into auth.users (id, email) values ('${A}', 'a@x.test'), ('${B}', 'b@x.test'), ('${C}', 'c@x.test'), ('${D}', 'd@x.test');
  insert into public.fitclub_profiles (id, username, name) values ('${A}', 'anna_lifts', 'Anna'), ('${B}', 'ben_runs', 'Ben'), ('${C}', 'cara_flow', 'Cara'), ('${D}', 'dan_moves', 'Dan');
  insert into public.fitclub_push_config (key, value) values ('server_secret_sha256', encode(sha256(convert_to('s3cret-for-tests', 'utf8')), 'hex'));
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
const sub = (tag) => ({ endpoint: `https://push.example.com/send/${tag}-0123456789abcdef`, keys: { p256dh: `BPp256dh-key-for-${tag}-0123456789`, auth: `auth-${tag}-xyz` } });

check("Ben saves his phone's subscription", (await rpc(B, "push_save", sub("ben"), { lang: "en", tzOffset: 210, messages: true, reminders: true })).value === true);
check("Cara saves hers with messages off", (await rpc(C, "push_save", sub("cara"), { lang: "fa", messages: false, reminders: true })).ok);
check("Dan saves his", (await rpc(D, "push_save", sub("dan"), {})).ok);
check("nobody reads subscriptions", !(await as(B, "select * from public.fitclub_push_subscriptions")).ok && !(await as(null, "select * from public.fitclub_push_subscriptions")).ok);
check("…or the server secret", !(await as(B, "select * from public.fitclub_push_config")).ok);
check("a visitor can't save one", !(await rpc(null, "push_save", sub("x"), {})).ok);
check("a made-up endpoint is refused", !(await rpc(B, "push_save", { endpoint: "http://evil", keys: { p256dh: "x", auth: "y" } }, {})).ok);

const g = (await rpc(A, "create_chat", "group", "Squad", "", "", "", false, null, ["ben_runs", "cara_flow"])).value;
const m = (await rpc(A, "send", g.id, { text: "Gym at 7?" })).value;
check("without the secret, nobody learns who to tell", (await rpc(null, "push_for_message", "wrong", m.id, A)).error?.includes("unauthorized")
  && (await rpc(B, "push_for_message", "", m.id, A)).error?.includes("unauthorized"));
let r = await rpc(null, "push_for_message", "s3cret-for-tests", m.id, B);
check("…nor for someone who didn't send it", r.ok && r.value.targets.length === 0);
r = await rpc(null, "push_for_message", "s3cret-for-tests", m.id, A);
check("the server learns: Ben, in the chat with messages on (not Cara, not Dan, not Anna)", r.ok && r.value.targets.length === 1 && r.value.targets[0].endpoint === sub("ben").endpoint && r.value.targets[0].keys.auth === sub("ben").keys.auth, r.value);
check("…with a title and preview to show", r.value.title === "Squad" && r.value.body === "Anna: Gym at 7?" && r.value.chatId === g.id);
check("a message is announced once", (await rpc(null, "push_for_message", "s3cret-for-tests", m.id, A)).value.targets.length === 0);
await db.exec(`update public.fitclub_messages set created_at = now() - interval '10 minutes' where id = '${(await rpc(A, "send", g.id, { text: "old" })).value.id}'`);
const old = (await db.query(`select id from public.fitclub_messages where text = 'old'`)).rows[0].id;
check("…and only while it's fresh", (await rpc(null, "push_for_message", "s3cret-for-tests", old, A)).value.targets.length === 0);
const p = (await rpc(A, "private_chat", "ben_runs")).value;
const pm = (await rpc(A, "send", p.id, { kind: "checklist", checklist: { title: "Groceries", items: ["Eggs"] } })).value;
r = await rpc(null, "push_for_message", "s3cret-for-tests", pm.id, A);
check("a private chat is titled with the sender; a checklist previews its title", r.value.title === "Anna" && r.value.body === "☑️ Groceries");

// Evening reminders: Ben (UTC+3:30) and Cara; nothing logged yet.
await db.exec(`update public.fitclub_push_subscriptions set tz_offset = ((20 - extract(hour from now() at time zone 'UTC'))::int * 60 + 1440) % 1440 - (case when ((20 - extract(hour from now() at time zone 'UTC'))::int * 60 + 1440) % 1440 > 840 then 1440 else 0 end) where endpoint <> '${sub("dan").endpoint}'`);
// …and Dan's morning, whatever the hour the tests run (his default, Tehran, is evening for part of the day).
await db.exec(`update public.fitclub_push_subscriptions set tz_offset = ((8 - extract(hour from now() at time zone 'UTC'))::int * 60 + 1440) % 1440 - (case when ((8 - extract(hour from now() at time zone 'UTC'))::int * 60 + 1440) % 1440 > 840 then 1440 else 0 end) where endpoint = '${sub("dan").endpoint}'`);
check("reminders need the secret", (await rpc(null, "push_due_reminders", "nope")).error?.includes("unauthorized"));
await rpc(B, "publish_activity", [{ day: (await db.query(`select (now() at time zone 'UTC' + make_interval(mins => (select tz_offset from public.fitclub_push_subscriptions where endpoint = '${sub("ben").endpoint}')))::date::text as d`)).rows[0].d, workouts: 1 }], 1, 1);
r = await rpc(null, "push_due_reminders", "s3cret-for-tests");
check("in their evening, only those who logged nothing today are reminded (Cara, not Ben)", r.ok && r.value.targets.length === 1 && r.value.targets[0].endpoint === sub("cara").endpoint, r.value);
check("…once a day", (await rpc(null, "push_due_reminders", "s3cret-for-tests")).value.targets.length === 0);
check("a subscription the push service dropped is forgotten", (await rpc(null, "push_gone", "s3cret-for-tests", sub("dan").endpoint)).value === true);
check("Ben removes his own, not others'", (await rpc(B, "push_remove", sub("cara").endpoint)).value === false && (await rpc(B, "push_remove", sub("ben").endpoint)).value === true);
check("the phone moves with a new sign-in", (await rpc(D, "push_save", sub("cara"), {})).ok && (await db.query(`select user_id from public.fitclub_push_subscriptions where endpoint = '${sub("cara").endpoint}'`)).rows[0].user_id === D);

console.log(`push schema: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
