// The exercise library's media bucket (supabase/migrations/0013) on PGlite:
// anyone views, only a listed importer uploads, and nothing else changes.

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
  -- Another app's bucket in the same project.
  insert into storage.buckets (id, name, public) values ('other-app', 'other-app', false);
`);
const bucketsBefore = (await db.query("select id, public, file_size_limit from storage.buckets where id not like 'fitclub-%' order by id")).rows;
for (const sql of migrations) await db.exec(sql);
let rerun = true;
try { for (const sql of migrations) await db.exec(sql); } catch (e) { rerun = false; console.log(e.message); }
check("the migrations run twice without trouble", rerun);
check("other apps' buckets are untouched", JSON.stringify(bucketsBefore) === JSON.stringify((await db.query("select id, public, file_size_limit from storage.buckets where id not like 'fitclub-%' order by id")).rows));
await db.exec("grant select, insert, update, delete on storage.objects to authenticated; grant select on storage.objects to anon;");

const bucket = (await db.query("select * from storage.buckets where id = 'fitclub-exercises'")).rows[0];
check("the library's bucket is public, 1 MB a file, MP4 and WebP only",
  bucket?.public === true && Number(bucket.file_size_limit) === 1048576 && JSON.stringify(bucket.allowed_mime_types) === JSON.stringify(["video/mp4", "image/webp"]), bucket);

const IMPORTER = "aaaaaaaa-0000-0000-0000-000000000001";
const SOMEONE = "bbbbbbbb-0000-0000-0000-000000000002";
await db.exec(`insert into auth.users (id, email) values ('${IMPORTER}', 'i@x.test'), ('${SOMEONE}', 's@x.test');`);
async function as(uid, sql) {
  try {
    await db.exec(`set role ${uid ? "authenticated" : "anon"}; select set_config('request.jwt.claim.sub', '${uid || ""}', false);`);
    return { ok: true, rows: (await db.query(sql)).rows };
  } catch (error) { return { ok: false, error: error.message }; }
  finally { await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);"); }
}
const put = (uid, name) => as(uid, `insert into storage.objects (bucket_id, name) values ('fitclub-exercises', '${name}')`);

check("nobody uploads while no importer is listed", !(await put(IMPORTER, "squat.mp4")).ok);
await db.exec(`insert into public.fitclub_media_uploaders (user_id) values ('${IMPORTER}')`);
check("a listed importer uploads", (await put(IMPORTER, "squat.mp4")).ok && (await put(IMPORTER, "squat.webp")).ok);
check("…and replaces", (await as(IMPORTER, "update storage.objects set name = name where name = 'squat.mp4' returning id")).rows?.length === 1);
check("anyone else can't", !(await put(SOMEONE, "evil.mp4")).ok && !(await put(null, "evil.mp4")).ok);
check("…nor take files down", (await as(SOMEONE, "delete from storage.objects where bucket_id = 'fitclub-exercises' returning id")).rows?.length === 0);
check("everyone can see the files, signed in or not", (await as(null, "select name from storage.objects where bucket_id = 'fitclub-exercises'")).rows?.length === 2
  && (await as(SOMEONE, "select name from storage.objects where bucket_id = 'fitclub-exercises'")).rows?.length === 2);
check("the importer list can't be read or written through the API", !(await as(SOMEONE, "select * from public.fitclub_media_uploaders")).ok
  && !(await as(SOMEONE, `insert into public.fitclub_media_uploaders (user_id) values ('${SOMEONE}')`)).ok);
await db.exec("delete from public.fitclub_media_uploaders");
check("taken off the list, the importer can't upload any more", !(await put(IMPORTER, "late.mp4")).ok);

console.log(`exercise media schema: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
