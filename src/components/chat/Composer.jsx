import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, Image, Mic, Paperclip, Send, Smile, Sticker, VolumeX, X } from "lucide-react";
import { senderColor, senderName } from "./ChatBits";

const EMOJI = ["😀","😁","😂","🤣","😊","😍","😘","😎","🤔","😴","🙄","😮","😢","😤","🥵","🤝","🙏","👍","👎","👏","💪","🔥","⚡","🏆","🥇","🎯","💯","❤️","🩶","✅","🏋️","🏃","🚴","🧘","🥗","🍗","💧","😮‍💨"];
const STICKERS = ["🏋️","🥇","🔥","💪","🧘","🏃","🚴","🥗","😤","🎯","🏆","⚡","🦾","🥵","🫡","🙌"];

const ATTACHMENTS = [
  { id: "photo", icon: Image, label: "photo", tint: "#e0567d" },
  { id: "file", icon: Paperclip, label: "file", tint: "#38bdf8" },
  { id: "voice", icon: Mic, label: "voiceMessage", tint: "#f59e0b" },
  { id: "poll", icon: () => <span className="text-base leading-none">📊</span>, label: "poll", tint: "#10b981" },
];

/** The bar above the input while replying to or editing a message. */
function ContextStrip({ mode, message, isRtl, t, onCancel }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-black/40">
      <span className="w-0.5 h-8 rounded-full shrink-0"
        style={{ background: mode === "edit" ? "#f59e0b" : senderColor(message.senderId) }} />
      <span className="flex-1 min-w-0">
        <span className="block text-[10px] font-black"
          style={{ color: mode === "edit" ? "#f59e0b" : senderColor(message.senderId) }}>
          {mode === "edit" ? t.editingMessage : senderName(message.senderId, isRtl)}
        </span>
        <span className="block text-[11px] text-neutral-400 truncate">{message.text || t.photo}</span>
      </span>
      <button type="button" onClick={onCancel} aria-label={t.cancel}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-500 hover:text-white shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function Composer({
  chat, draft, replyTo, editing, isRtl, t,
  onChangeDraft, onSend, onAttach, onCancelContext, onOpenSchedule,
}) {
  const [panel, setPanel] = useState(null); // "emoji" | "stickers" | "attach"
  const [silent, setSilent] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing || replyTo) inputRef.current?.focus();
  }, [editing, replyTo]);

  const canSend = draft.trim().length > 0;

  const submit = () => {
    if (!canSend) return;
    onSend({ text: draft.trim(), silent });
    setPanel(null);
  };

  const insert = (char) => {
    onChangeDraft(draft + char);
    inputRef.current?.focus();
  };

  return (
    <div className="sticky bottom-0 z-20 bg-black/95 backdrop-blur border-t border-white/10">
      <ContextStrip
        mode={editing ? "edit" : "reply"}
        message={editing || replyTo}
        isRtl={isRtl} t={t}
        onCancel={onCancelContext}
      />

      <AnimatePresence>
        {panel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-white/10"
          >
            {panel === "attach" ? (
              <div className="grid grid-cols-4 gap-2 p-4">
                {ATTACHMENTS.map((a) => {
                  const Icon = a.icon;
                  return (
                    <button key={a.id} type="button"
                      onClick={() => { onAttach(a.id); setPanel(null); }}
                      className="flex flex-col items-center gap-1.5">
                      <span className="w-12 h-12 rounded-2xl flex items-center justify-center"
                        style={{ background: `${a.tint}22`, border: `1px solid ${a.tint}55`, color: a.tint }}>
                        <Icon className="w-5 h-5" />
                      </span>
                      <span className="text-[9px] font-black text-neutral-400">{t[a.label]}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1 p-3 max-h-40 overflow-y-auto scrollbar-hide">
                {(panel === "emoji" ? EMOJI : STICKERS).map((e) => (
                  <button key={e} type="button"
                    onClick={() => (panel === "emoji" ? insert(e) : onSend({ kind: "sticker", media: { emoji: e } }))}
                    className={`rounded-lg hover:bg-white/10 flex items-center justify-center ${
                      panel === "emoji" ? "w-9 h-9 text-xl" : "w-14 h-14 text-4xl"
                    }`}>
                    {e}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end gap-1.5 px-2 py-2">
        <button type="button" onClick={() => setPanel(panel === "attach" ? null : "attach")}
          aria-label={t.attach}
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            panel === "attach" ? "text-[#c07dbf]" : "text-neutral-500 hover:text-white"
          }`}>
          <Paperclip className="w-5 h-5" />
        </button>

        <div className="flex-1 flex items-end gap-1 rounded-2xl bg-[#141416] border border-white/10 px-2 py-1 min-w-0">
          <button type="button" onClick={() => setPanel(panel === "emoji" ? null : "emoji")}
            aria-label={t.emoji}
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              panel === "emoji" ? "text-[#c07dbf]" : "text-neutral-500 hover:text-white"
            }`}>
            <Smile className="w-5 h-5" />
          </button>

          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => onChangeDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
            }}
            placeholder={t.message}
            className="flex-1 min-w-0 bg-transparent py-1.5 text-sm font-medium text-white placeholder:text-neutral-600 resize-none focus:outline-none max-h-28"
          />

          <button type="button" onClick={() => setPanel(panel === "stickers" ? null : "stickers")}
            aria-label={t.stickers}
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              panel === "stickers" ? "text-[#c07dbf]" : "text-neutral-500 hover:text-white"
            }`}>
            <Sticker className="w-5 h-5" />
          </button>
        </div>

        {canSend ? (
          <div className="flex items-center gap-1 shrink-0">
            <button type="button" onClick={() => setSilent((v) => !v)} aria-label={t.sendSilently}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                silent ? "text-amber-400" : "text-neutral-600 hover:text-white"
              }`}>
              <VolumeX className="w-4 h-4" />
            </button>
            <button type="button" onClick={onOpenSchedule} aria-label={t.schedule}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-600 hover:text-white">
              <Clock className="w-4 h-4" />
            </button>
            <button type="button" onClick={submit} aria-label={t.send}
              className="w-10 h-10 rounded-full bg-[#844783] flex items-center justify-center text-white hover:brightness-110 active:scale-95 transition-all">
              <Send className={`w-4 h-4 ${isRtl ? "scale-x-[-1]" : ""}`} />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => onAttach("voice")} aria-label={t.voiceMessage}
            className="w-10 h-10 rounded-full bg-[#141416] border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white shrink-0">
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
