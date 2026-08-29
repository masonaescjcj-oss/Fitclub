import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ME, createMessage, sortChats, toggleReaction, unreadCount, visibleMessages, votePoll,
} from "../lib/chat/chatModel";
import { loadChat, saveChat } from "../lib/chat/chatStore";
import { scheduleReply } from "../lib/chat/simulator";

/** Owns the whole messenger: chats, messages, and the simulated peers. */
export default function useChat(lang = "en") {
  const [state, setState] = useState(loadChat);
  const [openChatId, setOpenChatId] = useState(null);
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
          onReply: (userId, text) =>
            setState((s) => ({
              ...s,
              messages: [
                // Their reply implies they saw everything I had sent.
                ...s.messages.map((m) =>
                  m.chatId === chatId && m.senderId === ME ? { ...m, status: "read" } : m
                ),
                createMessage({ chatId, senderId: userId, text, status: "sent" }),
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
    openChatId,
    openedChat,
    typing,
    messagesOf,
    unreadOf,
    ...api,
  };
}
