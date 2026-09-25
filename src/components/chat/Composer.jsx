import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp, BarChart3, Clock, CornerUpLeft, Image, ListChecks, Megaphone, Mic, Paperclip, Pencil, Smile, Sticker, Target, VolumeX, X,
} from "lucide-react";
import { applyMention, mentionCandidates, mentionQuery } from "../../lib/chat/mentions";
import { Avatar, senderName } from "./ChatBits";
import { senderTone } from "./MessageBubble";
import { IconButton, IconWell, cx } from "../ui/kit";

const EMOJI = ["😀","😁","😂","🤣","😊","😍","😘","😎","🤔","😴","🙄","😮","😢","😤","🥵","🤝","🙏","👍","👎","👏","💪","🔥","⚡","🏆","🥇","🎯","💯","❤️","🩶","✅","🏋️","🏃","🚴","🧘","🥗","🍗","💧","😮‍💨"];
const STICKERS = ["🏋️","🥇","🔥","💪","🧘","🏃","🚴","🥗","😤","🎯","🏆","⚡","🦾","🥵","🫡","🙌"];

// Attachments, each on one of the kit's icon-well tones.
const ATTACHMENTS = [
  { id: "photo", icon: Image, label: "photo", tone: "sand" },
  { id: "file", icon: Paperclip, label: "file", tone: "mist" },
  { id: "voice", icon: Mic, label: "voiceMessage", tone: "sage" },
  { id: "poll", icon: BarChart3, label: "poll", tone: "inv" },
  { id: "checklist", icon: ListChecks, label: "checklist", tone: "inv" },
  { id: "challenge", icon: Target, label: "challengeAttach", tone: "inv" },
];

/** The bar above the input while replying to or editing a message. */
function ContextStrip({ mode, message, chat, isRtl, t, onCancel }) {
  if (!message) return null;
  const edit = mode === "edit";
  const tone = edit ? undefined : senderTone(message.senderId, chat);
  const Icon = edit ? Pencil : CornerUpLeft;
  return (
    <div className="flex items-center gap-3 ps-3.5 pe-1.5 py-1.5 rounded-3xl bg-card">
      <Icon className="w-[18px] h-[18px] shrink-0 text-muted" strokeWidth={2} />
      <span aria-hidden="true" className={cx("w-[3px] h-8 rounded-full shrink-0", edit && "bg-inv")} style={tone ? { background: tone } : undefined} />
      <span className="flex-1 min-w-0 flex flex-col">
        <span className="text-[13px] font-bold truncate" style={tone ? { color: tone } : undefined}>
          {edit ? t.editingMessage : senderName(message.senderId, isRtl)}
        </span>
        <span dir="auto" className="text-[13px] text-muted truncate text-start">{message.text || t.photo}</span>
      </span>
      <IconButton label={t.cancel} tone="soft" size={36} onClick={onCancel}>
        <X className="w-4 h-4" strokeWidth={2.2} />
      </IconButton>
    </div>
  );
}

/**
 * The composer: a round attach button beside a white pill that holds the
 * field, the sticker and emoji toggles, and the send button (voice when the
 * field is empty). Holding send offers silent and scheduled sending, as the
 * real client does.
 */
export default function Composer({
  chat, draft, replyTo, editing, isRtl, t, members = [],
  onChangeDraft, onSend, onAttach, onCancelContext, onOpenSchedule,
  // What this chat can really send: the attachment kinds, voice notes, scheduling.
  kinds = ATTACHMENTS.map((a) => a.id), voice = true, schedule = true,
}) {
  const [panel, setPanel] = useState(null); // "emoji" | "stickers" | "attach"
  const [sendMenu, setSendMenu] = useState(false);
  const [caret, setCaret] = useState(null);
  const inputRef = useRef(null);
  const holdTimer = useRef(null);

  // @mentions: in a group, typing "@" offers the members; picking one drops in their handle.
  const mention = members.length ? mentionQuery(draft, caret ?? draft.length) : null;
  const suggestions = mention ? mentionCandidates(mention.query, members) : [];
  const pickMention = (u) => {
    const next = applyMention(draft, mention.start, caret ?? draft.length, u.username);
    onChangeDraft(next.text);
    setCaret(next.caret);
    requestAnimationFrame(() => { const el = inputRef.current; if (el) { el.focus(); el.setSelectionRange(next.caret, next.caret); } });
  };

  useEffect(() => {
    if (editing || replyTo) inputRef.current?.focus();
  }, [editing, replyTo]);

  const canSend = draft.trim().length > 0;
  const isChannel = chat.type === "channel";
  const placeholder = isChannel ? t.broadcast : t.message;

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

  const toggle = (id) => setPanel(panel === id ? null : id);
  const inPill = "w-10 h-12 flex items-center justify-center shrink-0 bg-transparent border-0 cursor-pointer transition-colors";

  return (
    <div className="flex flex-col gap-2">
      <ContextStrip
        mode={editing ? "edit" : "reply"}
        message={editing || replyTo}
        chat={chat}
        isRtl={isRtl} t={t}
        onCancel={onCancelContext}
      />

      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.ul key="mentions" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
            className="m-0 p-0 py-1 list-none rounded-3xl bg-card shadow-lift divide-y divide-hair max-h-64 overflow-y-auto scrollbar-hide"
            role="listbox" aria-label="@">
            {suggestions.map((u) => (
              <li key={u.id} className="list-none">
                <button type="button" role="option" aria-selected="false" onMouseDown={(e) => e.preventDefault()} onClick={() => pickMention(u)}
                  className="w-full min-h-[52px] flex items-center gap-3 px-4 py-1.5 text-start bg-transparent border-0 cursor-pointer active:bg-sunk">
                  <Avatar user={u} size={32} showStatus={false} />
                  <span className="flex-1 min-w-0 text-[15px] font-semibold text-ink truncate">{isRtl ? u.nameFa || u.name : u.name}</span>
                  <span className="text-[13px] text-muted shrink-0" dir="ltr">@{u.username}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
        {panel && (
          <motion.div key={panel}
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden rounded-3xl bg-card"
          >
            {panel === "attach" ? (
              <div className="grid grid-cols-4 gap-2 px-3 py-4">
                {ATTACHMENTS.filter((a) => kinds.includes(a.id)).map((a) => {
                  const Icon = a.icon;
                  return (
                    <button key={a.id} type="button"
                      onClick={() => { onAttach(a.id); setPanel(null); }}
                      className="flex flex-col items-center gap-2 bg-transparent border-0 cursor-pointer active:scale-95 transition-transform">
                      <IconWell tone={a.tone} size={52}><Icon className="w-[22px] h-[22px]" strokeWidth={2} /></IconWell>
                      <span className="text-[12px] font-medium text-muted">{t[a.label]}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1 p-3 max-h-44 overflow-y-auto scrollbar-hide">
                {(panel === "emoji" ? EMOJI : STICKERS).map((e) => (
                  <button key={e} type="button" aria-label={e}
                    onClick={() => (panel === "emoji" ? insert(e) : onSend({ kind: "sticker", media: { emoji: e } }))}
                    className={cx("rounded-2xl flex items-center justify-center bg-transparent border-0 cursor-pointer active:bg-sunk hover:bg-sunk",
                      panel === "emoji" ? "w-10 h-10 text-[22px]" : "w-14 h-14 text-4xl")}>
                    {e}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex items-end gap-2">
        <IconButton label={t.attach} size={48} aria-expanded={panel === "attach"} onClick={() => toggle("attach")}
          tone={panel === "attach" ? "inv" : "card"}>
          <Paperclip className="w-[22px] h-[22px]" strokeWidth={2} />
        </IconButton>

        <div className="flex-1 min-w-0 min-h-[48px] flex items-end rounded-[24px] bg-card ps-4 pe-1 focus-within:ring-2 focus-within:ring-inset focus-within:ring-ink/80">
          {isChannel && <Megaphone aria-hidden="true" className="w-[18px] h-[18px] shrink-0 self-center me-2 text-muted" strokeWidth={2} />}
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => { onChangeDraft(e.target.value); setCaret(e.target.selectionStart); }}
            onKeyUp={(e) => setCaret(e.target.selectionStart)}
            onClick={(e) => setCaret(e.target.selectionStart)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (suggestions.length) pickMention(suggestions[0]); else submit();
              }
              if (e.key === "Tab" && suggestions.length) { e.preventDefault(); pickMention(suggestions[0]); }
            }}
            placeholder={placeholder}
            aria-label={placeholder}
            dir="auto"
            className="flex-1 min-w-0 border-0 bg-transparent py-[13px] text-[16px] leading-[22px] text-ink placeholder:text-muted resize-none outline-none focus-visible:outline-none max-h-28"
          />
          <button type="button" onClick={() => toggle("stickers")} aria-label={t.stickers} aria-pressed={panel === "stickers"}
            className={cx(inPill, panel === "stickers" ? "text-ink" : "text-muted")}>
            <Sticker className="w-[22px] h-[22px]" strokeWidth={2} />
          </button>
          <button type="button" onClick={() => toggle("emoji")} aria-label={t.emoji} aria-pressed={panel === "emoji"}
            className={cx(inPill, panel === "emoji" ? "text-ink" : "text-muted")}>
            <Smile className="w-[22px] h-[22px]" strokeWidth={2} />
          </button>

          {canSend ? (
            <button type="button" onClick={() => submit()} aria-label={t.send}
              onPointerDown={startHold} onPointerUp={endHold} onPointerLeave={endHold}
              onContextMenu={(e) => { e.preventDefault(); setSendMenu(true); }}
              className="w-10 h-10 my-1 rounded-full flex items-center justify-center shrink-0 bg-accent text-on-accent border-0 cursor-pointer active:scale-95 transition-transform">
              <ArrowUp className="w-5 h-5" strokeWidth={2.6} />
            </button>
          ) : !voice ? (
            <button type="button" disabled aria-label={t.send}
              className="w-10 h-10 my-1 rounded-full flex items-center justify-center shrink-0 bg-accent text-on-accent border-0 opacity-40 cursor-not-allowed">
              <ArrowUp className="w-5 h-5" strokeWidth={2.6} />
            </button>
          ) : (
            <button type="button" onClick={() => onAttach("voice")} aria-label={t.voiceMessage}
              className="w-10 h-10 my-1 rounded-full flex items-center justify-center shrink-0 bg-jet text-accent border-0 cursor-pointer active:scale-95 transition-transform dark:ring-1 dark:ring-inset dark:ring-line">
              <Mic className="w-5 h-5" strokeWidth={2} />
            </button>
          )}
        </div>

        <AnimatePresence>
          {sendMenu && canSend && (
            <>
              <button key="scrim" type="button" aria-label={t.close} onClick={() => setSendMenu(false)}
                className="fixed inset-0 z-10 cursor-default bg-transparent border-0" />
              <motion.ul key="menu" initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.96 }}
                className="absolute bottom-full mb-2 end-0 z-20 m-0 p-0 py-1 list-none min-w-[230px] rounded-3xl bg-card shadow-sheet divide-y divide-hair overflow-hidden">
                <li className="list-none">
                  <button type="button" onClick={() => submit(true)}
                    className="w-full h-12 flex items-center justify-between gap-3 px-4 text-[15px] font-medium text-ink text-start bg-transparent border-0 cursor-pointer active:bg-sunk">
                    {t.sendSilently} <VolumeX className="w-5 h-5 text-muted" strokeWidth={2} />
                  </button>
                </li>
                {schedule && <li className="list-none">
                  <button type="button" onClick={() => { setSendMenu(false); onOpenSchedule(); }}
                    className="w-full h-12 flex items-center justify-between gap-3 px-4 text-[15px] font-medium text-ink text-start bg-transparent border-0 cursor-pointer active:bg-sunk">
                    {t.schedule} <Clock className="w-5 h-5 text-muted" strokeWidth={2} />
                  </button>
                </li>}
              </motion.ul>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
