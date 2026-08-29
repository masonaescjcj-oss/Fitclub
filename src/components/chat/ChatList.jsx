import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Archive, MoreVertical, Pencil, Search, X } from "lucide-react";
import { ME, lastMessage, previewOf, relativeTime } from "../../lib/chat/chatModel";
import { findUser } from "../../lib/chat/chatStore";
import { Avatar, ChatFlags, NameBadges, Ticks, senderName } from "./ChatBits";

const FOLDERS = [
  { id: "all", label: "all" },
  { id: "unread", label: "unreadFolder" },
  { id: "personal", label: "personal" },
  { id: "groups", label: "groups" },
  { id: "channels", label: "channels" },
  { id: "archived", label: "archived" },
];

function matchesFolder(chat, folder, unread) {
  if (folder === "archived") return chat.archived;
  if (chat.archived) return false;
  switch (folder) {
    case "unread": return unread > 0;
    case "personal": return chat.type === "private";
    case "groups": return chat.type === "group";
    case "channels": return chat.type === "channel";
    default: return true;
  }
}

/** One row in the chat list. Long-press (or the ⋮ button) opens its actions. */
function Row({ chat, message, unread, typingUser, isRtl, t, onOpen, onMenu }) {
  const title = isRtl ? chat.titleFa || chat.title : chat.title;
  const peer = chat.type === "private" && chat.id !== "saved"
    ? findUser(chat.members.find((m) => m !== ME))
    : null;

  const preview = typingUser
    ? t.typing
    : chat.draft
      ? chat.draft
      : previewOf(message, isRtl, t);

  const showSenderPrefix =
    !typingUser && !chat.draft && message && chat.type !== "private" && message.kind !== "system";

  return (
    <button type="button" onClick={onOpen}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] active:bg-white/[0.07] transition-colors text-start">
      <Avatar chat={chat} user={peer} size={52} />

      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5">
          <span className="text-sm font-black text-white truncate">{title}</span>
          <NameBadges verified={chat.verified} premium={chat.premium || peer?.premium} />
          <span className="flex-1" />
          <ChatFlags chat={chat} />
          {message && (
            <span className="flex items-center gap-1 shrink-0">
              <Ticks message={message} />
              <span className="text-[10px] font-bold text-neutral-500">{relativeTime(message.at, t)}</span>
            </span>
          )}
        </span>

        <span className="flex items-center gap-1.5 mt-0.5">
          <span className={`flex-1 min-w-0 text-xs font-medium truncate ${
            typingUser ? "text-[#c07dbf]" : "text-neutral-500"
          }`}>
            {chat.draft && !typingUser && (
              <span className="text-rose-400 font-bold">{t.edit}: </span>
            )}
            {showSenderPrefix && (
              <span className="text-neutral-400">
                {message.senderId === ME ? `${isRtl ? "شما" : "You"}: ` : `${senderName(message.senderId, isRtl).split(" ")[0]}: `}
              </span>
            )}
            {preview}
          </span>

          {unread > 0 ? (
            <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
              chat.muted ? "bg-neutral-700 text-neutral-300" : "bg-[#844783] text-white"
            }`}>
              {unread > 99 ? "99+" : unread}
            </span>
          ) : (
            <span
              role="button"
              tabIndex={0}
              aria-label={t.select}
              onClick={(e) => { e.stopPropagation(); onMenu(); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onMenu(); } }}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-neutral-700 hover:text-white shrink-0"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

export default function ChatList({ store, isRtl, t, onOpen, onMenu, onCompose }) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.orderedChats
      .map((chat) => ({
        chat,
        message: lastMessage(store.messages, chat.id),
        unread: store.unreadOf(chat),
      }))
      .filter(({ chat, unread }) => {
        if (q) {
          const title = `${chat.title} ${chat.titleFa}`.toLowerCase();
          return title.includes(q);
        }
        return matchesFolder(chat, store.folder, unread);
      });
  }, [store, query]);

  const archivedCount = store.chats.filter((c) => c.archived).length;

  return (
    <div className="w-full min-h-[100dvh] bg-black text-white pb-28">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur border-b border-white/10">
        <div className="flex items-center gap-2 px-4 pt-5 pb-3">
          <h1 className="text-2xl font-black text-white flex-1">{t.chats}</h1>
          <button type="button" onClick={() => { setSearching((v) => !v); setQuery(""); }}
            aria-label={t.searchChats}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
              searching ? "bg-white/10 border-white/30 text-white" : "bg-[#141416] border-white/10 text-neutral-400"
            }`}>
            {searching ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>
          <button type="button" onClick={onCompose} aria-label={t.message}
            className="w-9 h-9 rounded-xl bg-[#844783] flex items-center justify-center text-white">
            <Pencil className="w-4 h-4" />
          </button>
        </div>

        {searching && (
          <div className="px-4 pb-3">
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchChats}
              className="w-full h-10 px-3 rounded-xl bg-[#141416] border border-white/10 text-sm font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-white/30" />
          </div>
        )}

        {!searching && (
          <div className="flex gap-1 px-3 pb-2 overflow-x-auto scrollbar-hide">
            {FOLDERS.filter((f) => f.id !== "archived" || archivedCount > 0).map((f) => (
              <button key={f.id} type="button" onClick={() => store.setFolder(f.id)}
                className={`px-3 h-8 rounded-lg text-[11px] font-black whitespace-nowrap transition-all ${
                  store.folder === f.id ? "bg-[#844783]/25 text-white" : "text-neutral-500 hover:text-neutral-300"
                }`}>
                {f.id === "archived" && <Archive className="w-3 h-3 inline ltr:mr-1 rtl:ml-1" />}
                {t[f.label]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Rows */}
      <div className="divide-y divide-white/[0.04]">
        {rows.length === 0 && (
          <p className="py-16 text-center text-xs font-bold text-neutral-600">
            {query ? t.noResults : t.noChats}
          </p>
        )}
        {rows.map(({ chat, message, unread }) => (
          <motion.div key={chat.id} layout="position">
            <Row
              chat={chat} message={message} unread={unread}
              typingUser={store.typing[chat.id]}
              isRtl={isRtl} t={t}
              onOpen={() => onOpen(chat.id)}
              onMenu={() => onMenu(chat)}
            />
          </motion.div>
        ))}
      </div>

      <p className="px-6 pt-6 text-center text-[9px] font-bold text-neutral-700">{t.simulatedNote}</p>
    </div>
  );
}
