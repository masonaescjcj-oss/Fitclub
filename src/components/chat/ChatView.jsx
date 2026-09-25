import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Ban, Bell, BellOff, ChevronDown, Clock, Forward, Languages, Pin, Search, Trash2, X,
} from "lucide-react";
import {
  ME, groupByDay, isGroupedWith, relativeTime, scheduledMessages,
} from "../../lib/chat/chatModel";
import { findUser } from "../../lib/chat/chatStore";
import { Avatar, NameBadges } from "./ChatBits";
import MessageBubble from "./MessageBubble";
import Composer from "./Composer";
import { Button, Empty, IconButton, Label, cx, num } from "../ui/kit";
import {
  ForwardSheet, MessageActionsSheet, PollSheet, ScheduleSheet,
} from "./ChatSheets";

const WAVEFORM = () => Array.from({ length: 22 }, () => 20 + Math.random() * 80);

/** How far from the end the conversation may drift before the jump-down button shows. */
const NEAR_END = 240;

export default function ChatView({ store, chat, isRtl, t, onBack, onOpenProfile, searching = false, onSearchClose, onBotAction, blocked = false, onUnblock, onMention, jumpTo = null, onJumped }) {
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [actionsFor, setActionsFor] = useState(null);
  const [selection, setSelection] = useState([]);
  const [sheet, setSheet] = useState(null); // "forward" | "poll" | "schedule"
  const [translateAll, setTranslateAll] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [flash, setFlash] = useState(null); // message id lit up after a jump
  const [searchOpen, setSearchOpen] = useState(false); // the header's own search button
  const [nearEnd, setNearEnd] = useState(true);
  const endRef = useRef(null);
  const bubbleRefs = useRef({});

  // Search opens from the profile (the `searching` prop) or from the header here.
  const isSearching = searching || searchOpen;
  const closeSearch = () => { setSearchOpen(false); onSearchClose?.(); };

  const all = store.messagesOf(chat.id);
  const byId = useMemo(() => Object.fromEntries(all.map((m) => [m.id, m])), [all]);
  const q = isSearching ? query.trim().toLowerCase() : "";
  const messages = useMemo(
    () => (q ? all.filter((m) => (m.text || "").toLowerCase().includes(q) || (m.translation || "").toLowerCase().includes(q)) : all),
    [all, q]
  );
  const rows = useMemo(() => groupByDay(messages), [messages]);
  const scheduled = scheduledMessages(store.messages, chat.id);
  const pinned = chat.pinnedMessageId ? byId[chat.pinnedMessageId] : null;

  const peer = chat.type === "private" && chat.id !== "saved"
    ? findUser(chat.members.find((m) => m !== ME))
    : null;
  const typingUser = store.typing[chat.id];
  // Who can be @mentioned here: everyone else in a group or channel.
  const mentionable = chat.type === "group" || chat.type === "channel" ? chat.members.filter((id) => id !== ME).map((id) => findUser(id)) : [];

  /** Scrolls a message into view and lights it up; the reply quote, the pinned bar, the @ badge and notifications all land here. */
  const jump = (id) => {
    const el = bubbleRefs.current[id];
    if (!el) return false;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlash(id);
    setTimeout(() => setFlash((f) => (f === id ? null : f)), 1600);
    return true;
  };

  // Opening a chat lands on the newest message at once; later arrivals glide in.
  const landed = useRef(false);
  useEffect(() => {
    if (jumpTo) { const id = requestAnimationFrame(() => { jump(jumpTo); onJumped?.(); }); landed.current = true; return () => cancelAnimationFrame(id); }
    if (!q) endRef.current?.scrollIntoView({ behavior: landed.current ? "smooth" : "auto", block: "end" });
    landed.current = true;
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all.length, typingUser, q, jumpTo]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(""), toast.length > 40 ? 2600 : 1600);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => { if (!isSearching) setQuery(""); }, [isSearching]);

  // The page scrolls the window; the jump-down button shows once the end is out of reach.
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      setNearEnd(doc.scrollHeight - (window.scrollY + window.innerHeight) < NEAR_END);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);

  // Whatever lands while the conversation is on screen has been seen.
  const newest = all.length ? all[all.length - 1].at : null;
  useEffect(() => {
    if (newest && (!chat.lastReadAt || newest > chat.lastReadAt)) store.markRead(chat.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newest, chat.id]);

  const n = (v) => num(v, isRtl);
  const sep = isRtl ? "، " : " · ";
  const onlineCount = chat.type === "group" ? chat.members.filter((id) => id !== ME && findUser(id).online).length : 0;
  const subtitle = typingUser
    ? t.typing
    : chat.type === "bot"
      ? t.botSub
    : chat.type === "channel"
      ? `${n(chat.subscribers.toLocaleString("en-US"))} ${t.subscribers}`
      : chat.type === "group"
        ? `${n(chat.members.length)} ${t.members}${onlineCount ? `${sep}${n(onlineCount)} ${t.online}` : ""}`
        : peer?.online
          ? t.online
          : peer?.lastSeen
            ? `${t.lastSeen} ${relativeTime(peer.lastSeen, t)}`
            : chat.id === "saved" ? "" : t.lastSeenRecently;
  const subtitleLive = !!typingUser || (peer?.online && chat.type === "private");

  const send = (patch) => {
    if (editing) {
      store.editMessage(editing.id, patch.text);
      setEditing(null);
      store.setDraft(chat.id, "");
      return;
    }
    store.send(chat.id, { ...patch, replyTo: replyTo?.id || null });
    setReplyTo(null);
    store.setDraft(chat.id, "");
    // The bot doesn't read free text; it points back at its buttons.
    if (chat.type === "bot" && patch.text) setTimeout(() => onBotAction?.("fallback"), 600);
  };

  const attach = (kind) => {
    if (kind === "poll") { setSheet("poll"); return; }
    if (kind === "photo") {
      store.send(chat.id, { kind: "photo", media: { emoji: "🏋️" } });
    } else if (kind === "file") {
      store.send(chat.id, { kind: "file", media: { name: "training-notes.pdf", size: "184 KB" } });
    } else if (kind === "voice") {
      store.send(chat.id, {
        kind: "voice",
        voice: { seconds: 8 + Math.floor(Math.random() * 20), waveform: WAVEFORM(), transcript: null },
      });
    }
  };

  const toggleSelect = (id) =>
    setSelection((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const selectionMode = selection.length > 0;
  const canProfile = chat.id !== "saved";
  const Back = isRtl ? ArrowRight : ArrowLeft;
  const title = isRtl ? chat.titleFa || chat.title : chat.title;
  const dayLabel = (at) => (new Date(at).toDateString() === new Date().toDateString()
    ? t.today
    : new Date(at).toLocaleDateString(isRtl ? "fa-IR" : "en-US", { month: "short", day: "numeric" }));

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="ui tg-wallpaper w-full min-h-[100dvh] flex flex-col text-ink">
      {/* Navigation bar */}
      <header className="sticky top-0 z-30 bg-canvas/90 backdrop-blur-xl border-b border-line/70 pt-[calc(env(safe-area-inset-top)+6px)]">
        <div className="flex items-center gap-2 px-4 pt-1 pb-2.5 min-h-[58px]">
          {selectionMode ? (
            <>
              <IconButton label={t.cancel} onClick={() => setSelection([])}><X className="w-5 h-5" strokeWidth={2} /></IconButton>
              <span className="flex-1 min-w-0 truncate text-[17px] font-bold">{n(selection.length)} {t.selected}</span>
              <IconButton label={t.forward} onClick={() => setSheet("forward")}><Forward className="w-5 h-5" strokeWidth={2} /></IconButton>
              <IconButton label={t.deleteMessage} className="!text-alert"
                onClick={() => { store.deleteMessages(selection); setSelection([]); }}>
                <Trash2 className="w-5 h-5" strokeWidth={2} />
              </IconButton>
            </>
          ) : isSearching ? (
            <>
              <label className="flex-1 min-w-0 h-11 rounded-full bg-card flex items-center gap-2 ps-4 pe-3 focus-within:ring-2 focus-within:ring-inset focus-within:ring-ink">
                <Search className="w-[18px] h-[18px] shrink-0 text-muted" strokeWidth={2} />
                <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.searchMessages}
                  aria-label={t.searchMessages}
                  className="flex-1 min-w-0 h-full border-0 bg-transparent text-[15px] text-ink placeholder:text-muted outline-none focus-visible:outline-none" />
                {q && <span className="text-[12px] text-muted shrink-0">{n(messages.length)} {t.results}</span>}
              </label>
              <IconButton label={t.close} onClick={closeSearch}><X className="w-5 h-5" strokeWidth={2} /></IconButton>
            </>
          ) : (
            <>
              <IconButton label={t.backToApp} onClick={onBack}><Back className="w-5 h-5" strokeWidth={2} /></IconButton>
              <button type="button" onClick={canProfile ? onOpenProfile : undefined} aria-label={t.infoLabel}
                className="flex-1 min-w-0 flex items-center gap-2.5 ps-0.5 text-start bg-transparent border-0 p-0 cursor-pointer">
                <Avatar chat={chat} user={peer} size={40} showStatus={false} />
                <span className="min-w-0 flex flex-col gap-0.5">
                  <span className="flex items-center gap-1 min-w-0">
                    <span className="text-[17px] font-bold leading-tight truncate">{title}</span>
                    <NameBadges verified={chat.verified} premium={chat.premium || peer?.premium} size={15} />
                  </span>
                  {subtitle && (
                    <span className={cx("text-[13px] leading-tight truncate", subtitleLive ? "text-ink font-semibold" : "text-muted")}>
                      {subtitle}
                    </span>
                  )}
                </span>
              </button>
              <IconButton label={t.searchMessages} onClick={() => setSearchOpen(true)}>
                <Search className="w-5 h-5" strokeWidth={2} />
              </IconButton>
            </>
          )}
        </div>

        {!selectionMode && !isSearching && (pinned || scheduled.length > 0 || all.some((m) => m.translation && !m.deleted)) && (
          <div className="px-3 pb-2.5 flex flex-col gap-1.5">
            {pinned && (
              <div className="flex items-center rounded-2xl bg-card">
                <button type="button" onClick={() => jump(pinned.id)}
                  className="flex-1 min-w-0 flex items-center gap-3 ps-3 pe-1 py-2 text-start bg-transparent border-0 cursor-pointer">
                  <span aria-hidden="true" className="w-[3px] self-stretch rounded-full bg-inv shrink-0" />
                  <span className="min-w-0 flex flex-col">
                    <span className="text-[12px] font-bold">{t.pinnedMessage}</span>
                    <span dir="auto" className="text-[13px] text-muted truncate text-start">{pinned.text || t.photo}</span>
                  </span>
                </button>
                <IconButton label={t.unpinMessage} tone="ghost" onClick={() => store.pinMessage(chat.id, pinned.id)} className="!text-muted">
                  <Pin className="w-[18px] h-[18px]" strokeWidth={2} />
                </IconButton>
              </div>
            )}

            {all.some((m) => m.translation && !m.deleted) && (
              <button type="button" onClick={() => setTranslateAll((v) => !v)}
                className="h-10 w-full rounded-full bg-card flex items-center justify-center gap-2 text-[13px] font-semibold text-ink border-0 cursor-pointer">
                <Languages className="w-4 h-4" strokeWidth={2} />
                {translateAll ? t.showOriginal : t.translateBar}
              </button>
            )}

            {scheduled.length > 0 && (
              <div className="h-9 w-full rounded-full bg-card flex items-center justify-center gap-1.5 text-[12px] font-semibold">
                <Clock className="w-3.5 h-3.5" strokeWidth={2} />
                {n(scheduled.length)} {t.scheduledCount}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Messages */}
      <div role="log" aria-label={title} className="flex-1 pt-2 pb-3">
        {q && rows.length === 0 && (
          <Empty icon={<Search className="w-6 h-6" strokeWidth={2} />} title={t.noMessagesFound} />
        )}
        {rows.map((row, i) => {
          if (row.separator) {
            return (
              <div key={row.id} className="flex justify-center my-3">
                <Label className="h-[26px] px-3 rounded-full bg-line inline-flex items-center">{dayLabel(row.at)}</Label>
              </div>
            );
          }
          return (
            <div key={row.id} ref={(el) => { bubbleRefs.current[row.id] = el; }} className={flash === row.id ? "tg-flash" : ""} data-message-id={row.id}>
              <MessageBubble
                message={row}
                chat={chat}
                replyTarget={row.replyTo ? byId[row.replyTo] : null}
                grouped={isGroupedWith(rows[i - 1], row)}
                tail={!(rows[i + 1] && !rows[i + 1].separator && isGroupedWith(row, rows[i + 1]))}
                isRtl={isRtl} t={t}
                selected={selection.includes(row.id)}
                selectionMode={selectionMode}
                translateAll={translateAll}
                onSelect={toggleSelect}
                onLongPress={(m) => (selectionMode ? toggleSelect(m.id) : setActionsFor(m))}
                onReact={store.react}
                onVote={(i2) => store.vote(row.id, i2)}
                onJumpToReply={(id) => jump(id)}
                onButton={onBotAction}
                onMention={onMention}
              />
            </div>
          );
        })}

        {typingUser && !q && (
          <div className="flex items-end gap-2 px-3 mt-2.5" aria-live="polite" aria-label={t.typing}>
            <Avatar user={findUser(typingUser)} size={chat.type === "group" ? 32 : 26} showStatus={false} />
            <span className="flex items-center gap-1 h-10 px-4 rounded-[20px] rounded-es-[6px] bg-card">
              {[0, 1, 2].map((d) => (
                <span key={d} className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce"
                  style={{ animationDelay: `${d * 0.15}s` }} />
              ))}
            </span>
          </div>
        )}

      </div>

      {/* Footer: channels are broadcast-only unless you run them; a blocked peer can't be written to. */}
      <div className="sticky bottom-0 z-20 px-3 pt-3 pb-[max(10px,env(safe-area-inset-bottom))] bg-gradient-to-t from-canvas via-canvas/95 to-canvas/0">
        <AnimatePresence>
          {!nearEnd && !q && (
            <motion.div key="down" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              className="absolute bottom-full mb-1 end-3">
              <IconButton label={isRtl ? "رفتن به آخرین پیام" : "Jump to latest"} className="shadow-lift"
                onClick={() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })}>
                <ChevronDown className="w-5 h-5" strokeWidth={2} />
              </IconButton>
            </motion.div>
          )}
        </AnimatePresence>

        {blocked ? (
          <div className="w-full h-12 rounded-full bg-card flex items-center justify-between gap-2 ps-4 pe-1.5">
            <span className="min-w-0 inline-flex items-center gap-2 text-[14px] font-medium text-alert">
              <Ban className="w-4 h-4 shrink-0" strokeWidth={2} /><span className="truncate">{t.blockedBar}</span>
            </span>
            <Button tone="ink" size="sm" onClick={onUnblock}>{t.unblock}</Button>
          </div>
        ) : chat.type === "channel" && !chat.admins.includes(ME) ? (
          <Button tone="card" block onClick={() => store.toggleMuted(chat.id)}
            icon={chat.muted ? <Bell className="w-[18px] h-[18px]" strokeWidth={2} /> : <BellOff className="w-[18px] h-[18px]" strokeWidth={2} />}>
            {chat.muted ? t.unmute : t.mute}
          </Button>
        ) : (
          <Composer
            chat={chat}
            draft={chat.draft || ""}
            replyTo={replyTo}
            editing={editing}
            isRtl={isRtl} t={t}
            members={mentionable}
            onChangeDraft={(v) => store.setDraft(chat.id, v)}
            onSend={send}
            onAttach={attach}
            onCancelContext={() => { setReplyTo(null); setEditing(null); store.setDraft(chat.id, ""); }}
            onOpenSchedule={() => setSheet("schedule")}
          />
        )}
      </div>

      {/* The end of the page, below the footer, so scrolling here shows the last message above the composer. */}
      <div ref={endRef} aria-hidden="true" />

      {toast && (
        <div className="fixed bottom-28 inset-x-0 px-8 flex justify-center z-40 pointer-events-none">
          <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="px-4 py-2.5 rounded-3xl bg-inv text-on-inv text-[13px] font-semibold leading-snug text-center shadow-bar">
            {toast}
          </motion.span>
        </div>
      )}

      {/* Sheets */}
      <AnimatePresence>
        {actionsFor && (
          <MessageActionsSheet
            message={actionsFor} chat={chat} premium isRtl={isRtl} t={t}
            onReact={(e) => store.react(actionsFor.id, e)}
            onReply={() => { setReplyTo(actionsFor); setActionsFor(null); }}
            onForward={() => { setSelection([actionsFor.id]); setActionsFor(null); setSheet("forward"); }}
            onEdit={() => { setEditing(actionsFor); store.setDraft(chat.id, actionsFor.text); setActionsFor(null); }}
            onCopy={() => {
              navigator.clipboard?.writeText(actionsFor.text).catch(() => {});
              setToast(t.copied); setActionsFor(null);
            }}
            onTranslate={actionsFor.translation ? () => { store.toggleTranslate(actionsFor.id); setActionsFor(null); } : null}
            onTranscribe={actionsFor.kind === "voice" && !actionsFor.voice?.transcript
              ? () => { store.transcribeVoice(actionsFor.id); setActionsFor(null); }
              : null}
            onPin={() => { store.pinMessage(chat.id, actionsFor.id); setActionsFor(null); }}
            onSelect={() => { setSelection([actionsFor.id]); setActionsFor(null); }}
            onDelete={() => { store.deleteMessage(actionsFor.id, actionsFor.senderId === ME); setActionsFor(null); }}
            onClose={() => setActionsFor(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sheet === "forward" && (
          <ForwardSheet
            chats={store.chats.filter((c) => c.id !== chat.id)}
            count={selection.length} isRtl={isRtl} t={t}
            onPick={(toId) => { store.forwardMessages(selection, toId); setSelection([]); setSheet(null); setToast(t.forward); }}
            onClose={() => setSheet(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sheet === "poll" && (
          <PollSheet isRtl={isRtl} t={t}
            onCreate={(poll) => {
              store.send(chat.id, {
                kind: "poll",
                poll: { ...poll, quiz: false, options: poll.options.map((text) => ({ text, votes: [] })) },
              });
              setSheet(null);
            }}
            onClose={() => setSheet(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sheet === "schedule" && (
          <ScheduleSheet isRtl={isRtl} t={t}
            onSchedule={(mins) => {
              const when = new Date(Date.now() + mins * 60000).toISOString();
              store.send(chat.id, { text: (chat.draft || "").trim(), scheduledFor: when, at: when });
              store.setDraft(chat.id, "");
              setSheet(null);
            }}
            onClose={() => setSheet(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
