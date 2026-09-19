import React from "react";
import { motion } from "framer-motion";
import { Check, CornerUpLeft, Eye, FileText, Mic, Pin } from "lucide-react";
import {
  ME, hasVoted, isMine, pollTotals, reactionList, timeOf,
} from "../../lib/chat/chatModel";
import { TG } from "../../lib/chat/extras";
import { Ticks, senderColor, senderName } from "./ChatBits";

/** The quoted block above a reply. */
function ReplyQuote({ message, isRtl, t, onJump }) {
  if (!message) return null;
  return (
    <button type="button" onClick={onJump}
      className="w-full flex gap-2 mb-1.5 px-2 py-1 rounded-lg bg-black/25 text-start hover:bg-black/40 transition-colors">
      <span className="w-0.5 rounded-full shrink-0" style={{ background: senderColor(message.senderId) }} />
      <span className="min-w-0">
        <span className="block text-[10px] font-black truncate" style={{ color: senderColor(message.senderId) }}>
          {senderName(message.senderId, isRtl)}
        </span>
        <span className="block text-[10px] text-neutral-400 truncate">
          {message.deleted ? t.deletedMessage : message.text || t.photo}
        </span>
      </span>
    </button>
  );
}

function Poll({ message, t, onVote }) {
  const { poll } = message;
  const voted = hasVoted(poll);
  const { voters } = pollTotals(poll);

  return (
    <div className="space-y-2 min-w-[220px]">
      <div>
        <p className="text-sm font-black text-white">{poll.question}</p>
        <span className="text-[9px] font-bold text-white/50 uppercase tracking-wide">
          {poll.multiple ? t.multipleAnswers : t.anonymousPoll}
        </span>
      </div>

      <div className="space-y-1.5">
        {poll.options.map((opt, i) => {
          const mine = opt.votes.includes(ME);
          const share = voters ? Math.round((opt.votes.length / voters) * 100) : 0;
          return (
            <button key={i} type="button" onClick={() => onVote(i)}
              className="w-full text-start group">
              <span className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  mine ? "bg-white border-white" : "border-white/40 group-hover:border-white/70"
                }`}>
                  {mine && <Check className="w-2.5 h-2.5 text-[#3390ec] stroke-[4]" />}
                </span>
                <span className="flex-1 text-xs font-bold text-white truncate">{opt.text}</span>
                {voted && <span className="text-[10px] font-black text-white/70 tabular-nums shrink-0">{share}%</span>}
              </span>
              {voted && (
                <span className="block h-1 rounded-full bg-white/15 mt-1 overflow-hidden">
                  <motion.span className="block h-full rounded-full bg-white/70"
                    initial={{ width: 0 }} animate={{ width: `${share}%` }} transition={{ duration: 0.35 }} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <span className="block text-[9px] font-bold text-white/50">
        {voters ? `${voters} ${t.votes}` : t.noVotes}
      </span>
    </div>
  );
}

/** Static waveform — there is no recorder, so the bars are decoration. */
function Voice({ message, t }) {
  const bars = message.voice?.waveform || [];
  return (
    <div className="space-y-1.5 min-w-[180px]">
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <Mic className="w-4 h-4 text-white" />
        </span>
        <span className="flex items-end gap-[2px] h-7 flex-1" dir="ltr">
          {bars.map((h, i) => (
            <span key={i} className="flex-1 rounded-full bg-white/60" style={{ height: `${Math.max(h, 12)}%` }} />
          ))}
        </span>
        <span className="text-[10px] font-black text-white/70 tabular-nums shrink-0">
          {message.voice?.seconds ?? 0}s
        </span>
      </div>
      {message.voice?.transcript && (
        <p className="text-[11px] font-medium text-white/80 border-t border-white/15 pt-1.5">
          {message.voice.transcript}
        </p>
      )}
    </div>
  );
}

/** A crew's weekly goal: the bar, the number, and who put in what. */
function Challenge({ message, isRtl, t }) {
  const c = message.challenge;
  if (!c) return null;
  const kindLabel = c.kind === "volume" ? t.kindVolume : c.kind === "sessions" ? t.kindSessions : t.kindStreak;
  const unit = c.kind === "volume" ? t.volumeKg : c.kind === "sessions" ? t.sessionsLabel : "";
  return (
    <div className="space-y-2.5 min-w-[240px]">
      <div>
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-white/50">🎯 {t.challengeTitle}</span>
        <p className="text-[15px] font-semibold text-white">{kindLabel}</p>
      </div>
      <div className="flex items-baseline gap-1.5" dir="ltr">
        <span className="text-[26px] font-bold text-white tabular-nums leading-none">{c.value.toLocaleString()}</span>
        <span className="text-[13px] text-white/60 tabular-nums">/ {c.target.toLocaleString()} {unit}</span>
        <span className="ms-auto text-[13px] font-semibold" style={{ color: c.done ? "#1f9d4d" : "var(--tg-accent)" }}>{c.done ? `✓ ${t.challengeDone}` : `${c.pct}%`}</span>
      </div>
      <span className="block h-2 rounded-full bg-white/15 overflow-hidden">
        <motion.span className="block h-full rounded-full" style={{ background: c.done ? "#34c759" : "linear-gradient(90deg,#34c759,#2fa6ff)" }}
          initial={{ width: 0 }} animate={{ width: `${c.pct}%` }} transition={{ duration: 0.5 }} />
      </span>
      <div className="space-y-1">
        <span className="block text-[11px] font-semibold text-white/50">{t.contributions}</span>
        {c.contributions.map((row) => (
          <span key={row.id} className="flex items-center justify-between gap-2 text-[12px]">
            <span className="text-white truncate">{isRtl ? row.nameFa : row.nameEn}</span>
            <span className="text-white/70 tabular-nums shrink-0" dir="ltr">{c.kind === "streak" ? (row.value ? "🔥" : "—") : row.value.toLocaleString()}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function MessageBubble({
  message, chat, replyTarget, grouped, tail = true, isRtl, t, selected, selectionMode, translateAll,
  onSelect, onLongPress, onReact, onVote, onJumpToReply, onButton,
}) {
  const shown = (isRtl && message.textFa) || message.text;
  const mine = isMine(message);
  const isChannel = chat.type === "channel";
  const showSender = !mine && !grouped && chat.type !== "private" && chat.type !== "bot";
  const reactions = reactionList(message);

  if (message.kind === "system") {
    return (
      <div className="flex justify-center py-1">
        <span className="px-3 py-1 rounded-full bg-black/20 backdrop-blur text-[12px] font-semibold text-white on-accent text-center max-w-[85%]">
          {shown}
        </span>
      </div>
    );
  }

  const isSticker = message.kind === "sticker";
  const align = isChannel ? "justify-start" : mine ? "justify-end" : "justify-start";

  // A press-and-hold opens the action sheet; a plain tap toggles selection
  // once selection mode is on.
  let pressTimer = null;
  const startPress = () => { pressTimer = setTimeout(() => onLongPress(message), 420); };
  const endPress = () => { if (pressTimer) clearTimeout(pressTimer); };

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${align} px-3 ${grouped ? "mt-0.5" : "mt-2"} ${selected ? "bg-[#3390ec]/15 -mx-3 px-6 py-0.5" : ""}`}
    >
      <div className="flex items-end gap-1.5 max-w-[85%]">
        <div className="flex flex-col gap-1.5 min-w-0">
        <div
          onPointerDown={startPress}
          onPointerUp={endPress}
          onPointerLeave={endPress}
          onClick={() => (selectionMode ? onSelect(message.id) : null)}
          onContextMenu={(e) => { e.preventDefault(); onLongPress(message); }}
          className={`relative ${isSticker ? "pb-3" : `tg-bubble px-3 py-1.5 rounded-[18px] ${tail ? "tg-tail" : ""}`} ${
            isSticker
              ? ""
              : mine && !isChannel
                ? `tg-out text-white ${tail ? "rounded-ee-[6px]" : ""}`
                : `tg-in text-white ${tail ? "rounded-es-[6px]" : ""}`
          } ${selectionMode ? "cursor-pointer" : ""}`}
          style={!isSticker
            ? { background: mine && !isChannel ? TG.outBubble : TG.inBubble }
            : undefined}
        >
          {showSender && (
            <span className="block text-[11px] font-black mb-0.5" style={{ color: senderColor(message.senderId) }}>
              {senderName(message.senderId, isRtl)}
            </span>
          )}

          {message.forwardFrom && (
            <span className="flex items-center gap-1 mb-1 text-[10px] font-bold text-white/60">
              <CornerUpLeft className="w-3 h-3 scale-x-[-1]" />
              {t.forwardedFrom} {senderName(message.forwardFrom.senderId, isRtl)}
            </span>
          )}

          {message.replyTo && (
            <ReplyQuote message={replyTarget} isRtl={isRtl} t={t} onJump={() => onJumpToReply(message.replyTo)} />
          )}

          {message.deleted ? (
            <p className="text-xs italic text-white/50">{t.deletedMessage}</p>
          ) : isSticker ? (
            <>
              <span className="text-7xl leading-none block">{message.media?.emoji}</span>
              <span className="absolute bottom-0 end-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur text-[10px] font-semibold text-white on-accent" dir="ltr">
                {timeOf(message.at)}
                <Ticks message={message} color="#fff" className="w-3.5 h-3.5" />
              </span>
            </>
          ) : message.kind === "challenge" ? (
            <Challenge message={message} isRtl={isRtl} t={t} />
          ) : message.kind === "poll" ? (
            <Poll message={message} t={t} onVote={onVote} />
          ) : message.kind === "voice" ? (
            <Voice message={message} t={t} />
          ) : message.kind === "photo" ? (
            <span
              className="block rounded-xl overflow-hidden"
              style={{ width: 200, height: 140, background: message.media?.gradient || "linear-gradient(135deg,#3390ec,#38bdf8)" }}
            >
              <span className="w-full h-full flex items-center justify-center text-5xl">
                {message.media?.emoji || "🏋️"}
              </span>
            </span>
          ) : message.kind === "file" ? (
            <span className="flex items-center gap-2.5 min-w-[180px]">
              <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-black truncate">{message.media?.name}</span>
                <span className="block text-[10px] font-bold text-white/60">{message.media?.size}</span>
              </span>
            </span>
          ) : (
            <>
              <p className="text-[16px] font-normal whitespace-pre-wrap break-words leading-[21px]" dir="auto">
                {(translateAll || message.showTranslation) && message.translation
                  ? message.translation
                  : shown}
              </p>
              {(translateAll || message.showTranslation) && message.translation && (
                <span className="block text-[9px] font-bold text-white/50 mt-0.5">🌐 {t.translated}</span>
              )}
            </>
          )}

          {/* meta line */}
          {!isSticker && (
            <span className="flex items-center justify-end gap-1 mt-0.5 -mb-0.5" dir="ltr">
              {message.pinned && <Pin className="w-3 h-3 text-white/50" />}
              {isChannel && message.views > 0 && (
                <span className="flex items-center gap-0.5 text-[9px] font-bold text-white/50">
                  <Eye className="w-3 h-3" /> {message.views.toLocaleString()}
                </span>
              )}
              {message.editedAt && <span className="text-[9px] font-bold text-white/50">{t.edited}</span>}
              <span className="text-[11px] font-medium text-white/50 tabular-nums">{timeOf(message.at)}</span>
              <Ticks message={message} color={message.status === "read" ? TG.accent : undefined} />
            </span>
          )}

          {/* reactions */}
          {reactions.length > 0 && (
            <span className="flex flex-wrap gap-1 mt-1.5">
              {reactions.map((r) => (
                <button key={r.emoji} type="button"
                  onClick={(e) => { e.stopPropagation(); onReact(message.id, r.emoji); }}
                  className={`px-1.5 h-6 rounded-full text-[11px] font-black flex items-center gap-1 transition-all ${
                    r.mine ? "bg-white/25 ring-1 ring-white/40" : "bg-black/25 hover:bg-black/40"
                  }`}>
                  <span>{r.emoji}</span>
                  <span className="tabular-nums">{r.count}</span>
                </button>
              ))}
            </span>
          )}
        </div>

        {/* inline keyboard, Telegram-bot style */}
        {message.buttons && !message.deleted && (
          <div className="flex flex-col gap-1.5 w-[min(78vw,320px)]">
            {message.buttons.map((rowButtons, ri) => (
              <div key={ri} className="flex gap-1.5">
                {rowButtons.map((btn) => (
                  <button key={btn.id} type="button" onClick={() => onButton?.(btn.id)}
                    className="flex-1 min-h-[40px] px-3 rounded-xl backdrop-blur-xl text-[14px] font-medium leading-tight active:scale-[0.98] transition-transform"
                    style={{ background: "var(--tg-glass)", color: "var(--tg-accent)", boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
                    {btn.name ? `${t[btn.label] || btn.label} ${btn.name}` : t[btn.label] || btn.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
        </div>

        {selectionMode && (
          <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mb-1 ${
            selected ? "bg-[#3390ec] border-[#3390ec]" : "border-neutral-600"
          }`}>
            {selected && <Check className="w-3 h-3 text-white stroke-[4]" />}
          </span>
        )}
      </div>
    </motion.div>
  );
}
