// Help and feedback (supabase/migrations/0009) on PGlite: people send and
// read back only their own messages.

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

const A = "aaaaaaaa-0000-0000-0000-000000000001";
const B = "bbbbbbbb-0000-0000-0000-000000000002";
await db.exec(`insert into auth.users (id, email) values ('${A}', 'a@x.test'), ('${B}', 'b@x.test');`);
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
let r = await rpc(A, "send_feedback", "bug", "  The timer skips a second.  ", { page: "/train?x=1#t", build: "abc123", lang: "en", agent: "Test" });
check("Anna sends a bug report", r.ok && r.value.kind === "bug" && r.value.message === "The timer skips a second." && r.value.status === "new", r);
check("…kept with the page's path only", (await db.query("select page, build, lang from public.fitclub_feedback")).rows[0].page === "/train");
check("an unknown kind becomes 'other'; an empty message is refused", (await rpc(A, "send_feedback", "rant", "hi", {})).value.kind === "other" && (await rpc(A, "send_feedback", "idea", "   ", {})).error?.includes("empty"));
check("long messages are cut to 2,000 characters", (await rpc(B, "send_feedback", "idea", "x".repeat(3000), {})).value.message.length === 2000);
check("each person reads back only their own", (await rpc(A, "my_feedback")).value.length === 2 && (await rpc(B, "my_feedback")).value.length === 1);
check("nobody reads the table directly, visitors can't send", !(await as(A, "select * from public.fitclub_feedback")).ok && !(await rpc(null, "send_feedback", "bug", "x", {})).ok);
for (let i = 0; i < 12; i += 1) await rpc(B, "send_feedback", "idea", `idea ${i}`, {});
check("at most 10 an hour", (await db.query(`select count(*)::int n from public.fitclub_feedback where user_id = '${B}'`)).rows[0].n === 10);
check("…the 11th is refused with a reason", (await rpc(B, "send_feedback", "idea", "one more", {})).error?.includes("too_many"));

console.log(`feedback schema: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
