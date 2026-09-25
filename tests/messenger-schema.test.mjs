// The messenger's schema (supabase/migrations/0002) on PGlite: four people,
// a group, a channel and a private chat, driven only through the functions
// the app calls, checked from each person's side, with the other apps'
// objects in the project left exactly as they were.

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
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  grant usage on schema public, auth, storage to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  -- Another app in the same project.
  create table public.profiles (id uuid primary key references auth.users (id) on delete cascade, email text);
  create table public.tradingo_orders (id serial primary key, owner uuid, note text);
  alter table public.tradingo_orders enable row level security;
  create policy "own orders" on public.tradingo_orders for select using (owner = auth.uid());
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

const A = "aaaaaaaa-0000-0000-0000-000000000001"; // anna, makes things
const B = "bbbbbbbb-0000-0000-0000-000000000002"; // ben
const C = "cccccccc-0000-0000-0000-000000000003"; // cara
const D = "dddddddd-0000-0000-0000-000000000004"; // dan, starts outside everything
await db.exec(`
  insert into auth.users (id, email) values ('${A}', 'a@x.test'), ('${B}', 'b@x.test'), ('${C}', 'c@x.test'), ('${D}', 'd@x.test');
  insert into public.fitclub_profiles (id, username, name) values ('${A}', 'anna_lifts', 'Anna'), ('${B}', 'ben_runs', 'Ben'), ('${C}', 'cara_flow', 'Cara'), ('${D}', 'dan_moves', 'Dan');
`);

/** Runs `sql` as a signed-in person (or anon for null). */
async function as(uid, sql, params = []) {
  try {
    await db.exec(`set role ${uid ? "authenticated" : "anon"}; select set_config('request.jwt.claim.sub', '${uid || ""}', false);`);
    return { ok: true, rows: (await db.query(sql, params)).rows };
  } catch (error) {
    return { ok: false, error: error.message };
  } finally {
    await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);");
  }
}
/** Calls fitclub_<fn>(args…) as `uid`; returns { ok, value } or { ok:false, error }. */
async function rpc(uid, fn, ...args) {
  const r = await as(uid, `select public.fitclub_${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as v`, args);
  return r.ok ? { ok: true, value: r.rows[0].v } : r;
}
const inbox = async (uid) => (await as(uid, "select kind, chat_id, payload from public.fitclub_inbox order by id")).rows;
const clearInbox = () => db.exec("delete from public.fitclub_inbox");

// ── a group ──
const made = await rpc(A, "create_chat", "group", "Squad", "Leg day crew", "", "", false, null, ["ben_runs", C]);
check("Anna makes a group with Ben (by @username) and Cara (by id)", made.ok && made.value.title === "Squad", made);
const g = made.value;
check("…everyone is a member, Anna runs it", JSON.stringify([...g.members].sort()) === JSON.stringify([A, B, C].sort()) && JSON.stringify(g.admins) === JSON.stringify([A]) && g.createdBy === A, g);
check("…with an invite link", /^fitclub\.app\/\+[0-9a-f]{16}$/.test(g.inviteLink), g.inviteLink);
check("…Ben's and Cara's inboxes say so, not Anna's", JSON.stringify((await inbox(B)).map((e) => e.kind)) === '["chat"]' && (await inbox(C)).length === 1 && (await inbox(A)).length === 0);
check("an empty title is refused", (await rpc(A, "create_chat", "group", "  ", "", "", "", false, null, [])).error?.includes("title_required"));
check("people who aren't on FitClub are left out", !(await rpc(A, "create_chat", "group", "Ghosts", "", "", "", false, null, ["nobody_here"])).value.members.includes("nobody_here"));

const hist = await rpc(B, "history", g.id, null);
check("the group opens with its system message", hist.ok && hist.value.length === 1 && hist.value[0].kind === "system" && hist.value[0].text === "Group created");

// ── messages ──
const sent = await rpc(B, "send", g.id, { text: "Squats at 6?", clientId: "c-1" });
check("Ben writes to the group", sent.ok && sent.value.senderId === B && sent.value.clientId === "c-1" && sent.value.status === "sent", sent);
check("…timestamps come back the way the client writes them", /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(sent.value.at), sent.value.at);
check("an empty message is refused", (await rpc(B, "send", g.id, { text: "   " })).error?.includes("empty"));
check("nobody can send a system message", (await rpc(B, "send", g.id, { kind: "system", text: "Anna was removed" })).value.kind === "text");
check("Cara reads it", (await rpc(C, "history", g.id, null)).value.some((m) => m.text === "Squats at 6?"));
check("Dan can't read the group's history", (await rpc(D, "history", g.id, null)).error?.includes("chat_not_found"));
check("…or its rows", (await as(D, "select * from public.fitclub_messages")).rows.length === 0 && (await as(D, "select * from public.fitclub_chats")).rows.length === 0);
check("…or write into it", (await rpc(D, "send", g.id, { text: "hi" })).error?.includes("chat_not_found"));
check("nobody writes a row directly", !(await as(B, `insert into public.fitclub_messages (chat_id, sender_id, text) values ('${g.id}', '${B}', 'x')`)).ok);
check("…or promotes themself", !(await as(B, `update public.fitclub_chat_members set role = 'owner' where user_id = '${B}'`)).ok);
check("a visitor who isn't signed in reads nothing", !(await as(null, "select * from public.fitclub_chats")).ok && !(await rpc(null, "sync", null)).ok);

const edited = await rpc(B, "edit_message", sent.value.id, "Squats at 7?");
check("Ben edits his message", edited.ok && edited.value.text === "Squats at 7?" && !!edited.value.editedAt);
check("Cara can't edit Ben's", (await rpc(C, "edit_message", sent.value.id, "no")).error?.includes("not_yours"));

let r = await rpc(C, "react", sent.value.id, "👍");
check("Cara reacts", r.ok && JSON.stringify(r.value.reactions) === JSON.stringify({ "👍": [C] }), r);
r = await rpc(A, "react", sent.value.id, "👍");
check("…so does Anna", JSON.stringify(r.value.reactions["👍"]) === JSON.stringify([C, A]));
r = await rpc(C, "react", sent.value.id, "👍");
check("…and Cara takes hers back", JSON.stringify(r.value.reactions["👍"]) === JSON.stringify([A]));
r = await rpc(A, "react", sent.value.id, "👍");
check("the last one out removes the emoji", JSON.stringify(r.value.reactions) === "{}");

const poll = await rpc(A, "send", g.id, { kind: "poll", text: "", poll: { question: "When?", multiple: false, options: [{ text: "6", votes: [] }, { text: "7", votes: [] }] } });
check("Anna asks with a poll", poll.ok && poll.value.poll.options.length === 2);
await rpc(B, "vote", poll.value.id, 0);
r = await rpc(B, "vote", poll.value.id, 1);
check("a single-choice vote moves", JSON.stringify(r.value.poll.options.map((o) => o.votes)) === JSON.stringify([[], [B]]), r.value.poll);

// ── read receipts ──
await clearInbox();
const mine = await rpc(A, "send", g.id, { text: "Bring chalk" });
let sync = await rpc(A, "sync", null);
check("before anyone reads it, Anna's message is sent", sync.value.messages.find((m) => m.id === mine.value.id).status === "sent");
const read = await rpc(C, "mark_read", g.id);
check("Cara reads the group", read.ok);
check("…Anna and Ben hear about it, Cara doesn't", (await inbox(A)).some((e) => e.kind === "read" && e.payload.userId === C) && (await inbox(B)).some((e) => e.kind === "read") && (await inbox(C)).length === 0);
sync = await rpc(A, "sync", null);
check("…and Anna's message now shows as read", sync.value.messages.find((m) => m.id === mine.value.id).status === "read");
check("each person sees only their own inbox", (await as(B, "select user_id from public.fitclub_inbox")).rows.every((x) => x.user_id === B));

// ── sync ──
check("Anna's sync: her chats, their people, their messages", sync.ok && sync.value.chats.length === 2 && sync.value.chats.some((c) => c.id === g.id)
  && [A, B, C].every((id) => sync.value.users.some((u) => u.id === id)) && sync.value.me.username === "anna_lifts" && !!sync.value.now);
check("Dan's sync is empty", (await rpc(D, "sync", null)).value.chats.length === 0);
const later = await rpc(A, "sync", sync.value.now);
check("a later sync brings only what changed since", later.value.messages.length === 0);
await rpc(B, "react", mine.value.id, "🔥");
check("…a reaction counts as a change", (await rpc(A, "sync", sync.value.now)).value.messages.some((m) => m.id === mine.value.id && m.reactions["🔥"]));

// ── admins, members, the owner ──
check("a member can't remove anyone", (await rpc(B, "remove_member", g.id, C)).error?.includes("admins_only"));
check("…or add anyone", (await rpc(B, "add_members", g.id, ["dan_moves"])).error?.includes("admins_only"));
check("…or rename the group", (await rpc(B, "update_chat", g.id, { title: "Mine now" })).error?.includes("admins_only"));
r = await rpc(A, "toggle_admin", g.id, B);
check("Anna makes Ben an admin", r.ok && r.value.admins.includes(B));
check("Ben, an admin now, still can't remove the owner", (await rpc(B, "remove_member", g.id, A)).error?.includes("owner"));
await clearInbox();
r = await rpc(B, "remove_member", g.id, C);
check("Ben removes Cara", r.ok && !r.value.members.includes(C));
check("…Cara is told she's out", (await inbox(C)).some((e) => e.kind === "removed" && e.chat_id === g.id));
check("…and can't read the group any more", (await rpc(C, "history", g.id, null)).error?.includes("chat_not_found"));
check("…Anna hears the group changed", (await inbox(A)).some((e) => e.kind === "chat"));
r = await rpc(A, "update_chat", g.id, { title: "Squad 2", description: "New block" });
check("Anna renames the group", r.ok && r.value.title === "Squad 2" && r.value.description === "New block");
check("…with a system message for everyone", (await rpc(B, "history", g.id, null)).value.some((m) => m.kind === "system" && m.text.includes("Squad 2")));
const oldLink = r.value.inviteLink;
r = await rpc(A, "update_chat", g.id, { revokeLink: true });
check("a fresh invite link replaces the old one", r.value.inviteLink !== oldLink);

// ── invite links and joining ──
const peek = await rpc(D, "resolve", r.value.inviteLink);
check("Dan opens the invite: he sees the group, not who's in it", peek.ok && peek.value.chat.id === g.id && peek.value.joined === false && peek.value.chat.members.length === 0, peek);
check("the old link leads nowhere", (await rpc(D, "join", oldLink)).error?.includes("link_not_found"));
await clearInbox();
const joined = await rpc(D, "join", `https://fitclub-ai.vercel.app/#join=${r.value.inviteLink}`);
check("Dan joins through the link, as the app shares it", joined.ok && joined.value.chat.members.includes(D), joined);
check("…the others hear he joined", (await inbox(A)).some((e) => e.kind === "chat") && (await rpc(A, "history", g.id, null)).value.some((m) => m.kind === "system" && m.text === "Dan joined"));
check("joining twice changes nothing", (await rpc(D, "join", r.value.inviteLink)).value.chat.members.filter((m) => m === D).length === 1);
check("Dan, a member, can't delete Anna's message", (await rpc(D, "delete_message", mine.value.id)).error?.includes("not_yours"));
const tomb = await rpc(B, "delete_message", poll.value.id);
check("Ben, an admin, can delete it, leaving a tombstone", tomb.ok && tomb.value.deleted && tomb.value.poll === null && tomb.value.text === "");

// ── a public channel ──
const ch = await rpc(A, "create_chat", "channel", "Squad News", "", "", "", true, "squad_news", []);
check("Anna starts a public channel", ch.ok && ch.value.type === "channel" && ch.value.isPublic && ch.value.username === "squad_news", ch);
check("its name is taken now", (await rpc(D, "username_available", "squad_news")).value === false && (await rpc(D, "username_available", "fresh_name")).value === true);
check("a person's name is taken too", (await rpc(A, "create_chat", "channel", "Mine", "", "", "", true, "ben_runs", [])).error?.includes("username_taken"));
check("a short name is refused", (await rpc(A, "create_chat", "channel", "Mine", "", "", "", true, "abc", [])).error?.includes("username_short"));
check("Dan finds it by search", (await rpc(D, "search_public", "squad")).value.some((c) => c.id === ch.value.id && c.members.length === 0));
check("…and by its @handle", (await rpc(D, "resolve", "@squad_news")).value.chat?.id === ch.value.id);
check("Dan joins it", (await rpc(D, "join", "squad_news")).ok);
check("…but as a subscriber he can't post", (await rpc(D, "send", ch.value.id, { text: "hello?" })).error?.includes("admins_only"));
check("Anna posts", (await rpc(A, "send", ch.value.id, { text: "Gym closes at 20:00 Friday" })).ok);
await clearInbox();
await rpc(D, "mark_read", ch.value.id);
check("a channel's readers send no receipts", (await inbox(A)).length === 0);

// ── people and private chats ──
check("searching finds people by @username or name", (await rpc(A, "search_people", "ben")).value.some((u) => u.id === B) && (await rpc(A, "search_people", "Cara")).value.some((u) => u.id === C));
check("…but never yourself", !(await rpc(A, "search_people", "anna")).value.some((u) => u.id === A));
check("a @username resolves to the person", (await rpc(D, "resolve", "@ben_runs")).value.user?.id === B);
await clearInbox();
const p1 = await rpc(A, "private_chat", "ben_runs");
const p2 = await rpc(A, "private_chat", B);
check("Anna and Ben have one private chat, however she opens it", p1.ok && p1.value.id === p2.value.id && p1.value.type === "private" && p1.value.inviteLink === "", [p1, p2]);
check("…and Ben hears about it once", (await inbox(B)).filter((e) => e.kind === "chat").length === 1);
check("…from his side it's the same chat", (await rpc(B, "private_chat", A)).value.id === p1.value.id);
check("nobody opens a private chat with themself", (await rpc(A, "private_chat", A)).error?.includes("self"));
check("a private chat has no admin to rename it", (await rpc(A, "update_chat", p1.value.id, { title: "x" })).error?.includes("admins_only"));
check("Cara can't read Anna and Ben's chat", (await rpc(C, "history", p1.value.id, null)).error?.includes("chat_not_found"));

// ── leaving and deleting ──
const solo = (await rpc(A, "create_chat", "group", "Pair", "", "", "", false, null, ["cara_flow", "dan_moves"])).value;
await rpc(A, "leave_chat", solo.id);
const left = (await rpc(C, "chat_bundle", solo.id)).value.chat;
check("when the only admin leaves, the next member takes over", !left.members.includes(A) && left.admins.length === 1 && left.admins[0] === C, left);
check("Dan, not the owner, can't delete the squad", (await rpc(D, "delete_chat", g.id)).error?.includes("owner_only"));
await clearInbox();
check("Anna deletes it", (await rpc(A, "delete_chat", g.id)).ok);
check("…and everyone left in it is told", (await inbox(B)).some((e) => e.kind === "removed" && e.chat_id === g.id) && (await inbox(D)).some((e) => e.kind === "removed"));
check("…its messages go with it", (await db.query(`select count(*)::int as n from public.fitclub_messages where chat_id = '${g.id}'`)).rows[0].n === 0);
await rpc(C, "leave_chat", solo.id);
await rpc(D, "leave_chat", solo.id);
check("the last one out deletes the chat", (await db.query(`select count(*)::int as n from public.fitclub_chats where id = '${solo.id}'`)).rows[0].n === 0);

check("helpers inside the schema can't be called from outside", !(await as(A, `select public.fitclub_emit(array['${A}'::uuid], 'chat', null)`)).ok
  && !(await as(A, `select public.fitclub_person('${B}')`)).ok);
check("last seen is recorded", (await rpc(B, "seen")).ok && (await db.query(`select last_seen_at from public.fitclub_profiles where id = '${B}'`)).rows[0].last_seen_at !== null);

console.log(`messenger schema: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
