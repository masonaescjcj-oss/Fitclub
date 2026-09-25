import React from "react";
import { motion } from "framer-motion";
import { Check, CheckCheck, Eye, FileText, Flame, Forward, Languages, Pin, Play, Target } from "lucide-react";
import {
  ME, hasVoted, isMine, pollTotals, reactionList, timeOf,
} from "../../lib/chat/chatModel";
import { findUser } from "../../lib/chat/chatStore";
import { Avatar, senderName } from "./ChatBits";
import { Bar, Label, cx, num } from "../ui/kit";
import { splitMentions } from "../../lib/chat/mentions";

// One message in the conversation, Telegram's layout in Ink & Volt: white
// bubbles for others, ink bubbles for mine, radius 20 with a 6 px corner on
// the tail side, and reactions as pills on the paper under the bubble.

/* Member-name tones: grape and ochre, then three inline tones that index.css
   defines on .tg-wallpaper for light and night. */
const NAME_TONES = ["var(--ui-grape)", "var(--ui-ochre)", "var(--tg-name-pine, 28 120 88)", "var(--tg-name-sea, 30 94 158)", "var(--tg-name-berry, 168 52 118)"];

/**
 * A stable colour for a member's name. In a chat the members take the tones
 * in order, so the first five never share one; anyone else falls back to a hash.
 */
export function senderTone(userId, chat) {
  if (userId === ME) return "rgb(var(--ui-fg))";
  const others = (chat?.members || []).filter((id) => id !== ME);
  let i = others.indexOf(userId);
  if (i < 0) i = [...String(userId || "")].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return `rgb(${NAME_TONES[i % NAME_TONES.length]})`;
}

/** The clock time of a message, in Persian digits on Persian screens. */
export const clockOf = (iso, isRtl) =>
  (isRtl ? new Date(iso).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }) : timeOf(iso));

/** Delivery ticks on my own messages: one when sent, two when read. */
function Ticks({ message, className = "" }) {
  if (message.senderId !== ME) return null;
  const Icon = message.status === "read" ? CheckCheck : Check;
  return <Icon className={cx("w-[15px] h-[15px] shrink-0", message.status === "read" ? "opacity-100" : "opacity-60", className)} strokeWidth={2.2} />;
}

/** The quoted block above a reply; tapping it jumps to the original. */
function ReplyQuote({ message, chat, out, isRtl, t, onJump }) {
  if (!message) return null;
  const tone = out ? undefined : senderTone(message.senderId, chat);
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onJump(); }}
      className={cx("w-full flex gap-2 mt-1 mb-1.5 ps-2 pe-3 py-1.5 rounded-xl text-start border-0 cursor-pointer transition-colors",
        out ? "bg-on-inv/10 active:bg-on-inv/20" : "bg-sunk active:bg-line")}>
      <span className={cx("w-[3px] rounded-full shrink-0", out && "bg-on-inv/60")} style={tone ? { background: tone } : undefined} />
      <span className="min-w-0 flex flex-col">
        <span className="text-[12px] font-bold truncate" style={tone ? { color: tone } : undefined}>
          {senderName(message.senderId, isRtl)}
        </span>
        <span dir="auto" className={cx("text-[13px] truncate text-start", out ? "text-on-inv/70" : "text-muted")}>
          {message.deleted ? t.deletedMessage : message.text || t.photo}
        </span>
      </span>
    </button>
  );
}

function Poll({ message, out, isRtl, t, onVote }) {
  const { poll } = message;
  const voted = hasVoted(poll);
  const { voters } = pollTotals(poll);
  const sep = isRtl ? "، " : " · ";

  return (
    <div className="flex flex-col gap-2 w-[250px] max-w-full pt-0.5">
      <p className="m-0 text-[16px] font-bold leading-snug" dir="auto">{poll.question}</p>
      <Label className={cx(out && "!text-on-inv/60")}>
        {poll.multiple ? t.multipleAnswers : t.anonymousPoll}{sep}{voters ? `${num(voters, isRtl)} ${t.votes}` : t.noVotes}
      </Label>

      <div className="flex flex-col gap-1.5">
        {poll.options.map((opt, i) => {
          const mine = opt.votes.includes(ME);
          const share = voters ? Math.round((opt.votes.length / voters) * 100) : 0;
          return (
            <button key={i} type="button" aria-pressed={mine} onClick={(e) => { e.stopPropagation(); onVote(i); }}
              className={cx("relative h-10 rounded-xl overflow-hidden flex items-center justify-between gap-2 px-3 text-[14px] text-ink border-0 cursor-pointer text-start",
                out ? "bg-card" : "bg-sunk", mine ? "font-bold" : "font-semibold")}>
              {voted && (
                <motion.span aria-hidden="true" className={cx("absolute inset-y-0 start-0", mine ? "bg-accent dark:bg-accent/40" : "bg-line")}
                  initial={{ width: 0 }} animate={{ width: `${share}%` }} transition={{ duration: 0.35 }} />
              )}
              <span className="relative min-w-0 flex items-center gap-2">
                {!voted && <span aria-hidden="true" className="w-4 h-4 rounded-full ring-2 ring-inset ring-faint shrink-0" />}
                <span className="truncate" dir="auto">{opt.text}</span>
                {mine && <Check className="w-4 h-4 shrink-0" strokeWidth={2.6} />}
              </span>
              {voted && <span className={cx("relative shrink-0 tabular-nums", mine ? "text-ink" : "text-muted")}>{num(share, isRtl)}%</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Static waveform: there is no recorder, so the bars are decoration. */
function Voice({ message, out, isRtl }) {
  const bars = message.voice?.waveform || [];
  return (
    <div className="flex flex-col gap-1.5 w-[220px] max-w-full pt-0.5">
      <div className="flex items-center gap-2.5">
        <span className={cx("w-10 h-10 rounded-full flex items-center justify-center shrink-0",
          out ? "bg-on-inv text-inv" : "bg-jet text-accent dark:ring-1 dark:ring-inset dark:ring-line")}>
          <Play className="w-4 h-4 ms-0.5" fill="currentColor" strokeWidth={2} />
        </span>
        <span className="flex items-center gap-[2px] h-7 flex-1" dir="ltr" aria-hidden="true">
          {bars.map((h, i) => (
            <span key={i} className="flex-1 rounded-full bg-current opacity-40" style={{ height: `${Math.max(h, 14)}%` }} />
          ))}
        </span>
        <span className={cx("text-[12px] font-semibold tabular-nums shrink-0", out ? "text-on-inv/70" : "text-muted")}>
          {num(message.voice?.seconds ?? 0, isRtl)}{isRtl ? " ثانیه" : "s"}
        </span>
      </div>
      {message.voice?.transcript && (
        <p className={cx("m-0 pt-1.5 text-[13px] leading-snug border-t", out ? "border-on-inv/15 text-on-inv/85" : "border-hair text-ink/85")}>
          {message.voice.transcript}
        </p>
      )}
    </div>
  );
}

/** A crew's weekly goal: the bar, the number, and who put in what. */
function Challenge({ message, out, isRtl, t }) {
  const c = message.challenge;
  if (!c) return null;
  const kindLabel = c.kind === "volume" ? t.kindVolume : c.kind === "sessions" ? t.kindSessions : t.kindStreak;
  const unit = c.kind === "volume" ? t.volumeKg : c.kind === "sessions" ? t.sessionsLabel : "";
  const soft = out ? "text-on-inv/65" : "text-muted";
  return (
    <div className="flex flex-col gap-2.5 w-[260px] max-w-full pt-0.5">
      <div className="flex flex-col gap-1">
        <Label className={cx("inline-flex items-center gap-1.5", out && "!text-on-inv/60")}>
          <Target className="w-3.5 h-3.5" strokeWidth={2} />{t.challengeTitle}
        </Label>
        <p className="m-0 text-[15px] font-semibold">{kindLabel}</p>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-display font-extrabold text-[28px] leading-none tracking-[-0.03em] tabular-nums">{num(c.value.toLocaleString("en-US"), isRtl)}</span>
        <span className={cx("text-[13px] tabular-nums", soft)}>/ {num(c.target.toLocaleString("en-US"), isRtl)} {unit}</span>
        <span className="ms-auto inline-flex items-center gap-1 text-[13px] font-bold">
          {c.done ? <><Check className="w-4 h-4" strokeWidth={2.6} />{t.challengeDone}</> : `${num(c.pct, isRtl)}%`}
        </span>
      </div>
      <Bar value={c.pct / 100} height={8} color={out ? "bg-accent" : "bg-inv"} track={out ? "bg-on-inv/20" : "bg-line"} />
      <div className="flex flex-col gap-1">
        <span className={cx("text-[12px] font-semibold", soft)}>{t.contributions}</span>
        {c.contributions.map((row) => (
          <span key={row.id} className="flex items-center justify-between gap-2 text-[13px]">
            <span className="truncate">{isRtl ? row.nameFa : row.nameEn}</span>
            <span className={cx("tabular-nums shrink-0", soft)}>
              {c.kind === "streak" ? (row.value ? <Flame className="w-4 h-4" strokeWidth={2} /> : "—") : num(row.value.toLocaleString("en-US"), isRtl)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** A photo placeholder: the picture's emoji on a stable tone, as the seed data has no images. */
const PHOTO_TONES = ["bg-sand", "bg-sage", "bg-mist"];
const photoTone = (id) => PHOTO_TONES[[...String(id)].reduce((h, ch) => (h + ch.charCodeAt(0)) >>> 0, 0) % PHOTO_TONES.length];

export default function MessageBubble({
  message, chat, replyTarget, grouped, tail = true, isRtl, t, selected, selectionMode, translateAll,
  onSelect, onLongPress, onReact, onVote, onJumpToReply, onButton, onMention,
}) {
  const shown = (isRtl && message.textFa) || message.text;
  const mine = isMine(message);
  const isChannel = chat.type === "channel";
  const out = mine && !isChannel;
  const showSender = !mine && !grouped && chat.type !== "private" && chat.type !== "bot";
  // Groups show the sender's face beside the last bubble of their run, as Telegram does.
  const withAvatar = chat.type === "group" && !mine;
  const reactions = reactionList(message);

  if (message.kind === "system") {
    return (
      <div className="flex justify-center px-6 py-1.5">
        <span className="px-3 py-1 rounded-full bg-line text-[12.5px] font-medium leading-snug text-muted text-center max-w-full" dir="auto">
          {shown}
        </span>
      </div>
    );
  }

  const isSticker = message.kind === "sticker";
  const soft = out ? "text-on-inv/60" : "text-muted";

  // A press-and-hold opens the action sheet; a plain tap toggles selection
  // once selection mode is on.
  let pressTimer = null;
  const startPress = () => { pressTimer = setTimeout(() => onLongPress(message), 420); };
  const endPress = () => { if (pressTimer) clearTimeout(pressTimer); };

  // Radius 20; the tail side tightens where bubbles of one run meet and drops to 6 on the last one.
  const corners = isSticker ? "" : out
    ? cx(grouped && "rounded-se-[10px]", tail ? "rounded-ee-[6px]" : "rounded-ee-[10px]")
    : cx(grouped && "rounded-ss-[10px]", tail ? "rounded-es-[6px]" : "rounded-es-[10px]");

  const meta = (
    <span className={cx("flex justify-end mt-0.5 -mb-0.5 text-[11px] tabular-nums", soft)}>
      <span className="inline-flex items-center gap-1" dir="ltr">
        {message.pinned && <Pin className="w-3 h-3" strokeWidth={2} />}
        {isChannel && message.views > 0 && (
          <span className="inline-flex items-center gap-0.5">
            <Eye className="w-3.5 h-3.5" strokeWidth={2} /> {num(message.views.toLocaleString("en-US"), isRtl)}
          </span>
        )}
        {message.editedAt && <span dir="auto">{t.edited}</span>}
        <span>{clockOf(message.at, isRtl)}</span>
        <Ticks message={message} className={out ? "text-on-inv" : "text-ink"} />
      </span>
    </span>
  );

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => (selectionMode ? onSelect(message.id) : null)}
      className={cx("flex items-end gap-2 px-3 transition-colors", grouped ? "mt-1" : "mt-2.5",
        selectionMode && "cursor-pointer py-0.5", selected && "bg-accent/25")}
    >
      {selectionMode && (
        <span aria-hidden="true" className={cx("w-6 h-6 mb-1.5 rounded-full flex items-center justify-center shrink-0",
          selected ? "bg-jet text-accent dark:bg-accent dark:text-on-accent" : "ring-2 ring-inset ring-faint bg-card/60")}>
          {selected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
        </span>
      )}

      <div className={cx("flex-1 min-w-0 flex", out ? "justify-end" : "justify-start")}>
        <div className="flex items-end gap-2 max-w-[86%] min-w-0">
          {withAvatar && (tail
            ? <span className="mb-0.5 shrink-0"><Avatar user={findUser(message.senderId)} size={32} showStatus={false} /></span>
            : <span aria-hidden="true" className="w-8 shrink-0" />)}

          <div className={cx("flex flex-col gap-1.5 min-w-0", out ? "items-end" : "items-start")}>
            <div
              onPointerDown={startPress}
              onPointerUp={endPress}
              onPointerLeave={endPress}
              onContextMenu={(e) => { e.preventDefault(); onLongPress(message); }}
              className={cx("relative max-w-full",
                isSticker ? "pb-3" : cx("px-3.5 pt-2 pb-1.5 rounded-[20px]", out ? "bg-inv text-on-inv" : "bg-card text-ink"),
                corners, selectionMode && "cursor-pointer")}
            >
              {showSender && (
                <span className={cx("block text-[13px] font-bold leading-tight", isSticker ? "w-fit mb-1.5 px-2.5 py-1 rounded-full bg-card" : "mb-0.5")}
                  style={{ color: senderTone(message.senderId, chat) }}>
                  {senderName(message.senderId, isRtl)}
                </span>
              )}

              {message.forwardFrom && (
                <span className={cx("flex items-center gap-1 mb-1 text-[12px] font-medium", soft)}>
                  <Forward className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                  <span className="truncate">{t.forwardedFrom} <span className="font-semibold">{senderName(message.forwardFrom.senderId, isRtl)}</span></span>
                </span>
              )}

              {message.replyTo && (
                <ReplyQuote message={replyTarget} chat={chat} out={out} isRtl={isRtl} t={t} onJump={() => onJumpToReply(message.replyTo)} />
              )}

              {message.deleted ? (
                <p className={cx("m-0 text-[14px] italic", soft)}>{t.deletedMessage}</p>
              ) : isSticker ? (
                <>
                  <span className="text-7xl leading-none block">{message.media?.emoji}</span>
                  <span className="absolute bottom-0 end-0 flex items-center gap-1 h-5 px-2 rounded-full bg-card text-[11px] font-medium text-muted tabular-nums" dir="ltr">
                    {clockOf(message.at, isRtl)}
                    <Ticks message={message} className="text-ink" />
                  </span>
                </>
              ) : message.kind === "challenge" ? (
                <Challenge message={message} out={out} isRtl={isRtl} t={t} />
              ) : message.kind === "poll" ? (
                <Poll message={message} out={out} isRtl={isRtl} t={t} onVote={onVote} />
              ) : message.kind === "voice" ? (
                <Voice message={message} out={out} isRtl={isRtl} />
              ) : message.kind === "photo" ? (
                <span role="img" aria-label={t.photo}
                  className={cx("mt-0.5 flex items-center justify-center rounded-[14px] text-5xl w-[230px] max-w-full h-[150px]", photoTone(message.id))}>
                  {message.media?.emoji || "🏋️"}
                </span>
              ) : message.kind === "file" ? (
                <span className="flex items-center gap-2.5 w-[220px] max-w-full pt-0.5">
                  <span className={cx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", out ? "bg-on-inv/15" : "bg-sunk")}>
                    <FileText className="w-5 h-5" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex flex-col">
                    <span dir="auto" className="text-[14px] font-semibold truncate text-start">{message.media?.name}</span>
                    <span dir="auto" className={cx("text-[12px] text-start", soft)}>{message.media?.size}</span>
                  </span>
                </span>
              ) : (
                <>
                  <p className="m-0 text-[15px] leading-[1.4] whitespace-pre-wrap break-words" dir="auto">
                    {(translateAll || message.showTranslation) && message.translation
                      ? message.translation
                      : splitMentions(shown).map((run, i) => (run.type === "mention"
                        ? <button key={i} type="button" onClick={(e) => { e.stopPropagation(); onMention?.(run.username); }}
                            className={cx("inline px-1.5 py-px rounded-md font-bold border-0 cursor-pointer",
                              out ? "bg-accent text-on-accent" : "bg-jet text-accent")} dir="ltr">{run.value}</button>
                        : <React.Fragment key={i}>{run.value}</React.Fragment>))}
                  </p>
                  {(translateAll || message.showTranslation) && message.translation && (
                    <span className={cx("flex items-center gap-1 mt-0.5 text-[11px] font-medium", soft)}>
                      <Languages className="w-3 h-3" strokeWidth={2} />{t.translated}
                    </span>
                  )}
                </>
              )}

              {!isSticker && meta}
            </div>

            {/* reactions: ink when I reacted, white otherwise */}
            {reactions.length > 0 && (
              <span className={cx("flex flex-wrap gap-1.5", out && "justify-end")}>
                {reactions.map((r) => (
                  <button key={r.emoji} type="button" aria-pressed={r.mine} aria-label={`${r.emoji} ${r.count}`}
                    onClick={(e) => { e.stopPropagation(); onReact(message.id, r.emoji); }}
                    className={cx("h-[30px] px-2.5 rounded-full text-[13px] inline-flex items-center gap-1.5 border-0 cursor-pointer transition-transform active:scale-95",
                      r.mine ? "bg-inv text-on-inv font-bold" : "bg-card text-ink font-semibold")}>
                    <span className="text-[15px] leading-none">{r.emoji}</span>
                    <span className="tabular-nums">{num(r.count, isRtl)}</span>
                  </button>
                ))}
              </span>
            )}

            {/* inline keyboard, Telegram-bot style */}
            {message.buttons && !message.deleted && (
              <div className="flex flex-col gap-1.5 w-[min(78vw,320px)]">
                {message.buttons.map((rowButtons, ri) => (
                  <div key={ri} className="flex gap-1.5">
                    {rowButtons.map((btn) => (
                      <button key={btn.id} type="button" onClick={(e) => { e.stopPropagation(); onButton?.(btn.id); }}
                        className="flex-1 min-h-[44px] px-3 rounded-2xl bg-card text-ink text-[14px] font-semibold leading-tight border-0 cursor-pointer active:scale-[0.98] transition-transform">
                        {btn.name ? `${t[btn.label] || btn.label} ${btn.name}` : t[btn.label] || btn.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
