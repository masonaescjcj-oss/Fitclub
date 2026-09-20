/*
 * End-to-end check of the messenger server, in-process, with two accounts.
 * Run: node server/test.js
 */
const path = require("path");
const fs = require("fs");
const os = require("os");

process.env.FITCLUB_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "fitclub-srv-"));
const { start, db } = require("./index.js");

let pass = 0, fail = 0;
const ok = (c, m, got) => { c ? pass++ : fail++; if (!c) console.log("✗", m, got !== undefined ? `(got ${JSON.stringify(got).slice(0, 200)})` : ""); };

async function main() {
  const server = start(0);
  await new Promise((r) => server.once("listening", r));
  const base = `http://localhost:${server.address().port}`;
  const call = async (method, p, { token, body } = {}) => {
    const res = await fetch(base + p, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  };
  /** Collects SSE events for one user until closed. */
  const listen = async (token) => {
    const ctl = new AbortController();
    const res = await fetch(`${base}/api/events?token=${token}`, { signal: ctl.signal });
    const events = [];
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    (async () => {
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n\n")) >= 0) {
            const frame = buf.slice(0, i); buf = buf.slice(i + 2);
            const line = frame.split("\n").find((l) => l.startsWith("data: "));
            if (line) events.push(JSON.parse(line.slice(6)));
          }
        }
      } catch { /* aborted */ }
    })();
    return { events, close: () => ctl.abort() };
  };
  const waitFor = (pred, ms = 2000) => new Promise((resolve) => { const t0 = Date.now(); const tick = () => (pred() ? resolve(true) : Date.now() - t0 > ms ? resolve(false) : setTimeout(tick, 25)); tick(); });

  // ── health + auth ──
  ok((await call("GET", "/api/health")).json.ok === true, "health");
  let r = await call("POST", "/api/auth", { body: { name: "Hakim", username: "ab" } });
  ok(r.status === 400 && r.json.error === "username_short", "short username rejected", r.json);
  r = await call("POST", "/api/auth", { body: { name: "Hakim", username: "hakim_pro", avatar: "🏋️" } });
  ok(r.status === 200 && r.json.token && r.json.user.username === "hakim_pro", "register A", r.json);
  const A = { token: r.json.token, id: r.json.user.id };
  r = await call("POST", "/api/auth", { body: { name: "Sara", username: "sara_runs" } });
  const B = { token: r.json.token, id: r.json.user.id };
  r = await call("POST", "/api/auth", { body: { name: "Somebody", username: "hakim_pro" } });
  ok(r.status === 200 && r.json.user.id === A.id, "same username logs into the same account (dev auth)");
  ok((await call("GET", "/api/me")).status === 401, "no token → 401");
  ok((await call("GET", "/api/username/sara_runs", { token: A.token })).json.available === false, "taken username reported");
  ok((await call("GET", "/api/username/fresh_one", { token: A.token })).json.available === true, "free username reported");

  // ── live streams ──
  const sa = await listen(A.token);
  const sb = await listen(B.token);
  await waitFor(() => sa.events.length && sb.events.length);
  ok(sa.events[0].type === "hello" && sa.events[0].userId === A.id, "hello frame carries my id");

  // ── A creates a public channel; B finds and joins it by @username ──
  r = await call("POST", "/api/chats", { token: A.token, body: { type: "channel", title: "Lift Log", isPublic: true, username: "lift_log", description: "daily" } });
  ok(r.status === 200 && r.json.type === "channel" && r.json.username === "lift_log" && r.json.remote === true && r.json.admins[0] === A.id, "channel created", r.json);
  const ch = r.json;
  r = await call("POST", "/api/chats", { token: A.token, body: { type: "channel", title: "Dup", isPublic: true, username: "lift_log" } });
  ok(r.status === 400 && r.json.error === "username_taken", "duplicate channel username rejected");
  r = await call("GET", "/api/chats/public?q=lift", { token: B.token });
  ok(r.json.length === 1 && r.json[0].id === ch.id && r.json[0].memberCount === 1, "public search from B", r.json);
  r = await call("GET", "/api/resolve?code=@lift_log", { token: B.token });
  ok(r.json.chat?.id === ch.id && r.json.joined === false, "resolve @handle → not joined yet");
  r = await call("GET", `/api/resolve?code=${encodeURIComponent(`https://app.example/#join=${ch.inviteLink.split("/")[1]}`)}`, { token: B.token });
  ok(r.json.chat?.id === ch.id, "resolve app URL with invite token");
  r = await call("POST", "/api/join", { token: B.token, body: { code: "lift_log" } });
  ok(r.status === 200 && r.json.chat.members.includes(B.id) && r.json.chat.subscribers === 2, "B joined; subscribers = 2", r.json);
  ok(await waitFor(() => sa.events.some((e) => e.type === "chat" && e.chat.id === ch.id && e.chat.members.includes(B.id))), "A got the chat update live");
  ok(await waitFor(() => sa.events.some((e) => e.type === "message" && e.message.kind === "system" && /Sara joined/.test(e.message.text))), "A saw the joined pill");
  r = await call("POST", "/api/join", { token: B.token, body: { code: "nope_nope" } });
  ok(r.status === 404 && r.json.error === "link_not_found", "unknown code → 404");

  // ── broadcast: only admins post; subscribers receive live ──
  r = await call("POST", `/api/chats/${ch.id}/messages`, { token: B.token, body: { text: "hi" } });
  ok(r.status === 403 && r.json.error === "admins_only", "subscriber cannot post to channel");
  r = await call("POST", `/api/chats/${ch.id}/messages`, { token: A.token, body: { text: "First post 💪", clientId: "c1" } });
  ok(r.status === 200 && r.json.clientId === "c1" && r.json.views === 1, "admin posts with clientId echoed", r.json);
  const post = r.json;
  ok(await waitFor(() => sb.events.some((e) => e.type === "message" && e.message.id === post.id)), "B received the post live");
  ok(await waitFor(() => sa.events.some((e) => e.type === "message" && e.message.id === post.id)), "A received their own echo");
  r = await call("POST", `/api/messages/${post.id}/react`, { token: B.token, body: { emoji: "🔥" } });
  ok(r.json.reactions["🔥"]?.[0] === B.id, "B reacted");
  ok(await waitFor(() => sa.events.some((e) => e.type === "message" && e.message.id === post.id && e.message.reactions["🔥"])), "A saw the reaction live");

  // ── group with members, admin rights, mentions travel as text ──
  r = await call("POST", "/api/chats", { token: A.token, body: { type: "group", title: "Crew", memberIds: ["sara_runs"] } });
  const g = r.json;
  ok(g.type === "group" && g.members.includes(B.id) && g.isPublic === false && /\+/.test(g.inviteLink), "group with B via username; private invite link", g);
  ok(await waitFor(() => sb.events.some((e) => e.type === "chat" && e.chat.id === g.id)), "B learned of the group live");
  r = await call("POST", `/api/chats/${g.id}/messages`, { token: B.token, body: { text: "@hakim_pro you in?" } });
  ok(r.status === 200, "member posts in group");
  ok(await waitFor(() => sa.events.some((e) => e.type === "message" && e.message.text === "@hakim_pro you in?")), "A received the mention live");
  r = await call("POST", `/api/chats/${g.id}/admins/${B.id}`, { token: B.token });
  ok(r.status === 403, "non-admin cannot promote");
  r = await call("POST", `/api/chats/${g.id}/admins/${B.id}`, { token: A.token });
  ok(r.json.admins.includes(B.id), "owner promoted B");
  ok(await waitFor(() => sb.events.some((e) => e.type === "message" && /Sara is now an admin/.test(e.message.text))), "promotion pill delivered");
  r = await call("PATCH", `/api/chats/${g.id}`, { token: B.token, body: { title: "Crew 2", isPublic: true, username: "crew_two" } });
  ok(r.json.title === "Crew 2" && r.json.username === "crew_two", "admin B edited info + made it public");
  r = await call("POST", `/api/chats/${g.id}/read`, { token: A.token });
  ok(r.json.ok && (await waitFor(() => sb.events.some((e) => e.type === "read" && e.chatId === g.id && e.userId === A.id))), "read receipt reaches B");
  r = await call("DELETE", `/api/chats/${g.id}/members/${A.id}`, { token: B.token });
  ok(r.status === 403 && r.json.error === "owner", "owner cannot be removed");
  r = await call("POST", `/api/chats/${g.id}/leave`, { token: B.token });
  ok(r.json.ok && !db.chats.find((c) => c.id === g.id).members.includes(B.id), "B left");

  // ── private chat + sync shape ──
  r = await call("POST", "/api/private", { token: A.token, body: { username: "sara_runs" } });
  const pv = r.json;
  ok(pv.type === "private" && pv.members.length === 2, "private chat created");
  r = await call("POST", "/api/private", { token: B.token, body: { userId: A.id } });
  ok(r.json.id === pv.id, "private chat is reused from the other side");
  r = await call("GET", "/api/sync", { token: B.token });
  ok(r.json.me.id === B.id && r.json.chats.some((c) => c.id === ch.id) && r.json.chats.some((c) => c.id === pv.id) && !r.json.chats.some((c) => c.id === g.id), "sync lists my chats only", r.json.chats.map((c) => c.id));
  ok(r.json.users.some((u) => u.id === A.id) && r.json.messages.some((m) => m.id === post.id), "sync carries peers and messages");
  ok(r.json.chats.find((c) => c.id === ch.id).lastReadAt !== undefined, "per-user read marker on chats");
  r = await call("GET", `/api/sync?since=${encodeURIComponent(post.at)}`, { token: B.token });
  ok(!r.json.messages.some((m) => m.id === post.id), "since= filters older messages");
  r = await call("GET", "/api/users?q=hak", { token: B.token });
  ok(r.json.length === 1 && r.json[0].username === "hakim_pro" && r.json[0].online === true, "user search + presence", r.json);

  // ── owner deletes the channel; B is told ──
  r = await call("DELETE", `/api/chats/${ch.id}`, { token: B.token });
  ok(r.status === 403, "non-owner cannot delete");
  r = await call("DELETE", `/api/chats/${ch.id}`, { token: A.token });
  ok(r.json.ok && (await waitFor(() => sb.events.some((e) => e.type === "chat.removed" && e.chatId === ch.id))), "channel deleted, B notified");

  // ── persistence ──
  await new Promise((r2) => setTimeout(r2, 300));
  const saved = JSON.parse(fs.readFileSync(path.join(process.env.FITCLUB_DATA_DIR, "db.json"), "utf8"));
  ok(saved.users.length === 2 && saved.chats.some((c) => c.id === pv.id), "state written to disk");

  sa.close(); sb.close();
  await new Promise((r2) => setTimeout(r2, 100));
  ok(await waitFor(() => (db.users.find((u) => u.id === A.id).lastSeen || "") > post.at), "last seen stamped on disconnect");

  server.close();
  console.log(`server: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
