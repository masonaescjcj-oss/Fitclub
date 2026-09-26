// The messenger's connection to its server: a thin fetch wrapper plus the
// live event stream. Everything here mirrors server/index.js one to one.

import { ME } from "./chatModel";
import { publicAvatarUrl } from "../backend/supabase";

const KEY = "fitclub.chat.server";

/** Where the server lives and who we are there. Null when running offline. */
export function loadServerConfig() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* unreadable storage: offline */ }
  const url = process.env.REACT_APP_CHAT_API;
  return url ? { url, token: null, me: null } : null;
}

export function saveServerConfig(config) {
  try {
    if (config) window.localStorage.setItem(KEY, JSON.stringify(config));
    else window.localStorage.removeItem(KEY);
  } catch { /* nothing to do */ }
  window.dispatchEvent(new Event("fitclub:server"));
}

export class ApiError extends Error {
  constructor(status, code, message) { super(message || code); this.status = status; this.code = code; }
}

/**
 * Wire ↔ local translation. On the wire the athlete is a real user id; in
 * the client they are `ME`. Everything that names people goes through here.
 */
export function toLocalChat(chat, myId) {
  const swap = (id) => (id === myId ? ME : id);
  // A group's photo comes as a path in the public avatars bucket (supabase/migrations/0012).
  const photo = chat.photo ? publicAvatarUrl(chat.photo) : null;
  return { ...chat, photo, members: (chat.members || []).map(swap), admins: (chat.admins || []).map(swap), createdBy: swap(chat.createdBy), remote: true };
}
export function toLocalMessage(m, myId) {
  const swap = (id) => (id === myId ? ME : id);
  const reactions = Object.fromEntries(Object.entries(m.reactions || {}).map(([e, who]) => [e, who.map(swap)]));
  const poll = m.poll ? { ...m.poll, options: m.poll.options.map((o) => ({ ...o, votes: (o.votes || []).map(swap) })) } : null;
  const checklist = m.checklist
    ? { ...m.checklist, items: (m.checklist.items || []).map((i) => ({ ...i, addedBy: swap(i.addedBy), doneBy: i.doneBy ? swap(i.doneBy) : null })) }
    : null;
  return { ...m, senderId: swap(m.senderId), reactions, poll, checklist, remote: true };
}
export const toWireId = (id, myId) => (id === ME ? myId : id);

/** A client bound to one server and one token. */
export function createApi({ url, token }) {
  const base = String(url || "").replace(/\/+$/, "");
  async function call(method, path, body) {
    let res;
    try {
      res = await fetch(`${base}${path}`, {
        method,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      throw new ApiError(0, "network", e.message);
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, json.error || "error", json.message);
    return json;
  }
  const q = (params) => {
    const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")).toString();
    return s ? `?${s}` : "";
  };

  return {
    base,
    health: () => call("GET", "/api/health"),
    auth: (body) => call("POST", "/api/auth", body),
    me: () => call("GET", "/api/me"),
    updateMe: (patch) => call("PATCH", "/api/me", patch),
    usernameFree: (slug) => call("GET", `/api/username/${encodeURIComponent(slug)}`),
    searchUsers: (query) => call("GET", `/api/users${q({ q: query })}`),
    userByUsername: (u) => call("GET", `/api/users/${encodeURIComponent(u)}`),
    sync: (since) => call("GET", `/api/sync${q({ since })}`),
    searchPublic: (query) => call("GET", `/api/chats/public${q({ q: query })}`),
    resolve: (code) => call("GET", `/api/resolve${q({ code })}`),
    join: (code) => call("POST", "/api/join", { code }),
    createChat: (body) => call("POST", "/api/chats", body),
    privateChat: (body) => call("POST", "/api/private", body),
    updateChat: (id, patch) => call("PATCH", `/api/chats/${id}`, patch),
    addMembers: (id, userIds) => call("POST", `/api/chats/${id}/members`, { userIds }),
    removeMember: (id, uid) => call("DELETE", `/api/chats/${id}/members/${uid}`),
    toggleAdmin: (id, uid) => call("POST", `/api/chats/${id}/admins/${uid}`),
    leave: (id) => call("POST", `/api/chats/${id}/leave`),
    deleteChat: (id) => call("DELETE", `/api/chats/${id}`),
    messages: (id, before) => call("GET", `/api/chats/${id}/messages${q({ before })}`),
    send: (id, body) => call("POST", `/api/chats/${id}/messages`, body),
    edit: (id, text) => call("PATCH", `/api/messages/${id}`, { text }),
    remove: (id) => call("DELETE", `/api/messages/${id}`),
    react: (id, emoji) => call("POST", `/api/messages/${id}/react`, { emoji }),
    vote: (id, option) => call("POST", `/api/messages/${id}/vote`, { option }),
    read: (id) => call("POST", `/api/chats/${id}/read`),
    typing: (id) => call("POST", `/api/chats/${id}/typing`),

    /**
     * The live stream. `onEvent` gets each server event; `onStatus` gets
     * "open" | "closed". Returns a function that closes it.
     */
    subscribe(onEvent, onStatus) {
      if (typeof EventSource === "undefined" || !token) return () => {};
      const es = new EventSource(`${base}/api/events?token=${encodeURIComponent(token)}`);
      es.onopen = () => onStatus?.("open");
      es.onerror = () => onStatus?.("closed");
      es.onmessage = (e) => { try { onEvent(JSON.parse(e.data)); } catch { /* a heartbeat or a malformed frame */ } };
      return () => es.close();
    },
  };
}
