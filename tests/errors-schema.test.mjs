// Error reports (supabase/migrations/0005) on PGlite: anyone can file one,
// nobody can read them through the app, and a flood can't fill the table.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..", "supabase", "migrations");
const migrations = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort().map((f) => readFileSync(join(dir, f), "utf8"));

let passed = 0, failed = 0;
const check = (name, cond, got) => { if (cond) passed += 1; else { failed += 1; console.log("FAIL:", name, got !== undefined ? JSON.stringify(got).slice(0, 300) : ""); } };

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
`);
for (const sql of migrations) await db.exec(sql);
let rerun = true;
try { for (const sql of migrations) await db.exec(sql); } catch (e) { rerun = false; console.log(e.message); }
check("the migrations run twice without trouble", rerun);

const A = "aaaaaaaa-0000-0000-0000-000000000001";
await db.exec(`insert into auth.users (id, email) values ('${A}', 'a@x.test')`);
async function as(uid, sql, params = []) {
  try {
    await db.exec(`set role ${uid ? "authenticated" : "anon"}; select set_config('request.jwt.claim.sub', '${uid || ""}', false);`);
    return { ok: true, rows: (await db.query(sql, params)).rows };
  } catch (error) { return { ok: false, error: error.message }; }
  finally { await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);"); }
}
const report = (uid, r) => as(uid, "select public.fitclub_report_error($1) as ok", [r]);
const rows = async () => (await db.query("select * from public.fitclub_error_reports order by id")).rows;
const base = { kind: "error", message: "TypeError: x is undefined", stack: "TypeError: x is undefined\n    at Today (main.js:1:2)", page: "/today?code=secret#access_token=abc", build: "e28e7ee5", agent: "Test" };

check("a signed-in person files a report", (await report(A, base)).rows?.[0]?.ok === true);
let r = await rows();
check("…kept with their account, the page's path only", r.length === 1 && r[0].user_id === A && r[0].page === "/today" && r[0].build === "e28e7ee5", r);
check("the same error again within the hour is counted, not stored twice", (await report(A, base)).rows[0].ok && (await rows()).length === 1 && (await rows())[0].times === 2);
check("a visitor can file one too", (await report(null, { ...base, message: "RangeError: y" })).rows?.[0]?.ok === true && (await rows()).some((x) => x.user_id === null));
check("an empty or malformed report is dropped", (await report(A, { message: "  " })).rows[0].ok === false && (await report(A, [1, 2])).rows[0].ok === false);
check("an unknown kind becomes 'error' and long text is cut", (await report(A, { kind: "nope", message: "m".repeat(900) })).rows[0].ok
  && (await rows()).at(-1).kind === "error" && (await rows()).at(-1).message.length === 500);
check("nobody reads reports through the app", !(await as(A, "select * from public.fitclub_error_reports")).ok && !(await as(null, "select * from public.fitclub_error_reports")).ok);
check("…or writes them directly", !(await as(A, "insert into public.fitclub_error_reports (message, fingerprint) values ('x', 'y')")).ok);

for (let i = 0; i < 40; i += 1) await report(A, { ...base, message: `Error ${i}` });
const mine = (await db.query(`select count(*)::int n from public.fitclub_error_reports where user_id = '${A}'`)).rows[0].n;
check("one person files at most 30 an hour", mine === 30, mine);
await db.exec("update public.fitclub_error_reports set at = now() - interval '31 days', last_at = now() - interval '31 days'");
await report(null, { ...base, message: "Fresh" });
check("reports older than 30 days are deleted as new ones arrive", (await rows()).length === 1 && (await rows())[0].message === "Fresh");

console.log(`error reports schema: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
