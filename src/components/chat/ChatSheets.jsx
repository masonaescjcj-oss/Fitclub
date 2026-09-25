import React, { useState } from "react";
import {
  Archive, BellOff, CheckCheck, CheckCircle2, Clock, Copy, CornerUpLeft, FileAudio, Forward, Languages, Pencil, Pin, Plus, Star, Trash2, X,
} from "lucide-react";
import { BASE_REACTIONS, CHECKLIST_MAX, PREMIUM_REACTIONS, ME, isMine } from "../../lib/chat/chatModel";
import { Avatar } from "./ChatBits";
import { Button, Field, Label, Sheet as KitSheet, Toggle, cx, num } from "../ui/kit";

/**
 * The messenger's bottom sheet, in the kit's look: paper, a grabber, the
 * title with a round close button, and an optional pinned footer. Children
 * bring their own padding, so screens that fill it edge to edge keep working.
 * Callers render it conditionally inside <AnimatePresence>.
 */
export function Sheet({ title, isRtl, t, onClose, children, footer, tall = false }) {
  return (
    <KitSheet title={title} isRtl={isRtl} onClose={onClose} footer={footer} tall={tall} closeLabel={t?.close} bare>
      {children}
    </KitSheet>
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

/**
 * A checklist message, as in Telegram: a title, up to 30 tasks, and whether
 * the others in the chat may tick tasks or add their own. `shared` is false
 * in Saved Messages, where there are no others to ask about.
 */
export function ChecklistSheet({ isRtl, t, shared = true, onCreate, onClose }) {
  const [title, setTitle] = useState("");
  const [tasks, setTasks] = useState([""]);
  const [othersCanMark, setMark] = useState(true);
  const [othersCanAdd, setAdd] = useState(true);
  const filled = tasks.map((x) => x.trim()).filter(Boolean);
  const valid = title.trim() && filled.length > 0;
  const left = CHECKLIST_MAX - tasks.length;
  const setTask = (i, v) => setTasks((all) => all.map((x, k) => (k === i ? v : x)));
  const addRow = () => { if (tasks.length < CHECKLIST_MAX) setTasks((all) => [...all, ""]); };

  return (
    <Sheet title={t.newChecklist} isRtl={isRtl} t={t} onClose={onClose} tall
      footer={
        <>
          <Button tone="card" className="flex-1" onClick={onClose}>{t.cancel}</Button>
          <Button tone="ink" className="flex-1" disabled={!valid}
            onClick={() => onCreate({ title: title.trim(), tasks: filled, othersCanMark: shared && othersCanMark, othersCanAdd: shared && othersCanAdd })}>
            {t.createChecklist}
          </Button>
        </>
      }>
      <div className="px-5 pt-1 flex flex-col gap-3">
        <Field autoFocus value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)}
          placeholder={t.checklistTitle} aria-label={t.checklistTitle} dir="auto" />

        <Label as="h3" className="m-0 mt-1 px-1">{t.checklist}</Label>
        <div className="rounded-3xl bg-card px-2 py-1">
          {tasks.map((task, i) => (
            <div key={i} className="flex items-center gap-1 border-t border-hair first:border-t-0">
              <input value={task} maxLength={200} dir="auto"
                onChange={(e) => setTask(i, e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRow(); } }}
                placeholder={t.task} aria-label={`${t.task} ${num(i + 1, isRtl)}`}
                className="flex-1 min-w-0 h-12 px-3 border-0 bg-transparent text-[15px] text-ink !outline-none placeholder:text-muted" />
              {tasks.length > 1 && (
                <button type="button" onClick={() => setTasks((all) => all.filter((_, k) => k !== i))} aria-label={t.removeTask}
                  className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-transparent border-0 text-muted cursor-pointer active:bg-sunk">
                  <X className="w-4 h-4" strokeWidth={2.2} />
                </button>
              )}
            </div>
          ))}
          {tasks.length < CHECKLIST_MAX && (
            <button type="button" onClick={addRow}
              className="w-full h-12 flex items-center gap-2.5 px-3 border-0 border-t border-hair bg-transparent text-[15px] font-semibold text-ink cursor-pointer text-start">
              <span className="w-6 h-6 rounded-full bg-jet text-accent flex items-center justify-center shrink-0"><Plus className="w-4 h-4" strokeWidth={2.6} /></span>
              {t.addATask}
            </button>
          )}
        </div>
        <p className="m-0 px-1 text-[13px] text-muted">{t.tasksLeft(Math.max(left, 0))}</p>

        {shared && (
          <>
            <Label as="h3" className="m-0 mt-1 px-1">{t.checklistSettings}</Label>
            <div className="rounded-3xl bg-card">
              <div className="min-h-[56px] flex items-center justify-between gap-3 px-4">
                <span className="text-[15px] font-semibold">{t.othersCanMark}</span>
                <Toggle checked={othersCanMark} onChange={setMark} label={t.othersCanMark} />
              </div>
              <div className="min-h-[56px] flex items-center justify-between gap-3 px-4 border-t border-hair">
                <span className="text-[15px] font-semibold">{t.othersCanAdd}</span>
                <Toggle checked={othersCanAdd} onChange={setAdd} label={t.othersCanAdd} />
              </div>
            </div>
          </>
        )}
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
