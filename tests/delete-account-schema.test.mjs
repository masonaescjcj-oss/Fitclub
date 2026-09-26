// Deleting an account from inside the app (supabase/migrations/0011) on
// PGlite: everything FitClub keeps about the person goes, the people they
// talked to keep their chats and lists, and a phone still signed in from
// before can't write the data back.

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
  create table auth.sessions (id uuid primary key, user_id uuid, created_at timestamptz not null default now());
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
  (select string_agg(proname, ',' order by proname) from pg_proc where pronamespace = 'public'::regnamespace and proname not like 'fitclub\\_%') as functions,
  (select string_agg(tgname, ',' order by tgname) from pg_trigger t join pg_class c on c.oid = t.tgrelid where not tgisinternal and c.relname not like 'fitclub\\_%') as triggers`;
const before = (await db.query(FINGERPRINT)).rows[0];
for (const sql of migrations) await db.exec(sql);
let rerun = true;
try { for (const sql of migrations) await db.exec(sql); } catch (e) { rerun = false; console.log(e.message); }
check("the migrations run twice without trouble", rerun);
check("other apps' tables, policies, functions and triggers are untouched", JSON.stringify(before) === JSON.stringify((await db.query(FINGERPRINT)).rows[0]));

const A = "aaaaaaaa-0000-0000-0000-000000000001"; // anna, deletes her account
const B = "bbbbbbbb-0000-0000-0000-000000000002"; // ben, chats with her
const C = "cccccccc-0000-0000-0000-000000000003"; // cara, in her group
const OLD = "0a000000-0000-0000-0000-00000000000a"; // anna's session from before
const NEW = "0b000000-0000-0000-0000-00000000000b"; // anna signs in again
await db.exec(`
  insert into auth.users (id, email) values ('${A}', 'a@x.test'), ('${B}', 'b@x.test'), ('${C}', 'c@x.test');
  insert into public.fitclub_profiles (id, username, name) values ('${A}', 'anna_lifts', 'Anna'), ('${B}', 'ben_runs', 'Ben'), ('${C}', 'cara_flow', 'Cara');
  insert into auth.sessions (id, user_id, created_at) values ('${OLD}', '${A}', now() - interval '3 days');
`);

// Runs as a signed-in person. `claims` are the token's, as PostgREST sets them.
async function as(uid, sql, params = [], claims = null) {
  try {
    await db.exec(`set role ${uid ? "authenticated" : "anon"}; select set_config('request.jwt.claim.sub', '${uid || ""}', false);`);
    await db.query("select set_config('request.jwt.claims', $1, false)", [claims ? JSON.stringify({ sub: uid, ...claims }) : ""]);
    return { ok: true, rows: (await db.query(sql, params)).rows };
  } catch (error) { return { ok: false, error: error.message }; }
  finally { await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false); select set_config('request.jwt.claims', '', false);"); }
}
async function rpc(uid, fn, ...args) {
  const r = await as(uid, `select public.fitclub_${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as v`, args);
  return r.ok ? { ok: true, value: r.rows[0].v } : r;
}
const q = async (sql) => (await db.query(sql)).rows;
const count = async (sql) => Number((await q(sql))[0].n);

// ── Anna's FitClub, before ──
await as(A, `insert into public.fitclub_user_state (user_id, key, data) values ('${A}', 'diary.v1', '{"x": 1}'), ('${A}', 'plan.v1', '{}')`);
await rpc(A, "publish_activity", [{ day: new Date().toISOString().slice(0, 10), workouts: 1 }], 3, 5);
await rpc(A, "set_on_board", true);
await rpc(A, "push_save", { endpoint: "https://push.example/a", keys: { p256dh: "k", auth: "s" } }, { lang: "en" });
await rpc(A, "send_feedback", "idea", "More squats", { page: "/" });
await rpc(A, "report_error", { kind: "error", message: "boom", page: "/" });
await rpc(B, "report_error", { kind: "error", message: "bang", page: "/" });

const dm = (await rpc(A, "private_chat", "ben_runs")).value;
const hers = (await rpc(A, "send", dm.id, { kind: "text", text: "hi Ben" })).value;
await rpc(B, "send", dm.id, { kind: "text", text: "hi Anna" });

const g = (await rpc(A, "create_chat", "group", "Lifters", "", "", "", false, null, ["ben_runs", "cara_flow"])).value;
await rpc(A, "toggle_admin", g.id, C);
const aText = (await rpc(A, "send", g.id, { kind: "text", text: "my secret PR" })).value;
const aPoll = (await rpc(A, "send", g.id, { kind: "poll", poll: { question: "Mine?", options: [{ text: "a", votes: [] }] } })).value;
const bMsg = (await rpc(B, "send", g.id, { kind: "text", text: "Ben here" })).value;
await rpc(A, "react", bMsg.id, "🔥");
await rpc(C, "react", bMsg.id, "🔥");
await rpc(A, "react", bMsg.id, "👍");
const bPoll = (await rpc(B, "send", g.id, { kind: "poll", poll: { question: "Legs?", multiple: true, options: [{ text: "yes", votes: [] }, { text: "no", votes: [] }] } })).value;
await rpc(A, "vote", bPoll.id, 0);
await rpc(C, "vote", bPoll.id, 0);
const bList = (await rpc(B, "send", g.id, { kind: "checklist", checklist: { title: "Bag", othersCanMark: true, othersCanAdd: true, items: ["Shoes", "Towel"] } })).value;
await rpc(A, "checklist_mark", bList.id, "t1", true);
await rpc(C, "checklist_mark", bList.id, "t2", true);
await rpc(A, "checklist_add", bList.id, "Chalk");
await rpc(A, "challenge_create", g.id, "workouts", 5, 7, "Five this week", null);

const alone = (await rpc(A, "create_chat", "group", "Just me", "", "", "", false, null, [])).value;
const ch = (await rpc(B, "create_chat", "channel", "Ben's tips", "", "", "", false, null, ["anna_lifts"])).value;

const list = (await rpc(A, "list_create", { name: "Morning" }, [{ id: "i1", text: "Stretch", assignees: [A, B] }], ["ben_runs"])).value;
await rpc(A, "list_tick", list.id, "i1", true);
await rpc(B, "list_tick", list.id, "i1", true);
const solo = (await rpc(A, "list_create", { name: "Solo" }, [], [])).value;

await db.exec(`
  insert into storage.objects (bucket_id, name, owner) values
    ('fitclub-avatars', '${A}/face.jpg', '${A}'), ('fitclub-avatars', '${B}/face.jpg', '${B}'),
    ('fitclub-chat-media', '${dm.id}/ben.jpg', '${B}'), ('fitclub-chat-media', '${g.id}/anna.jpg', '${A}'),
    ('fitclub-chat-media', '${g.id}/ben.jpg', '${B}'), ('fitclub-chat-media', '${alone.id}/note.jpg', '${A}'),
    ('other-app-bucket', '${A}/x.jpg', '${A}');
`);
check("everything is in place before", dm?.id && g?.id && alone?.id && ch?.id && list?.id && solo?.id && aPoll?.id && bList?.id
  && await count(`select count(*) n from public.fitclub_activity where user_id = '${A}'`) === 1);

// ── Her photos ──
const photos = (await rpc(A, "my_photos")).value;
check("her photos: her profile photo", JSON.stringify(photos.avatars) === JSON.stringify([`${A}/face.jpg`]), photos);
check("…the chat photos she sent, and every photo in a chat that goes with her",
  JSON.stringify([...photos.chat].sort()) === JSON.stringify([`${alone.id}/note.jpg`, `${dm.id}/ben.jpg`, `${g.id}/anna.jpg`].sort()), photos);
check("…not Ben's photo in the group that stays, nor another app's files", !photos.chat.includes(`${g.id}/ben.jpg`) && !JSON.stringify(photos).includes("x.jpg"));
check("nobody signed out can ask for photos", !(await rpc(null, "my_photos")).ok);

// ── Deleting ──
check("a call without the confirmation word deletes nothing", (await rpc(A, "delete_me", "yes")).error?.includes("not_confirmed")
  && await count(`select count(*) n from public.fitclub_profiles where id = '${A}'`) === 1);
check("nobody signed out can delete", !(await rpc(null, "delete_me", "delete")).ok);
const heard = `select count(*) n from public.fitclub_inbox where kind = 'chat' and chat_id = '${g.id}' and user_id in ('${B}', '${C}')`;
const heardBefore = await count(heard);
const res = await rpc(A, "delete_me", "delete");
check("Anna deletes her account", res.ok && res.value.ok && res.value.chatsDeleted === 2 && res.value.chatsLeft === 2 && res.value.listsLeft === 2, res);

for (const [table, col] of [["fitclub_profiles", "id"], ["fitclub_user_state", "user_id"], ["fitclub_activity", "user_id"], ["fitclub_scores", "user_id"],
  ["fitclub_push_subscriptions", "user_id"], ["fitclub_feedback", "user_id"], ["fitclub_error_reports", "user_id"], ["fitclub_inbox", "user_id"],
  ["fitclub_chat_members", "user_id"], ["fitclub_list_members", "user_id"], ["fitclub_chats", "created_by"], ["fitclub_lists", "created_by"],
  ["fitclub_list_items", "created_by"], ["fitclub_challenges", "created_by"], ["fitclub_messages", "sender_id"]]) {
  check(`nothing of hers is left in ${table}`, await count(`select count(*) n from public.${table} where ${col} = '${A}'`) === 0);
}
check("her id is nowhere in a message, a reaction, a vote or a tick", await count(`select count(*) n from public.fitclub_messages where row_to_json(fitclub_messages)::text like '%${A}%'`) === 0);
check("her sign-in stays: it is shared with other apps", await count(`select count(*) n from auth.users where id = '${A}'`) === 1);
check("…with a note of when she deleted", await count(`select count(*) n from public.fitclub_deleted_accounts where user_id = '${A}'`) === 1);
check("Ben's things are untouched", await count(`select count(*) n from public.fitclub_profiles where id = '${B}'`) === 1
  && await count(`select count(*) n from public.fitclub_error_reports where user_id = '${B}'`) === 1);

const msgs = Object.fromEntries((await q(`select * from public.fitclub_messages where chat_id = '${g.id}'`)).map((m) => [m.id, m]));
check("what she wrote is emptied, as a deleted message", msgs[aText.id]?.deleted && msgs[aText.id].text === "" && msgs[aText.id].sender_id === null, msgs[aText.id]);
check("…her poll too", msgs[aPoll.id]?.deleted && msgs[aPoll.id].poll === null);
check("her reactions come off Ben's message, Cara's stay", JSON.stringify(msgs[bMsg.id].reactions) === JSON.stringify({ "🔥": [C] }), msgs[bMsg.id].reactions);
check("her vote comes off Ben's poll, Cara's stays", JSON.stringify(msgs[bPoll.id].poll.options.map((o) => o.votes)) === JSON.stringify([[C], []]), msgs[bPoll.id].poll);
const tasks = msgs[bList.id].checklist.items;
check("her tick comes off Ben's checklist, Cara's stays", tasks[0].doneBy === null && tasks[0].doneAt === null && tasks[1].doneBy === C, tasks);
check("…the task she added stays, no longer hers", tasks[2].text === "Chalk" && tasks[2].addedBy === null, tasks[2]);
check("the lines the app wrote for her are gone; the group says someone deleted their account",
  Object.values(msgs).filter((m) => m.kind === "system").map((m) => m.text).join("|") === "A member deleted their account");

check("the private chat is deleted for Ben too", await count(`select count(*) n from public.fitclub_chats where id = '${dm.id}'`) === 0
  && await count(`select count(*) n from public.fitclub_inbox where user_id = '${B}' and kind = 'removed' and chat_id = '${dm.id}'`) === 1);
check("the group she was alone in is deleted", await count(`select count(*) n from public.fitclub_chats where id = '${alone.id}'`) === 0);
const heir = await q(`select user_id, role from public.fitclub_chat_members where chat_id = '${g.id}' order by user_id`);
check("her group passes to Cara, its admin, ahead of Ben who joined with her",
  JSON.stringify(heir) === JSON.stringify([{ user_id: B, role: "member" }, { user_id: C, role: "owner" }])
  && (await q(`select created_by from public.fitclub_chats where id = '${g.id}'`))[0].created_by === C, heir);
check("…Ben and Cara hear the group changed", await count(heard) === heardBefore + 2);
check("she's out of Ben's channel, which says nothing to its readers",
  await count(`select count(*) n from public.fitclub_chat_members where chat_id = '${ch.id}'`) === 1
  && await count(`select count(*) n from public.fitclub_messages where chat_id = '${ch.id}' and kind = 'system' and text like '%deleted%'`) === 0);
check("the challenge stays with the group", await count(`select count(*) n from public.fitclub_challenges where chat_id = '${g.id}'`) === 1);
const item = (await q(`select done_by, assignees from public.fitclub_list_items where list_id = '${list.id}'`))[0];
check("her shared list passes to Ben, with his tick and none of hers",
  (await q(`select user_id, role from public.fitclub_list_members where list_id = '${list.id}'`)).map((m) => `${m.user_id}:${m.role}`).join() === `${B}:owner`
  && Object.keys(item.done_by).join() === B && item.assignees.join() === B, item);
check("her list with nobody else in it is deleted", await count(`select count(*) n from public.fitclub_lists where id = '${solo.id}'`) === 0);
check("Ben still reads the group", (await rpc(B, "history", g.id, null)).ok);
check("Anna's profile is gone from people search", JSON.stringify((await rpc(B, "search_people", "anna")).value || []) === "[]");

// ── A phone still signed in from before ──
const earlier = Math.floor(Date.now() / 1000) - 600;
const stale = await as(A, `insert into public.fitclub_user_state (user_id, key, data) values ('${A}', 'diary.v1', '{"x": 1}')`, [], { iat: earlier, session_id: OLD });
check("a phone signed in from before can't write her data back", !stale.ok && stale.error.includes("account_deleted"), stale);
const refreshed = await as(A, `insert into public.fitclub_profiles (id, name) values ('${A}', 'Anna')`, [], { iat: Math.floor(Date.now() / 1000) + 60, session_id: OLD });
check("…not even after it refreshes its token", !refreshed.ok && refreshed.error.includes("account_deleted"), refreshed);
const viaRpc = await as(A, `select public.fitclub_publish_activity('[]'::jsonb, 1, 1)`, [], { iat: earlier, session_id: OLD });
check("…nor through the app's functions", !viaRpc.ok && viaRpc.error.includes("account_deleted"), viaRpc);
check("…and nothing was written", await count(`select count(*) n from public.fitclub_user_state where user_id = '${A}'`) === 0
  && await count(`select count(*) n from public.fitclub_scores where user_id = '${A}'`) === 0);

// ── Signing in again ──
await db.exec(`insert into auth.sessions (id, user_id, created_at) values ('${NEW}', '${A}', now() + interval '1 minute')`);
const later = { iat: Math.floor(Date.now() / 1000) + 120, session_id: NEW };
const fresh = await as(A, `insert into public.fitclub_profiles (id, username, name) values ('${A}', 'anna_again', 'Anna')`, [], later);
check("signing in again starts over with an empty account", fresh.ok && (await as(A, `insert into public.fitclub_user_state (user_id, key, data) values ('${A}', 'diary.v1', '{}')`, [], later)).ok, fresh);
check("other people are never refused", (await as(B, `update public.fitclub_user_state set data = data where user_id = '${B}'`, [], { iat: earlier })).ok
  && (await rpc(B, "send", g.id, { kind: "text", text: "still here" })).ok);
check("the helpers can't be called through the API", !(await rpc(A, "token_stale")).ok && !(await as(A, "select * from public.fitclub_deleted_accounts")).ok);

console.log(`delete account schema: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
