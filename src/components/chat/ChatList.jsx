import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Archive, Menu, MoreVertical, Pencil, Search, X } from "lucide-react";
import { ME, lastMessage, previewOf, relativeTime } from "../../lib/chat/chatModel";
import { findUser } from "../../lib/chat/chatStore";
import { TG } from "../../lib/chat/extras";
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

/** One row. The ⋮ affordance opens the chat's actions. */
function Row({ chat, message, unread, typingUser, isRtl, t, onOpen, onMenu }) {
  const title = isRtl ? chat.titleFa || chat.title : chat.title;
  const peer = chat.type === "private" && chat.id !== "saved"
    ? findUser(chat.members.find((m) => m !== ME))
    : null;

  const preview = typingUser ? t.typing : chat.draft ? chat.draft : previewOf(message, isRtl, t);
  const showSenderPrefix =
    !typingUser && !chat.draft && message && chat.type !== "private" && message.kind !== "system";

  return (
    <button type="button" onClick={onOpen}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] active:bg-white/[0.07] transition-colors text-start">
      <Avatar chat={chat} user={peer} size={54} ring={TG.bg} />

      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5">
          <span className="text-[15px] font-black text-white truncate">{title}</span>
          <NameBadges verified={chat.verified} premium={chat.premium || peer?.premium} />
          <span className="flex-1" />
          <ChatFlags chat={chat} />
          {message && (
            <span className="flex items-center gap-1 shrink-0">
              <Ticks message={message} />
              <span className="text-[10px] font-bold text-[#6b7c8a]">{relativeTime(message.at, t)}</span>
            </span>
          )}
        </span>

        <span className="flex items-center gap-1.5 mt-0.5">
          <span className={`flex-1 min-w-0 text-[13px] font-medium truncate ${
            typingUser ? "" : "text-[#7d8b99]"
          }`} style={typingUser ? { color: TG.accent } : undefined}>
            {chat.draft && !typingUser && <span className="text-rose-400 font-bold">{t.edit}: </span>}
            {showSenderPrefix && (
              <span className="text-neutral-400">
                {message.senderId === ME ? `${isRtl ? "شما" : "You"}: ` : `${senderName(message.senderId, isRtl).split(" ")[0]}: `}
              </span>
            )}
            {preview}
          </span>

          {unread > 0 ? (
            <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
              chat.muted ? "bg-[#3d4a56] text-neutral-300" : "text-white"
            }`} style={chat.muted ? undefined : { background: TG.accentDeep }}>
              {unread > 99 ? "99+" : unread}
            </span>
          ) : (
            <span role="button" tabIndex={0} aria-label={t.select}
              onClick={(e) => { e.stopPropagation(); onMenu(); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onMenu(); } }}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-neutral-700 hover:text-white shrink-0">
              <MoreVertical className="w-3.5 h-3.5" />
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

export default function ChatList({ store, isRtl, t, onOpen, onMenu, onCompose, onOpenDrawer }) {
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
        if (q) return `${chat.title} ${chat.titleFa}`.toLowerCase().includes(q);
        return matchesFolder(chat, store.folder, unread);
      });
  }, [store, query]);

  const archivedCount = store.chats.filter((c) => c.archived).length;

  return (
    <div className="w-full min-h-[100dvh] text-white pb-28" style={{ background: TG.bg }}>
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-white/[0.06]" style={{ background: TG.surface }}>
        <div className="flex items-center gap-2 px-3 pt-4 pb-2">
          <button type="button" onClick={onOpenDrawer} aria-label={t.menu}
            className="relative w-10 h-10 rounded-xl flex items-center justify-center text-neutral-300 hover:text-white shrink-0">
            <Menu className="w-5 h-5" />
            {store.unreadTotal > 0 && (
              <span className="absolute top-1 ltr:right-0.5 rtl:left-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black text-white flex items-center justify-center"
                style={{ background: TG.accentDeep }}>
                {store.unreadTotal}
              </span>
            )}
          </button>
          <h1 className="text-xl font-black text-white flex-1">{t.chats}</h1>
          <button type="button" onClick={() => { setSearching((v) => !v); setQuery(""); }}
            aria-label={t.searchChats}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-neutral-300 hover:text-white">
            {searching ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </button>
        </div>

        {searching ? (
          <div className="px-4 pb-3">
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchChats}
              className="w-full h-10 px-3 rounded-2xl bg-[#242f3d] border border-white/[0.07] text-sm font-bold text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/25" />
          </div>
        ) : (
          /* Folder strip, underline style */
          <div className="flex gap-1 px-2 overflow-x-auto scrollbar-hide">
            {FOLDERS.filter((f) => f.id !== "archived" || archivedCount > 0).map((f) => {
              const active = store.folder === f.id;
              return (
                <button key={f.id} type="button" onClick={() => store.setFolder(f.id)}
                  className={`relative px-3 pt-1.5 pb-2.5 text-[13px] font-black whitespace-nowrap transition-colors ${
                    active ? "" : "text-[#7d8b99] hover:text-neutral-300"
                  }`} style={active ? { color: TG.accent } : undefined}>
                  {f.id === "archived" && <Archive className="w-3 h-3 inline ltr:mr-1 rtl:ml-1" />}
                  {t[f.label]}
                  {active && (
                    <motion.span layoutId="folder-underline"
                      className="absolute bottom-0 left-2 right-2 h-[3px] rounded-t-full"
                      style={{ background: TG.accent }} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Rows */}
      <div className="divide-y divide-white/[0.035]">
        {rows.length === 0 && (
          <p className="py-16 text-center text-xs font-bold text-neutral-600">
            {query ? t.noResults : t.noChats}
          </p>
        )}
        {rows.map(({ chat, message, unread }) => (
          <motion.div key={chat.id} layout="position">
            <Row chat={chat} message={message} unread={unread}
              typingUser={store.typing[chat.id]}
              isRtl={isRtl} t={t}
              onOpen={() => onOpen(chat.id)}
              onMenu={() => onMenu(chat)} />
          </motion.div>
        ))}
      </div>

      <p className="px-6 pt-6 text-center text-[9px] font-bold text-neutral-700">{t.simulatedNote}</p>

      {/* Compose FAB */}
      <button type="button" onClick={onCompose} aria-label={t.newChat}
        className={`fixed bottom-24 ${isRtl ? "left-5" : "right-5"} w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl active:scale-95 transition-transform z-30`}
        style={{ background: TG.accentDeep }}>
        <Pencil className="w-5 h-5" />
      </button>
    </div>
  );
}
