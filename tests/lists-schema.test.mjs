// Group checklists (supabase/migrations/0004) on PGlite: four people sharing
// a list, driven only through the functions the app calls, checked from each
// person's side, with the other apps' objects in the project left alone.

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

const A = "aaaaaaaa-0000-0000-0000-000000000001"; // anna, makes the list
const B = "bbbbbbbb-0000-0000-0000-000000000002"; // ben
const C = "cccccccc-0000-0000-0000-000000000003"; // cara
const D = "dddddddd-0000-0000-0000-000000000004"; // dan, outside
await db.exec(`
  insert into auth.users (id, email) values ('${A}', 'a@x.test'), ('${B}', 'b@x.test'), ('${C}', 'c@x.test'), ('${D}', 'd@x.test');
  insert into public.fitclub_profiles (id, username, name) values ('${A}', 'anna_lifts', 'Anna'), ('${B}', 'ben_runs', 'Ben'), ('${C}', 'cara_flow', 'Cara'), ('${D}', 'dan_moves', 'Dan');
`);

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
async function rpc(uid, fn, ...args) {
  const r = await as(uid, `select public.fitclub_${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as v`, args);
  return r.ok ? { ok: true, value: r.rows[0].v } : r;
}
const item = (l, id) => l.items.find((i) => i.id === id);

// ── a new group list ──
const reset = { mode: "daily", resetHour: 4, weekStart: 6, monthDay: 1, every: 2, anchor: 1790000000000, junk: "x" };
let r = await rpc(A, "list_create",
  { name: "  Squad Shred  ", emoji: "⚡", color: "#e0567d", groupRule: "everyone", reset, periodKey: "daily:2026-09-24", streak: 2, bestStreak: 4, history: [{ key: "daily:2026-09-23", done: 3, total: 3 }] },
  [{ id: "i1", text: "10,000 steps", priority: "high", doneBy: { [A]: "2026-09-24T08:00:00.000Z", [B]: "2026-09-24T08:00:00.000Z" } },
   { id: "i2", text: "No sugar", assignees: [B, D] }],
  ["ben_runs", C]);
check("Anna turns a list into a group with Ben (by @username) and Cara (by id)", r.ok && r.value.name === "Squad Shred" && r.value.type === "group", r);
const L = r.value;
check("…she owns it and all three are in", L.ownerId === A && JSON.stringify(L.members.map((m) => m.id)) === JSON.stringify([A, B, C]) && L.members[1].name === "Ben" && L.members[1].username === "ben_runs", L.members);
check("…its schedule is kept, stripped to what the app uses", L.reset.mode === "daily" && L.reset.resetHour === 4 && L.reset.anchor === 1790000000000 && !("junk" in L.reset), L.reset);
check("…with its history and streak so far", L.streak === 2 && L.bestStreak === 4 && L.history.length === 1 && L.periodKey === "daily:2026-09-24");
check("…her own ticks come along, nobody else's", JSON.stringify(Object.keys(item(L, "i1").doneBy)) === JSON.stringify([A]), item(L, "i1").doneBy);
check("…and only members can be assigned", JSON.stringify(item(L, "i2").assignees) === JSON.stringify([B]), item(L, "i2").assignees);
check("a made-up schedule is refused", (await rpc(A, "list_create", { name: "x", reset: { mode: "hourly" } }, [], [])).error?.includes("bad_reset"));

check("Ben and Cara get it on their next sync", (await rpc(B, "lists_sync")).value.some((l) => l.id === L.id) && (await rpc(C, "lists_sync")).value.length === 1);
check("Dan sees nothing", (await rpc(D, "lists_sync")).value.length === 0 && (await rpc(D, "list_bundle", L.id)).error?.includes("list_not_found"));
check("…not even reading the tables directly", (await as(D, "select * from public.fitclub_list_items")).rows.length === 0
  && (await as(D, "select * from public.fitclub_lists")).rows.length === 0 && (await as(D, "select * from public.fitclub_list_members")).rows.length === 0);
check("members read the tables Realtime watches", (await as(B, `select id from public.fitclub_lists where id = '${L.id}'`)).rows.length === 1
  && (await as(B, `select user_id from public.fitclub_list_members where list_id = '${L.id}'`)).rows.length === 3);
check("nobody writes a row directly", !(await as(B, `update public.fitclub_list_items set done_by = '{}' where list_id = '${L.id}'`)).ok
  && !(await as(B, `insert into public.fitclub_list_members (list_id, user_id, role) values ('${L.id}', '${D}', 'owner')`)).ok);
check("anon calls nothing", !(await rpc(null, "lists_sync")).ok);

// ── ticking ──
r = await rpc(B, "list_tick", L.id, "i1", true);
check("Ben ticks the steps", r.ok && Object.keys(item(r.value, "i1").doneBy).sort().join() === [A, B].sort().join(), r);
await rpc(C, "list_tick", L.id, "i1", true);
r = await rpc(A, "list_tick", L.id, "i1", false);
check("Anna unticks her own, leaving Ben's and Cara's", JSON.stringify(Object.keys(item(r.value, "i1").doneBy).sort()) === JSON.stringify([B, C].sort()), item(r.value, "i1").doneBy);
check("Dan can't tick", (await rpc(D, "list_tick", L.id, "i1", true)).error?.includes("list_not_found"));
check("a missing item is reported", (await rpc(B, "list_tick", L.id, "nope", true)).error?.includes("item_not_found"));

// ── items ──
r = await rpc(C, "list_put_item", L.id, { id: "i3", text: "Post a progress photo", priority: "low", due: "2026-10-01", assignees: [A, C, "not-a-uuid"] });
check("Cara adds an item, at the end", r.ok && r.value.items.at(-1).id === "i3" && item(r.value, "i3").due === "2026-10-01" && item(r.value, "i3").assignees.length === 2, r);
r = await rpc(B, "list_put_item", L.id, { id: "i3", text: "Post a photo", priority: "medium", assignees: [] });
check("Ben edits it", item(r.value, "i3").text === "Post a photo" && item(r.value, "i3").priority === "medium" && item(r.value, "i3").due === "2026-10-01" && item(r.value, "i3").assignees.length === 0);
r = await rpc(B, "list_put_item", L.id, { id: "i3", due: null });
check("…only what he sent changes", item(r.value, "i3").due === null && item(r.value, "i3").text === "Post a photo");
r = await rpc(B, "list_put_item", L.id, { id: "i2", text: "No sugar", doneBy: { [B]: "2026-09-24T09:00:00.000Z" } });
check("…and an edit can't slip in a tick", Object.keys(item(r.value, "i2").doneBy).length === 0);
r = await rpc(A, "list_reorder", L.id, ["i3", "i1"]);
check("the order is shared: named first, the rest after", JSON.stringify(r.value.items.map((i) => i.id)) === JSON.stringify(["i3", "i1", "i2"]), r.value.items.map((i) => i.id));
r = await rpc(B, "list_remove_item", L.id, "i3");
check("any member can remove an item", r.ok && !item(r.value, "i3"));
check("an item's text has a limit", !(await rpc(B, "list_put_item", L.id, { id: "i9", text: "x".repeat(301) })).ok || (await rpc(B, "list_bundle", L.id)).value.items.find((i) => i.id === "i9")?.text.length === 300);
await rpc(B, "list_remove_item", L.id, "i9");

// ── settings ──
r = await rpc(B, "list_update", L.id, { name: "Squad Shred 2", groupRule: "anyone", color: "#10b981" });
check("any member edits the list", r.ok && r.value.name === "Squad Shred 2" && r.value.groupRule === "anyone" && r.value.emoji === "⚡", r);
await rpc(A, "list_update", L.id, { groupRule: "everyone" });

// ── the period rolls over, once ──
// i1: Ben and Cara ticked, Anna didn't (everyone rule → not done). i2: Ben assigned, not ticked.
r = await rpc(B, "list_roll", L.id, "daily:2026-09-24", "daily:2026-09-25", "daily:2026-09-24");
check("the day ends: scored from the ticks, 0 of 2 under 'everyone'", r.ok && r.value.periodKey === "daily:2026-09-25" && JSON.stringify(r.value.history.at(-1)) === JSON.stringify({ key: "daily:2026-09-24", done: 0, total: 2 }), r.value?.history);
check("…the streak breaks and every tick clears", r.value.streak === 0 && r.value.bestStreak === 4 && r.value.items.every((i) => Object.keys(i.doneBy).length === 0));
const again = await rpc(C, "list_roll", L.id, "daily:2026-09-24", "daily:2026-09-25", "daily:2026-09-24");
check("a second phone asking for the same rollover changes nothing", again.value.history.length === 2 && again.value.periodKey === "daily:2026-09-25");
const behind = await rpc(A, "list_roll", L.id, "daily:2026-09-25", "daily:2026-09-24", "daily:2026-09-23");
check("a phone whose clock is behind can't roll it back", behind.value.periodKey === "daily:2026-09-25");

for (const who of [A, B, C]) await rpc(who, "list_tick", L.id, "i1", true);
await rpc(B, "list_tick", L.id, "i2", true);
r = await rpc(A, "list_roll", L.id, "daily:2026-09-25", "daily:2026-09-26", "daily:2026-09-25");
check("a perfect day: everyone did the steps, Ben (the one assigned) did the other", JSON.stringify(r.value.history.at(-1)) === JSON.stringify({ key: "daily:2026-09-25", done: 2, total: 2 }) && r.value.streak === 1);
for (const who of [A, B, C]) await rpc(who, "list_tick", L.id, "i1", true);
await rpc(B, "list_tick", L.id, "i2", true);
r = await rpc(A, "list_roll", L.id, "daily:2026-09-26", "daily:2026-09-27", "daily:2026-09-26");
check("…two in a row", r.value.streak === 2);
for (const who of [A, B, C]) await rpc(who, "list_tick", L.id, "i1", true);
await rpc(B, "list_tick", L.id, "i2", true);
r = await rpc(A, "list_roll", L.id, "daily:2026-09-27", "daily:2026-09-29", "daily:2026-09-28");
check("a skipped day starts the run again at one", r.value.streak === 1 && r.value.bestStreak === 4, [r.value.streak, r.value.bestStreak]);
await rpc(C, "list_update", L.id, { groupRule: "anyone" });
await rpc(C, "list_tick", L.id, "i1", true);
r = await rpc(A, "list_roll", L.id, "daily:2026-09-29", "daily:2026-09-30", "daily:2026-09-29");
check("under 'anyone', one tick is enough", JSON.stringify(r.value.history.at(-1)) === JSON.stringify({ key: "daily:2026-09-29", done: 1, total: 2 }));
await rpc(C, "list_tick", L.id, "i2", true);
r = await rpc(A, "list_clear", L.id, "daily:2026-09-30");
check("'reset now' clears every tick and keeps the schedule", r.value.items.every((i) => Object.keys(i.doneBy).length === 0) && r.value.periodKey === "daily:2026-09-30" && r.value.lastResetAt);

// ── people ──
check("Ben, a member, can't remove Cara", (await rpc(B, "list_remove_member", L.id, C)).error?.includes("owner_only"));
check("…or delete the list", (await rpc(B, "list_delete", L.id)).error?.includes("owner_only"));
r = await rpc(B, "list_add_members", L.id, ["dan_moves", "nobody_here"]);
check("but he can add Dan", r.ok && r.value.members.some((m) => m.id === D) && r.value.members.length === 4, r);
check("Dan has it now", (await rpc(D, "lists_sync")).value.length === 1);
check("people you share a chat or a list with are suggested", (await rpc(D, "list_contacts")).value.map((p) => p.id).sort().join() === [A, B, C].sort().join());
await rpc(D, "list_tick", L.id, "i1", true);
await rpc(A, "list_put_item", L.id, { id: "i2", text: "No sugar", assignees: [B, D] });
r = await rpc(A, "list_remove_member", L.id, D);
check("Anna removes Dan: his ticks and assignments go too", r.ok && !r.value.members.some((m) => m.id === D) && !(D in item(r.value, "i1").doneBy) && JSON.stringify(item(r.value, "i2").assignees) === JSON.stringify([B]), r.value);
check("…and he can't read it any more", (await rpc(D, "lists_sync")).value.length === 0);
r = await rpc(A, "list_remove_member", L.id, A);
check("when Anna leaves, Ben (there longest) owns it", r.value.left === true && (await rpc(B, "list_bundle", L.id)).value.ownerId === B);
check("now Ben can delete it; Cara can only leave", (await rpc(C, "list_delete", L.id)).error?.includes("owner_only"));
await rpc(C, "list_remove_member", L.id, C);
await rpc(B, "list_remove_member", L.id, B);
check("the last one out deletes the list and its items", (await db.query(`select (select count(*) from public.fitclub_lists)::int + (select count(*) from public.fitclub_list_items)::int as n`)).rows[0].n === 0);

r = await rpc(A, "list_create", { name: "Two", reset: { mode: "weekly" } }, [{ id: "a", text: "x" }], [B]);
check("the owner deletes a list outright", (await rpc(A, "list_delete", r.value.id)).ok && (await rpc(B, "lists_sync")).value.length === 0);

check("helpers inside the schema can't be called from outside", !(await as(A, `select public.fitclub_list_view('${L.id}')`)).ok
  && !(await as(A, `select public.fitclub_list_put('${L.id}', '{}'::jsonb, true)`)).ok);

console.log(`group lists schema: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
