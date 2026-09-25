// Checklists in chats (supabase/migrations/0007) on PGlite: who may tick,
// untick and add, checked from each side.

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

const A = "aaaaaaaa-0000-0000-0000-000000000001"; // anna, sends the checklist
const B = "bbbbbbbb-0000-0000-0000-000000000002"; // ben, in the group
const C = "cccccccc-0000-0000-0000-000000000003"; // cara, in the group
const D = "dddddddd-0000-0000-0000-000000000004"; // dan, outside
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
const g = (await rpc(A, "create_chat", "group", "Groceries", "", "", "", false, null, ["ben_runs", "cara_flow"])).value;

let r = await rpc(A, "send", g.id, { kind: "checklist", clientId: "c1", checklist: {
  title: "  خرید خانه ", othersCanMark: true, othersCanAdd: false,
  items: ["خرید چند کیلو سیب زمینی", { text: "چند کیلو روغن" }, "   ", { text: "x".repeat(250) }, ...Array.from({ length: 40 }, (_, i) => `task ${i}`)] } });
check("Anna sends a checklist to the group", r.ok && r.value.kind === "checklist" && r.value.text === "خرید خانه", r);
const L = r.value;
check("…its tasks cleaned: blanks skipped, text cut, 30 at most", L.checklist.items.length === 30 && L.checklist.items[0].text === "خرید چند کیلو سیب زمینی" && L.checklist.items[2].text.length === 200 && L.checklist.items.every((t) => t.addedBy === A && t.doneBy === null));
check("…with her settings", L.checklist.othersCanMark === true && L.checklist.othersCanAdd === false && L.checklist.title === "خرید خانه");
check("an empty checklist is refused", (await rpc(A, "send", g.id, { kind: "checklist", checklist: { title: "x", items: ["  "] } })).error?.includes("empty_checklist"));

r = await rpc(B, "checklist_mark", L.id, "t2", true);
check("Ben ticks a task: it shows it was him", r.ok && r.value.checklist.items[1].doneBy === B && r.value.checklist.items[1].doneAt, r);
check("…Cara sees it", (await rpc(C, "history", g.id, null)).value.find((m) => m.id === L.id).checklist.items[1].doneBy === B);
check("ticking it again changes nothing", (await rpc(C, "checklist_mark", L.id, "t2", true)).value.checklist.items[1].doneBy === B);
check("Cara can't untick Ben's tick", (await rpc(C, "checklist_mark", L.id, "t2", false)).error?.includes("not_yours"));
check("Anna, who sent it, can", (await rpc(A, "checklist_mark", L.id, "t2", false)).value.checklist.items[1].doneBy === null);
check("Ben can't add a task: Anna didn't allow it", (await rpc(B, "checklist_add", L.id, "Eggs")).error?.includes("not_allowed"));
check("Dan, outside the group, can't tick", (await rpc(D, "checklist_mark", L.id, "t1", true)).error?.includes("checklist_not_found"));
check("a missing task is reported", (await rpc(B, "checklist_mark", L.id, "t99", true)).error?.includes("task_not_found"));
check("the 30-task limit holds for the sender too", (await rpc(A, "checklist_add", L.id, "one more")).error?.includes("too_many_tasks"));

r = await rpc(B, "send", g.id, { kind: "checklist", checklist: { title: "Gym bag", othersCanMark: false, othersCanAdd: true, items: ["Shoes"] } });
const M = r.value;
check("in Ben's list, others can't tick", (await rpc(A, "checklist_mark", M.id, "t1", true)).error?.includes("not_allowed"));
r = await rpc(C, "checklist_add", M.id, "  Towel  ");
check("…but can add a task, which says who added it", r.ok && r.value.checklist.items[1].text === "Towel" && r.value.checklist.items[1].addedBy === C && r.value.checklist.items[1].id === "t2");
check("…and Ben ticks his own list", (await rpc(B, "checklist_mark", M.id, "t2", true)).value.checklist.items[1].doneBy === B);
check("a checklist can't be written straight into the table", !(await as(A, `update public.fitclub_messages set checklist = '{}' where id = '${M.id}'`)).ok);
r = await rpc(B, "delete_message", M.id);
check("deleting the message takes the checklist with it", r.value.deleted && r.value.checklist === null && (await rpc(C, "checklist_add", M.id, "x")).error?.includes("checklist_not_found"));
check("other kinds still send as before", (await rpc(A, "send", g.id, { kind: "poll", text: "", poll: { question: "Q", options: [{ text: "a", votes: [] }] } })).value.poll?.question === "Q");

console.log(`chat checklists schema: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
