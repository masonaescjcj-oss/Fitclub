// The messenger's server when FitClub runs on Supabase: the same client
// interface as createApi() in ./api.js (same methods, same JSON), backed by
// the fitclub_* functions and tables from supabase/migrations/0002.
//
// Live updates come three ways, all folded into the server's event types:
//   - new and changed messages from Realtime, filtered by row-level security;
//   - the person's own inbox (a chat to reload, a removal, a read receipt);
//   - one shared signal channel for presence (who is online) and typing.

import { CHAT_MEDIA_BUCKET, supabase } from "../backend/supabase";
import { saveProfile } from "../backend/account";
import { ApiError } from "./api";

export const SUPABASE_SERVER = "supabase";
export { CHAT_MEDIA_BUCKET };

const iso = (ts) => (ts ? new Date(ts).toISOString() : null);

/** A message row as Realtime delivers it, in the server's JSON. */
export function rowToMessage(r) {
  return {
    id: r.id, clientId: r.client_id || null, chatId: r.chat_id, senderId: r.sender_id, kind: r.kind,
    text: r.text || "", textFa: r.text_fa || "", replyTo: r.reply_to || null,
    media: r.media || null, poll: r.poll || null, voice: r.voice || null, checklist: r.checklist || null,
    at: iso(r.created_at), status: "sent", reactions: r.reactions || {}, deleted: !!r.deleted,
    editedAt: iso(r.edited_at), silent: !!r.silent, views: 0,
  };
}

/** A profile row as the server's public user. */
export function profileToPerson(p) {
  const name = p.name || p.username || "FitClub";
  return {
    id: p.id, name, nameFa: name, username: p.username || "", avatar: "", photo: p.avatar_url || null, color: "",
    bio: p.bio || "", phone: "", online: false, lastSeen: iso(p.last_seen_at), verified: false, premium: false,
  };
}

/** "…#join=%2Babc", "fitclub.app/+abc", "@name": the code as the database expects it. */
export function normalizeCode(code) {
  let raw = String(code || "").trim();
  try { raw = decodeURIComponent(raw); } catch { /* not encoded */ }
  return raw;
}

/** A database error as the server's error code (`admins_only`, `username_taken`, …). */
function toApiError(error) {
  const message = String(error?.message || "");
  if (/^[a-z_]+$/.test(message)) return new ApiError(400, message, message);
  if (/fetch|network|Failed to/i.test(message)) return new ApiError(0, "network", message);
  return new ApiError(500, "error", message);
}

/**
 * A client for the signed-in account `me` (its user id). `client` is the
 * Supabase client; tests pass a fake.
 */
export function createSupabaseApi({ me, client = supabase }) {
  const people = new Map();   // id -> person, everyone met so far
  const online = new Set();   // ids present on the signal channel
  const myChats = new Set();  // chat ids this account is in
  let signal = null;

  const remember = (list = []) => {
    for (const p of list) if (p && p.id) people.set(p.id, { ...people.get(p.id), ...p, online: online.has(p.id) });
    return list.map((p) => (p && p.id ? people.get(p.id) : p));
  };

  async function rpc(fn, args = {}) {
    const { data, error } = await client.rpc(`fitclub_${fn}`, args);
    if (error) throw toApiError(error);
    return data;
  }

  async function person(id) {
    if (!id) return null;
    if (people.has(id)) return people.get(id);
    const { data } = await client.from("fitclub_profiles").select("id, username, name, bio, avatar_url, last_seen_at").eq("id", id).maybeSingle();
    return data ? remember([profileToPerson(data)])[0] : null;
  }

  const api = {
    base: SUPABASE_SERVER,
    health: async () => ({ ok: true }),

    me: async () => person(me),
    async updateMe(patch) {
      const row = {};
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.username !== undefined) row.username = patch.username;
      if (patch.bio !== undefined) row.bio = patch.bio;
      if (!Object.keys(row).length) return person(me);
      const { error, profile } = await saveProfile(row);
      if (error) throw new ApiError(400, error === "taken" ? "username_taken" : error, error);
      people.delete(me);
      return profile ? remember([profileToPerson({ id: me, ...profile })])[0] : person(me);
    },
    async usernameFree(slug) {
      const available = await rpc("username_available", { candidate: String(slug || "").trim().toLowerCase() });
      return { available: !!available, problem: available ? null : "taken" };
    },

    searchUsers: async (q) => remember(await rpc("search_people", { p_query: q })),
    async userByUsername(username) {
      const r = await rpc("resolve", { p_code: `@${String(username || "").replace(/^@/, "")}` });
      if (!r.user) throw new ApiError(404, "user_not_found");
      return remember([r.user])[0];
    },

    async sync(since) {
      // A little overlap, so a message committed while the last sync ran isn't skipped.
      const from = since ? new Date(Date.parse(since) - 5000).toISOString() : null;
      const data = await rpc("sync", { p_since: from });
      remember(data.users);
      for (const c of data.chats) myChats.add(c.id);
      return { ...data, users: data.users.map((u) => people.get(u.id) || u), me: data.me || { id: me, name: "", username: "" } };
    },
    searchPublic: (q) => rpc("search_public", { p_query: q }),
    async resolve(code) {
      const r = await rpc("resolve", { p_code: normalizeCode(code) });
      if (r.user) remember([r.user]);
      return r;
    },
    async join(code) {
      const r = await rpc("join", { p_code: normalizeCode(code) });
      if (r.chat) myChats.add(r.chat.id);
      if (r.user) remember([r.user]);
      return r;
    },

    async createChat(body) {
      const chat = await rpc("create_chat", {
        p_type: body.type, p_title: body.title || "", p_description: body.description || "", p_emoji: body.emoji || "",
        p_color: body.color || "", p_is_public: !!body.isPublic, p_username: body.username || null, p_members: (body.memberIds || []).map(String),
      });
      myChats.add(chat.id);
      return chat;
    },
    async privateChat({ userId, username }) {
      const chat = await rpc("private_chat", { p_other: String(userId || username || "") });
      myChats.add(chat.id);
      return chat;
    },
    updateChat: (id, patch) => rpc("update_chat", { p_chat: id, p_patch: patch }),
    addMembers: (id, userIds) => rpc("add_members", { p_chat: id, p_users: (userIds || []).map(String) }),
    removeMember: (id, uid) => rpc("remove_member", { p_chat: id, p_user: uid }),
    toggleAdmin: (id, uid) => rpc("toggle_admin", { p_chat: id, p_user: uid }),
    async leave(id) { myChats.delete(id); return rpc("leave_chat", { p_chat: id }); },
    async deleteChat(id) { myChats.delete(id); return rpc("delete_chat", { p_chat: id }); },

    messages: (id, before) => rpc("history", { p_chat: id, p_before: before || null }),
    send: (id, body) => rpc("send", { p_chat: id, p_body: body }),
    edit: (id, text) => rpc("edit_message", { p_message: id, p_text: text }),
    remove: (id) => rpc("delete_message", { p_message: id }),
    react: (id, emoji) => rpc("react", { p_message: id, p_emoji: emoji }),
    vote: (id, option) => rpc("vote", { p_message: id, p_option: Number(option) }),
    /** A checklist message: tick or untick one task, or add one (supabase/migrations/0007). */
    markTask: (id, itemId, done) => rpc("checklist_mark", { p_message: id, p_item: itemId, p_done: !!done }),
    addTask: (id, text) => rpc("checklist_add", { p_message: id, p_text: text }),
    read: (id) => rpc("mark_read", { p_chat: id }),

    /** Puts a photo (a JPEG blob, already shrunk) in the chat's private folder; returns where. */
    async uploadPhoto(chatId, blob) {
      const path = `${chatId}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}.jpg`;
      const { error } = await client.storage.from(CHAT_MEDIA_BUCKET).upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (error) throw toApiError(error);
      return { path };
    },
    /** Takes photos down with their messages. Skips any this account may not remove. */
    async removePhotos(paths) {
      if (!paths?.length) return;
      const { error } = await client.storage.from(CHAT_MEDIA_BUCKET).remove(paths);
      if (error) throw toApiError(error);
    },
    /** Every photo in the chat's folder, cleared before the chat itself is deleted. */
    async clearPhotos(chatId) {
      const bucket = client.storage.from(CHAT_MEDIA_BUCKET);
      for (;;) {
        const { data, error } = await bucket.list(chatId, { limit: 100 });
        if (error) throw toApiError(error);
        if (!data?.length) return;
        const { data: gone, error: failed } = await bucket.remove(data.map((f) => `${chatId}/${f.name}`));
        if (failed) throw toApiError(failed);
        if (!gone?.length) return; // what's left isn't this account's to remove
      }
    },
    /** A link to one of this chat's photos, good for an hour. */
    async photoUrl(path) {
      const { data, error } = await client.storage.from(CHAT_MEDIA_BUCKET).createSignedUrl(path, 3600);
      if (error) throw toApiError(error);
      return data.signedUrl;
    },
    async typing(chatId) {
      if (signal) await signal.send({ type: "broadcast", event: "typing", payload: { chatId, userId: me } });
      return { ok: true };
    },

    /**
     * The live stream, as server events. `onStatus` gets "open" when the
     * message stream is up (the client then catches up) and "closed" when
     * it drops. Returns a function that closes everything.
     */
    subscribe(onEvent, onStatus) {
      const onMessage = async (row, isUpdate) => {
        if (!row || !myChats.has(row.chat_id)) return;
        const message = rowToMessage(row);
        // A change to my own message (a reaction, a vote) must not undo its read ticks.
        if (isUpdate && message.senderId === me) delete message.status;
        const sender = message.senderId && message.senderId !== me ? await person(message.senderId) : null;
        onEvent({ type: "message", message, sender });
      };
      const onInbox = async (row) => {
        if (!row) return;
        if (row.kind === "removed") {
          myChats.delete(row.chat_id);
          onEvent({ type: "chat.removed", chatId: row.chat_id });
        } else if (row.kind === "read") {
          onEvent({ type: "read", chatId: row.chat_id, userId: row.payload?.userId, at: row.payload?.at });
        } else if (row.kind === "chat") {
          const fresh = !myChats.has(row.chat_id);
          const bundle = await rpc("chat_bundle", { p_chat: row.chat_id }).catch(() => null);
          if (!bundle) return;
          myChats.add(row.chat_id);
          onEvent({ type: "chat", chat: bundle.chat, users: remember(bundle.users) });
          // A chat I was just added to arrives with its history.
          if (fresh) {
            const history = await rpc("history", { p_chat: row.chat_id, p_before: null }).catch(() => []);
            for (const m of history) onEvent({ type: "message", message: m, sender: null });
          }
        }
      };
      const onPresence = (state) => {
        const now = new Set(Object.keys(state || {}));
        const changed = [...new Set([...now, ...online])].filter((id) => now.has(id) !== online.has(id));
        online.clear();
        now.forEach((id) => online.add(id));
        for (const id of changed) {
          if (id === me || !people.has(id)) continue;
          const p = { ...people.get(id), online: online.has(id), lastSeen: online.has(id) ? people.get(id).lastSeen : new Date().toISOString() };
          people.set(id, p);
          onEvent({ type: "user", user: p });
        }
      };

      const live = client.channel(`fitclub-live-${me}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "fitclub_messages" }, (p) => { onMessage(p.new, false); })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "fitclub_messages" }, (p) => { onMessage(p.new, true); })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "fitclub_inbox", filter: `user_id=eq.${me}` }, (p) => { onInbox(p.new); })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") onStatus?.("open");
          else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") onStatus?.("closed");
        });

      signal = client.channel("fitclub-signal", { config: { presence: { key: me }, broadcast: { self: false } } });
      signal
        .on("presence", { event: "sync" }, () => onPresence(signal.presenceState()))
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          if (payload && payload.userId !== me && myChats.has(payload.chatId)) onEvent({ type: "typing", chatId: payload.chatId, userId: payload.userId });
        })
        .subscribe((status) => { if (status === "SUBSCRIBED") signal.track({ at: Date.now() }).catch(() => {}); });

      // "Last seen" moves when the app goes to the background and when it closes.
      const seen = () => { rpc("seen").catch(() => {}); };
      const onVisibility = () => { if (document.visibilityState === "hidden") seen(); };
      document.addEventListener("visibilitychange", onVisibility);
      seen();

      return () => {
        document.removeEventListener("visibilitychange", onVisibility);
        seen();
        client.removeChannel(live);
        if (signal) client.removeChannel(signal);
        signal = null;
      };
    },
  };
  return api;
}
