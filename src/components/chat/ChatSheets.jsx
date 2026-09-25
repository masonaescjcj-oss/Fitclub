import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Archive, BellOff, CheckCheck, CheckCircle2, Clock, Copy, CornerUpLeft, FileAudio, Forward, Languages, Pencil, Pin, Plus, Star, Trash2, X,
} from "lucide-react";
import { BASE_REACTIONS, PREMIUM_REACTIONS, ME, isMine } from "../../lib/chat/chatModel";
import { Avatar } from "./ChatBits";
import { Button, Field, IconButton, Label, Toggle, cx, num } from "../ui/kit";

/**
 * The messenger's bottom sheet, in the kit's look: paper, a grabber, the
 * title with a round close button, and an optional pinned footer. Children
 * bring their own padding, so screens that fill it edge to edge keep working.
 * Callers render it conditionally inside <AnimatePresence>.
 */
export function Sheet({ title, isRtl, t, onClose, children, footer, tall = false }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="ui fixed inset-0 z-[70] flex items-end justify-center !bg-transparent">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-hero/45 backdrop-blur-[2px]" />
      <motion.div role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 36 }}
        className={cx("relative w-full md:max-w-lg bg-canvas text-ink rounded-t-4xl shadow-sheet flex flex-col overflow-hidden",
          tall ? "h-[92dvh]" : "max-h-[88dvh]")}
      >
        <span aria-hidden="true" className="mx-auto mt-2.5 w-10 h-1 rounded-full bg-line shrink-0" />
        {title ? (
          <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-3 shrink-0">
            <h2 className="m-0 min-w-0 truncate font-display font-extrabold text-[22px] tracking-[-0.02em] text-ink">{title}</h2>
            <IconButton label={t?.close || (isRtl ? "بستن" : "Close")} tone="card" size={40} onClick={onClose}>
              <X className="w-[18px] h-[18px]" strokeWidth={2} />
            </IconButton>
          </div>
        ) : (
          <span aria-hidden="true" className="h-3 shrink-0" />
        )}
        <div className={cx("flex-1 overflow-y-auto scrollbar-hide", !footer && "pb-[max(env(safe-area-inset-bottom),16px)]")}>{children}</div>
        {footer && <div className="px-5 pt-3 pb-[max(env(safe-area-inset-bottom),20px)] flex gap-2.5 shrink-0">{footer}</div>}
      </motion.div>
    </div>
  );
}

/** One row of an action list: an icon and a label, alert-coloured when destructive. */
function Action({ icon: Icon, label, danger = false, onClick }) {
  return (
    <li className="list-none">
      <button type="button" onClick={onClick}
        className={cx("w-full min-h-[52px] flex items-center gap-3.5 px-4 py-2 text-start bg-transparent border-0 cursor-pointer active:bg-sunk transition-colors",
          danger ? "text-alert" : "text-ink")}>
        <Icon className={cx("w-5 h-5 shrink-0", danger ? "text-alert" : "text-muted")} strokeWidth={2} />
        <span className="text-[15px] font-medium">{label}</span>
      </button>
    </li>
  );
}

/** A white card of action rows split by hairlines. */
function ActionList({ children }) {
  return <ul className="m-0 p-0 py-1 list-none rounded-3xl bg-card divide-y divide-hair overflow-hidden">{children}</ul>;
}

/** Long-press menu on a message, with the reaction strip on top. */
export function MessageActionsSheet({
  message, chat, premium, isRtl, t, onReact, onReply, onForward, onEdit,
  onCopy, onPin, onSelect, onDelete, onClose, onTranslate, onTranscribe,
}) {
  const mine = isMine(message);
  const canEdit = mine && message.kind === "text" && !message.deleted;
  const reactionBtn = "w-11 h-11 rounded-full text-[24px] leading-none flex items-center justify-center border-0 cursor-pointer transition-transform";

  return (
    <Sheet isRtl={isRtl} t={t} onClose={onClose}>
      <div className="px-4 flex flex-col gap-3">
        {/* Reactions */}
        <div className="rounded-3xl bg-card p-3">
          <div className="flex flex-wrap gap-1.5">
            {BASE_REACTIONS.map((e) => (
              <button key={e} type="button" aria-label={e} onClick={() => { onReact(e); onClose(); }}
                className={cx(reactionBtn, "bg-sunk hover:bg-line active:scale-90")}>
                {e}
              </button>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-hair">
            <Label className="flex items-center gap-1.5 mb-2">
              <Star className="w-3.5 h-3.5" strokeWidth={2} />
              {premium ? t.premiumReactions : t.premiumLocked}
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {PREMIUM_REACTIONS.map((e) => (
                <button key={e} type="button" aria-label={e} disabled={!premium}
                  onClick={() => { onReact(e); onClose(); }}
                  className={cx(reactionBtn, premium ? "bg-sunk hover:bg-line active:scale-90" : "bg-sunk opacity-35 cursor-not-allowed")}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>

        <ActionList>
          <Action icon={CornerUpLeft} label={t.reply} onClick={onReply} />
          <Action icon={Forward} label={t.forward} onClick={onForward} />
          {canEdit && <Action icon={Pencil} label={t.edit} onClick={onEdit} />}
          {message.kind === "text" && !message.deleted && <Action icon={Copy} label={t.copy} onClick={onCopy} />}
          {onTranslate && (
            <Action icon={Languages} label={message.showTranslation ? t.showOriginal : t.translate} onClick={onTranslate} />
          )}
          {onTranscribe && <Action icon={FileAudio} label={t.transcribe} onClick={onTranscribe} />}
          {chat.type !== "channel" && (
            <Action icon={Pin} label={chat.pinnedMessageId === message.id ? t.unpinMessage : t.pinMessage} onClick={onPin} />
          )}
          <Action icon={CheckCircle2} label={t.select} onClick={onSelect} />
          <Action icon={Trash2} label={mine ? t.deleteForEveryone : t.deleteMessage} danger onClick={onDelete} />
        </ActionList>
      </div>
    </Sheet>
  );
}

/** Long-press menu on a chat row. */
export function ChatActionsSheet({ chat, isRtl, t, onPin, onMute, onArchive, onRead, onDelete, onClose }) {
  return (
    <Sheet title={isRtl ? chat.titleFa || chat.title : chat.title} isRtl={isRtl} t={t} onClose={onClose}>
      <div className="px-4">
        <ActionList>
          <Action icon={Pin} label={chat.pinned ? t.unpin : t.pin} onClick={onPin} />
          <Action icon={BellOff} label={chat.muted ? t.unmute : t.mute} onClick={onMute} />
          <Action icon={Archive} label={chat.archived ? t.unarchive : t.archive} onClick={onArchive} />
          <Action icon={CheckCheck} label={t.markRead} onClick={onRead} />
          <Action icon={Trash2} label={t.deleteChat} danger onClick={onDelete} />
        </ActionList>
      </div>
    </Sheet>
  );
}

/** Picks a destination chat when forwarding. */
export function ForwardSheet({ chats, count, isRtl, t, onPick, onClose }) {
  return (
    <Sheet title={`${t.forwardTo} (${num(count, isRtl)})`} isRtl={isRtl} t={t} onClose={onClose}>
      <div className="px-4">
        <ul className="m-0 p-0 py-1 list-none rounded-3xl bg-card divide-y divide-hair overflow-hidden">
          {chats.map((c) => (
            <li key={c.id} className="list-none">
              <button type="button" onClick={() => onPick(c.id)}
                className="w-full min-h-[60px] flex items-center gap-3 px-4 py-2 text-start bg-transparent border-0 cursor-pointer active:bg-sunk transition-colors">
                <Avatar chat={c} size={40} showStatus={false} />
                <span className="flex-1 min-w-0 text-[15px] font-semibold text-ink truncate">
                  {isRtl ? c.titleFa || c.title : c.title}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}

/** Builds a poll. Telegram allows quiz mode and multiple answers. */
export function PollSheet({ isRtl, t, onCreate, onClose }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [multiple, setMultiple] = useState(false);

  const filled = options.map((o) => o.trim()).filter(Boolean);
  const valid = question.trim() && filled.length >= 2;

  return (
    <Sheet title={t.createPoll} isRtl={isRtl} t={t} onClose={onClose}
      footer={
        <>
          <Button tone="card" className="flex-1" onClick={onClose}>{t.cancel}</Button>
          <Button tone="ink" className="flex-1" disabled={!valid}
            onClick={() => onCreate({ question: question.trim(), options: filled, multiple })}>{t.send}</Button>
        </>
      }>
      <div className="px-5 pt-1 flex flex-col gap-3">
        <Field autoFocus value={question} onChange={(e) => setQuestion(e.target.value)}
          placeholder={t.question} aria-label={t.question} />
        {options.map((o, i) => (
          <Field key={i} value={o}
            onChange={(e) => setOptions(options.map((x, k) => (k === i ? e.target.value : x)))}
            placeholder={`${t.option} ${num(i + 1, isRtl)}`} aria-label={`${t.option} ${num(i + 1, isRtl)}`} />
        ))}
        {options.length < 10 && (
          <Button tone="card" block onClick={() => setOptions([...options, ""])}
            icon={<Plus className="w-[18px] h-[18px]" strokeWidth={2} />}>
            {t.addOption}
          </Button>
        )}
        <div className="min-h-[56px] rounded-3xl bg-card flex items-center justify-between gap-3 px-4">
          <span className="text-[15px] font-semibold">{t.multipleAnswers}</span>
          <Toggle checked={multiple} onChange={setMultiple} label={t.multipleAnswers} />
        </div>
      </div>
    </Sheet>
  );
}

/** Sends later. Telegram shows scheduled messages in their own view. */
export function ScheduleSheet({ isRtl, t, onSchedule, onClose }) {
  const presets = [
    { mins: 30, label: isRtl ? "۳۰ دقیقه‌ی دیگر" : "In 30 min" },
    { mins: 60, label: isRtl ? "۱ ساعت دیگر" : "In 1 hour" },
    { mins: 180, label: isRtl ? "۳ ساعت دیگر" : "In 3 hours" },
    { mins: 1440, label: isRtl ? "فردا همین ساعت" : "Tomorrow" },
  ];
  return (
    <Sheet title={t.schedule} isRtl={isRtl} t={t} onClose={onClose}>
      <div className="px-5 pt-1 grid grid-cols-2 gap-2.5">
        {presets.map((p) => (
          <Button key={p.mins} tone="card" size="lg" onClick={() => onSchedule(p.mins)}
            icon={<Clock className="w-[18px] h-[18px] text-muted" strokeWidth={2} />}>
            {p.label}
          </Button>
        ))}
      </div>
    </Sheet>
  );
}

export { ME };
