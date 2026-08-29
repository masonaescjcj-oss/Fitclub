import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ME, createChat, createMessage, findPrivateChatWith, sortChats, toggleReaction,
  totalUnread, unreadCount, visibleMessages, votePoll,
} from "../lib/chat/chatModel";
import { loadChat, saveChat } from "../lib/chat/chatStore";
import { scheduleReply } from "../lib/chat/simulator";
import { TRANSCRIPTS } from "../lib/chat/extras";
import { uid } from "../lib/chat/chatModel";

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

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    saveChat(state);
  }, [state]);

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
    if (chatId) patchChat(chatId, (c) => ({ ...c, lastReadAt: new Date().toISOString() }));
  }, [patchChat]);

  const api = useMemo(() => ({
    openChat,
    closeChat: () => setOpenChatId(null),
    setFolder: (folder) => setState((s) => ({ ...s, folder })),

    /** Sends a message and, for a real conversation, provokes a reply. */
    send: (chatId, patch) => {
      const message = createMessage({ chatId, senderId: ME, status: "sent", ...patch });
      setState((s) => ({
        ...s,
        messages: [...s.messages, message],
        chats: s.chats.map((c) => (c.id === chatId ? { ...c, draft: "", lastReadAt: new Date().toISOString() } : c)),
      }));

      const chat = state.chats.find((c) => c.id === chatId);
      const isSelf = chatId === "saved";
      if (chat && !isSelf && !message.scheduledFor) {
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
        });
        timers.current.push(cancel);
      }
      return message;
    },

    editMessage: (id, text) =>
      patchMessage(id, (m) => ({ ...m, text, editedAt: new Date().toISOString() })),

    /** Telegram keeps a tombstone rather than removing the row outright. */
    deleteMessage: (id, forEveryone = false) => {
      if (forEveryone) patchMessage(id, (m) => ({ ...m, deleted: true, text: "", media: null, poll: null, reactions: {} }));
      else setState((s) => ({ ...s, messages: s.messages.filter((m) => m.id !== id) }));
    },

    deleteMessages: (ids) =>
      setState((s) => ({ ...s, messages: s.messages.filter((m) => !ids.includes(m.id)) })),

    react: (id, emoji) => patchMessage(id, (m) => toggleReaction(m, emoji)),
    vote: (id, optionIndex) => patchMessage(id, (m) => votePoll(m, optionIndex)),

    forwardMessages: (ids, toChatId) =>
      setState((s) => {
        const source = s.messages.filter((m) => ids.includes(m.id));
        const copies = source.map((m) => {
          const fromChat = s.chats.find((c) => c.id === m.chatId);
          return createMessage({
            ...m,
            id: undefined,
            chatId: toChatId,
            senderId: ME,
            at: new Date().toISOString(),
            status: "sent",
            reactions: {},
            replyTo: null,
            forwardFrom: { senderId: m.senderId, chatTitle: fromChat?.title || "" },
          });
        }).map((m) => createMessage(m));
        return { ...s, messages: [...s.messages, ...copies] };
      }),

    pinMessage: (chatId, messageId) =>
      patchChat(chatId, (c) => ({ ...c, pinnedMessageId: c.pinnedMessageId === messageId ? null : messageId })),

    setDraft: (chatId, draft) => patchChat(chatId, (c) => ({ ...c, draft })),
    togglePinned: (chatId) => patchChat(chatId, (c) => ({ ...c, pinned: !c.pinned })),
    toggleMuted: (chatId) => patchChat(chatId, (c) => ({ ...c, muted: !c.muted })),
    toggleArchived: (chatId) => patchChat(chatId, (c) => ({ ...c, archived: !c.archived })),
    markRead: (chatId) => patchChat(chatId, (c) => ({ ...c, lastReadAt: new Date().toISOString() })),

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

    updateMe: (patch) => setState((s) => ({ ...s, me: { ...s.me, ...patch } })),
    setPref: (key, value) =>
      setState((s) => ({ ...s, me: { ...s.me, prefs: { ...(s.me.prefs || {}), [key]: value } } })),

    /** Opens the one-to-one chat with this person, creating it on first contact. */
    openOrCreatePrivateChat: (user) => {
      const existing = findPrivateChatWith(state.chats, user.id);
      if (existing) { openChat(existing.id); setScreen("list"); return existing.id; }
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
    addContact: ({ name, avatar, color }) => {
      const user = { id: uid(), name, nameFa: name, avatar: avatar || "👤", color: color || "#3390ec",
        online: false, lastSeen: new Date().toISOString(), premium: false };
      setState((s) => ({ ...s, customUsers: [...s.customUsers, user] }));
      return user;
    },

    /** Rerender hook for out-of-band changes like the language toggle. */
    bump: () => setState((s) => ({ ...s })),

    deleteChat: (chatId) =>
      setState((s) => ({
        ...s,
        chats: s.chats.filter((c) => c.id !== chatId),
        messages: s.messages.filter((m) => m.chatId !== chatId),
      })),
  }), [openChat, patchChat, patchMessage, state.chats, lang]);

  const openedChat = state.chats.find((c) => c.id === openChatId) || null;

  const messagesOf = useCallback(
    (chatId) => visibleMessages(state.messages, chatId),
    [state.messages]
  );

  const unreadOf = useCallback(
    (chat) => unreadCount(state.messages, chat),
    [state.messages]
  );

  const ordered = useMemo(
    () => sortChats(state.chats, state.messages),
    [state.chats, state.messages]
  );

  return {
    chats: state.chats,
    orderedChats: ordered,
    messages: state.messages,
    folder: state.folder,
    me: state.me,
    customUsers: state.customUsers,
    unreadTotal: totalUnread(state.chats, state.messages),
    screen,
    setScreen,
    openChatId,
    openedChat,
    typing,
    messagesOf,
    unreadOf,
    ...api,
  };
}
