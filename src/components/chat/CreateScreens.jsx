import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Camera, Check, Copy, QrCode, RefreshCw, Search, ShieldCheck, UserMinus, X,
} from "lucide-react";
import { ME, LINK_HOST, chatLink, relativeTime, validateUsername } from "../../lib/chat/chatModel";
import { PEOPLE, findUser } from "../../lib/chat/chatStore";
import { TG } from "../../lib/chat/extras";
import { Avatar, NameBadges } from "./ChatBits";
import { Sheet } from "./ChatSheets";
import { appLinkFor } from "../../lib/chat/search";

/*
 * Making and running groups and channels, laid out like the Android client:
 * details (picture, name, description) → type (public link / private invite
 * link) → people, each a full screen pushed over the last with a round
 * confirm button in the corner.
 */

export const COVER_EMOJI = ["📣", "👥", "🏋️", "🔥", "💪", "🏃", "🧘", "🥗", "🏆", "⚡", "🎯", "🚴", "🥊", "🏊", "📋", "🍎"];
export const COVER_COLORS = ["#3390ec", "#e0567d", "#f59e0b", "#10b981", "#8b5cf6", "#38bdf8", "#844783", "#ef4444"];

/** The frame every step shares: a bar with back + title, the content, one round action button. */
export function StepScreen({ title, subtitle, isRtl, t, onBack, children, fab, fabDisabled = false, fabLabel, fabIcon: FabIcon = Check, zIndex = 75 }) {
  return (
    <motion.div initial={{ x: isRtl ? "-100%" : "100%" }} animate={{ x: 0 }} exit={{ x: isRtl ? "-100%" : "100%" }}
      transition={{ type: "spring", stiffness: 380, damping: 40 }}
      className="fixed inset-0 overflow-y-auto scrollbar-hide text-white md:max-w-lg md:mx-auto"
      style={{ background: TG.bg, zIndex }} dir={isRtl ? "rtl" : "ltr"}>
      <div className="sticky top-0 z-10 flex items-center gap-1 h-14 px-2" style={{ background: TG.surface, boxShadow: `0 0.5px 0 ${TG.sep}` }}>
        <button type="button" onClick={onBack} aria-label={t.close}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white active:bg-black/[0.06]">
          <ArrowLeft className={`w-6 h-6 ${isRtl ? "rotate-180" : ""}`} />
        </button>
        <span className="flex-1 min-w-0 ps-1">
          <span className="block text-[19px] font-semibold text-white truncate leading-tight">{title}</span>
          {subtitle && <span className="block text-[13px] leading-tight" style={{ color: TG.muted }}>{subtitle}</span>}
        </span>
      </div>

      <div className="pb-32">{children}</div>

      {fab && (
        <button type="button" onClick={fab} disabled={fabDisabled} aria-label={fabLabel}
          className={`fixed bottom-6 ${isRtl ? "left-5" : "right-5"} w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl active:scale-95 transition-all on-accent disabled:opacity-40`}
          style={{ background: TG.accentDeep, boxShadow: "0 8px 24px rgba(51,144,236,.35)" }}>
          <FabIcon className={`w-6 h-6 ${FabIcon === ArrowRight && isRtl ? "rotate-180" : ""}`} strokeWidth={2.5} />
        </button>
      )}
    </motion.div>
  );
}

/** The big round picture with a camera badge; a tap opens emoji and colour swatches under it. */
function CoverPicker({ emoji, color, t, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="px-4 pt-5">
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-label={t.pickCoverEmoji}
          className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center shrink-0 on-accent"
          style={{ background: color }}>
          <span className="text-[34px] leading-none">{emoji}</span>
          <span className="absolute -bottom-0.5 -end-0.5 w-7 h-7 rounded-full flex items-center justify-center border-2"
            style={{ background: TG.accentDeep, borderColor: TG.bg }}>
            <Camera className="w-3.5 h-3.5 text-white" />
          </span>
        </button>
        <span className="text-[13px] leading-snug" style={{ color: TG.muted }}>{t.pickCoverEmoji}</span>
      </div>
      {open && (
        <div className="mt-3 p-3 rounded-2xl space-y-2.5" style={{ background: TG.card }}>
          <div className="flex flex-wrap gap-1.5">
            {COVER_EMOJI.map((e) => (
              <button key={e} type="button" onClick={() => onChange({ emoji: e })}
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center ${emoji === e ? "ring-2" : ""}`}
                style={{ background: TG.surface, ...(emoji === e ? { boxShadow: `0 0 0 2px ${TG.accent}` } : {}) }}>{e}</button>
            ))}
          </div>
          <div className="flex gap-2">
            {COVER_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => onChange({ color: c })} aria-label={c}
                className="w-7 h-7 rounded-full" style={{ background: c, boxShadow: color === c ? `0 0 0 2px ${TG.bg}, 0 0 0 4px ${c}` : "none" }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Android's underlined field with a small floating label. */
function Field({ label, value, onChange, multiline = false, autoFocus = false, maxLength = 128 }) {
  const Tag = multiline ? "textarea" : "input";
  return (
    <label className="block">
      <span className="block text-[12px] font-medium mb-0.5" style={{ color: TG.accent }}>{label}</span>
      <Tag value={value} onChange={(e) => onChange(e.target.value)} placeholder={label} aria-label={label} autoFocus={autoFocus}
        maxLength={maxLength} rows={multiline ? 2 : undefined}
        className="w-full bg-transparent py-1.5 text-[17px] text-white placeholder:text-neutral-500 focus:outline-none resize-none border-b-2"
        style={{ borderColor: TG.accent }} />
    </label>
  );
}

/**
 * Step one for a channel, step two for a group: picture, name and an optional
 * description. `nextIcon` says whether the corner button moves on or finishes.
 */
export function ChatDetailsScreen({ kind, initial = {}, title, isRtl, t, onBack, onNext, nextIcon = ArrowRight, nextLabel }) {
  const [name, setName] = useState(initial.title || "");
  const [description, setDescription] = useState(initial.description || "");
  const [emoji, setEmoji] = useState(initial.emoji || (kind === "channel" ? "📣" : "👥"));
  const [color, setColor] = useState(initial.color || (kind === "channel" ? "#f59e0b" : "#2fa6ff"));
  const isChannel = kind === "channel";
  return (
    <StepScreen title={title} isRtl={isRtl} t={t} onBack={onBack}
      fab={() => onNext({ title: name.trim(), description: description.trim(), emoji, color })}
      fabDisabled={!name.trim()} fabIcon={nextIcon} fabLabel={nextLabel || t.next}>
      <CoverPicker emoji={emoji} color={color} t={t} onChange={(p) => { if (p.emoji) setEmoji(p.emoji); if (p.color) setColor(p.color); }} />
      <div className="px-4 pt-6 space-y-6">
        <Field label={isChannel ? t.channelName : t.groupName} value={name} onChange={setName} autoFocus maxLength={64} />
        <Field label={t.descriptionOptional} value={description} onChange={setDescription} multiline maxLength={255} />
        <p className="text-[13px] leading-snug -mt-2" style={{ color: TG.muted }}>{isChannel ? t.descriptionHint : t.groupDescriptionHint}</p>
      </div>
    </StepScreen>
  );
}

function RadioRow({ on, title, sub, onClick }) {
  return (
    <button type="button" onClick={onClick} role="radio" aria-checked={on} aria-label={title}
      className="w-full flex items-start gap-4 px-4 py-3 text-start active:bg-black/[0.04]">
      <span className="mt-1 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0"
        style={{ borderColor: on ? TG.accent : TG.muted }}>
        {on && <span className="w-[11px] h-[11px] rounded-full" style={{ background: TG.accent }} />}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[16px] text-white">{title}</span>
        <span className="block text-[13px] leading-snug mt-0.5" style={{ color: TG.muted }}>{sub}</span>
      </span>
    </button>
  );
}

/** The private invite link with copy, QR and revoke — the card Telegram shows under a private chat's type. */
export function InviteLinkCard({ link, t, onCopy, onRevoke, onQr }) {
  return (
    <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: TG.card }}>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex-1 min-w-0 text-[16px] font-medium truncate" style={{ color: TG.accent }} dir="ltr">{link}</span>
        <button type="button" onClick={onQr} aria-label="QR" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ color: TG.muted }}>
          <QrCode className="w-5 h-5" />
        </button>
      </div>
      <div className="flex divide-x divide-white/[0.06] border-t border-white/[0.06]">
        <button type="button" onClick={onCopy} className="flex-1 flex items-center justify-center gap-2 h-11 text-[14px] font-semibold" style={{ color: TG.accent }}>
          <Copy className="w-4 h-4" /> {t.copyLink}
        </button>
        {onRevoke && (
          <button type="button" onClick={onRevoke} className="flex-1 flex items-center justify-center gap-2 h-11 text-[14px] font-semibold" style={{ color: TG.accent }}>
            <RefreshCw className="w-4 h-4" /> {t.revokeLink}
          </button>
        )}
      </div>
    </div>
  );
}

const LINK_ERROR = { short: "linkShort", long: "linkLong", chars: "linkChars", start: "linkStart", taken: "linkTaken" };

/**
 * Public or private, and the link that goes with it. Used both while creating
 * (the corner button moves on) and later from the info screen (it saves).
 */
export function ChatTypeScreen({ kind, draft, chats, selfId = null, isRtl, t, onBack, onDone, onToast, onRevoke, nextIcon = ArrowRight, nextLabel }) {
  const [isPublic, setIsPublic] = useState(!!draft.isPublic);
  const [username, setUsername] = useState(draft.username || "");
  const isChannel = kind === "channel";
  const slug = username.trim().toLowerCase();
  const error = isPublic ? validateUsername(slug, chats, selfId) : null;
  const copy = () => { navigator.clipboard?.writeText(appLinkFor({ ...draft, isPublic: false }) || chatLink({ ...draft, isPublic: false })).catch(() => {}); onToast(t.chatLinkCopied); };
  return (
    <StepScreen title={isChannel ? t.channelSettings : t.groupSettings} isRtl={isRtl} t={t} onBack={onBack}
      fab={() => onDone({ isPublic, username: isPublic ? slug : "" })} fabDisabled={!!error} fabIcon={nextIcon} fabLabel={nextLabel || t.next}>
      <span className="block px-4 pt-4 pb-1 text-[14px] font-semibold" style={{ color: TG.accent }}>{isChannel ? t.channelType : t.groupType}</span>
      <div className="divide-y divide-white/[0.05]">
        <RadioRow on={isPublic} onClick={() => setIsPublic(true)}
          title={isChannel ? t.publicChannel : t.publicGroup} sub={isChannel ? t.publicChannelSub : t.publicGroupSub} />
        <RadioRow on={!isPublic} onClick={() => setIsPublic(false)}
          title={isChannel ? t.privateChannel : t.privateGroup} sub={isChannel ? t.privateChannelSub : t.privateGroupSub} />
      </div>
      <div className="h-2 my-2" style={{ background: TG.surface }} />

      {isPublic ? (
        <div className="px-4 pt-2">
          <span className="block text-[14px] font-semibold mb-2" style={{ color: TG.accent }}>{t.linkLabel}</span>
          <div className="flex items-center border-b-2 pb-1.5" style={{ borderColor: error && slug ? "#ef4444" : TG.accent }} dir="ltr">
            <span className="text-[17px] text-neutral-500 shrink-0">{LINK_HOST}/</span>
            <input value={username} onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ""))} aria-label={t.linkLabel}
              autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={32}
              className="flex-1 min-w-0 bg-transparent text-[17px] text-white focus:outline-none" />
          </div>
          <p className="text-[13px] leading-snug mt-3" style={{ color: error ? (slug ? "#ef4444" : TG.muted) : "#1f9d4d" }}>
            {error ? (slug ? t[LINK_ERROR[error]] : t.linkRules) : t.linkFree}
          </p>
          <p className="text-[13px] leading-snug mt-3" style={{ color: TG.muted }}>{t.linkHint}</p>
        </div>
      ) : (
        <div className="pt-2">
          <span className="block px-4 text-[14px] font-semibold mb-2" style={{ color: TG.accent }}>{t.inviteLink}</span>
          <InviteLinkCard link={draft.inviteLink} t={t} onCopy={copy} onQr={() => onToast(t.qrSoon)} onRevoke={onRevoke} />
          <p className="px-4 text-[13px] leading-snug mt-3" style={{ color: TG.muted }}>{t.inviteLinkHint}</p>
        </div>
      )}
    </StepScreen>
  );
}

/** Everyone the athlete could add: contacts, people they added by hand, and teammates who showed their name. */
export function addablePeople(store) {
  const revealed = (store.buddy?.matches || []).filter((m) => m.revealed).map((m) => findUser(m.buddyId));
  return [...PEOPLE, ...store.customUsers, ...revealed].filter((u) => !(store.blocked || []).includes(u.id));
}

/**
 * The people picker: a search field, chips for whoever is ticked, and the
 * contact list with round checkboxes. `exclude` hides people already in.
 */
export function MemberPickerScreen({ store, title, placeholder, exclude = [], initial = [], isRtl, t, onBack, onDone, allowEmpty = true, doneIcon = ArrowRight, doneLabel, zIndex }) {
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState(initial);
  const people = useMemo(() => {
    const q = query.trim().toLowerCase();
    return addablePeople(store)
      .filter((u) => u.id !== ME && !exclude.includes(u.id))
      .filter((u) => !q || u.name.toLowerCase().includes(q) || (u.nameFa || "").includes(q) || (u.username || "").toLowerCase().includes(q))
      .sort((a, b) => {
        if (a.online !== b.online) return a.online ? -1 : 1;
        return new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0);
      });
  }, [store, query, exclude]);
  const toggle = (id) => setPicked((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const nameOf = (u) => (isRtl ? u.nameFa || u.name : u.name);
  const subOf = (u) => (u.online ? t.online : u.lastSeen ? `${t.lastSeen} ${relativeTime(u.lastSeen, t)}` : t.lastSeenRecently);

  return (
    <StepScreen title={title} subtitle={t.membersPicked(picked.length)} isRtl={isRtl} t={t} onBack={onBack} zIndex={zIndex}
      fab={() => onDone(picked)} fabDisabled={!allowEmpty && !picked.length} fabIcon={doneIcon} fabLabel={doneLabel || t.next}>
      <div className="px-4 pt-3 pb-2" style={{ background: TG.surface }}>
        {picked.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pb-2">
            {picked.map((id) => {
              const u = findUser(id);
              return (
                <button key={id} type="button" onClick={() => toggle(id)} aria-label={`${t.removeFromChat} ${nameOf(u)}`}
                  className="flex items-center gap-1.5 ps-1 pe-2.5 h-8 rounded-full" style={{ background: TG.card }}>
                  <Avatar user={u} size={24} showStatus={false} />
                  <span className="text-[13px] font-medium text-white">{nameOf(u)}</span>
                  <X className="w-3.5 h-3.5" style={{ color: TG.muted }} />
                </button>
              );
            })}
          </div>
        )}
        <div className="flex items-center gap-2 h-10">
          <Search className="w-5 h-5 shrink-0" style={{ color: TG.muted }} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} aria-label={placeholder}
            className="flex-1 min-w-0 bg-transparent text-[16px] text-white placeholder:text-neutral-500 focus:outline-none" />
        </div>
      </div>

      <div className="mt-2" style={{ background: TG.surface }}>
        {people.length === 0 && <p className="px-4 py-10 text-center text-[14px]" style={{ color: TG.muted }}>{t.noContactsMatch}</p>}
        {people.map((u) => {
          const on = picked.includes(u.id);
          return (
            <button key={u.id} type="button" onClick={() => toggle(u.id)} role="checkbox" aria-checked={on} aria-label={nameOf(u)}
              className="w-full flex items-center gap-3 px-4 py-2 text-start active:bg-black/[0.04]">
              <span className="relative shrink-0">
                <Avatar user={u} size={50} ring={TG.surface} />
                {on && (
                  <span className="absolute -bottom-0.5 -end-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 on-accent"
                    style={{ background: "#34c759", borderColor: TG.surface }}>
                    <Check className="w-3 h-3 text-white stroke-[3]" />
                  </span>
                )}
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="text-[16px] font-medium text-white truncate">{nameOf(u)}</span>
                  <NameBadges verified={u.verified} premium={u.premium} size={14} />
                </span>
                <span className="block text-[13px]" style={{ color: u.online ? TG.accent : TG.muted }}>{subOf(u)}</span>
              </span>
              <span className="w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0 on-accent"
                style={{ background: on ? TG.accentDeep : "transparent", borderColor: on ? TG.accentDeep : TG.muted }}>
                {on && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
              </span>
            </button>
          );
        })}
      </div>
    </StepScreen>
  );
}

/** What an admin can do to one member: promote or demote, or remove them. */
export function MemberActionsSheet({ user, chat, isRtl, t, onToggleAdmin, onRemove, onClose }) {
  const isAdmin = chat.admins.includes(user.id);
  const name = isRtl ? user.nameFa || user.name : user.name;
  return (
    <Sheet title={name} isRtl={isRtl} t={t} onClose={onClose}>
      <div className="py-1">
        <button type="button" onClick={onToggleAdmin} className="w-full flex items-center gap-3 px-4 py-3 text-start">
          <ShieldCheck className="w-5 h-5 shrink-0" style={{ color: TG.accent }} />
          <span className="text-[16px] font-medium text-white">{isAdmin ? t.dismissAdmin : t.makeAdmin}</span>
        </button>
        <button type="button" onClick={onRemove} className="w-full flex items-center gap-3 px-4 py-3 text-start">
          <UserMinus className="w-5 h-5 shrink-0 text-rose-500" />
          <span className="text-[16px] font-medium text-rose-500">{t.removeFromChat}</span>
        </button>
      </div>
    </Sheet>
  );
}
