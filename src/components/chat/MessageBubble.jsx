import React from "react";
import { motion } from "framer-motion";
import { Check, CornerUpLeft, Eye, FileText, Mic, Pin } from "lucide-react";
import {
  ME, hasVoted, isMine, pollTotals, reactionList, timeOf,
} from "../../lib/chat/chatModel";
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
                  {mine && <Check className="w-2.5 h-2.5 text-[#844783] stroke-[4]" />}
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

export default function MessageBubble({
  message, chat, replyTarget, grouped, isRtl, t, selected, selectionMode,
  onSelect, onLongPress, onReact, onVote, onJumpToReply,
}) {
  const mine = isMine(message);
  const isChannel = chat.type === "channel";
  const showSender = !mine && !grouped && chat.type !== "private";
  const reactions = reactionList(message);

  if (message.kind === "system") {
    return (
      <div className="flex justify-center py-1">
        <span className="px-3 py-1 rounded-full bg-white/[0.06] text-[10px] font-bold text-neutral-400">
          {message.text}
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
      className={`flex ${align} px-3 ${grouped ? "mt-0.5" : "mt-2"} ${selected ? "bg-[#844783]/15 -mx-3 px-6 py-0.5" : ""}`}
    >
      <div className="flex items-end gap-1.5 max-w-[85%]">
        <div
          onPointerDown={startPress}
          onPointerUp={endPress}
          onPointerLeave={endPress}
          onClick={() => (selectionMode ? onSelect(message.id) : null)}
          onContextMenu={(e) => { e.preventDefault(); onLongPress(message); }}
          className={`relative ${isSticker ? "" : "px-3 py-2 rounded-2xl"} ${
            isSticker
              ? ""
              : mine && !isChannel
                ? "bg-[#844783] text-white rounded-br-md"
                : "bg-[#1c1c1f] text-white rounded-bl-md"
          } ${selectionMode ? "cursor-pointer" : ""}`}
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
            <span className="text-6xl leading-none block">{message.media?.emoji}</span>
          ) : message.kind === "poll" ? (
            <Poll message={message} t={t} onVote={onVote} />
          ) : message.kind === "voice" ? (
            <Voice message={message} t={t} />
          ) : message.kind === "photo" ? (
            <span
              className="block rounded-xl overflow-hidden"
              style={{ width: 200, height: 140, background: message.media?.gradient || "linear-gradient(135deg,#844783,#38bdf8)" }}
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
            <p className="text-sm font-medium whitespace-pre-wrap break-words leading-snug">{message.text}</p>
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
              <span className="text-[9px] font-bold text-white/50 tabular-nums">{timeOf(message.at)}</span>
              <Ticks message={message} />
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

        {selectionMode && (
          <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mb-1 ${
            selected ? "bg-[#844783] border-[#844783]" : "border-neutral-600"
          }`}>
            {selected && <Check className="w-3 h-3 text-white stroke-[4]" />}
          </span>
        )}
      </div>
    </motion.div>
  );
}
