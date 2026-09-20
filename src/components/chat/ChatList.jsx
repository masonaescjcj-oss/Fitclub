import React, { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Archive, MoreHorizontal, PenSquare, Pin, Plus, PlusCircle, Search, VolumeX, X } from "lucide-react";
import { ME, lastMessage, previewOf, relativeTime } from "../../lib/chat/chatModel";
import { STORIES, findUser } from "../../lib/chat/chatStore";
import { globalSearch } from "../../lib/chat/search";
import { TG } from "../../lib/chat/extras";
import { Avatar, NameBadges, Ticks, senderName } from "./ChatBits";

/** Folder tabs, Telegram-style: two built-ins, then the athlete's own folders. */
export const FOLDERS = [
  { id: "all", label: "all" },
  { id: "unread", label: "unreadFolder" },
  { id: "family", label: "family" },
  { id: "gym", label: "gym" },
  { id: "work", label: "work" },
  { id: "people", label: "people" },
  { id: "archived", label: "archived" },
];

export function matchesFolder(chat, folder, unread) {
  if (folder === "archived") return chat.archived;
  if (chat.archived) return false;
  if (folder === "all") return true;
  if (folder === "unread") return unread > 0;
  return (chat.folders || []).includes(folder);
}

/** The Premium star Telegram draws beside the title for a Premium account. */
function PremiumStar({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id="tg-premium" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6fb8ff" />
          <stop offset="0.55" stopColor="#7c6cf6" />
          <stop offset="1" stopColor="#d86bd0" />
        </linearGradient>
      </defs>
      <path fill="url(#tg-premium)"
        d="M12 2.6l2.7 5.7 6.2.8-4.5 4.3 1.1 6.2L12 16.7l-5.5 2.9 1.1-6.2L3.1 9.1l6.2-.8z" />
    </svg>
  );
}

/** A story bubble: gradient ring while unseen, thin grey once watched. */
function StoryBubble({ user, seen, mine, label, onClick }) {
  const ring = mine ? "transparent" : seen ? TG.sep : "linear-gradient(135deg,#34c759 0%,#2fa6ff 100%)";
  return (
    <button type="button" onClick={onClick} aria-label={label} className="relative shrink-0 active:scale-95 transition-transform">
      <span className="block rounded-full p-[2.5px]" style={{ background: ring }}>
        <span className="block rounded-full p-[2px]" style={{ background: TG.bg }}>
          <Avatar user={user} size={56} showStatus={false} />
        </span>
      </span>
      {mine && (
        <span className="absolute bottom-0.5 end-0.5 w-5 h-5 rounded-full flex items-center justify-center on-accent"
          style={{ background: TG.accentDeep, boxShadow: `0 0 0 2px ${TG.bg}` }}>
          <Plus className="w-3 h-3 text-white stroke-[3]" />
        </span>
      )}
    </button>
  );
}

/** Holds a row for half a second to open its actions, the way a phone does. */
function useLongPress(onLongPress) {
  const timer = useRef(null);
  const start = () => { timer.current = setTimeout(onLongPress, 480); };
  const stop = () => { clearTimeout(timer.current); timer.current = null; };
  return { onPointerDown: start, onPointerUp: stop, onPointerLeave: stop, onPointerMove: stop, onPointerCancel: stop };
}

/** One row, laid out the way the iOS client lays it out. */
function Row({ chat, message, unread, mentioned = 0, typingUser, isRtl, t, editing, onOpen, onMenu, onOpenMention }) {
  const title = isRtl ? chat.titleFa || chat.title : chat.title;
  const peer = chat.type === "private" && chat.id !== "saved"
    ? findUser(chat.members.find((m) => m !== ME))
    : null;
  const press = useLongPress(onMenu);

  const preview = typingUser ? t.typing : chat.draft ? chat.draft : previewOf(message, isRtl, t);
  const showSenderPrefix =
    !typingUser && !chat.draft && message && chat.type !== "private" && message.kind !== "system";

  return (
    <div role="button" tabIndex={0} onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }}
      onContextMenu={(e) => { e.preventDefault(); onMenu(); }}
      {...press}
      className="w-full flex items-center gap-2.5 ps-2.5 pe-0 active:bg-black/[0.04] transition-colors text-start cursor-pointer select-none">
      {editing && (
        <button type="button" aria-label={t.select}
          onClick={(e) => { e.stopPropagation(); onMenu(); }}
          className="w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center shrink-0"
          style={{ borderColor: TG.muted, color: TG.muted }}>
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      )}
      <Avatar chat={chat} user={peer} size={60} ring={TG.bg} />

      <span className="flex-1 min-w-0 pe-4 py-2.5 border-b" style={{ borderColor: TG.sep }}>
        <span className="flex items-center gap-1">
          <span className="text-[17px] font-semibold text-white truncate leading-[22px]">{title}</span>
          <NameBadges verified={chat.verified} premium={chat.premium || peer?.premium} />
          <span className="flex-1" />
          {message && (
            <span className="flex items-center gap-0.5 shrink-0 text-[14px] font-medium" style={{ color: TG.muted }}>
              <Ticks message={message} color={message.status === "read" ? TG.green : TG.muted} className="w-4 h-4" />
              <span dir="ltr">{relativeTime(message.at, t)}</span>
            </span>
          )}
        </span>

        <span className="flex items-start gap-2 mt-0.5">
          <span className="flex-1 min-w-0 text-[15px] leading-[20px] font-normal"
            style={{ color: typingUser ? TG.accent : TG.muted, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {chat.draft && !typingUser && <span className="text-rose-400 font-semibold">{t.edit}: </span>}
            {showSenderPrefix && (
              <span className="text-white">
                {message.senderId === ME ? `${isRtl ? "شما" : "You"}: ` : `${senderName(message.senderId, isRtl).split(" ")[0]}: `}
              </span>
            )}
            {preview}
          </span>

          <span className="flex items-center gap-1 shrink-0 mt-2.5">
            {chat.muted && unread === 0 && <VolumeX className="w-4 h-4" style={{ color: TG.muted }} />}
            {mentioned > 0 && (
              <button type="button" aria-label={t.mentionedYou} title={t.mentionedYou}
                onClick={(e) => { e.stopPropagation(); onOpenMention?.(); }}
                className="w-[22px] h-[22px] rounded-full text-[13px] font-bold text-white flex items-center justify-center on-accent"
                style={{ background: TG.accentDeep }}>@</button>
            )}
            {unread > 0 ? (
              <span className={`min-w-[22px] h-[22px] px-1.5 rounded-full text-[13px] font-semibold text-white flex items-center justify-center ${chat.muted ? "" : "on-accent"}`}
                style={{ background: chat.muted ? "#c7c7cc" : TG.accentDeep, color: chat.muted ? "#fff" : undefined }}>
                {unread > 99 ? "99+" : unread}
              </span>
            ) : chat.pinned ? (
              <Pin className="w-4 h-4 rotate-45" style={{ color: TG.muted }} fill="currentColor" />
            ) : null}
          </span>
        </span>
      </span>
    </div>
  );
}

/** One search hit: a chat of mine, a person, or a public community, with the action that fits. */
function ResultRow({ chat, user, title, subtitle, action, actionTone, onClick, onAction }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 active:bg-black/[0.04]">
      <button type="button" onClick={onClick} className="flex-1 flex items-center gap-3 min-w-0 text-start">
        <Avatar chat={chat} user={user} size={48} ring={TG.bg} showStatus={false} />
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-1">
            <span className="text-[16px] font-semibold text-white truncate">{title}</span>
            <NameBadges verified={chat?.verified || user?.verified} premium={chat?.premium || user?.premium} />
          </span>
          <span className="block text-[13px] truncate" style={{ color: TG.muted }} dir="auto">{subtitle}</span>
        </span>
      </button>
      {action && (
        <button type="button" onClick={onAction || onClick}
          className={`h-8 px-3.5 rounded-full text-[13px] font-semibold shrink-0 ${actionTone === "accent" ? "text-white on-accent" : ""}`}
          style={actionTone === "accent" ? { background: TG.accentDeep } : { color: TG.accent, background: `${TG.accent}1a` }}>
          {action}
        </button>
      )}
    </div>
  );
}

/**
 * Global search: my chats, my contacts, then public groups and channels
 * anyone can join by @username, plus links pasted straight in.
 */
function SearchResults({ query, store, people, isRtl, t, onOpen, onOpenUser, onJoin }) {
  const r = useMemo(() => globalSearch(query, { chats: store.chats, people, directory: store.directory }), [query, store.chats, people, store.directory]);
  const titleOf = (c) => (isRtl ? c.titleFa || c.title : c.title);
  const nameOf = (u) => (isRtl ? u.nameFa || u.name : u.name);
  const countOf = (c) => (c.type === "channel" ? `${c.subscribers.toLocaleString()} ${t.subscribers}` : `${c.members.length} ${t.members}`);
  const handle = (c) => (c.username ? `@${c.username} · ` : "");
  const section = (label) => <span className="block px-4 pt-4 pb-1 text-[13px] font-medium" style={{ color: TG.muted }}>{label}</span>;
  const empty = !r.link && !r.chats.length && !r.people.length && !r.global.length;

  return (
    <div className="pb-8">
      {r.link && (
        <>
          {section(t.linkSection)}
          {r.link.chat ? (
            <ResultRow chat={r.link.chat} title={titleOf(r.link.chat)} subtitle={`${handle(r.link.chat)}${countOf(r.link.chat)}`}
              action={r.link.joined ? t.open : t.join} actionTone={r.link.joined ? undefined : "accent"}
              onClick={() => (r.link.joined ? onOpen(r.link.chat.id) : onJoin(r.link.chat))} />
          ) : r.link.user ? (
            <ResultRow user={r.link.user} title={nameOf(r.link.user)} subtitle={`@${r.link.user.username}`}
              action={t.messageAction} actionTone="accent" onClick={() => onOpenUser(r.link.user)} />
          ) : (
            <p className="px-4 py-3 text-[14px]" style={{ color: TG.muted }}>{t.linkNotFound}</p>
          )}
        </>
      )}
      {r.chats.length > 0 && (
        <>
          {section(t.chatsSection)}
          {r.chats.map((c) => {
            const peer = c.type === "private" && c.id !== "saved" ? findUser(c.members.find((m) => m !== ME)) : null;
            const sub = c.type === "private" ? (peer?.username ? `@${peer.username}` : "") : `${handle(c)}${countOf(c)}`;
            return <ResultRow key={c.id} chat={c} user={peer} title={titleOf(c)} subtitle={sub} onClick={() => onOpen(c.id)} />;
          })}
        </>
      )}
      {r.people.length > 0 && (
        <>
          {section(t.contactsSection)}
          {r.people.map((u) => (
            <ResultRow key={u.id} user={u} title={nameOf(u)} subtitle={u.username ? `@${u.username}` : u.online ? t.online : t.lastSeenRecently}
              action={t.messageAction} onClick={() => onOpenUser(u)} />
          ))}
        </>
      )}
      {r.global.length > 0 && (
        <>
          {section(t.globalSection)}
          {r.global.map((c) => (
            <ResultRow key={c.id} chat={c} title={titleOf(c)} subtitle={`${handle(c)}${countOf(c)}`}
              action={t.join} actionTone="accent" onClick={() => onJoin(c)} />
          ))}
        </>
      )}
      {empty && <p className="py-14 px-8 text-center text-[14px]" style={{ color: TG.muted }}>{t.noSearchResults}</p>}
      {!query.trim() && <p className="py-14 px-8 text-center text-[13px]" style={{ color: TG.muted }}>{t.searchHint}</p>}
    </div>
  );
}

export default function ChatList({ store, isRtl, t, onOpen, onOpenAt, onMenu, onCompose, onOpenStory, onAddStory, onOpenUser, onJoin, people = [] }) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searching = searchOpen || query.trim().length > 0;

  const rows = useMemo(() => store.orderedChats
    .map((chat) => ({ chat, message: lastMessage(store.messages, chat.id), unread: store.unreadOf(chat), mentions: store.mentionsOf(chat) }))
    .filter(({ chat, unread }) => matchesFolder(chat, store.folder, unread)), [store]);

  const archivedCount = store.chats.filter((c) => c.archived).length;
  const stories = useMemo(() => {
    const seen = new Set(store.seenStories || []);
    // Unseen first, the way Telegram orders the rail.
    return [...STORIES].sort((a, b) => Number(seen.has(a.id)) - Number(seen.has(b.id)));
  }, [store.seenStories]);

  return (
    <div className="w-full min-h-[100dvh] text-white pb-44" style={{ background: TG.bg }}>
      {/* Navigation bar */}
      <div className="sticky top-0 z-20 backdrop-blur-xl" style={{ background: TG.surface }}>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center h-11 px-4">
          <button type="button" onClick={() => setEditing((v) => !v)}
            className="justify-self-start text-[17px] font-normal" style={{ color: TG.accent }}>
            {editing ? t.done : t.edit}
          </button>
          <h1 className="flex items-center gap-1 text-[17px] font-semibold text-white">
            {t.chats}
            <PremiumStar />
          </h1>
          <div className="justify-self-end flex items-center gap-4" style={{ color: TG.accent }}>
            <button type="button" onClick={onAddStory} aria-label={t.addStory}><PlusCircle className="w-[22px] h-[22px]" /></button>
            <button type="button" onClick={onCompose} aria-label={t.newChat}><PenSquare className="w-[22px] h-[22px]" /></button>
          </div>
        </div>

        {/* Search — by name, @username or a pasted link */}
        <div className="flex items-center gap-2 px-3 pt-1 pb-2">
          <label className="flex-1 flex items-center gap-2 h-9 px-3 rounded-[10px]" style={{ background: TG.card }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: TG.muted }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => setSearchOpen(true)}
              placeholder={t.searchPh} aria-label={t.searchPh}
              className="flex-1 min-w-0 bg-transparent text-[16px] text-white placeholder:text-neutral-500 focus:outline-none" />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label={t.close} className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: TG.muted, color: TG.card }}>
                <X className="w-3 h-3" />
              </button>
            )}
          </label>
          {searching && (
            <button type="button" onClick={() => { setQuery(""); setSearchOpen(false); }} className="text-[16px]" style={{ color: TG.accent }}>{t.cancel}</button>
          )}
        </div>

        {/* Stories rail */}
        {!searching && <div className="flex items-center gap-3 px-3 pt-1 pb-2.5 overflow-x-auto scrollbar-hide">
          <StoryBubble mine user={{ avatar: store.me.avatar, color: "#844783" }} label={t.myStory} onClick={onAddStory} />
          {stories.map((s) => (
            <StoryBubble key={s.id} user={findUser(s.userId)} seen={(store.seenStories || []).includes(s.id)}
              label={`${t.storyOf}: ${findUser(s.userId).name}`} onClick={() => onOpenStory(s)} />
          ))}
        </div>}

        {/* Folder tabs */}
        {!searching && <div className="flex px-2 overflow-x-auto scrollbar-hide border-b" style={{ borderColor: TG.sep }}>
          {FOLDERS.filter((f) => f.id !== "archived" || archivedCount > 0).map((f) => {
            const active = store.folder === f.id;
            return (
              <button key={f.id} type="button" onClick={() => store.setFolder(f.id)}
                className="relative px-3 pt-1 pb-2.5 text-[15px] font-medium whitespace-nowrap transition-colors"
                style={{ color: active ? TG.accent : TG.muted }}>
                {f.id === "archived" && <Archive className="w-3.5 h-3.5 inline -mt-0.5 me-1" />}
                {t[f.label]}
                {active && (
                  <motion.span layoutId="folder-underline"
                    className="absolute bottom-0 left-2 right-2 h-[3px] rounded-t-full"
                    style={{ background: TG.accent }} />
                )}
              </button>
            );
          })}
        </div>}
      </div>

      {searching && (
        <SearchResults query={query} store={store} people={people} isRtl={isRtl} t={t}
          onOpen={(id) => { setQuery(""); setSearchOpen(false); onOpen(id); }}
          onOpenUser={(u) => { setQuery(""); setSearchOpen(false); onOpenUser(u); }}
          onJoin={(c) => { setQuery(""); setSearchOpen(false); onJoin(c); }} />
      )}

      {/* Rows */}
      {!searching && <div>
        {rows.length === 0 && (
          <p className="py-16 text-center text-sm font-medium" style={{ color: TG.muted }}>{t.noChats}</p>
        )}
        {rows.map(({ chat, message, unread, mentions }) => (
          <motion.div key={chat.id} layout="position">
            <Row chat={chat} message={message} unread={unread} mentioned={mentions.length}
              typingUser={store.typing[chat.id]}
              isRtl={isRtl} t={t} editing={editing}
              onOpen={() => onOpen(chat.id)}
              onOpenMention={() => (onOpenAt ? onOpenAt(chat.id, mentions[0].id) : onOpen(chat.id))}
              onMenu={() => onMenu(chat)} />
          </motion.div>
        ))}
      </div>}

      {!searching && <p className="px-6 pt-6 text-center text-[11px] font-medium" style={{ color: TG.muted }}>{t.simulatedNote}</p>}
    </div>
  );
}
