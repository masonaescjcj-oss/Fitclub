import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ME, buildChannelChat, buildGroupChat, createChat, createMessage, createdSystemMessage, findPrivateChatWith,
  makeInviteLink, membershipMessage, messengerNotifications, sortChats, toggleReaction, totalUnread, uniqueUsername, unreadCount,
  unreadMentions, visibleMessages, votePoll,
} from "../lib/chat/chatModel";
import { CUSTOM, DEMO_WORLD, DIRECTORY, REVEALED, directoryMessages, findUser, loadChat, registerCustomUsers, saveChat, takenUsernames } from "../lib/chat/chatStore";
import { BOT_CHAT_ID, BOT_ID, findBuddy } from "../lib/buddy/buddyModel";
import { loadSession, saveSession } from "../lib/session";
import { scheduleChannelLife, scheduleGreeting, scheduleReply } from "../lib/chat/simulator";
import { createApi, loadServerConfig, saveServerConfig, toLocalChat, toLocalMessage, toWireId } from "../lib/chat/api";
import { SUPABASE_SERVER, createSupabaseApi } from "../lib/chat/supabaseApi";
import { TRANSCRIPTS } from "../lib/chat/extras";
import { uid } from "../lib/chat/chatModel";

/**
 * Where the messenger talks to. With accounts, the signed-in account on
 * Supabase, always; without them, a development server if one was set up
 * in settings, or nothing (this device alone, with simulated peers).
 */
function initialServer() {
  if (!DEMO_WORLD) {
    const userId = loadSession().userId;
    return userId ? { kind: SUPABASE_SERVER, url: SUPABASE_SERVER, token: userId, me: { id: userId }, status: "connecting" } : null;
  }
  const c = loadServerConfig();
  return c ? { ...c, status: c.token ? "connecting" : "offline" } : null;
}

/** Owns the whole messenger: chats, messages, and the simulated peers. */
export default function useChat(lang = "en") {
  const [state, setState] = useState(loadChat);
  const [openChatId, setOpenChatId] = useState(null);
  // Which top-level messenger screen is showing: list | contacts | calls | settings | profile.
  // Session-only on purpose — reopening the tab always lands on the chat list.
  const [screen, setScreen] = useState("list");
  const [typing, setTyping] = useState({});   // chatId -> userId
  const first = useRef(true);
  const timers = useRef([]);
  // The latest state for callbacks that read it without wanting to be rebuilt on every change.
  const latest = useRef(state);
  latest.current = state;

  /* ── the server, when there is one ── */
  // { url, token, me, status: offline | connecting | online | error } or null when running purely on this device.
  const [server, setServer] = useState(initialServer);
  const [remoteUsers, setRemoteUsers] = useState([]); // people met through the server
  const apiRef = useRef(null);
  const lastSync = useRef(null);
  // Whether live updates are flowing. On Supabase the account stays usable
  // without them: the status follows whether the server answers, and the
  // store polls until the live stream is back.
  const [live, setLive] = useState(false);
  const typingSent = useRef({}); // chatId -> last time we told the server we were typing
  const myId = server?.me?.id || null;
  const online = !!(server && server.token && server.status === "online");

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    saveChat(state);
  }, [state]);

  // findUser() is a plain function, so it learns about revealed teammates and added people through these.
  REVEALED.clear();
  for (const m of state.buddy.matches) if (m.revealed) REVEALED.add(m.buddyId);
  const people = useMemo(() => [...state.customUsers, ...remoteUsers], [state.customUsers, remoteUsers]);
  if (CUSTOM.size !== people.length || people.some((u) => CUSTOM.get(u.id) !== u)) registerCustomUsers(people);

  // Never leave a simulated reply firing into an unmounted tree.
  useEffect(() => () => { timers.current.forEach((cancel) => cancel()); }, []);

  const patchChat = useCallback((chatId, fn) => {
    setState((s) => ({ ...s, chats: s.chats.map((c) => (c.id === chatId ? fn(c) : c)) }));
  }, []);

  const patchMessage = useCallback((id, fn) => {
    setState((s) => ({ ...s, messages: s.messages.map((m) => (m.id === id ? fn(m) : m)) }));
  }, []);

  const openChat = useCallback((chatId) => {
    setOpenChatId(chatId);
    if (chatId) {
      patchChat(chatId, (c) => ({ ...c, lastReadAt: new Date().toISOString() }));
      const c = latest.current.chats.find((x) => x.id === chatId);
      if (c?.remote && apiRef.current) apiRef.current.read(chatId).catch(() => {});
    }
  }, [patchChat]);

  /* ── merging what the server says into local state ── */
  const upsertChat = useCallback((chat) => {
    setState((s) => (s.chats.some((c) => c.id === chat.id)
      ? { ...s, chats: s.chats.map((c) => (c.id === chat.id ? { ...c, ...chat, draft: c.draft, pinned: c.pinned, muted: c.muted, archived: c.archived, folders: c.folders } : c)) }
      : { ...s, chats: [...s.chats, chat] }));
  }, []);
  const upsertMessage = useCallback((m) => {
    setState((s) => {
      const byId = s.messages.findIndex((x) => x.id === m.id);
      const byClient = m.clientId ? s.messages.findIndex((x) => x.clientId && x.clientId === m.clientId) : -1;
      const i = byId >= 0 ? byId : byClient;
      if (i < 0) return { ...s, messages: [...s.messages, m] };
      const messages = s.messages.slice(); messages[i] = { ...messages[i], ...m };
      return { ...s, messages };
    });
  }, []);
  const removeChatLocal = useCallback((chatId) => {
    setOpenChatId((id) => (id === chatId ? null : id));
    setState((s) => ({ ...s, chats: s.chats.filter((c) => c.id !== chatId), messages: s.messages.filter((m) => m.chatId !== chatId) }));
  }, []);
  const absorbUsers = useCallback((users, me) => {
    setRemoteUsers((list) => {
      const next = new Map(list.map((u) => [u.id, u]));
      for (const u of users) if (!me || u.id !== me.id) next.set(u.id, { ...u, remote: true });
      return [...next.values()];
    });
  }, []);

  /** Pulls the server's view of my world and lays it over the local one. */
  const syncNow = useCallback(async (since = null) => {
    const client = apiRef.current;
    if (!client) return;
    const data = await client.sync(since);
    const me = data.me;
    absorbUsers(data.users, me);
    const chats = data.chats.map((c) => toLocalChat(c, me.id));
    const messages = data.messages.map((m) => toLocalMessage(m, me.id));
    setState((s) => {
      const remoteIds = new Set(chats.map((c) => c.id));
      // Full sync: the server's list replaces every server chat we had; incremental: it lays over them.
      const kept = s.chats
        .filter((c) => !c.remote || (since ? true : remoteIds.has(c.id)))
        .map((c) => { const fresh = chats.find((x) => x.id === c.id); return fresh ? { ...c, ...fresh, draft: c.draft, pinned: c.pinned, muted: c.muted, archived: c.archived, folders: c.folders } : c; });
      const mergedChats = [...kept, ...chats.filter((c) => !kept.some((x) => x.id === c.id))];
      const knownIds = new Set(messages.map((m) => m.id));
      const mergedMessages = since
        ? [...s.messages.filter((m) => !knownIds.has(m.id)), ...messages]
        : [...s.messages.filter((m) => !m.remote || !remoteIds.has(m.chatId)), ...messages];
      return { ...s, chats: mergedChats, messages: mergedMessages, me: { ...s.me, name: me.name, username: me.username, avatar: me.avatar || s.me.avatar, bio: me.bio || s.me.bio } };
    });
    lastSync.current = data.now;
    setServer((sv) => (sv ? { ...sv, me, status: "online" } : sv));
    if (client.base !== SUPABASE_SERVER) saveServerConfig({ url: client.base, token: server?.token, me });
  }, [absorbUsers, server?.token]);

  /** One live event from the server. */
  const onEvent = useCallback((e) => {
    const id = latest.current.__myId;
    switch (e.type) {
      case "message": { if (e.sender) absorbUsers([e.sender], { id }); upsertMessage(toLocalMessage(e.message, id)); break; }
      case "chat": { if (e.users) absorbUsers(e.users, { id }); upsertChat(toLocalChat(e.chat, id)); break; }
      case "chat.removed": removeChatLocal(e.chatId); break;
      case "user": absorbUsers([e.user], { id }); break;
      case "typing": {
        setTyping((t) => ({ ...t, [e.chatId]: e.userId }));
        setTimeout(() => setTyping((t) => (t[e.chatId] === e.userId ? Object.fromEntries(Object.entries(t).filter(([k]) => k !== e.chatId)) : t)), 3000);
        break;
      }
      case "read": {
        setState((s) => ({ ...s, messages: s.messages.map((m) => (m.chatId === e.chatId && m.senderId === ME && m.at <= e.at ? { ...m, status: "read" } : m)) }));
        break;
      }
      default: break;
    }
  }, [upsertMessage, upsertChat, removeChatLocal, absorbUsers]);
  latest.current.__myId = myId;

  // Connect when we have a token; reconnects re-sync from where we left off.
  useEffect(() => {
    if (!server || !server.token) { apiRef.current = null; return undefined; }
    const client = server.kind === SUPABASE_SERVER ? createSupabaseApi({ me: server.token }) : createApi(server);
    apiRef.current = client;
    let closed = false;
    setServer((sv) => ({ ...sv, status: "connecting" }));
    syncNow().catch(() => setServer((sv) => (sv ? { ...sv, status: "error" } : sv)));
    const stop = client.subscribe(onEvent, (status) => {
      if (closed) return;
      if (status === "open") { setLive(true); syncNow(lastSync.current).catch(() => {}); return; }
      setLive(false);
      if (server.kind !== SUPABASE_SERVER) setServer((sv) => (sv && sv.status !== "error" ? { ...sv, status: "connecting" } : sv));
    });
    return () => { closed = true; stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server?.url, server?.token]);

  // A network that blocks the live stream (some do) still gets its messages, every few seconds.
  useEffect(() => {
    if (server?.kind !== SUPABASE_SERVER || !server.token || live) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") syncNow(lastSync.current).catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, [server?.kind, server?.token, live, syncNow]);

  /** Signs in (creating the account on first sight) and switches this device online. */
  const connectServer = useCallback(async ({ url, name, username }) => {
    const client = createApi({ url, token: null });
    const { token, user } = await client.auth({ name, username, avatar: latest.current.me.avatar });
    saveServerConfig({ url: client.base, token, me: user });
    setServer({ url: client.base, token, me: user, status: "connecting" });
    return user;
  }, []);
  const disconnectServer = useCallback(() => {
    saveServerConfig(null);
    apiRef.current = null;
    setServer(null);
    setRemoteUsers([]);
    setState((s) => ({ ...s, chats: s.chats.filter((c) => !c.remote), messages: s.messages.filter((m) => !m.remote) }));
  }, []);

  /** People and public communities on the server matching a query, in local shapes. */
  const searchRemote = useCallback(async (query) => {
    const client = apiRef.current;
    if (!client || !latest.current.__myId) return { users: [], chats: [] };
    const [users, chats] = await Promise.all([client.searchUsers(query), client.searchPublic(query)]);
    absorbUsers(users, { id: latest.current.__myId });
    return { users: users.map((u) => ({ ...u, remote: true })), chats: chats.map((c) => toLocalChat(c, latest.current.__myId)) };
  }, [absorbUsers]);
  const resolveRemote = useCallback(async (code) => {
    const client = apiRef.current;
    if (!client || !latest.current.__myId) return {};
    const r = await client.resolve(code);
    if (r.user) { absorbUsers([r.user], { id: latest.current.__myId }); return { user: { ...r.user, remote: true } }; }
    if (r.chat) return { chat: toLocalChat(r.chat, latest.current.__myId), joined: r.joined };
    return {};
  }, [absorbUsers]);

  const wire = (id) => toWireId(id, latest.current.__myId);
  const remote = (chatId) => { const c = latest.current.chats.find((x) => x.id === chatId); return c && c.remote && apiRef.current ? apiRef.current : null; };

  const api = useMemo(() => ({
    openChat,
    closeChat: () => setOpenChatId(null),
    setFolder: (folder) => setState((s) => ({ ...s, folder })),

    /** Sends a message and, for a real conversation, provokes a reply. */
    send: (chatId, patch) => {
      const chat = state.chats.find((c) => c.id === chatId);
      const client = chat?.remote ? apiRef.current : null;
      const message = createMessage({ chatId, senderId: ME, status: client ? "sending" : "sent", ...patch, ...(client ? { clientId: uid(), remote: true } : {}) });
      setState((s) => ({
        ...s,
        messages: [...s.messages, message],
        chats: s.chats.map((c) => (c.id === chatId ? { ...c, draft: "", lastReadAt: new Date().toISOString() } : c)),
      }));

      if (client) {
        // The server is the source of truth: its echo (by clientId) replaces the optimistic copy.
        const { text, kind, replyTo, media, poll, voice, silent, clientId } = message;
        client.send(chatId, { text, kind, replyTo, media, poll, voice, silent, clientId })
          .then((saved) => upsertMessage(toLocalMessage(saved, latest.current.__myId)))
          .catch(() => patchMessage(message.id, (m) => ({ ...m, status: "failed" })));
        return message;
      }

      const isSelf = chatId === "saved";
      if (chat && chat.type === "channel" && !message.scheduledFor) {
        // A broadcast is read, not answered: views climb and a few subscribers react.
        patchMessage(message.id, (m) => ({ ...m, views: 1 }));
        timers.current.push(scheduleChannelLife(chat, message.id, {
          onViews: (id, views) => patchMessage(id, (m) => ({ ...m, views: Math.max(m.views || 0, views) })),
          onReaction: (id, emoji, userId) => patchMessage(id, (m) => toggleReaction(m, emoji, userId)),
        }));
      } else if (chat && !isSelf && !message.scheduledFor) {
        const cancel = scheduleReply(chat, message.text, lang, {
          onTyping: (userId, on) =>
            setTyping((t) => {
              const next = { ...t };
              if (on) next[chatId] = userId; else delete next[chatId];
              return next;
            }),
          onReply: (userId, text, translation) =>
            setState((s) => ({
              ...s,
              messages: [
                // Their reply implies they saw everything I had sent.
                ...s.messages.map((m) =>
                  m.chatId === chatId && m.senderId === ME ? { ...m, status: "read" } : m
                ),
                createMessage({ chatId, senderId: userId, text, translation, status: "sent" }),
              ],
            })),
        }, { meUsername: latest.current.me.username });
        timers.current.push(cancel);
      }
      return message;
    },

    editMessage: (id, text) => {
      patchMessage(id, (m) => ({ ...m, text, editedAt: new Date().toISOString() }));
      const m = latest.current.messages.find((x) => x.id === id);
      if (m?.remote && apiRef.current) apiRef.current.edit(id, text).catch(() => {});
    },

    /** Telegram keeps a tombstone rather than removing the row outright. */
    deleteMessage: (id, forEveryone = false) => {
      const m = latest.current.messages.find((x) => x.id === id);
      if (m?.remote && apiRef.current) { apiRef.current.remove(id).catch(() => {}); patchMessage(id, (x) => ({ ...x, deleted: true, text: "", media: null, poll: null, reactions: {} })); return; }
      if (forEveryone) patchMessage(id, (x) => ({ ...x, deleted: true, text: "", media: null, poll: null, reactions: {} }));
      else setState((s) => ({ ...s, messages: s.messages.filter((x) => x.id !== id) }));
    },

    deleteMessages: (ids) =>
      setState((s) => ({ ...s, messages: s.messages.filter((m) => !ids.includes(m.id)) })),

    react: (id, emoji) => {
      patchMessage(id, (m) => toggleReaction(m, emoji));
      const m = latest.current.messages.find((x) => x.id === id);
      if (m?.remote && apiRef.current) apiRef.current.react(id, emoji).catch(() => {});
    },
    vote: (id, optionIndex) => {
      patchMessage(id, (m) => votePoll(m, optionIndex));
      const m = latest.current.messages.find((x) => x.id === id);
      if (m?.remote && apiRef.current) apiRef.current.vote(id, optionIndex).catch(() => {});
    },

    forwardMessages: (ids, toChatId) =>
      setState((s) => {
        const source = s.messages.filter((m) => ids.includes(m.id));
        const copies = source.map(({ id: _id, ...m }) => {
          const fromChat = s.chats.find((c) => c.id === m.chatId);
          // Leaving `id` out of the patch lets the factory mint a fresh one.
          return createMessage({
            ...m,
            chatId: toChatId,
            senderId: ME,
            at: new Date().toISOString(),
            status: "sent",
            reactions: {},
            replyTo: null,
            forwardFrom: { senderId: m.senderId, chatTitle: fromChat?.title || "" },
          });
        });
        return { ...s, messages: [...s.messages, ...copies] };
      }),

    pinMessage: (chatId, messageId) =>
      patchChat(chatId, (c) => ({ ...c, pinnedMessageId: c.pinnedMessageId === messageId ? null : messageId })),

    setDraft: (chatId, draft) => {
      patchChat(chatId, (c) => ({ ...c, draft }));
      const client = remote(chatId);
      if (client && draft && Date.now() - (typingSent.current[chatId] || 0) > 3000) {
        typingSent.current[chatId] = Date.now();
        client.typing(chatId).catch(() => {});
      }
    },
    togglePinned: (chatId) => patchChat(chatId, (c) => ({ ...c, pinned: !c.pinned })),
    toggleMuted: (chatId) => patchChat(chatId, (c) => ({ ...c, muted: !c.muted })),
    toggleArchived: (chatId) => patchChat(chatId, (c) => ({ ...c, archived: !c.archived })),
    markRead: (chatId) => {
      patchChat(chatId, (c) => ({ ...c, lastReadAt: new Date().toISOString() }));
      const client = remote(chatId);
      if (client) client.read(chatId).catch(() => {});
    },

    /** Premium translate: flip one message between original and stored translation. */
    toggleTranslate: (id) =>
      patchMessage(id, (m) => ({ ...m, showTranslation: !m.showTranslation })),

    /** Premium voice-to-text: fills the transcript from a canned line. */
    transcribeVoice: (id) =>
      patchMessage(id, (m) => {
        if (m.kind !== "voice" || m.voice?.transcript) return m;
        const pool = TRANSCRIPTS[lang] || TRANSCRIPTS.en;
        return { ...m, voice: { ...m.voice, transcript: pool[(m.voice?.seconds ?? 0) % pool.length] } };
      }),

    updateMe: (patch) => {
      if (patch.username) saveSession({ username: patch.username });
      if (patch.name) saveSession({ name: patch.name });
      setState((s) => ({ ...s, me: { ...s.me, ...patch } }));
      if (apiRef.current) {
        const { name, username, bio, avatar, phone } = patch;
        const wirePatch = Object.fromEntries(Object.entries({ name, username, bio, avatar, phone }).filter(([, v]) => v !== undefined));
        if (Object.keys(wirePatch).length) apiRef.current.updateMe(wirePatch).then((me) => setServer((sv) => (sv ? { ...sv, me } : sv))).catch(() => {});
      }
    },
    /** Usernames nobody else has, for the profile editor's live check. */
    takenUsernames: () => takenUsernames(latest.current),
    setPref: (key, value) =>
      setState((s) => ({ ...s, me: { ...s.me, prefs: { ...(s.me.prefs || {}), [key]: value } } })),

    /** Opens the one-to-one chat with this person, creating it on first contact. */
    openOrCreatePrivateChat: (user) => {
      const existing = findPrivateChatWith(state.chats, user.id);
      if (existing) { openChat(existing.id); setScreen("list"); return existing.id; }
      if (user.remote && apiRef.current) {
        apiRef.current.privateChat({ userId: user.id }).then((c) => {
          const chat = { ...toLocalChat(c, latest.current.__myId), title: user.name, titleFa: user.nameFa || user.name, emoji: user.avatar || "👤", color: user.color || "#3390ec" };
          upsertChat(chat); openChat(chat.id); setScreen("list");
        }).catch(() => {});
        return null;
      }
      const chat = createChat({
        type: "private",
        title: user.name,
        titleFa: user.nameFa || user.name,
        emoji: user.avatar || "👤",
        color: user.color || "#3390ec",
        members: [ME, user.id],
        lastReadAt: new Date().toISOString(),
      });
      setState((s) => ({ ...s, chats: [...s.chats, chat] }));
      openChat(chat.id);
      setScreen("list");
      return chat.id;
    },

    /** Adds a person to contacts and starts the conversation. */
    addContact: ({ name, avatar, color, username, phone, bio }) => {
      const handle = (username || "").trim().replace(/^@/, "").toLowerCase() || uniqueUsername(name, takenUsernames(latest.current));
      const user = { id: uid(), name, nameFa: name, avatar: avatar || "👤", color: color || "#3390ec",
        username: handle, phone: (phone || "").trim(), bio: (bio || "").trim(),
        online: false, lastSeen: new Date().toISOString(), premium: false };
      setState((s) => ({ ...s, customUsers: [...s.customUsers, user] }));
      registerCustomUsers([...latest.current.customUsers, user]);
      return user;
    },
    /** Edits a person the athlete added; their one-to-one chat follows the new name and picture. */
    updateContact: (userId, patch) =>
      setState((s) => {
        const customUsers = s.customUsers.map((u) => (u.id === userId ? { ...u, ...patch, nameFa: patch.name || u.nameFa } : u));
        registerCustomUsers(customUsers);
        const chats = s.chats.map((c) => (c.type === "private" && c.members.includes(userId) && c.members.length === 2
          ? { ...c, title: patch.name ?? c.title, titleFa: patch.name ?? c.titleFa, emoji: patch.avatar ?? c.emoji, color: patch.color ?? c.color }
          : c));
        return { ...s, customUsers, chats };
      }),
    /** Removes an added person everywhere: contacts, their private chat, and any group they were put in. */
    deleteContact: (userId) => {
      setOpenChatId((id) => (id && latest.current.chats.some((c) => c.id === id && c.type === "private" && c.members.includes(userId)) ? null : id));
      setState((s) => {
        const gone = s.chats.filter((c) => c.type === "private" && c.members.includes(userId)).map((c) => c.id);
        const customUsers = s.customUsers.filter((u) => u.id !== userId);
        registerCustomUsers(customUsers);
        return {
          ...s,
          customUsers,
          chats: s.chats.filter((c) => !gone.includes(c.id)).map((c) => (c.members.includes(userId)
            ? { ...c, members: c.members.filter((id) => id !== userId), admins: c.admins.filter((id) => id !== userId),
              subscribers: c.type === "channel" ? Math.max((c.subscribers || 1) - 1, 0) : c.subscribers }
            : c)),
          messages: s.messages.filter((m) => !gone.includes(m.chatId)),
        };
      });
    },

    /* ── teammates ── */
    botPost: (patch, chatId = BOT_CHAT_ID) =>
      setState((s) => ({ ...s, messages: [...s.messages, createMessage({ chatId, senderId: BOT_ID, status: "read", ...patch })] })),
    /** A small group of teammates, with the bot keeping score in it. Returns the chat id. */
    createCrew: ({ name, memberIds }) => {
      const chat = createChat({
        type: "group", title: name, titleFa: name, emoji: "👥", color: "#2fa6ff",
        members: [ME, ...memberIds], admins: [ME], folders: ["gym", "people"], crew: true,
        lastReadAt: new Date().toISOString(),
      });
      setState((s) => ({ ...s, chats: [...s.chats, chat] }));
      return chat.id;
    },

    /* ── groups & channels ── */
    /** A group of the athlete's own: the picked contacts join, the creator runs it. Returns the chat id. */
    createGroup: ({ title, memberIds, emoji, color, description }) => {
      if (online && apiRef.current) {
        // Server chat: created there, then laid into local state; the id arrives async.
        const promise = apiRef.current.createChat({ type: "group", title, description, emoji, color, memberIds: memberIds.map(wire) })
          .then((c) => { const chat = toLocalChat(c, latest.current.__myId); upsertChat(chat); return chat.id; });
        return { remote: true, promise };
      }
      const chat = buildGroupChat({ title, memberIds, emoji, color, description });
      setState((s) => ({ ...s, chats: [...s.chats, chat], messages: [...s.messages, createdSystemMessage(chat)] }));
      return chat.id;
    },
    /** A channel: public with a username, or private behind an invite link. Returns the chat id. */
    createChannel: ({ title, description, isPublic, username, memberIds, emoji, color }) => {
      if (online && apiRef.current) {
        const promise = apiRef.current.createChat({ type: "channel", title, description, isPublic, username, emoji, color, memberIds: memberIds.map(wire) })
          .then((c) => { const chat = toLocalChat(c, latest.current.__myId); upsertChat(chat); return chat.id; });
        return { remote: true, promise };
      }
      const chat = buildChannelChat({ title, description, isPublic, username, memberIds, emoji, color });
      setState((s) => ({ ...s, chats: [...s.chats, chat], messages: [...s.messages, createdSystemMessage(chat)] }));
      return chat.id;
    },
    /** Name, description, picture, type and link — whatever the settings screen changed. */
    updateChatInfo: (chatId, patch) => {
      const client = remote(chatId);
      if (client) { client.updateChat(chatId, patch).then((c) => upsertChat(toLocalChat(c, latest.current.__myId))).catch(() => {}); return; }
      setState((s) => {
        const before = s.chats.find((c) => c.id === chatId);
        if (!before) return s;
        const next = { ...before, ...patch };
        if ("title" in patch) next.titleFa = patch.title;
        if (next.isPublic === false) next.username = "";
        const renamed = "title" in patch && patch.title !== before.title;
        return {
          ...s,
          chats: s.chats.map((c) => (c.id === chatId ? next : c)),
          messages: renamed ? [...s.messages, membershipMessage(chatId, "renamed", { title: patch.title })] : s.messages,
        };
      });
    },
    regenerateInviteLink: (chatId) => {
      const client = remote(chatId);
      if (client) { client.updateChat(chatId, { revokeLink: true }).then((c) => upsertChat(toLocalChat(c, latest.current.__myId))).catch(() => {}); return; }
      patchChat(chatId, (c) => ({ ...c, inviteLink: makeInviteLink() }));
    },
    addMembers: (chatId, userIds) => {
      const client = remote(chatId);
      if (client) { client.addMembers(chatId, userIds.map(wire)).then((c) => upsertChat(toLocalChat(c, latest.current.__myId))).catch(() => {}); return; }
      setState((s) => {
        const chat = s.chats.find((c) => c.id === chatId);
        if (!chat) return s;
        const fresh = userIds.filter((id) => !chat.members.includes(id));
        if (!fresh.length) return s;
        const members = [...chat.members, ...fresh];
        const next = { ...chat, members, subscribers: chat.type === "channel" ? (chat.subscribers || 0) + fresh.length : chat.subscribers };
        const people = fresh.map((id) => findUser(id));
        return {
          ...s,
          chats: s.chats.map((c) => (c.id === chatId ? next : c)),
          messages: [...s.messages, membershipMessage(chatId, "added", { names: people.map((u) => u.name), namesFa: people.map((u) => u.nameFa || u.name) })],
        };
      });
    },
    removeMember: (chatId, userId) => {
      const client = remote(chatId);
      if (client) { client.removeMember(chatId, wire(userId)).then((c) => upsertChat(toLocalChat(c, latest.current.__myId))).catch(() => {}); return; }
      setState((s) => {
        const chat = s.chats.find((c) => c.id === chatId);
        if (!chat || !chat.members.includes(userId)) return s;
        const u = findUser(userId);
        const next = {
          ...chat,
          members: chat.members.filter((id) => id !== userId),
          admins: chat.admins.filter((id) => id !== userId),
          subscribers: chat.type === "channel" ? Math.max((chat.subscribers || 1) - 1, 0) : chat.subscribers,
        };
        return {
          ...s,
          chats: s.chats.map((c) => (c.id === chatId ? next : c)),
          messages: [...s.messages, membershipMessage(chatId, "removed", { names: [u.name], namesFa: [u.nameFa || u.name] })],
        };
      });
    },
    toggleAdmin: (chatId, userId) => {
      const client = remote(chatId);
      if (client) { client.toggleAdmin(chatId, wire(userId)).then((c) => upsertChat(toLocalChat(c, latest.current.__myId))).catch(() => {}); return; }
      setState((s) => {
        const chat = s.chats.find((c) => c.id === chatId);
        if (!chat) return s;
        const isAdmin = chat.admins.includes(userId);
        const u = findUser(userId);
        return {
          ...s,
          chats: s.chats.map((c) => (c.id === chatId ? { ...c, admins: isAdmin ? c.admins.filter((id) => id !== userId) : [...c.admins, userId] } : c)),
          messages: [...s.messages, membershipMessage(chatId, isAdmin ? "demoted" : "promoted", { names: [u.name], namesFa: [u.nameFa || u.name] })],
        };
      });
    },
    /** Joins a public community: on the server when it lives there, else from the local directory. */
    joinChat: (target) => {
      const dirId = typeof target === "string" ? target : target?.id;
      const remoteChat = typeof target === "object" && target?.remote ? target : latest.current.chats.find((c) => c.id === dirId && c.remote);
      if (remoteChat && apiRef.current) {
        const code = remoteChat.isPublic && remoteChat.username ? remoteChat.username : `+${(remoteChat.inviteLink || "").split("/+")[1] || ""}`;
        apiRef.current.join(code).then(async (r) => {
          const chat = toLocalChat(r.chat, latest.current.__myId);
          upsertChat(chat);
          const history = await apiRef.current.messages(chat.id).catch(() => []);
          history.forEach((m) => upsertMessage(toLocalMessage(m, latest.current.__myId)));
          openChat(chat.id);
        }).catch(() => {});
        return dirId;
      }
      const source = DIRECTORY.find((c) => c.id === dirId);
      if (!source) return null;
      const now = new Date().toISOString();
      const chat = { ...source, members: [...source.members, ME], subscribers: source.type === "channel" ? (source.subscribers || 0) + 1 : 0,
        folders: [], lastReadAt: now, muted: false, pinned: false, archived: false };
      const joined = membershipMessage(dirId, source.type === "channel" ? "joinedChannel" : "joinedGroup");
      // Idempotent inside the updater: a double tap or a re-run effect must not add the chat twice.
      const fresh = !latest.current.chats.some((c) => c.id === dirId);
      setState((s) => (s.chats.some((c) => c.id === dirId) ? s : { ...s, chats: [...s.chats, chat], messages: [...s.messages, ...directoryMessages(dirId), joined] }));
      openChat(dirId);
      if (fresh) {
        timers.current.push(scheduleGreeting(chat, lang, latest.current.me.username, (from, text, translation) =>
          setState((s) => ({ ...s, messages: [...s.messages, createMessage({ chatId: dirId, senderId: from, text, translation, status: "sent" })] }))));
      }
      return dirId;
    },
    /** Leaving drops the chat from the list; its history goes with it, as Telegram does. */
    leaveChat: (chatId) => {
      const client = remote(chatId);
      if (client) client.leave(chatId).catch(() => {});
      setOpenChatId((id) => (id === chatId ? null : id));
      setState((s) => ({ ...s, chats: s.chats.filter((c) => c.id !== chatId), messages: s.messages.filter((m) => m.chatId !== chatId) }));
    },

    buddySetPrefs: (patch) =>
      setState((s) => ({ ...s, buddy: { ...s.buddy, prefs: { ...s.buddy.prefs, ...patch } } })),
    buddyPass: (id) =>
      setState((s) => ({ ...s, buddy: { ...s.buddy, passed: s.buddy.passed.includes(id) ? s.buddy.passed : [...s.buddy.passed, id] } })),
    buddyLike: (id) =>
      setState((s) => ({ ...s, buddy: { ...s.buddy, liked: s.buddy.liked.includes(id) ? s.buddy.liked : [...s.buddy.liked, id] } })),
    /** Opens the anonymous chat with a teammate and records the match. Returns the chat id. */
    buddyMatch: (buddyId, score, isRtl) => {
      const c = findBuddy(buddyId);
      if (!c) return null;
      let chatId = null;
      setState((s) => {
        const existing = s.buddy.matches.find((m) => m.buddyId === buddyId);
        if (existing) { chatId = existing.chatId; return s; }
        const chat = createChat({
          type: "private", title: c.alias, titleFa: c.aliasFa, emoji: "🎭", color: c.color,
          members: [ME, buddyId], folders: ["people"], lastReadAt: new Date().toISOString(),
          buddy: { buddyId, score, revealed: false },
        });
        chatId = chat.id;
        const hello = createMessage({
          chatId: chat.id, senderId: buddyId, status: "sent",
          text: `Hey! ${c.alias} here. Same goal as you, apparently 😄 What are you working on this week?`,
          textFa: `سلام! ${c.aliasFa} هستم. ظاهراً هدف‌مون یکیه 😄 این هفته روی چی کار می‌کنی؟`,
        });
        return {
          ...s,
          chats: [...s.chats, chat],
          messages: [...s.messages, hello],
          buddy: {
            ...s.buddy,
            liked: s.buddy.liked.includes(buddyId) ? s.buddy.liked : [...s.buddy.liked, buddyId],
            matches: [...s.buddy.matches, { buddyId, chatId: chat.id, score, at: new Date().toISOString(), revealed: false, revealRequested: false,
              alias: c.alias, aliasFa: c.aliasFa, name: c.name, nameFa: c.nameFa }],
          },
        };
      });
      return chatId;
    },
    buddyRequestReveal: (chatId) =>
      setState((s) => ({ ...s, buddy: { ...s.buddy, matches: s.buddy.matches.map((m) => (m.chatId === chatId ? { ...m, revealRequested: true } : m)) } })),
    /** Both sides agreed: the alias gives way to the real name everywhere. */
    buddyReveal: (chatId) =>
      setState((s) => {
        const match = s.buddy.matches.find((m) => m.chatId === chatId);
        if (!match || match.revealed) return s;
        const c = findBuddy(match.buddyId);
        return {
          ...s,
          chats: s.chats.map((ch) => (ch.id === chatId ? { ...ch, title: c.name, titleFa: c.nameFa, emoji: c.avatar, buddy: { ...ch.buddy, revealed: true } } : ch)),
          messages: [...s.messages, createMessage({ chatId, senderId: BOT_ID, kind: "system", status: "read",
            text: `🎭 → 🙂 You both revealed. Say hello to ${c.name}!`, textFa: `🎭 → 🙂 هر دو هویت‌تون رو نشون دادید. به ${c.nameFa} سلام کن!` })],
          buddy: { ...s.buddy, matches: s.buddy.matches.map((m) => (m.chatId === chatId ? { ...m, revealed: true } : m)) },
        };
      }),

    setChallenge: (chatId, challenge) => patchChat(chatId, (c) => ({ ...c, challenge })),
    /** Blocked people can't be written to and never come up as teammates again. */
    blockUser: (userId) => setState((s) => ({ ...s, blocked: s.blocked.includes(userId) ? s.blocked : [...s.blocked, userId] })),
    unblockUser: (userId) => setState((s) => ({ ...s, blocked: s.blocked.filter((id) => id !== userId) })),

    markStorySeen: (storyId) =>
      setState((s) => (s.seenStories.includes(storyId) ? s : { ...s, seenStories: [...s.seenStories, storyId] })),

    /** Rerender hook for out-of-band changes like the language toggle. */
    bump: () => setState((s) => ({ ...s })),

    deleteChat: (chatId) => {
      const client = remote(chatId);
      if (client) client.deleteChat(chatId).catch(() => {});
      setState((s) => ({
        ...s,
        chats: s.chats.filter((c) => c.id !== chatId),
        messages: s.messages.filter((m) => m.chatId !== chatId),
      }));
    },
  }), [openChat, patchChat, patchMessage, upsertChat, upsertMessage, state.chats, lang, online]);

  // A private chat on the server has no title of its own: each side sees the other person.
  const chats = useMemo(() => state.chats.map((c) => {
    if (c.type !== "private" || c.id === "saved" || (c.title && !c.remote)) return c;
    const other = c.members.find((m) => m !== ME);
    if (!other) return c;
    const u = findUser(other);
    return { ...c, title: u.name, titleFa: u.nameFa || u.name, emoji: u.avatar || c.emoji || "👤", color: u.color || c.color || "#3390ec" };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [state.chats, people]);

  const openedChat = chats.find((c) => c.id === openChatId) || null;

  const messagesOf = useCallback(
    (chatId) => visibleMessages(state.messages, chatId),
    [state.messages]
  );

  const unreadOf = useCallback(
    (chat) => unreadCount(state.messages, chat),
    [state.messages]
  );

  /** Unread messages in this chat that name me. */
  const mentionsOf = useCallback(
    (chat) => unreadMentions(state.messages, chat, state.me.username),
    [state.messages, state.me.username]
  );

  const notifications = useMemo(
    () => messengerNotifications({ chats: state.chats, messages: state.messages, username: state.me.username }),
    [state.chats, state.messages, state.me.username]
  );

  const ordered = useMemo(
    () => sortChats(chats, state.messages),
    [chats, state.messages]
  );

  return {
    chats,
    orderedChats: ordered,
    messages: state.messages,
    folder: state.folder,
    me: state.me,
    customUsers: state.customUsers,
    directory: DEMO_WORLD ? DIRECTORY : [],
    seenStories: state.seenStories,
    buddy: state.buddy,
    blocked: state.blocked,
    unreadTotal: totalUnread(state.chats, state.messages),
    screen,
    setScreen,
    openChatId,
    openedChat,
    typing,
    messagesOf,
    unreadOf,
    mentionsOf,
    notifications,
    server,
    online,
    remoteUsers,
    connectServer,
    disconnectServer,
    searchRemote,
    resolveRemote,
    syncNow,
    unreadMentionTotal: state.chats.reduce((n, c) => n + (c.archived ? 0 : unreadMentions(state.messages, c, state.me.username).length), 0),
    ...api,
  };
}
