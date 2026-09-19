import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ChevronLeft, Clock, Forward, Pin, Search, Trash2, X } from "lucide-react";
import {
  ME, groupByDay, isGroupedWith, relativeTime, scheduledMessages,
} from "../../lib/chat/chatModel";
import { findUser } from "../../lib/chat/chatStore";
import { Avatar, NameBadges } from "./ChatBits";
import MessageBubble from "./MessageBubble";
import Composer from "./Composer";
import { TG } from "../../lib/chat/extras";
import {
  ForwardSheet, MessageActionsSheet, PollSheet, ScheduleSheet,
} from "./ChatSheets";

const WAVEFORM = () => Array.from({ length: 22 }, () => 20 + Math.random() * 80);

/** A frosted pill floating over the wallpaper, the iOS navigation-bar idiom. */
const glass = { background: TG.glass, boxShadow: "0 1px 6px rgba(0,0,0,.08)" };

export default function ChatView({ store, chat, isRtl, t, onBack, onOpenProfile, searching = false, onSearchClose, onBotAction, blocked = false, onUnblock }) {
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [actionsFor, setActionsFor] = useState(null);
  const [selection, setSelection] = useState([]);
  const [sheet, setSheet] = useState(null); // "forward" | "poll" | "schedule"
  const [translateAll, setTranslateAll] = useState(false);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const endRef = useRef(null);

  const all = store.messagesOf(chat.id);
  const byId = useMemo(() => Object.fromEntries(all.map((m) => [m.id, m])), [all]);
  const q = searching ? query.trim().toLowerCase() : "";
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

  useEffect(() => {
    if (!q) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [all.length, typingUser, q]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(""), 1600);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => { if (!searching) setQuery(""); }, [searching]);

  const subtitle = typingUser
    ? t.typing
    : chat.type === "bot"
      ? t.botSub
    : chat.type === "channel"
      ? `${chat.subscribers.toLocaleString()} ${t.subscribers}`
      : chat.type === "group"
        ? `${chat.members.length} ${t.members}`
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
      store.send(chat.id, { kind: "photo", media: { emoji: "🏋️", gradient: "linear-gradient(135deg,#3390ec,#e0567d)" } });
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
  const round = "w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-xl text-white shrink-0";
  const canProfile = chat.id !== "saved";

  return (
    <div className="w-full min-h-[100dvh] text-white flex flex-col tg-wallpaper">
      {/* Navigation bar: frosted pills over the wallpaper */}
      <div className="sticky top-0 z-30 px-2 pt-2 pb-1 space-y-1.5">
        {selectionMode ? (
          <div className="flex items-center gap-2 h-11 px-2 rounded-full backdrop-blur-xl" style={glass}>
            <button type="button" onClick={() => setSelection([])} aria-label={t.cancel}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white">
              <X className="w-5 h-5" />
            </button>
            <span className="flex-1 text-[15px] font-semibold text-white">{selection.length} {t.selected}</span>
            <button type="button" onClick={() => setSheet("forward")} aria-label={t.forward}
              className="w-9 h-9 rounded-full flex items-center justify-center" style={{ color: TG.accent }}>
              <Forward className="w-5 h-5" />
            </button>
            <button type="button" aria-label={t.deleteMessage}
              onClick={() => { store.deleteMessages(selection); setSelection([]); }}
              className="w-9 h-9 rounded-full flex items-center justify-center text-rose-400">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ) : searching ? (
          <div className="flex items-center gap-2 h-11 ps-3 pe-1 rounded-full backdrop-blur-xl" style={glass}>
            <Search className="w-4 h-4 shrink-0" style={{ color: TG.muted }} />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.searchMessages}
              aria-label={t.searchMessages}
              className="flex-1 min-w-0 bg-transparent text-[15px] text-white placeholder:text-neutral-500 focus:outline-none" />
            {q && <span className="text-[12px] shrink-0" style={{ color: TG.muted }}>{messages.length} {t.results}</span>}
            <button type="button" onClick={onSearchClose} aria-label={t.close}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white"><X className="w-5 h-5" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button type="button" onClick={onBack} aria-label={t.backToApp} className={round} style={glass}>
              <ChevronLeft className={`w-6 h-6 ${isRtl ? "rotate-180" : ""}`} />
            </button>
            <div className="flex-1 flex justify-center min-w-0">
              <button type="button" onClick={canProfile ? onOpenProfile : undefined} aria-label={t.infoLabel}
                className="max-w-full px-4 py-1 rounded-full backdrop-blur-xl text-center" style={glass}>
                <span className="flex items-center justify-center gap-1">
                  <span className="text-[15px] font-semibold text-white truncate leading-[19px]">
                    {isRtl ? chat.titleFa || chat.title : chat.title}
                  </span>
                  <NameBadges verified={chat.verified} premium={chat.premium || peer?.premium} size={13} />
                </span>
                {subtitle && (
                  <span className="block text-[12px] leading-[15px] truncate" style={{ color: subtitleLive ? TG.accent : TG.muted }}>
                    {subtitle}
                  </span>
                )}
              </button>
            </div>
            <button type="button" onClick={canProfile ? onOpenProfile : undefined} aria-label={t.infoLabel} className="shrink-0 rounded-full" style={{ boxShadow: "0 1px 6px rgba(0,0,0,.12)" }}>
              <Avatar chat={chat} user={peer} size={40} showStatus={false} />
            </button>
          </div>
        )}

        {pinned && !selectionMode && !searching && (
          <button type="button" onClick={() => store.pinMessage(chat.id, pinned.id)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-2xl backdrop-blur-xl text-start" style={glass}>
            <span className="w-0.5 h-7 rounded-full shrink-0" style={{ background: TG.accent }} />
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-semibold" style={{ color: TG.accent }}>{t.pinnedMessage}</span>
              <span className="block text-[13px] text-white truncate">{pinned.text || t.photo}</span>
            </span>
            <Pin className="w-4 h-4 shrink-0" style={{ color: TG.accent }} />
          </button>
        )}

        {all.some((m) => m.translation && !m.deleted) && !selectionMode && !searching && (
          <button type="button" onClick={() => setTranslateAll((v) => !v)}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-2xl backdrop-blur-xl text-[13px] font-semibold"
            style={{ ...glass, color: TG.accent }}>
            🌐 {translateAll ? t.showOriginal : t.translateBar}
          </button>
        )}

        {scheduled.length > 0 && (
          <div className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-2xl backdrop-blur-xl" style={glass}>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[12px] font-semibold text-amber-400">{scheduled.length} {t.scheduledCount}</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 py-2">
        {q && rows.length === 0 && (
          <p className="py-16 text-center text-[13px] font-medium text-white/80">{t.noMessagesFound}</p>
        )}
        {rows.map((row, i) => {
          if (row.separator) {
            return (
              <div key={row.id} className="flex justify-center my-3">
                <span className="px-2.5 py-1 rounded-full bg-black/20 backdrop-blur text-[12px] font-semibold text-white on-accent">
                  {new Date(row.at).toDateString() === new Date().toDateString()
                    ? t.today
                    : new Date(row.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </div>
            );
          }
          return (
            <MessageBubble
              key={row.id}
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
              onJumpToReply={() => {}}
              onButton={onBotAction}
            />
          );
        })}

        {typingUser && !q && (
          <div className="flex items-center gap-2 px-4 py-2">
            <Avatar user={findUser(typingUser)} size={24} showStatus={false} />
            <span className="flex gap-1 px-3 py-2 rounded-2xl" style={{ background: TG.inBubble }}>
              {[0, 1, 2].map((d) => (
                <span key={d} className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-bounce"
                  style={{ animationDelay: `${d * 0.15}s` }} />
              ))}
            </span>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Composer — channels are broadcast-only unless you run them; a blocked peer can't be written to. */}
      {blocked ? (
        <div className="sticky bottom-0 px-2 pt-1" style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
          <div className="w-full h-[46px] rounded-full backdrop-blur-xl flex items-center justify-between ps-4 pe-1.5" style={glass}>
            <span className="text-[14px] font-medium text-rose-400">🚫 {t.blockedBar}</span>
            <button type="button" onClick={onUnblock} className="h-9 px-4 rounded-full text-[14px] font-semibold" style={{ color: TG.accent }}>{t.unblock}</button>
          </div>
        </div>
      ) : chat.type === "channel" && !chat.admins.includes(ME) ? (
        <div className="sticky bottom-0 px-2 pt-1" style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
          <button type="button" onClick={() => store.toggleMuted(chat.id)}
            className="w-full h-[46px] rounded-full text-[15px] font-semibold backdrop-blur-xl"
            style={{ ...glass, color: TG.accent }}>
            {chat.muted ? t.unmute : t.mute}
          </button>
        </div>
      ) : (
        <Composer
          chat={chat}
          draft={chat.draft || ""}
          replyTo={replyTo}
          editing={editing}
          isRtl={isRtl} t={t}
          onChangeDraft={(v) => store.setDraft(chat.id, v)}
          onSend={send}
          onAttach={attach}
          onCancelContext={() => { setReplyTo(null); setEditing(null); store.setDraft(chat.id, ""); }}
          onOpenSchedule={() => setSheet("schedule")}
        />
      )}

      {toast && (
        <div className="fixed bottom-24 inset-x-0 flex justify-center z-40 pointer-events-none">
          <span className="px-4 py-2 rounded-full bg-neutral-900/90 backdrop-blur text-xs font-bold text-white">{toast}</span>
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
