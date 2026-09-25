// Runs every supabase/migrations/*.sql against PGlite (Postgres compiled to
// WebAssembly) on a stub of the pieces Supabase provides (auth.users,
// auth.uid(), the storage schema, the API roles), then checks the row-level
// security from each role's side.
//
// The real project is shared with other apps, so the stub also holds
// stand-ins for their objects (a public.profiles table, a signup trigger on
// auth.users, another app's bucket and storage policy) and the test proves
// the migrations leave every one of them exactly as it was.

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..", "supabase", "migrations");
const migrations = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort().map((f) => readFileSync(join(dir, f), "utf8"));

let passed = 0;
let failed = 0;
const check = (name, cond) => {
  if (cond) passed += 1;
  else { failed += 1; console.log("FAIL:", name); }
};

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  grant usage on schema public, auth, storage to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`;

// Other apps already living in the project.
const NEIGHBOURS = `
  create table public.profiles (id uuid primary key references auth.users (id) on delete cascade, email text, display_name text);
  create function public.handle_new_user() returns trigger language plpgsql security definer as
    $$ begin insert into public.profiles (id, email) values (new.id, new.email); return new; end $$;
  create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
  insert into storage.buckets (id, name, public) values ('duskyr-avatars', 'duskyr-avatars', true);
  create policy "avatars are public" on storage.objects for select using (bucket_id = 'duskyr-avatars');
`;
const FINGERPRINT = `
  select
    (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'profiles') as profile_cols,
    (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'auth' and c.relname = 'users' and not t.tgisinternal) as auth_triggers,
    (select count(*) from pg_policy where polrelid = 'public.profiles'::regclass) as public_profile_policies,
    (select count(*) from pg_trigger where tgrelid = 'public.profiles'::regclass and not tgisinternal) as public_profile_triggers,
    (select string_agg(polname, ',' order by polname) from pg_policy where polrelid = 'storage.objects'::regclass and polname not like 'fitclub:%') as other_storage_policies,
    (select string_agg(id, ',' order by id) from storage.buckets where id <> 'fitclub-avatars') as other_buckets,
    (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass) as public_profiles_rls
`;

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";

const db = new PGlite();
await db.exec(SUPABASE_STUB);
await db.exec(NEIGHBOURS);
const before = (await db.query(FINGERPRINT)).rows[0];
for (const sql of migrations) await db.exec(sql);
// Supabase grants storage privileges to the API roles; RLS then narrows them.
await db.exec(`
  grant select, insert, update, delete on storage.objects to authenticated;
  grant select on storage.objects to anon;
`);

// Re-running every migration must be harmless.
let rerun = true;
try { for (const sql of migrations) await db.exec(sql); } catch (err) { rerun = false; console.log(err.message); }
check("migrations are idempotent", rerun);

const after = (await db.query(FINGERPRINT)).rows[0];
check("other apps' tables, triggers, policies and buckets are untouched", JSON.stringify(before) === JSON.stringify(after));
check("FitClub adds no trigger to auth.users", after.auth_triggers === before.auth_triggers);
check("every table FitClub adds carries its name",
  (await db.query("select count(*)::int as n from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and c.relname not like 'fitclub\\_%' and c.relname <> 'profiles'")).rows[0].n === 0);

await db.exec(`insert into auth.users (id, email) values ('${A}', 'a@x.test'), ('${B}', 'b@x.test');`);
check("the neighbour's own signup trigger still runs", (await db.query("select count(*)::int as n from public.profiles")).rows[0].n === 2);
check("signing up creates no FitClub row by itself", (await db.query("select count(*)::int as n from public.fitclub_profiles")).rows[0].n === 0);

/** Runs `sql` as a signed-in user (or anon when `uid` is null) and returns the result or the error. */
async function as(uid, sql, params = []) {
  try {
    await db.exec(`set role ${uid ? "authenticated" : "anon"}; select set_config('request.jwt.claim.sub', '${uid || ""}', false);`);
    return { ok: true, res: await db.query(sql, params) };
  } catch (error) {
    return { ok: false, error };
  } finally {
    await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);");
  }
}

// Profiles: the app creates its own row on first sign-in.
check("A creates their own FitClub profile", (await as(A, `insert into public.fitclub_profiles (id) values ('${A}')`)).ok);
check("B creates their own FitClub profile", (await as(B, `insert into public.fitclub_profiles (id) values ('${B}')`)).ok);
check("A cannot create a profile for someone else",
  !(await as(A, `insert into public.fitclub_profiles (id) values ('33333333-3333-3333-3333-333333333333')`)).ok);
check("A sets a valid username", (await as(A, `update public.fitclub_profiles set username = 'isaac_lifts', name = 'Isaac' where id = '${A}'`)).ok);
const bEdit = await as(A, `update public.fitclub_profiles set name = 'hacked' where id = '${B}'`);
check("A cannot edit B's profile", bEdit.ok && bEdit.res.affectedRows === 0);
check("an invalid username is rejected", !(await as(B, `update public.fitclub_profiles set username = '9lives' where id = '${B}'`)).ok);
check("a reserved username is rejected", !(await as(B, `update public.fitclub_profiles set username = 'support' where id = '${B}'`)).ok);
check("capital letters are rejected, so uniqueness ignores case", !(await as(B, `update public.fitclub_profiles set username = 'Isaac_Lifts' where id = '${B}'`)).ok);
check("usernames are unique", !(await as(B, `update public.fitclub_profiles set username = 'isaac_lifts' where id = '${B}'`)).ok);
const seen = await as(B, "select name from public.fitclub_profiles where username = 'isaac_lifts'");
check("signed-in people can read profiles", seen.ok && seen.res.rows[0]?.name === "Isaac");
const anonRead = await as(null, "select * from public.fitclub_profiles");
check("anonymous visitors cannot list profiles", !anonRead.ok || anonRead.res.rows.length === 0);

const avail = async (uid, name) => (await as(uid, "select public.fitclub_username_available($1) as ok", [name])).res?.rows[0]?.ok;
check("a taken username is not available", (await avail(null, "isaac_lifts")) === false);
check("a free username is available", (await avail(null, "sara_runs")) === true);
check("your own username counts as available to you", (await avail(A, "isaac_lifts")) === true);
check("a reserved username is not available", (await avail(null, "admin")) === false);
check("a malformed username is not available", (await avail(null, "ab")) === false);

// user_state
check("A writes their own state",
  (await as(A, `insert into public.fitclub_user_state (user_id, key, data) values ('${A}', 'training.v1', '{"programs":[]}')`)).ok);
check("A cannot write state as B",
  !(await as(A, `insert into public.fitclub_user_state (user_id, key, data) values ('${B}', 'training.v1', '{}')`)).ok);
const bSees = await as(B, "select * from public.fitclub_user_state");
check("B cannot see A's state", bSees.ok && bSees.res.rows.length === 0);
const aSees = await as(A, "select key, data from public.fitclub_user_state");
check("A reads their own state back", aSees.ok && aSees.res.rows[0]?.data?.programs?.length === 0);
check("a malformed key is rejected",
  !(await as(A, `insert into public.fitclub_user_state (user_id, key, data) values ('${A}', 'Bad Key!', '{}')`)).ok);
const bClear = await as(B, `delete from public.fitclub_user_state where user_id = '${A}'`);
check("B cannot delete A's state", bClear.ok && bClear.res.affectedRows === 0);

// Avatars
check("the fitclub-avatars bucket exists", (await db.query("select public from storage.buckets where id = 'fitclub-avatars'")).rows[0]?.public === true);
check("A uploads into their own folder",
  (await as(A, `insert into storage.objects (bucket_id, name) values ('fitclub-avatars', '${A}/me.png')`)).ok);
check("A cannot upload into B's folder",
  !(await as(A, `insert into storage.objects (bucket_id, name) values ('fitclub-avatars', '${B}/me.png')`)).ok);
const anonAvatar = await as(null, "select name from storage.objects where bucket_id = 'fitclub-avatars'");
check("anyone can view avatars", anonAvatar.ok && anonAvatar.res.rows.length === 1);

console.log(`supabase schema: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
