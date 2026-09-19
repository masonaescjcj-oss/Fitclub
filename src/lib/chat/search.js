// Global search, the way Telegram's works: my chats, my contacts, then public
// communities anyone can find by @username, and links pasted straight in.
// Pure functions only.

import { LINK_HOST, ME } from "./chatModel";

/**
 * Reads a pasted link or handle. Returns null when the text is not a link,
 * otherwise { kind: "public", slug } or { kind: "invite", token }.
 */
export function parseLink(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  const host = LINK_HOST.replace(/\./g, "\\.");
  const m = text.match(new RegExp(`^(?:https?://)?(?:www\\.)?(?:${host}|t\\.me)/(\\+?[A-Za-z0-9_]+)/?$`, "i"));
  if (m) return m[1].startsWith("+") ? { kind: "invite", token: m[1].slice(1) } : { kind: "public", slug: m[1].toLowerCase() };
  if (/^@[A-Za-z0-9_]{1,32}$/.test(text)) return { kind: "public", slug: text.slice(1).toLowerCase() };
  return null;
}

const norm = (v) => String(v || "").toLowerCase();
const hit = (q, ...fields) => fields.some((f) => norm(f).includes(q));

/**
 * Everything that matches `query`, grouped the way the results screen shows it.
 * `chats` are mine; `people` are contacts I can message; `directory` are public
 * communities I may not be in yet. A link resolves to exactly one target.
 */
export function globalSearch(query, { chats = [], people = [], directory = [] }) {
  const raw = String(query || "").trim();
  const empty = { chats: [], people: [], global: [], link: null };
  if (!raw) return empty;
  const link = parseLink(raw);
  const q = norm(link?.kind === "public" ? link.slug : raw.replace(/^@/, ""));

  if (link?.kind === "invite") {
    const target = [...chats, ...directory].find((c) => (c.inviteLink || "").endsWith(`/+${link.token}`)) || null;
    return { ...empty, link: target ? { chat: target, joined: chats.some((c) => c.id === target.id) } : { chat: null, joined: false } };
  }

  const myChats = chats.filter((c) => !c.archived && hit(q, c.title, c.titleFa, c.username));
  const mine = new Set(chats.map((c) => c.id));
  const known = new Set(chats.flatMap((c) => (c.type === "private" ? c.members : [])));
  const contacts = people.filter((u) => u.id !== ME && hit(q, u.name, u.nameFa, u.username, u.phone?.replace(/\s+/g, "")));
  const global = directory.filter((c) => !mine.has(c.id) && c.isPublic && hit(q, c.title, c.titleFa, c.username));

  // A public link or @handle names one thing: surface it first, whatever it is.
  let resolved = null;
  if (link?.kind === "public") {
    const exact = (c) => norm(c.username) === link.slug;
    const chat = chats.find(exact) || directory.find(exact);
    const person = people.find((u) => norm(u.username) === link.slug);
    if (chat) resolved = { chat, joined: mine.has(chat.id) };
    else if (person) resolved = { user: person, known: known.has(person.id) };
    else resolved = { chat: null, user: null, joined: false };
  }
  return { chats: myChats, people: contacts, global, link: resolved };
}
