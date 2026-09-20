/*
 * FitClub messenger server.
 *
 * A small, dependency-free Node service that speaks the same JSON the client
 * already stores: users, chats (private / group / channel), messages, links.
 * REST for actions, Server-Sent Events for live updates, one JSON file for
 * persistence. Start with `npm run server` (port 4000 by default).
 *
 * Auth is deliberately minimal for now: POST /api/auth with a name and a
 * username returns a bearer token for that account (creating it on first
 * sight). Swap that one route for real sign-in when accounts exist.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 4000);
const DATA_DIR = process.env.FITCLUB_DATA_DIR || path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const LINK_HOST = "fitclub.app";
const USERNAME_RE = /^[a-z][a-z0-9_]{4,31}$/;
const RESERVED = new Set(["admin", "fitclub", "support", "help", "settings", "me", "saved"]);

/* ───────────────────────────── storage ───────────────────────────── */

const uid = (prefix = "") => `${prefix}${Date.now().toString(36)}${crypto.randomBytes(4).toString("hex")}`;
const now = () => new Date().toISOString();

const db = { users: [], tokens: {}, chats: [], messages: [] };
let saveTimer = null;

function load() {
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    Object.assign(db, JSON.parse(raw));
  } catch {
    // First run: an empty world.
  }
}

/** Debounced write-through; the file is the whole database. */
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DB_FILE, JSON.stringify(db));
    } catch (e) {
      console.error("save failed", e.message);
    }
  }, 150);
}

/* ───────────────────────────── helpers ───────────────────────────── */

class HttpError extends Error {
  constructor(status, code, message) { super(message || code); this.status = status; this.code = code; }
}
const bad = (code, message) => new HttpError(400, code, message);
const notFound = (code = "not_found") => new HttpError(404, code);
const forbidden = (code = "forbidden") => new HttpError(403, code);

const publicUser = (u) => ({ id: u.id, name: u.name, nameFa: u.nameFa || u.name, username: u.username, avatar: u.avatar, color: u.color, bio: u.bio || "", phone: u.phone || "", online: isOnline(u.id), lastSeen: u.lastSeen || null, verified: !!u.verified, premium: !!u.premium });

const findUser = (id) => db.users.find((u) => u.id === id);
const findByUsername = (username) => db.users.find((u) => u.username === String(username || "").toLowerCase());
const findChat = (id) => db.chats.find((c) => c.id === id);
const isMember = (chat, userId) => chat.members.includes(userId);
const isAdmin = (chat, userId) => chat.admins.includes(userId);

function validateUsername(raw, { selfId = null, selfChatId = null } = {}) {
  const slug = String(raw || "").trim().toLowerCase();
  if (slug.length < 5) return "short";
  if (slug.length > 32) return "long";
  if (!/^[a-z0-9_]+$/.test(slug)) return "chars";
  if (!USERNAME_RE.test(slug)) return "start";
  if (RESERVED.has(slug)) return "taken";
  if (db.users.some((u) => u.username === slug && u.id !== selfId)) return "taken";
  if (db.chats.some((c) => c.username === slug && c.id !== selfChatId)) return "taken";
  return null;
}

function makeInviteLink() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let token = "";
  for (let i = 0; i < 16; i += 1) token += alphabet[crypto.randomInt(alphabet.length)];
  return `${LINK_HOST}/+${token}`;
}

/** The chat as one member sees it: their own read marker, subscriber count, no per-user tables. */
function chatFor(chat, userId) {
  const { readAt, ...rest } = chat;
  return { ...rest, lastReadAt: (readAt || {})[userId] || null, subscribers: chat.type === "channel" ? chat.members.length : 0, remote: true };
}

const chatLink = (chat) => (chat.isPublic && chat.username ? `${LINK_HOST}/${chat.username}` : chat.inviteLink || "");

function systemMessage(chatId, text, textFa, senderId) {
  return { id: uid("m_"), chatId, senderId, kind: "system", text, textFa, at: now(), status: "read", reactions: {}, deleted: false };
}

const shortName = (u) => (u ? u.name : "someone");

/* ───────────────────────────── realtime ───────────────────────────── */

/** userId -> Set of SSE responses. */
const streams = new Map();
const isOnline = (userId) => (streams.get(userId) || new Set()).size > 0;

function emit(userIds, event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const id of new Set(userIds)) {
    for (const res of streams.get(id) || []) {
      try { res.write(payload); } catch { /* the socket is gone; it is dropped on close */ }
    }
  }
}

function emitChat(chat, type = "chat") {
  // Members travel with the chat so a client that has never met them can name them at once.
  const users = chat.members.map(findUser).filter(Boolean).map(publicUser);
  for (const id of chat.members) emit([id], { type, chat: chatFor(chat, id), users });
}

function presence(userId) {
  const u = findUser(userId);
  if (!u) return;
  const peers = new Set();
  for (const c of db.chats) if (isMember(c, userId)) c.members.forEach((m) => peers.add(m));
  peers.delete(userId);
  emit([...peers], { type: "user", user: publicUser(u) });
}

/* ───────────────────────────── domain ───────────────────────────── */

function postMessage(chat, message) {
  db.messages.push(message);
  save();
  const sender = findUser(message.senderId);
  emit(chat.members, { type: "message", message, sender: sender ? publicUser(sender) : null });
  return message;
}

function createChat(owner, body) {
  const type = body.type === "channel" ? "channel" : "group";
  const title = String(body.title || "").trim();
  if (!title) throw bad("title_required");
  const isPublic = !!body.isPublic;
  let username = "";
  if (isPublic) {
    const problem = validateUsername(body.username);
    if (problem) throw bad(`username_${problem}`);
    username = String(body.username).trim().toLowerCase();
  }
  const members = [owner.id];
  for (const raw of body.memberIds || []) {
    const u = findUser(raw) || findByUsername(raw);
    if (u && !members.includes(u.id)) members.push(u.id);
  }
  const chat = {
    id: uid("c_"), type, title, titleFa: title, emoji: body.emoji || (type === "channel" ? "📣" : "👥"), color: body.color || (type === "channel" ? "#f59e0b" : "#2fa6ff"),
    description: String(body.description || "").trim(), isPublic, username, inviteLink: makeInviteLink(),
    members, admins: [owner.id], createdBy: owner.id, createdAt: now(), readAt: { [owner.id]: now() },
    pinned: false, muted: false, archived: false, folders: [], verified: false, premium: false, draft: "", pinnedMessageId: null,
  };
  db.chats.push(chat);
  save();
  emitChat(chat);
  postMessage(chat, systemMessage(chat.id, type === "channel" ? "Channel created" : "Group created", type === "channel" ? "کانال ساخته شد" : "گروه ساخته شد", owner.id));
  return chat;
}

function privateChat(a, b) {
  const existing = db.chats.find((c) => c.type === "private" && c.members.length === 2 && isMember(c, a.id) && isMember(c, b.id));
  if (existing) return existing;
  const chat = {
    id: uid("c_"), type: "private", title: "", titleFa: "", emoji: "", color: "", description: "", isPublic: false, username: "", inviteLink: "",
    members: [a.id, b.id], admins: [], createdBy: a.id, createdAt: now(), readAt: { [a.id]: now() },
    pinned: false, muted: false, archived: false, folders: [], verified: false, premium: false, draft: "", pinnedMessageId: null,
  };
  db.chats.push(chat);
  save();
  emitChat(chat);
  return chat;
}

function join(user, code) {
  const raw = String(code || "").trim().replace(/^https?:\/\/[^/]+\//, "").replace(/^[#?&]?join=/, "").replace(new RegExp(`^${LINK_HOST}/`), "").replace(/^@/, "");
  let chat = null;
  if (raw.startsWith("+")) chat = db.chats.find((c) => c.inviteLink && c.inviteLink.endsWith(`/${raw}`));
  else chat = db.chats.find((c) => c.isPublic && c.username === raw.toLowerCase());
  if (!chat) {
    const person = !raw.startsWith("+") ? findByUsername(raw) : null;
    if (person) return { user: publicUser(person) };
    throw notFound("link_not_found");
  }
  if (!isMember(chat, user.id)) {
    chat.members.push(user.id);
    chat.readAt = { ...(chat.readAt || {}), [user.id]: now() };
    save();
    postMessage(chat, systemMessage(chat.id, `${shortName(user)} joined`, `${shortName(user)} پیوست`, user.id));
    emitChat(chat);
  }
  return { chat: chatFor(chat, user.id) };
}

/* ───────────────────────────── http plumbing ───────────────────────────── */

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
}

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; if (data.length > 1e6) { reject(bad("too_large")); req.destroy(); } });
    req.on("end", () => { try { resolve(data ? JSON.parse(data) : {}); } catch { reject(bad("bad_json")); } });
    req.on("error", reject);
  });
}

function authUser(req, url) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : url.searchParams.get("token");
  const userId = token && db.tokens[token];
  return userId ? findUser(userId) : null;
}

/** Route table: method + pattern with :params. */
const routes = [];
const route = (method, pattern, handler) => routes.push({ method, pattern, keys: (pattern.match(/:\w+/g) || []).map((k) => k.slice(1)), re: new RegExp(`^${pattern.replace(/:\w+/g, "([^/]+)")}$`), handler });

/* ───────────────────────────── routes ───────────────────────────── */

route("POST", "/api/auth", async ({ body }) => {
  const name = String(body.name || "").trim();
  if (!name) throw bad("name_required");
  const username = String(body.username || "").trim().toLowerCase();
  let user = findByUsername(username);
  if (!user) {
    const problem = validateUsername(username);
    if (problem) throw bad(`username_${problem}`);
    user = { id: uid("u_"), name, nameFa: name, username, avatar: body.avatar || "🙂", color: body.color || "#3390ec", bio: "", phone: "", createdAt: now(), lastSeen: now() };
    db.users.push(user);
  }
  const token = crypto.randomBytes(24).toString("hex");
  db.tokens[token] = user.id;
  save();
  return { token, user: publicUser(user) };
});

route("GET", "/api/me", async ({ user }) => publicUser(user));

route("PATCH", "/api/me", async ({ user, body }) => {
  if (body.username !== undefined) {
    const problem = validateUsername(body.username, { selfId: user.id });
    if (problem) throw bad(`username_${problem}`);
    user.username = String(body.username).trim().toLowerCase();
  }
  for (const k of ["name", "bio", "phone", "avatar", "color"]) if (body[k] !== undefined) user[k] = String(body[k]);
  if (body.name !== undefined) user.nameFa = user.name;
  save();
  presence(user.id);
  return publicUser(user);
});

route("GET", "/api/users", async ({ url, user }) => {
  const q = String(url.searchParams.get("q") || "").trim().toLowerCase().replace(/^@/, "");
  if (!q) return [];
  return db.users.filter((u) => u.id !== user.id && (u.username.includes(q) || u.name.toLowerCase().includes(q))).slice(0, 20).map(publicUser);
});

route("GET", "/api/users/:username", async ({ params }) => {
  const u = findByUsername(params.username);
  if (!u) throw notFound("user_not_found");
  return publicUser(u);
});

route("GET", "/api/username/:slug", async ({ params, user }) => ({ available: validateUsername(params.slug, { selfId: user.id }) === null, problem: validateUsername(params.slug, { selfId: user.id }) }));

/** Everything the client needs to paint: me, the people in my chats, my chats, recent messages. */
route("GET", "/api/sync", async ({ user, url }) => {
  const since = url.searchParams.get("since");
  const chats = db.chats.filter((c) => isMember(c, user.id));
  const peopleIds = new Set();
  chats.forEach((c) => c.members.forEach((m) => peopleIds.add(m)));
  const chatIds = new Set(chats.map((c) => c.id));
  let messages = db.messages.filter((m) => chatIds.has(m.chatId));
  if (since) messages = messages.filter((m) => m.at > since);
  else {
    // Last 200 per chat keeps the first paint light.
    const perChat = {};
    messages = messages.filter((m) => { perChat[m.chatId] = (perChat[m.chatId] || 0) + 1; return true; });
    const drop = new Set();
    for (const c of chats) {
      const list = messages.filter((m) => m.chatId === c.id);
      list.slice(0, Math.max(list.length - 200, 0)).forEach((m) => drop.add(m.id));
    }
    messages = messages.filter((m) => !drop.has(m.id));
  }
  messages.forEach((m) => peopleIds.add(m.senderId));
  return {
    me: publicUser(user),
    users: [...peopleIds].map(findUser).filter(Boolean).map(publicUser),
    chats: chats.map((c) => chatFor(c, user.id)),
    messages,
    now: now(),
  };
});

route("GET", "/api/chats/public", async ({ url, user }) => {
  const q = String(url.searchParams.get("q") || "").trim().toLowerCase().replace(/^@/, "");
  if (!q) return [];
  return db.chats
    .filter((c) => c.isPublic && !isMember(c, user.id) && (c.username.includes(q) || c.title.toLowerCase().includes(q)))
    .slice(0, 20)
    .map((c) => ({ ...chatFor(c, user.id), members: [], memberCount: c.members.length, subscribers: c.type === "channel" ? c.members.length : 0 }));
});

route("GET", "/api/resolve", async ({ url, user }) => {
  const code = url.searchParams.get("code") || "";
  try {
    const raw = String(code).trim().replace(/^https?:\/\/[^/]+\//, "").replace(/^[#?&]?join=/, "").replace(new RegExp(`^${LINK_HOST}/`), "").replace(/^@/, "");
    const chat = raw.startsWith("+") ? db.chats.find((c) => c.inviteLink && c.inviteLink.endsWith(`/${raw}`)) : db.chats.find((c) => c.isPublic && c.username === raw.toLowerCase());
    if (chat) return { chat: { ...chatFor(chat, user.id), members: isMember(chat, user.id) ? chat.members : [], memberCount: chat.members.length }, joined: isMember(chat, user.id) };
    const person = !raw.startsWith("+") ? findByUsername(raw) : null;
    if (person) return { user: publicUser(person) };
    return {};
  } catch { return {}; }
});

route("POST", "/api/join", async ({ user, body }) => join(user, body.code));

route("POST", "/api/chats", async ({ user, body }) => chatFor(createChat(user, body), user.id));

route("POST", "/api/private", async ({ user, body }) => {
  const other = findUser(body.userId) || findByUsername(body.username);
  if (!other) throw notFound("user_not_found");
  if (other.id === user.id) throw bad("self");
  return chatFor(privateChat(user, other), user.id);
});

route("PATCH", "/api/chats/:id", async ({ user, params, body }) => {
  const chat = findChat(params.id);
  if (!chat || !isMember(chat, user.id)) throw notFound("chat_not_found");
  if (!isAdmin(chat, user.id)) throw forbidden("admins_only");
  if (body.isPublic !== undefined) {
    if (body.isPublic) {
      const problem = validateUsername(body.username, { selfChatId: chat.id });
      if (problem) throw bad(`username_${problem}`);
      chat.isPublic = true; chat.username = String(body.username).trim().toLowerCase();
    } else { chat.isPublic = false; chat.username = ""; }
  }
  if (body.title !== undefined && String(body.title).trim() && body.title !== chat.title) {
    chat.title = String(body.title).trim(); chat.titleFa = chat.title;
    postMessage(chat, systemMessage(chat.id, `Name changed to “${chat.title}”`, `نام به «${chat.title}» تغییر کرد`, user.id));
  }
  for (const k of ["description", "emoji", "color"]) if (body[k] !== undefined) chat[k] = String(body[k]);
  if (body.revokeLink) chat.inviteLink = makeInviteLink();
  save();
  emitChat(chat);
  return chatFor(chat, user.id);
});

route("POST", "/api/chats/:id/members", async ({ user, params, body }) => {
  const chat = findChat(params.id);
  if (!chat || !isMember(chat, user.id)) throw notFound("chat_not_found");
  if (!isAdmin(chat, user.id)) throw forbidden("admins_only");
  const added = [];
  for (const raw of body.userIds || []) {
    const u = findUser(raw) || findByUsername(raw);
    if (u && !isMember(chat, u.id)) { chat.members.push(u.id); chat.readAt = { ...(chat.readAt || {}), [u.id]: chat.createdAt }; added.push(u); }
  }
  if (added.length) {
    save();
    postMessage(chat, systemMessage(chat.id, `${shortName(user)} added ${added.map(shortName).join(", ")}`, `${shortName(user)} ${added.map(shortName).join("، ")} را اضافه کرد`, user.id));
    emitChat(chat);
  }
  return chatFor(chat, user.id);
});

route("DELETE", "/api/chats/:id/members/:uid", async ({ user, params }) => {
  const chat = findChat(params.id);
  if (!chat || !isMember(chat, user.id)) throw notFound("chat_not_found");
  if (!isAdmin(chat, user.id)) throw forbidden("admins_only");
  if (params.uid === chat.createdBy) throw forbidden("owner");
  const gone = findUser(params.uid);
  chat.members = chat.members.filter((m) => m !== params.uid);
  chat.admins = chat.admins.filter((m) => m !== params.uid);
  save();
  postMessage(chat, systemMessage(chat.id, `${shortName(gone)} was removed`, `${shortName(gone)} حذف شد`, user.id));
  emitChat(chat);
  emit([params.uid], { type: "chat.removed", chatId: chat.id });
  return chatFor(chat, user.id);
});

route("POST", "/api/chats/:id/admins/:uid", async ({ user, params }) => {
  const chat = findChat(params.id);
  if (!chat || !isMember(chat, user.id)) throw notFound("chat_not_found");
  if (!isAdmin(chat, user.id)) throw forbidden("admins_only");
  if (!isMember(chat, params.uid) || params.uid === chat.createdBy) throw bad("not_applicable");
  const target = findUser(params.uid);
  const was = isAdmin(chat, params.uid);
  chat.admins = was ? chat.admins.filter((m) => m !== params.uid) : [...chat.admins, params.uid];
  save();
  postMessage(chat, systemMessage(chat.id, was ? `${shortName(target)} is no longer an admin` : `${shortName(target)} is now an admin`, was ? `${shortName(target)} دیگر مدیر نیست` : `${shortName(target)} مدیر شد`, user.id));
  emitChat(chat);
  return chatFor(chat, user.id);
});

route("POST", "/api/chats/:id/leave", async ({ user, params }) => {
  const chat = findChat(params.id);
  if (!chat || !isMember(chat, user.id)) throw notFound("chat_not_found");
  chat.members = chat.members.filter((m) => m !== user.id);
  chat.admins = chat.admins.filter((m) => m !== user.id);
  if (chat.members.length === 0) {
    db.chats = db.chats.filter((c) => c.id !== chat.id);
    db.messages = db.messages.filter((m) => m.chatId !== chat.id);
  } else {
    if (chat.admins.length === 0) chat.admins = [chat.members[0]];
    postMessage(chat, systemMessage(chat.id, `${shortName(user)} left`, `${shortName(user)} رفت`, user.id));
    emitChat(chat);
  }
  save();
  return { ok: true };
});

route("DELETE", "/api/chats/:id", async ({ user, params }) => {
  const chat = findChat(params.id);
  if (!chat || !isMember(chat, user.id)) throw notFound("chat_not_found");
  if (chat.createdBy !== user.id && chat.type !== "private") throw forbidden("owner_only");
  const members = [...chat.members];
  db.chats = db.chats.filter((c) => c.id !== chat.id);
  db.messages = db.messages.filter((m) => m.chatId !== chat.id);
  save();
  emit(members, { type: "chat.removed", chatId: chat.id });
  return { ok: true };
});

route("GET", "/api/chats/:id/messages", async ({ user, params, url }) => {
  const chat = findChat(params.id);
  if (!chat || !isMember(chat, user.id)) throw notFound("chat_not_found");
  const before = url.searchParams.get("before");
  let list = db.messages.filter((m) => m.chatId === chat.id);
  if (before) list = list.filter((m) => m.at < before);
  return list.slice(-100);
});

route("POST", "/api/chats/:id/messages", async ({ user, params, body }) => {
  const chat = findChat(params.id);
  if (!chat || !isMember(chat, user.id)) throw notFound("chat_not_found");
  if (chat.type === "channel" && !isAdmin(chat, user.id)) throw forbidden("admins_only");
  const kind = ["text", "photo", "voice", "sticker", "poll", "file"].includes(body.kind) ? body.kind : "text";
  const text = String(body.text || "").slice(0, 4000);
  if (kind === "text" && !text.trim()) throw bad("empty");
  const message = {
    id: uid("m_"), clientId: body.clientId || null, chatId: chat.id, senderId: user.id, kind, text, textFa: "",
    replyTo: body.replyTo || null, media: body.media || null, poll: body.poll || null, voice: body.voice || null,
    at: now(), status: "sent", reactions: {}, deleted: false, editedAt: null, silent: !!body.silent, views: chat.type === "channel" ? 1 : 0,
  };
  chat.readAt = { ...(chat.readAt || {}), [user.id]: message.at };
  return postMessage(chat, message);
});

route("PATCH", "/api/messages/:id", async ({ user, params, body }) => {
  const m = db.messages.find((x) => x.id === params.id);
  if (!m) throw notFound("message_not_found");
  if (m.senderId !== user.id) throw forbidden("not_yours");
  m.text = String(body.text || "").slice(0, 4000); m.editedAt = now();
  save();
  emit(findChat(m.chatId).members, { type: "message", message: m });
  return m;
});

route("DELETE", "/api/messages/:id", async ({ user, params }) => {
  const m = db.messages.find((x) => x.id === params.id);
  if (!m) throw notFound("message_not_found");
  const chat = findChat(m.chatId);
  if (m.senderId !== user.id && !isAdmin(chat, user.id)) throw forbidden("not_yours");
  m.deleted = true; m.text = ""; m.media = null; m.poll = null; m.reactions = {};
  save();
  emit(chat.members, { type: "message", message: m });
  return m;
});

route("POST", "/api/messages/:id/react", async ({ user, params, body }) => {
  const m = db.messages.find((x) => x.id === params.id);
  if (!m) throw notFound("message_not_found");
  const chat = findChat(m.chatId);
  if (!isMember(chat, user.id)) throw forbidden();
  const emoji = String(body.emoji || "").slice(0, 8);
  const who = (m.reactions || {})[emoji] || [];
  m.reactions = { ...(m.reactions || {}) };
  if (who.includes(user.id)) { const next = who.filter((u) => u !== user.id); if (next.length) m.reactions[emoji] = next; else delete m.reactions[emoji]; }
  else m.reactions[emoji] = [...who, user.id];
  save();
  emit(chat.members, { type: "message", message: m });
  return m;
});

route("POST", "/api/messages/:id/vote", async ({ user, params, body }) => {
  const m = db.messages.find((x) => x.id === params.id);
  if (!m || !m.poll) throw notFound("poll_not_found");
  const chat = findChat(m.chatId);
  if (!isMember(chat, user.id)) throw forbidden();
  const i = Number(body.option);
  m.poll.options = m.poll.options.map((o, idx) => {
    const votes = o.votes.filter((v) => v !== user.id);
    if (idx === i) return { ...o, votes: o.votes.includes(user.id) && m.poll.multiple ? votes : [...votes, user.id] };
    return m.poll.multiple ? o : { ...o, votes };
  });
  save();
  emit(chat.members, { type: "message", message: m });
  return m;
});

route("POST", "/api/chats/:id/read", async ({ user, params }) => {
  const chat = findChat(params.id);
  if (!chat || !isMember(chat, user.id)) throw notFound("chat_not_found");
  chat.readAt = { ...(chat.readAt || {}), [user.id]: now() };
  save();
  // Their messages to me are now read: tell the others so ticks turn blue.
  emit(chat.members.filter((m) => m !== user.id), { type: "read", chatId: chat.id, userId: user.id, at: chat.readAt[user.id] });
  return { ok: true };
});

route("POST", "/api/chats/:id/typing", async ({ user, params }) => {
  const chat = findChat(params.id);
  if (!chat || !isMember(chat, user.id)) throw notFound("chat_not_found");
  emit(chat.members.filter((m) => m !== user.id), { type: "typing", chatId: chat.id, userId: user.id });
  return { ok: true };
});

route("GET", "/api/events", async ({ user, req, res }) => {
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "Access-Control-Allow-Origin": "*" });
  res.write(`data: ${JSON.stringify({ type: "hello", userId: user.id, at: now() })}\n\n`);
  if (!streams.has(user.id)) streams.set(user.id, new Set());
  streams.get(user.id).add(res);
  const wasOffline = streams.get(user.id).size === 1;
  if (wasOffline) presence(user.id);
  const beat = setInterval(() => { try { res.write(": ping\n\n"); } catch { /* closing */ } }, 25000);
  req.on("close", () => {
    clearInterval(beat);
    const set = streams.get(user.id);
    if (set) { set.delete(res); if (set.size === 0) { streams.delete(user.id); user.lastSeen = now(); save(); presence(user.id); } }
  });
  return undefined; // the stream stays open
});

/* ───────────────────────────── server ───────────────────────────── */

const OPEN = new Set(["/api/auth", "/api/health"]);

async function handle(req, res) {
  cors(res);
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname === "/api/health") { send(res, 200, { ok: true, users: db.users.length, chats: db.chats.length, at: now() }); return; }
  try {
    const match = routes.find((r) => r.method === req.method && r.re.test(url.pathname));
    if (!match) throw notFound("no_route");
    const params = Object.fromEntries(match.keys.map((k, i) => [k, decodeURIComponent(url.pathname.match(match.re)[i + 1])]));
    const user = authUser(req, url);
    if (!user && !OPEN.has(url.pathname)) throw new HttpError(401, "unauthorized");
    const body = req.method === "GET" || req.method === "DELETE" ? {} : await readBody(req);
    const result = await match.handler({ req, res, url, params, body, user });
    if (result !== undefined) send(res, 200, result);
  } catch (e) {
    if (e instanceof HttpError) send(res, e.status, { error: e.code, message: e.message });
    else { console.error(e); send(res, 500, { error: "internal" }); }
  }
}

function start(port = PORT) {
  load();
  const server = http.createServer(handle);
  server.listen(port, () => console.log(`fitclub messenger server on http://localhost:${server.address().port}`));
  return server;
}

if (require.main === module) start();

module.exports = { start, handle, db, validateUsername };
