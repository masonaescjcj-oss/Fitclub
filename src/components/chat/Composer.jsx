import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Clock, Image, Mic, Paperclip, Smile, Sticker, VolumeX, X } from "lucide-react";
import { TG } from "../../lib/chat/extras";
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
    <div className="flex items-center gap-2 px-3 py-2 mb-1.5 rounded-2xl backdrop-blur-xl" style={{ background: TG.glass, boxShadow: "0 1px 6px rgba(0,0,0,.08)" }}>
      <span className="w-0.5 h-8 rounded-full shrink-0"
        style={{ background: mode === "edit" ? "#f59e0b" : senderColor(message.senderId) }} />
      <span className="flex-1 min-w-0">
        <span className="block text-[12px] font-semibold"
          style={{ color: mode === "edit" ? "#f59e0b" : senderColor(message.senderId) }}>
          {mode === "edit" ? t.editingMessage : senderName(message.senderId, isRtl)}
        </span>
        <span className="block text-[13px] text-neutral-400 truncate">{message.text || t.photo}</span>
      </span>
      <button type="button" onClick={onCancel} aria-label={t.cancel}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-500 hover:text-white shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * The iOS composer: paperclip, a rounded field with emoji and sticker
 * toggles inside, and a round blue send button. Holding the send button
 * offers silent and scheduled sending, as the real client does.
 */
export default function Composer({
  chat, draft, replyTo, editing, isRtl, t,
  onChangeDraft, onSend, onAttach, onCancelContext, onOpenSchedule,
}) {
  const [panel, setPanel] = useState(null); // "emoji" | "stickers" | "attach"
  const [sendMenu, setSendMenu] = useState(false);
  const inputRef = useRef(null);
  const holdTimer = useRef(null);

  useEffect(() => {
    if (editing || replyTo) inputRef.current?.focus();
  }, [editing, replyTo]);

  const canSend = draft.trim().length > 0;

  const submit = (silent = false) => {
    if (!canSend) return;
    onSend({ text: draft.trim(), silent });
    setPanel(null);
    setSendMenu(false);
  };

  const insert = (char) => {
    onChangeDraft(draft + char);
    inputRef.current?.focus();
  };

  const startHold = () => { holdTimer.current = setTimeout(() => setSendMenu(true), 450); };
  const endHold = () => { clearTimeout(holdTimer.current); holdTimer.current = null; };

  return (
    <div className="sticky bottom-0 z-20 px-2 pt-1" style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
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
            className="overflow-hidden rounded-2xl mb-1.5 backdrop-blur-xl" style={{ background: TG.glass, boxShadow: "0 1px 6px rgba(0,0,0,.08)" }}
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
                      <span className="text-[11px] font-medium text-neutral-400">{t[a.label]}</span>
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

      <div className="flex items-end gap-2 relative">
        <div className="flex-1 flex items-end rounded-[24px] min-h-[46px] ps-1 pe-1 min-w-0 backdrop-blur-xl"
          style={{ background: TG.glass, boxShadow: "0 2px 12px rgba(0,0,0,.1)" }}>
          <button type="button" onClick={() => setPanel(panel === "attach" ? null : "attach")}
            aria-label={t.attach} className="w-10 h-[46px] flex items-center justify-center shrink-0"
            style={{ color: panel === "attach" ? TG.accent : TG.muted }}>
            <Paperclip className="w-[22px] h-[22px]" />
          </button>
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => onChangeDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
            }}
            placeholder={chat.type === "channel" ? t.broadcast : t.message}
            aria-label={chat.type === "channel" ? t.broadcast : t.message}
            className="flex-1 min-w-0 bg-transparent py-3 text-[16px] leading-[22px] text-white placeholder:text-neutral-500 resize-none focus:outline-none max-h-28"
          />
          <button type="button" onClick={() => setPanel(panel === "stickers" ? null : "stickers")}
            aria-label={t.stickers} className="w-9 h-[46px] flex items-center justify-center shrink-0"
            style={{ color: panel === "stickers" ? TG.accent : TG.muted }}>
            <Sticker className="w-[22px] h-[22px]" />
          </button>
          <button type="button" onClick={() => setPanel(panel === "emoji" ? null : "emoji")}
            aria-label={t.emoji} className="w-9 h-[46px] flex items-center justify-center shrink-0"
            style={{ color: panel === "emoji" ? TG.accent : TG.muted }}>
            <Smile className="w-[22px] h-[22px]" />
          </button>
        </div>

        {canSend ? (
          <button type="button" onClick={() => submit()} aria-label={t.send}
            onPointerDown={startHold} onPointerUp={endHold} onPointerLeave={endHold}
            onContextMenu={(e) => { e.preventDefault(); setSendMenu(true); }}
            className="w-[46px] h-[46px] rounded-full flex items-center justify-center text-white active:scale-95 transition-transform shrink-0 on-accent"
            style={{ background: TG.accentDeep, boxShadow: "0 2px 12px rgba(0,122,255,.35)" }}>
            <ArrowUp className="w-6 h-6 stroke-[2.5]" />
          </button>
        ) : (
          <button type="button" onClick={() => onAttach("voice")} aria-label={t.voiceMessage}
            className="w-[46px] h-[46px] rounded-full flex items-center justify-center shrink-0 backdrop-blur-xl"
            style={{ color: TG.muted, background: TG.glass, boxShadow: "0 2px 12px rgba(0,0,0,.1)" }}>
            <Mic className="w-[22px] h-[22px]" />
          </button>
        )}

        <AnimatePresence>
          {sendMenu && canSend && (
            <>
              <button type="button" aria-label={t.close} onClick={() => setSendMenu(false)} className="fixed inset-0 z-10 cursor-default" />
              <motion.div initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.96 }}
                className="absolute bottom-14 end-0 z-20 min-w-[200px] rounded-2xl overflow-hidden backdrop-blur-xl divide-y"
                style={{ background: TG.glass, boxShadow: "0 12px 32px rgba(0,0,0,.18)", borderColor: TG.sep }}>
                <button type="button" onClick={() => submit(true)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-[15px] text-white text-start">
                  {t.sendSilently} <VolumeX className="w-5 h-5 text-neutral-500" />
                </button>
                <button type="button" onClick={() => { setSendMenu(false); onOpenSchedule(); }}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-[15px] text-white text-start">
                  {t.schedule} <Clock className="w-5 h-5 text-neutral-500" />
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
