import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Archive, BellOff, Copy, CornerUpLeft, Forward, Pencil, Pin, Trash2, X,
} from "lucide-react";
import { BASE_REACTIONS, PREMIUM_REACTIONS, ME, isMine } from "../../lib/chat/chatModel";
import { Avatar } from "./ChatBits";

export function Sheet({ title, isRtl, t, onClose, children, footer }) {
  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="relative w-full sm:max-w-lg bg-[#0d0d0f] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl max-h-[85dvh] flex flex-col overflow-hidden"
      >
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
            <h2 className="text-base font-black text-white">{title}</h2>
            <button type="button" onClick={onClose} aria-label={t.close}
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto scrollbar-hide">{children}</div>
        {footer && <div className="p-4 border-t border-white/10 flex gap-2 shrink-0">{footer}</div>}
      </motion.div>
    </div>
  );
}

function Action({ icon: Icon, label, tone = "text-white", onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.05] transition-colors text-start">
      <Icon className={`w-4 h-4 shrink-0 ${tone}`} />
      <span className={`text-sm font-bold ${tone}`}>{label}</span>
    </button>
  );
}

/** Long-press menu on a message, with the reaction strip on top. */
export function MessageActionsSheet({
  message, chat, premium, isRtl, t, onReact, onReply, onForward, onEdit,
  onCopy, onPin, onSelect, onDelete, onClose,
}) {
  const mine = isMine(message);
  const canEdit = mine && message.kind === "text" && !message.deleted;

  return (
    <Sheet isRtl={isRtl} t={t} onClose={onClose}>
      {/* Reactions */}
      <div className="p-3 border-b border-white/10">
        <div className="flex flex-wrap gap-1.5">
          {BASE_REACTIONS.map((e) => (
            <button key={e} type="button" onClick={() => { onReact(e); onClose(); }}
              className="w-11 h-11 rounded-xl bg-white/[0.06] hover:bg-white/15 text-2xl flex items-center justify-center transition-all active:scale-90">
              {e}
            </button>
          ))}
        </div>

        <div className="mt-2.5">
          <span className="flex items-center gap-1.5 text-[9px] font-black text-amber-400 uppercase tracking-wider mb-1.5">
            ⭐ {premium ? t.premiumReactions : t.premiumLocked}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PREMIUM_REACTIONS.map((e) => (
              <button key={e} type="button" disabled={!premium}
                onClick={() => { onReact(e); onClose(); }}
                className={`w-11 h-11 rounded-xl text-2xl flex items-center justify-center transition-all ${
                  premium
                    ? "bg-amber-500/10 hover:bg-amber-500/20 active:scale-90"
                    : "bg-white/[0.03] opacity-35 cursor-not-allowed"
                }`}>
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="py-1">
        <Action icon={CornerUpLeft} label={t.reply} onClick={onReply} />
        <Action icon={Forward} label={t.forward} onClick={onForward} />
        {canEdit && <Action icon={Pencil} label={t.edit} onClick={onEdit} />}
        {message.kind === "text" && !message.deleted && <Action icon={Copy} label={t.copy} onClick={onCopy} />}
        {chat.type !== "channel" && (
          <Action icon={Pin} label={chat.pinnedMessageId === message.id ? t.unpinMessage : t.pinMessage} onClick={onPin} />
        )}
        <Action icon={Copy} label={t.select} onClick={onSelect} />
        <Action icon={Trash2} label={mine ? t.deleteForEveryone : t.deleteMessage} tone="text-rose-400" onClick={onDelete} />
      </div>
    </Sheet>
  );
}

/** Long-press menu on a chat row. */
export function ChatActionsSheet({ chat, isRtl, t, onPin, onMute, onArchive, onRead, onDelete, onClose }) {
  return (
    <Sheet title={isRtl ? chat.titleFa || chat.title : chat.title} isRtl={isRtl} t={t} onClose={onClose}>
      <div className="py-1">
        <Action icon={Pin} label={chat.pinned ? t.unpin : t.pin} onClick={onPin} />
        <Action icon={BellOff} label={chat.muted ? t.unmute : t.mute} onClick={onMute} />
        <Action icon={Archive} label={chat.archived ? t.unarchive : t.archive} onClick={onArchive} />
        <Action icon={Copy} label={t.markRead} onClick={onRead} />
        <Action icon={Trash2} label={t.deleteChat} tone="text-rose-400" onClick={onDelete} />
      </div>
    </Sheet>
  );
}

/** Picks a destination chat when forwarding. */
export function ForwardSheet({ chats, count, isRtl, t, onPick, onClose }) {
  return (
    <Sheet title={`${t.forwardTo} (${count})`} isRtl={isRtl} t={t} onClose={onClose}>
      <div className="p-2 space-y-1">
        {chats.map((c) => (
          <button key={c.id} type="button" onClick={() => onPick(c.id)}
            className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/[0.06] transition-colors text-start">
            <Avatar chat={c} size={40} ring="#0d0d0f" showStatus={false} />
            <span className="flex-1 min-w-0 text-sm font-black text-white truncate">
              {isRtl ? c.titleFa || c.title : c.title}
            </span>
          </button>
        ))}
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
  const field = "w-full h-11 px-3 rounded-2xl bg-[#141416] border border-white/10 text-sm font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-white/30";

  return (
    <Sheet title={t.createPoll} isRtl={isRtl} t={t} onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose}
            className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/10 text-neutral-300 font-black text-sm">{t.cancel}</button>
          <button type="button" disabled={!valid}
            onClick={() => onCreate({ question: question.trim(), options: filled, multiple })}
            className="flex-1 h-12 rounded-2xl bg-[#844783] text-white font-black text-sm disabled:opacity-40">{t.send}</button>
        </>
      }>
      <div className="p-4 space-y-3">
        <input autoFocus value={question} onChange={(e) => setQuestion(e.target.value)}
          placeholder={t.question} className={field} />
        {options.map((o, i) => (
          <input key={i} value={o}
            onChange={(e) => setOptions(options.map((x, k) => (k === i ? e.target.value : x)))}
            placeholder={`${t.option} ${i + 1}`} className={field} />
        ))}
        {options.length < 10 && (
          <button type="button" onClick={() => setOptions([...options, ""])}
            className="w-full h-11 rounded-2xl border border-dashed border-white/15 text-xs font-black text-neutral-400 hover:text-white transition-colors">
            + {t.addOption}
          </button>
        )}
        <button type="button" onClick={() => setMultiple((v) => !v)}
          className="w-full flex items-center justify-between py-2">
          <span className="text-xs font-black text-white">{t.multipleAnswers}</span>
          <span className={`w-11 h-6 rounded-full p-0.5 transition-colors ${multiple ? "bg-[#844783]" : "bg-white/10"}`}>
            <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${
              multiple ? (isRtl ? "-translate-x-5" : "translate-x-5") : ""
            }`} />
          </span>
        </button>
      </div>
    </Sheet>
  );
}

/** Sends later. Telegram shows scheduled messages in their own view. */
export function ScheduleSheet({ isRtl, t, onSchedule, onClose }) {
  const presets = [
    { mins: 30, label: "+30m" },
    { mins: 60, label: "+1h" },
    { mins: 180, label: "+3h" },
    { mins: 1440, label: "+1d" },
  ];
  return (
    <Sheet title={t.schedule} isRtl={isRtl} t={t} onClose={onClose}>
      <div className="p-4 grid grid-cols-2 gap-2">
        {presets.map((p) => (
          <button key={p.mins} type="button" onClick={() => onSchedule(p.mins)}
            className="h-12 rounded-2xl bg-[#141416] border border-white/10 text-sm font-black text-white hover:border-white/30 transition-all">
            {p.label}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

export { ME };
