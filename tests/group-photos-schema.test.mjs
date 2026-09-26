// A photo for groups and channels (supabase/migrations/0012) on PGlite:
// owners and admins set it, members and outsiders can't, every member sees
// it, and the chat says when it changed.

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
  -- Another app in the same project, with its own bucket.
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
await db.exec("grant select, insert, update, delete on storage.objects to authenticated; grant select on storage.objects to anon;");

const A = "aaaaaaaa-0000-0000-0000-000000000001"; // anna, owns the group
const B = "bbbbbbbb-0000-0000-0000-000000000002"; // ben, a member
const C = "cccccccc-0000-0000-0000-000000000003"; // cara, made an admin
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
const put = (uid, name) => as(uid, `insert into storage.objects (bucket_id, name) values ('fitclub-avatars', '${name}')`);

const g = (await rpc(A, "create_chat", "group", "Lifters", "", "", "", false, null, ["ben_runs", "cara_flow"])).value;
const ch = (await rpc(A, "create_chat", "channel", "Tips", "", "", "", false, null, ["ben_runs"])).value;
const dm = (await rpc(A, "private_chat", "ben_runs")).value;
await rpc(A, "toggle_admin", g.id, C);
check("a new group has no photo", g.photo === null, g.photo);

// ── Storage ──
check("the owner puts a photo in the group's folder", (await put(A, `chats/${g.id}/photo.jpg`)).ok);
check("an admin can too", (await put(C, `chats/${g.id}/cara.jpg`)).ok);
check("a member can't", !(await put(B, `chats/${g.id}/ben.jpg`)).ok);
check("someone outside can't", !(await put(D, `chats/${g.id}/dan.jpg`)).ok);
check("a private chat has no photo of its own: the other person's shows", !(await put(A, `chats/${dm.id}/p.jpg`)).ok);
check("only one level under the chat's folder", !(await put(A, `chats/${g.id}/deep/p.jpg`)).ok);
check("a made-up folder is refused", !(await put(A, "chats/not-a-chat/p.jpg")).ok && !(await put(A, "chats/p.jpg")).ok);
check("a person's own avatar still works as before", (await put(B, `${B}/avatar.jpg`)).ok && !(await put(B, `${A}/avatar.jpg`)).ok);
check("a member can't take the group's photo down", (await as(B, `delete from storage.objects where name = 'chats/${g.id}/photo.jpg' returning id`)).rows?.length === 0);
check("an admin can", (await as(C, `delete from storage.objects where name = 'chats/${g.id}/cara.jpg' returning id`)).rows?.length === 1);
check("anyone can see a group's photo, like profile photos", (await as(null, `select name from storage.objects where name = 'chats/${g.id}/photo.jpg'`)).rows?.length === 1);

// ── The chat ──
let r = await rpc(A, "update_chat", g.id, { photo: `chats/${g.id}/photo.jpg?v=17` });
check("the owner sets the group's photo", r.ok && r.value.photo === `chats/${g.id}/photo.jpg?v=17`, r);
check("…every member sees it", (await rpc(B, "chat_bundle", g.id)).value?.chat?.photo === `chats/${g.id}/photo.jpg?v=17`);
check("…their devices are told", Number((await db.query(`select count(*) n from public.fitclub_inbox where kind = 'chat' and chat_id = '${g.id}' and user_id = '${B}'`)).rows[0].n) >= 1);
const lines = async (chat) => (await db.query(`select text, text_fa from public.fitclub_messages where chat_id = '${chat}' and kind = 'system' order by created_at, id`)).rows;
check("…and the chat says so", (await lines(g.id)).some((m) => m.text === "Group photo updated" && m.text_fa === "عکس گروه عوض شد"), await lines(g.id));
const count = (await lines(g.id)).length;
await rpc(A, "update_chat", g.id, { photo: `chats/${g.id}/photo.jpg?v=17` });
check("setting the same photo again says nothing", (await lines(g.id)).length === count);
check("a member can't change it", (await rpc(B, "update_chat", g.id, { photo: `chats/${g.id}/ben.jpg` })).error?.includes("admins_only"));
check("an admin can", (await rpc(C, "update_chat", g.id, { photo: `chats/${g.id}/photo.jpg?v=18` })).value?.photo === `chats/${g.id}/photo.jpg?v=18`);
for (const bad of [`chats/${ch.id}/photo.jpg`, `https://evil.example/x.jpg`, `chats/${g.id}/../x.jpg`, `chats/${g.id}/a b.jpg`, `${A}/avatar.jpg`, `chats/${g.id}/photo.jpg?v=1&x=2`]) {
  check(`a photo from anywhere else is refused: ${bad}`, (await rpc(A, "update_chat", g.id, { photo: bad })).error?.includes("bad_photo"));
}
r = await rpc(A, "update_chat", ch.id, { photo: `chats/${ch.id}/c.jpg` });
check("a channel takes a photo too, and says so", r.value?.photo === `chats/${ch.id}/c.jpg` && (await lines(ch.id)).some((m) => m.text === "Channel photo updated" && m.text_fa === "عکس کانال عوض شد"));
check("a private chat can't take one", (await rpc(A, "update_chat", dm.id, { photo: `chats/${dm.id}/p.jpg` })).error?.includes("admins_only"));
r = await rpc(A, "update_chat", g.id, { photo: null });
check("the owner takes it down", r.ok && r.value.photo === null && (await lines(g.id)).some((m) => m.text === "Group photo removed" && m.text_fa === "عکس گروه حذف شد"));
r = await rpc(A, "update_chat", g.id, { title: "Lifters club" });
check("other edits leave the photo alone", r.value.title === "Lifters club" && r.value.photo === null);
await rpc(A, "update_chat", g.id, { photo: `chats/${g.id}/photo.jpg?v=19` });
check("…and don't touch it once set", (await rpc(A, "update_chat", g.id, { description: "Heavy days" })).value.photo === `chats/${g.id}/photo.jpg?v=19`);
check("the photo can't be written straight into the table", !(await as(A, `update public.fitclub_chats set photo = 'x' where id = '${g.id}'`)).ok
  || (await db.query(`select photo from public.fitclub_chats where id = '${g.id}'`)).rows[0].photo === `chats/${g.id}/photo.jpg?v=19`);
check("public search shows a public channel's photo", await (async () => {
  await rpc(A, "update_chat", ch.id, { isPublic: true, username: "tips_daily" });
  const found = (await rpc(D, "search_public", "tips")).value || [];
  return found.length === 1 && found[0].photo === `chats/${ch.id}/c.jpg`;
})());

// ── Deleting the account takes the photos of chats that go with it ──
const solo = (await rpc(D, "create_chat", "group", "Just me", "", "", "", false, null, [])).value;
await put(D, `chats/${solo.id}/solo.jpg`);
await put(D, `${D}/avatar.jpg`);
const mine = (await rpc(D, "my_photos")).value;
check("before deleting an account: its avatar and the photo of the group only it is in",
  JSON.stringify([...mine.avatars].sort()) === JSON.stringify([`${D}/avatar.jpg`, `chats/${solo.id}/solo.jpg`].sort()), mine);
check("…not the photo of a group others stay in", !(await rpc(A, "my_photos")).value.avatars.some((n) => n.startsWith("chats/")));

console.log(`group photos schema: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
