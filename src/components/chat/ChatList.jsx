import React, { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { motion } from "framer-motion";
import { Archive, Loader2, MessageCircle, MoreHorizontal, PenSquare, Pin, Search, VolumeX, X } from "lucide-react";
import { ME, lastMessage, previewOf, relativeTime } from "../../lib/chat/chatModel";
import { DEMO_WORLD, STORIES_SHOWN, findUser } from "../../lib/chat/chatStore";
import { globalSearch } from "../../lib/chat/search";
import { Empty, IconButton, Label, cx, num } from "../ui/kit";
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

/**
 * The header sits right under the safe area, at the same height as the
 * contacts and settings headers. The folder tabs stick right under it.
 */
const HEAD_TOP = "calc(env(safe-area-inset-top) + 6px)";
const stickTop = { top: "calc(env(safe-area-inset-top) + 58px)" };

/** A story bubble: an ink ring while unseen, a faint one once watched. */
function StoryBubble({ user, seen, label, name, onClick }) {
  return (
    <li className="w-[66px] shrink-0 flex flex-col items-center gap-1.5">
      <button type="button" onClick={onClick} aria-label={label}
        className={cx("relative w-[62px] h-[62px] rounded-full flex items-center justify-center border-0 p-0 bg-canvas cursor-pointer active:scale-95 transition-transform",
          seen ? "ring-[1.5px] ring-faint" : "ring-[2.5px] ring-ink")}>
        <Avatar user={user} size={54} showStatus={false} />
      </button>
      <span className={cx("max-w-full truncate text-xs leading-tight", seen ? "text-muted" : "text-ink font-semibold")}>{name}</span>
    </li>
  );
}

/** The stories folded into the header, Telegram's way: up to three faces, overlapping. */
function StoryStack({ faces, label, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-expanded={false}
      className="shrink-0 flex items-center border-0 p-0 bg-transparent cursor-pointer transition-transform active:scale-95">
      {faces.map(({ user, seen }, i) => (
        <span key={user.id} style={{ zIndex: faces.length - i }}
          className={cx("relative rounded-full bg-canvas p-[2px]", i > 0 && "-ms-3", seen ? "ring-[1.5px] ring-faint" : "ring-2 ring-ink")}>
          <Avatar user={user} size={26} showStatus={false} />
        </span>
      ))}
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

/** A round count: ink for unread, quiet for a muted chat. */
function CountBadge({ count, muted, isRtl }) {
  return (
    <span className={cx("min-w-[22px] h-[22px] px-1.5 rounded-full text-[12px] font-bold flex items-center justify-center",
      muted ? "bg-line text-muted" : "bg-inv text-on-inv")}>
      {num(count > 99 ? "99+" : count, isRtl)}
    </span>
  );
}

/** One row, laid out the way the iOS client lays it out, on a white card. */
function Row({ chat, message, unread, mentioned = 0, typingUser, isRtl, t, editing, onOpen, onMenu, onOpenMention }) {
  const title = isRtl ? chat.titleFa || chat.title : chat.title;
  const peer = chat.type === "private" && chat.id !== "saved"
    ? findUser(chat.members.find((m) => m !== ME))
    : null;
  const press = useLongPress(onMenu);

  const preview = typingUser ? t.typing : chat.draft ? chat.draft : previewOf(message, isRtl, t);
  const showSenderPrefix =
    !typingUser && !chat.draft && message && chat.type !== "private" && message.kind !== "system";
  const fresh = unread > 0 && !chat.muted;

  return (
    <div role="button" tabIndex={0} onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }}
      onContextMenu={(e) => { e.preventDefault(); onMenu(); }}
      {...press}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-start cursor-pointer select-none active:bg-sunk transition-colors">
      {editing && (
        <button type="button" aria-label={t.select}
          onClick={(e) => { e.stopPropagation(); onMenu(); }}
          className="w-11 h-11 -ms-2.5 -me-1.5 shrink-0 flex items-center justify-center border-0 bg-transparent p-0 cursor-pointer">
          <span className="w-[26px] h-[26px] rounded-full ring-2 ring-inset ring-faint text-muted flex items-center justify-center">
            <MoreHorizontal className="w-4 h-4" strokeWidth={2.2} />
          </span>
        </button>
      )}
      <Avatar chat={chat} user={peer} size={54} />

      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="flex items-center gap-1 min-w-0">
          <span className="text-[16px] font-bold text-ink truncate leading-[22px]">{title}</span>
          <NameBadges verified={chat.verified} premium={chat.premium || peer?.premium} />
          <span className="flex-1" />
          {message && (
            <span className={cx("flex items-center gap-0.5 shrink-0 text-[13px]", fresh ? "text-ink font-semibold" : "text-muted")}>
              <Ticks message={message} className="w-4 h-4 text-ink" />
              <span dir={isRtl ? undefined : "ltr"}>{num(relativeTime(message.at, t), isRtl)}</span>
            </span>
          )}
        </span>

        <span className="flex items-end gap-2">
          <span className={cx("flex-1 min-w-0 text-[14px] leading-[19px] line-clamp-2 break-words", typingUser ? "text-ink font-medium" : "text-muted")}>
            {chat.draft && !typingUser && <span className="text-alert font-semibold">{t.draftLabel}: </span>}
            {showSenderPrefix && (
              <span className="text-ink font-medium">
                {message.senderId === ME ? `${isRtl ? "شما" : "You"}: ` : `${senderName(message.senderId, isRtl).split(" ")[0]}: `}
              </span>
            )}
            {/* Isolated, so an English preview in a Persian list keeps its punctuation in place. */}
            <span dir="auto">{preview}</span>
          </span>

          <span className="flex items-center gap-1 shrink-0 min-h-[22px]">
            {chat.muted && unread === 0 && <VolumeX className="w-4 h-4 text-muted" strokeWidth={2} aria-label={t.mutedLabel} role="img" />}
            {mentioned > 0 && (
              <button type="button" aria-label={t.mentionedYou} title={t.mentionedYou}
                onClick={(e) => { e.stopPropagation(); onOpenMention?.(); }}
                className="relative w-[22px] h-[22px] rounded-full border-0 p-0 bg-jet text-accent text-[13px] font-extrabold flex items-center justify-center cursor-pointer dark:ring-1 dark:ring-inset dark:ring-line before:content-[''] before:absolute before:-inset-3">
                @
              </button>
            )}
            {unread > 0 ? (
              <CountBadge count={unread} muted={chat.muted} isRtl={isRtl} />
            ) : chat.pinned ? (
              <Pin className="w-4 h-4 rotate-45 text-muted" fill="currentColor" strokeWidth={2} aria-label={t.pinnedLabel} role="img" />
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
    <li className="flex items-center gap-3 px-4 py-2 active:bg-sunk transition-colors">
      <button type="button" onClick={onClick} className="flex-1 flex items-center gap-3 min-w-0 text-start border-0 bg-transparent p-0 cursor-pointer">
        <Avatar chat={chat} user={user} size={46} showStatus={false} />
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-1">
            <span className="text-[15px] font-semibold text-ink truncate">{title}</span>
            <NameBadges verified={chat?.verified || user?.verified} premium={chat?.premium || user?.premium} />
          </span>
          <span className="block text-[13px] text-muted truncate" dir="auto">{subtitle}</span>
        </span>
      </button>
      {action && (
        <button type="button" onClick={onAction || onClick}
          className={cx("h-9 px-4 rounded-full text-[13px] font-semibold shrink-0 border-0 cursor-pointer active:scale-[0.98] transition-transform",
            actionTone === "accent" ? "bg-inv text-on-inv" : "bg-sunk text-ink")}>
          {action}
        </button>
      )}
    </li>
  );
}

/** A labelled white card of search hits. */
function ResultGroup({ label, children }) {
  return (
    <section className="flex flex-col gap-2">
      <Label as="h2" className="m-0 px-1">{label}</Label>
      <ul className="m-0 p-0 py-1 list-none rounded-3xl bg-card divide-y divide-hair overflow-hidden">{children}</ul>
    </section>
  );
}

/**
 * Global search: my chats, my contacts, then public groups and channels
 * anyone can join by @username, plus links pasted straight in.
 */
function SearchResults({ query, store, people, isRtl, t, onOpen, onOpenUser, onJoin }) {
  // People and communities on the server arrive a moment later and slot into the same sections.
  const [remote, setRemote] = useState({ users: [], chats: [] });
  const { online, searchRemote } = store;
  useEffect(() => {
    const q = query.trim();
    if (!online || q.length < 2) { setRemote({ users: [], chats: [] }); return undefined; }
    let live = true;
    const id = setTimeout(() => searchRemote(q.replace(/^@/, "")).then((res) => { if (live) setRemote(res); }).catch(() => {}), 250);
    return () => { live = false; clearTimeout(id); };
  }, [query, online, searchRemote]);
  const r = useMemo(() => {
    const local = globalSearch(query, { chats: store.chats, people, directory: store.directory });
    const known = new Set([...local.people.map((u) => u.id), ...people.map((u) => u.id)]);
    const mine = new Set(store.chats.map((c) => c.id));
    return {
      ...local,
      people: [...local.people, ...remote.users.filter((u) => !known.has(u.id))],
      global: [...local.global, ...remote.chats.filter((c) => !mine.has(c.id))],
    };
  }, [query, store.chats, people, store.directory, remote]);
  const titleOf = (c) => (isRtl ? c.titleFa || c.title : c.title);
  const nameOf = (u) => (isRtl ? u.nameFa || u.name : u.name);
  const countOf = (c) => (c.type === "channel"
    ? `${num((c.subscribers || c.memberCount || 0).toLocaleString("en-US"), isRtl)} ${t.subscribers}`
    : `${num(c.memberCount || c.members.length, isRtl)} ${t.members}`);
  // "·" reads as a Persian zero beside Persian digits, so Persian gets a comma.
  const handle = (c) => (c.username ? `@${c.username}${isRtl ? "، " : " · "}` : "");
  const empty = !r.link && !r.chats.length && !r.people.length && !r.global.length;

  return (
    <div className="px-5 pt-1 pb-8 flex flex-col gap-5">
      {r.link && (
        <ResultGroup label={t.linkSection}>
          {r.link.chat ? (
            <ResultRow chat={r.link.chat} title={titleOf(r.link.chat)} subtitle={`${handle(r.link.chat)}${countOf(r.link.chat)}`}
              action={r.link.joined ? t.open : t.join} actionTone={r.link.joined ? undefined : "accent"}
              onClick={() => (r.link.joined ? onOpen(r.link.chat.id) : onJoin(r.link.chat))} />
          ) : r.link.user ? (
            <ResultRow user={r.link.user} title={nameOf(r.link.user)} subtitle={`@${r.link.user.username}`}
              action={t.messageAction} actionTone="accent" onClick={() => onOpenUser(r.link.user)} />
          ) : (
            <li className="px-4 py-3 text-[14px] text-muted">{t.linkNotFound}</li>
          )}
        </ResultGroup>
      )}
      {r.chats.length > 0 && (
        <ResultGroup label={t.chatsSection}>
          {r.chats.map((c) => {
            const peer = c.type === "private" && c.id !== "saved" ? findUser(c.members.find((m) => m !== ME)) : null;
            const sub = c.type === "private" ? (peer?.username ? `@${peer.username}` : "") : `${handle(c)}${countOf(c)}`;
            return <ResultRow key={c.id} chat={c} user={peer} title={titleOf(c)} subtitle={sub} onClick={() => onOpen(c.id)} />;
          })}
        </ResultGroup>
      )}
      {r.people.length > 0 && (
        <ResultGroup label={t.contactsSection}>
          {r.people.map((u) => (
            <ResultRow key={u.id} user={u} title={nameOf(u)} subtitle={u.username ? `@${u.username}` : u.online ? t.online : t.lastSeenRecently}
              action={t.messageAction} onClick={() => onOpenUser(u)} />
          ))}
        </ResultGroup>
      )}
      {r.global.length > 0 && (
        <ResultGroup label={t.globalSection}>
          {r.global.map((c) => (
            <ResultRow key={c.id} chat={c} title={titleOf(c)} subtitle={`${handle(c)}${countOf(c)}`}
              action={t.join} actionTone="accent" onClick={() => onJoin(c)} />
          ))}
        </ResultGroup>
      )}
      {!query.trim()
        ? <Empty icon={<Search className="w-6 h-6" strokeWidth={2} />} title={t.searchPh} body={t.searchHint} />
        : empty && <Empty icon={<Search className="w-6 h-6" strokeWidth={2} />} title={t.noSearchResults} />}
    </div>
  );
}

export default function ChatList({ store, isRtl, t, onOpen, onOpenAt, onMenu, onCompose, onOpenStory, onOpenUser, onJoin, people = [] }) {
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searching = searchOpen || query.trim().length > 0;

  const rows = useMemo(() => store.orderedChats
    .map((chat) => ({ chat, message: lastMessage(store.messages, chat.id), unread: store.unreadOf(chat), mentions: store.mentionsOf(chat) }))
    // A real account has only the built-in folders; one kept from the demo reads as All.
    .filter(({ chat, unread }) => matchesFolder(chat, DEMO_WORLD || ["all", "unread", "archived"].includes(store.folder) ? store.folder : "all", unread)), [store]);

  const archivedCount = store.chats.filter((c) => c.archived).length;
  const stories = useMemo(() => {
    const seen = new Set(store.seenStories || []);
    // Unseen first, the way Telegram orders the rail.
    return [...STORIES_SHOWN].sort((a, b) => Number(seen.has(a.id)) - Number(seen.has(b.id)));
  }, [store.seenStories]);

  const status = store.server?.status;
  const connecting = status === "connecting" || status === "error";
  const firstName = (u) => (isRtl ? u.nameFa || u.name : u.name).split(" ")[0];
  const closeSearch = () => { setQuery(""); setSearchOpen(false); };

  // Stories start folded into the header, the way Telegram keeps the list
  // clear. Pulling the list down at the top opens the rail; scrolling past
  // it folds it back without moving the chats on screen.
  const [storiesOpen, setStoriesOpen] = useState(false);
  const railRef = useRef(null);
  const seenIds = store.seenStories || [];
  const faces = stories.slice(0, 3).map((s) => ({ user: findUser(s.userId), seen: seenIds.includes(s.id) })).filter((f) => f.user);
  const openStories = () => { window.scrollTo(0, 0); setStoriesOpen(true); };

  useEffect(() => {
    if (searching || storiesOpen) return undefined;
    let startY = null;
    const atTop = () => window.scrollY <= 0;
    const onStart = (e) => { startY = atTop() ? e.touches[0].clientY : null; };
    const onMove = (e) => { if (startY !== null && e.touches[0].clientY - startY > 48) { startY = null; setStoriesOpen(true); } };
    const onEnd = () => { startY = null; };
    const onWheel = (e) => { if (atTop() && e.deltaY < -24) setStoriesOpen(true); };
    // The pull opens the stories instead of the browser's pull-to-refresh.
    const root = document.documentElement;
    const overscroll = root.style.overscrollBehaviorY;
    root.style.overscrollBehaviorY = "contain";
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      root.style.overscrollBehaviorY = overscroll;
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("wheel", onWheel);
    };
  }, [searching, storiesOpen]);

  useEffect(() => {
    if (!storiesOpen) return undefined;
    const onScroll = () => {
      const h = railRef.current?.offsetHeight || 0;
      if (h && window.scrollY > h + 8) {
        // The rail sat above what is on screen: remove it and take its height
        // off the scroll in the same frame, so nothing on screen moves.
        const y = window.scrollY;
        flushSync(() => setStoriesOpen(false));
        window.scrollTo(0, y - h);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [storiesOpen]);

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="ui w-full min-h-[100dvh] pb-32">
      {/* Navigation bar: Edit · stories and title · compose */}
      <header className="sticky top-0 z-20 px-5 pb-2 bg-canvas" style={{ paddingTop: HEAD_TOP }}>
        <div className="h-11 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <button type="button" onClick={() => setEditing((v) => !v)} aria-pressed={editing}
            className="justify-self-start h-11 px-1 -ms-1 border-0 bg-transparent text-[16px] font-semibold text-ink cursor-pointer">
            {editing ? t.done : t.edit}
          </button>
          <h1 className="m-0 min-w-0 flex items-center justify-center gap-1.5">
            {connecting ? (
              <span className="flex items-center gap-1.5 text-[15px] font-semibold text-muted truncate">
                <Loader2 className="w-4 h-4 shrink-0 animate-spin" strokeWidth={2.2} />
                {status === "connecting" ? t.connecting : t.waitingNetwork}
              </span>
            ) : (
              <>
                {!storiesOpen && !searching && faces.length > 0 && (
                  <StoryStack faces={faces} label={t.showStories} onClick={openStories} />
                )}
                <span className="font-display font-extrabold text-[26px] leading-none tracking-[-0.035em] text-ink truncate">{t.chats}</span>
                <NameBadges premium size={17} />
              </>
            )}
          </h1>
          <div className="justify-self-end flex items-center gap-2">
            <IconButton label={t.newChat} tone="jet" onClick={onCompose}>
              <PenSquare className="w-[19px] h-[19px]" strokeWidth={2} />
            </IconButton>
          </div>
        </div>
      </header>

      {/* Stories rail, opened by a pull at the top or a tap on the header's faces */}
      {!searching && storiesOpen && (
        <motion.div ref={railRef} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
          transition={{ duration: 0.22, ease: "easeOut" }} className="overflow-hidden">
          <ul aria-label={t.storiesLabel} className="m-0 px-5 pt-1.5 pb-1 list-none flex gap-2.5 overflow-x-auto scrollbar-hide">
            {stories.map((s) => {
              const u = findUser(s.userId);
              const seen = seenIds.includes(s.id);
              return (
                <StoryBubble key={s.id} user={u} seen={seen} name={firstName(u)}
                  label={`${t.storyOf}: ${isRtl ? u.nameFa || u.name : u.name}${seen ? `, ${t.storySeenLabel}` : ""}`}
                  onClick={() => onOpenStory(s)} />
              );
            })}
          </ul>
        </motion.div>
      )}

      <div className="px-5 pt-1.5 pb-3 flex flex-col gap-3">
        {/* Search — by name, @username or a pasted link */}
        <div className="flex items-center gap-3">
          <label className="flex-1 h-11 rounded-2xl bg-card flex items-center gap-2.5 px-3.5 transition-shadow focus-within:ring-2 focus-within:ring-inset focus-within:ring-ink">
            <Search className="w-[18px] h-[18px] shrink-0 text-muted" strokeWidth={2} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => setSearchOpen(true)}
              placeholder={t.searchPh} aria-label={t.searchPh} type="text" role="searchbox" enterKeyHint="search"
              className="flex-1 min-w-0 h-full border-0 bg-transparent text-[15px] text-ink outline-none focus-visible:outline-none placeholder:text-muted/80" />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label={t.close}
                className="w-6 h-6 -me-1 rounded-full bg-line text-muted border-0 p-0 flex items-center justify-center cursor-pointer">
                <X className="w-3.5 h-3.5" strokeWidth={2.4} />
              </button>
            )}
          </label>
          {searching && (
            <button type="button" onClick={closeSearch}
              className="h-11 border-0 bg-transparent px-1 text-[15px] font-semibold text-ink cursor-pointer">{t.cancel}</button>
          )}
        </div>
      </div>

      {/* Folder tabs, pinned under the navigation bar */}
      {!searching && (
        <div className="sticky z-20 bg-canvas" style={stickTop}>
          <div role="tablist" aria-label={t.foldersLabel} className="flex px-3 overflow-x-auto scrollbar-hide border-b border-line">
            {FOLDERS.filter((f) => (f.id === "archived" ? archivedCount > 0 : DEMO_WORLD || f.id === "all" || f.id === "unread")).map((f) => {
              const active = store.folder === f.id || (!DEMO_WORLD && f.id === "all" && !["unread", "archived"].includes(store.folder));
              return (
                <button key={f.id} type="button" role="tab" aria-selected={active} onClick={() => store.setFolder(f.id)}
                  className={cx("relative h-11 px-3 shrink-0 inline-flex items-center gap-1.5 border-0 bg-transparent text-[15px] whitespace-nowrap cursor-pointer transition-colors",
                    active ? "text-ink font-semibold" : "text-muted font-medium")}>
                  {f.id === "archived" && <Archive className="w-4 h-4" strokeWidth={2} />}
                  {t[f.label]}
                  {active && (
                    <motion.span layoutId="folder-underline" transition={{ type: "spring", stiffness: 500, damping: 40 }}
                      className="absolute bottom-0 inset-x-2 h-[3px] rounded-t-full bg-ink" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {searching && (
        <SearchResults query={query} store={store} people={people} isRtl={isRtl} t={t}
          onOpen={(id) => { closeSearch(); onOpen(id); }}
          onOpenUser={(u) => { closeSearch(); onOpenUser(u); }}
          onJoin={(c) => { closeSearch(); onJoin(c); }} />
      )}

      {/* Rows */}
      {!searching && (
        <div className="px-5 pt-3">
          {rows.length === 0 ? (
            <div className="rounded-3xl bg-card">
              <Empty icon={<MessageCircle className="w-6 h-6" strokeWidth={2} />} title={t.noChats} />
            </div>
          ) : (
            <ul aria-label={t.chats} className="m-0 p-0 py-1 list-none rounded-3xl bg-card divide-y divide-hair overflow-hidden">
              {rows.map(({ chat, message, unread, mentions }) => (
                <motion.li key={chat.id} layout="position" className="list-none">
                  <Row chat={chat} message={message} unread={unread} mentioned={mentions.length}
                    typingUser={store.typing[chat.id]}
                    isRtl={isRtl} t={t} editing={editing}
                    onOpen={() => onOpen(chat.id)}
                    onOpenMention={() => (onOpenAt ? onOpenAt(chat.id, mentions[0].id) : onOpen(chat.id))}
                    onMenu={() => onMenu(chat)} />
                </motion.li>
              ))}
            </ul>
          )}
          {DEMO_WORLD && <p className="m-0 px-6 pt-5 text-center text-[12px] leading-relaxed text-muted">{t.simulatedNote}</p>}
        </div>
      )}
    </div>
  );
}
