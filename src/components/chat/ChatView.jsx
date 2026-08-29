import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock, Pin, Trash2, Forward, X } from "lucide-react";
import {
  ME, groupByDay, isGroupedWith, relativeTime, scheduledMessages,
} from "../../lib/chat/chatModel";
import { findUser } from "../../lib/chat/chatStore";
import { Avatar, NameBadges } from "./ChatBits";
import MessageBubble from "./MessageBubble";
import Composer from "./Composer";
import {
  ForwardSheet, MessageActionsSheet, PollSheet, ScheduleSheet,
} from "./ChatSheets";

const WAVEFORM = () => Array.from({ length: 22 }, () => 20 + Math.random() * 80);

export default function ChatView({ store, chat, isRtl, t, onBack }) {
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [actionsFor, setActionsFor] = useState(null);
  const [selection, setSelection] = useState([]);
  const [sheet, setSheet] = useState(null); // "forward" | "poll" | "schedule"
  const [toast, setToast] = useState("");
  const endRef = useRef(null);

  const messages = store.messagesOf(chat.id);
  const byId = useMemo(() => Object.fromEntries(messages.map((m) => [m.id, m])), [messages]);
  const rows = useMemo(() => groupByDay(messages), [messages]);
  const scheduled = scheduledMessages(store.messages, chat.id);
  const pinned = chat.pinnedMessageId ? byId[chat.pinnedMessageId] : null;

  const peer = chat.type === "private" && chat.id !== "saved"
    ? findUser(chat.members.find((m) => m !== ME))
    : null;
  const typingUser = store.typing[chat.id];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, typingUser]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(""), 1600);
    return () => clearTimeout(id);
  }, [toast]);

  const subtitle = typingUser
    ? t.typing
    : chat.type === "channel"
      ? `${chat.subscribers.toLocaleString()} ${t.subscribers}`
      : chat.type === "group"
        ? `${chat.members.length} ${t.members}`
        : peer?.online
          ? t.online
          : peer?.lastSeen
            ? `${t.lastSeen} ${relativeTime(peer.lastSeen, t)}`
            : "";

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
  };

  const attach = (kind) => {
    if (kind === "poll") { setSheet("poll"); return; }
    if (kind === "photo") {
      store.send(chat.id, { kind: "photo", media: { emoji: "🏋️", gradient: "linear-gradient(135deg,#844783,#e0567d)" } });
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

  return (
    <div className="w-full min-h-[100dvh] bg-black text-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/95 backdrop-blur border-b border-white/10">
        {selectionMode ? (
          <div className="flex items-center gap-2 px-3 h-14">
            <button type="button" onClick={() => setSelection([])} aria-label={t.cancel}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-300 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <span className="flex-1 text-sm font-black text-white">
              {selection.length} {t.selected}
            </span>
            <button type="button" onClick={() => setSheet("forward")} aria-label={t.forward}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-300 hover:text-white">
              <Forward className="w-5 h-5" />
            </button>
            <button type="button" aria-label={t.deleteMessage}
              onClick={() => { store.deleteMessages(selection); setSelection([]); }}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-rose-400">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 h-14">
            <button type="button" onClick={onBack} aria-label={t.close}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-300 hover:text-white shrink-0">
              <ArrowLeft className={`w-5 h-5 ${isRtl ? "rotate-180" : ""}`} />
            </button>
            <Avatar chat={chat} user={peer} size={38} />
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-1">
                <span className="text-sm font-black text-white truncate">
                  {isRtl ? chat.titleFa || chat.title : chat.title}
                </span>
                <NameBadges verified={chat.verified} premium={chat.premium || peer?.premium} size={13} />
              </span>
              <span className={`block text-[10px] font-bold truncate ${
                typingUser ? "text-[#c07dbf]" : peer?.online ? "text-emerald-400" : "text-neutral-500"
              }`}>
                {subtitle}
              </span>
            </span>
          </div>
        )}

        {pinned && !selectionMode && (
          <button type="button" onClick={() => store.pinMessage(chat.id, pinned.id)}
            className="w-full flex items-center gap-2 px-3 py-2 border-t border-white/10 bg-black/50 text-start">
            <Pin className="w-3.5 h-3.5 text-[#c07dbf] shrink-0" />
            <span className="min-w-0">
              <span className="block text-[9px] font-black text-[#c07dbf] uppercase tracking-wider">{t.pinnedMessage}</span>
              <span className="block text-[11px] text-neutral-300 truncate">{pinned.text || t.photo}</span>
            </span>
          </button>
        )}

        {scheduled.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 border-t border-white/10 bg-amber-500/10">
            <Clock className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-black text-amber-300">
              {scheduled.length} {t.scheduledCount}
            </span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 py-3">
        {rows.map((row, i) => {
          if (row.separator) {
            return (
              <div key={row.id} className="flex justify-center my-3">
                <span className="px-2.5 py-1 rounded-full bg-white/[0.07] text-[10px] font-black text-neutral-400">
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
              isRtl={isRtl} t={t}
              selected={selection.includes(row.id)}
              selectionMode={selectionMode}
              onSelect={toggleSelect}
              onLongPress={(m) => (selectionMode ? toggleSelect(m.id) : setActionsFor(m))}
              onReact={store.react}
              onVote={(i2) => store.vote(row.id, i2)}
              onJumpToReply={() => {}}
            />
          );
        })}

        {typingUser && (
          <div className="flex items-center gap-2 px-4 py-2">
            <Avatar user={findUser(typingUser)} size={24} showStatus={false} />
            <span className="flex gap-1 px-3 py-2 rounded-2xl bg-[#1c1c1f]">
              {[0, 1, 2].map((d) => (
                <span key={d} className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-bounce"
                  style={{ animationDelay: `${d * 0.15}s` }} />
              ))}
            </span>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Composer — channels are broadcast-only unless you run them. */}
      {chat.type === "channel" && !chat.admins.includes(ME) ? (
        <div className="sticky bottom-0 bg-black/95 backdrop-blur border-t border-white/10 px-4 py-3 text-center">
          <span className="text-xs font-black text-neutral-500">
            {chat.muted ? t.unmute : t.mute}
          </span>
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
          <span className="px-4 py-2 rounded-full bg-white/15 backdrop-blur text-xs font-black text-white">{toast}</span>
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
