import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Check, Copy, QrCode, RefreshCw, Search, ShieldCheck, UserMinus, X,
} from "lucide-react";
import { ME, LINK_HOST, chatLink, relativeTime, validateUsername } from "../../lib/chat/chatModel";
import { PEOPLE, findUser } from "../../lib/chat/chatStore";
import {
  Button, Check as RoundCheck, CtaButton, Field, IconButton, IconWell, Label, List, Row, Sheet, cx, num,
} from "../ui/kit";
import { Avatar, NameBadges } from "./ChatBits";
import { appLinkFor } from "../../lib/chat/search";

/*
 * Making and running groups and channels, laid out like the Android client:
 * details (picture, name, description) → type (public link / private invite
 * link) → people, each a full screen pushed over the last with the step's
 * action pinned at the bottom.
 */

// Kept for anything that still reads them; chats are now drawn as an icon on a tone picked from the name.
export const COVER_EMOJI = ["📣", "👥", "🏋️", "🔥", "💪", "🏃", "🧘", "🥗", "🏆", "⚡", "🎯", "🚴", "🥊", "🏊", "📋", "🍎"];
export const COVER_COLORS = ["#3390ec", "#e0567d", "#f59e0b", "#10b981", "#8b5cf6", "#38bdf8", "#844783", "#ef4444"];

/**
 * The frame every step shares: a round back button and the title, the
 * content, and the step's action pinned under it. Moving on is the arrow
 * CTA; finishing (a tick) is an ink pill with the tick.
 */
export function StepScreen({ title, subtitle, isRtl, t, onBack, children, fab, fabDisabled = false, fabLabel, fabIcon: FabIcon = Check, zIndex = 75 }) {
  const Back = isRtl ? ArrowRight : ArrowLeft;
  const moves = FabIcon === ArrowRight;
  return (
    <motion.div initial={{ x: isRtl ? "-100%" : "100%" }} animate={{ x: 0 }} exit={{ x: isRtl ? "-100%" : "100%" }}
      transition={{ type: "spring", stiffness: 380, damping: 40 }}
      className="ui fixed inset-0 flex flex-col md:max-w-lg md:mx-auto"
      style={{ zIndex }} dir={isRtl ? "rtl" : "ltr"}>
      <div className="shrink-0 flex items-center gap-3 px-5 pt-[max(env(safe-area-inset-top),20px)] pb-3">
        <IconButton label={t.close} tone="card" onClick={onBack}>
          <Back className="w-5 h-5" strokeWidth={2} />
        </IconButton>
        <span className="flex-1 min-w-0 flex flex-col gap-0.5">
          <h1 className="m-0 truncate font-display font-extrabold text-[28px] leading-none tracking-[-0.035em] text-ink">{title}</h1>
          {subtitle && <span className="text-[13px] leading-tight text-muted">{subtitle}</span>}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pt-2 pb-6 flex flex-col gap-3.5">{children}</div>

      {fab && (
        <div className="shrink-0 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),20px)]">
          {moves ? (
            <CtaButton isRtl={isRtl} onClick={fab} disabled={fabDisabled} aria-label={fabLabel}>{fabLabel}</CtaButton>
          ) : (
            <Button tone="ink" size="lg" block onClick={fab} disabled={fabDisabled} aria-label={fabLabel}
              icon={<FabIcon className="w-5 h-5" strokeWidth={2.4} />}>
              {fabLabel}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}

/** A multi-line field that matches the kit Field: label, soft well, ink focus ring. */
function TextArea({ label, value, onChange, maxLength, rows = 3 }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-muted">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} maxLength={maxLength} rows={rows}
        className="w-full rounded-2xl bg-card px-4 py-3.5 text-base leading-snug text-ink border-0 outline-none focus-visible:outline-none resize-none placeholder:text-muted/70 focus:ring-2 focus:ring-inset focus:ring-ink transition-shadow" />
    </label>
  );
}

/**
 * Step one for a channel, step two for a group: the picture (drawn from the
 * name), the name and an optional description. `nextIcon` says whether the
 * action moves on or finishes.
 */
export function ChatDetailsScreen({ kind, initial = {}, title, isRtl, t, onBack, onNext, nextIcon = ArrowRight, nextLabel }) {
  const [name, setName] = useState(initial.title || "");
  const [description, setDescription] = useState(initial.description || "");
  // The stored picture values ride along unchanged; the avatar itself is an icon on the name's tone.
  const emoji = initial.emoji || (kind === "channel" ? "📣" : "👥");
  const color = initial.color || (kind === "channel" ? "#f59e0b" : "#2fa6ff");
  const isChannel = kind === "channel";
  const preview = { id: initial.id || `new-${kind}`, type: kind, crew: initial.crew, title: name.trim() || title, titleFa: name.trim() || title };
  return (
    <StepScreen title={title} isRtl={isRtl} t={t} onBack={onBack}
      fab={() => onNext({ title: name.trim(), description: description.trim(), emoji, color })}
      fabDisabled={!name.trim()} fabIcon={nextIcon} fabLabel={nextLabel || t.next}>
      <div className="flex flex-col items-center gap-3 pt-2 pb-1">
        <Avatar chat={preview} size={96} />
        <span className="text-[13px] text-muted text-center max-w-[260px]">
          {isRtl ? "تصویر از روی نام ساخته می‌شود." : "The picture is drawn from the name."}
        </span>
      </div>
      <Field label={isChannel ? t.channelName : t.groupName} aria-label={isChannel ? t.channelName : t.groupName}
        value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={64} />
      <TextArea label={t.descriptionOptional} value={description} onChange={setDescription} maxLength={255} />
      <p className="m-0 -mt-1 px-1 text-[13px] leading-snug text-muted">{isChannel ? t.descriptionHint : t.groupDescriptionHint}</p>
    </StepScreen>
  );
}

/** The radio mark: ink with an accent dot when chosen, a faint ring when not. `alert` tints it for reports. */
export function RadioMark({ on, alert = false }) {
  return (
    <span aria-hidden="true" className={cx("w-[26px] h-[26px] rounded-full flex items-center justify-center shrink-0 transition-colors",
      on ? (alert ? "bg-alert" : "bg-jet dark:bg-accent") : "ring-2 ring-inset ring-faint")}>
      {on && <span className={cx("w-2.5 h-2.5 rounded-full", alert ? "bg-card" : "bg-accent dark:bg-jet")} />}
    </span>
  );
}

function RadioRow({ on, title, sub, onClick }) {
  return (
    <li className="list-none">
      <button type="button" onClick={onClick} role="radio" aria-checked={on} aria-label={title}
        className="w-full min-h-[64px] flex items-start gap-3.5 px-4 py-3 text-start bg-transparent border-0 cursor-pointer active:bg-sunk transition-colors">
        <span className="mt-0.5"><RadioMark on={on} /></span>
        <span className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="text-[15px] font-semibold text-ink">{title}</span>
          <span className="text-[13px] leading-snug text-muted">{sub}</span>
        </span>
      </button>
    </li>
  );
}

/**
 * The private invite link with copy, QR and revoke: the card Telegram shows
 * under a private chat's type, drawn as the ink link card the info screen
 * uses. It carries no outer margin; the screen places it.
 */
export function InviteLinkCard({ link, t, onCopy, onRevoke, onQr, label, hint, isRtl, className = "" }) {
  const text = String(link || "");
  const cut = text.lastIndexOf("/");
  const host = cut >= 0 ? text.slice(0, cut + 1) : "";
  const slug = cut >= 0 ? text.slice(cut + 1) : text;
  return (
    <section aria-label={label || t.inviteLink} className={cx("ui-hero rounded-3xl bg-hero text-hero-fg p-4 flex flex-col gap-3", className)}>
      <Label className="!text-hero-muted">{label || t.inviteLink}</Label>
      <span className="font-display font-bold text-[22px] leading-tight tracking-[-0.02em] break-all">
        <span dir="ltr">{host}<span className="text-accent">{slug}</span></span>
      </span>
      <div className="flex gap-2">
        <Button tone="accent" className="flex-1 !h-11 text-sm font-bold" onClick={onCopy} icon={<Copy className="w-4 h-4" strokeWidth={2.2} />}>
          {t.copyLink}
        </Button>
        {onQr && (
          <IconButton label={isRtl ? "کد QR" : "QR code"} tone="hero" onClick={onQr}>
            <QrCode className="w-5 h-5" strokeWidth={2} />
          </IconButton>
        )}
        {onRevoke && (
          <IconButton label={t.revokeLink} tone="hero" onClick={onRevoke}>
            <RefreshCw className="w-5 h-5" strokeWidth={2} />
          </IconButton>
        )}
      </div>
      {hint && <span className="text-[13px] leading-snug text-hero-muted">{hint}</span>}
    </section>
  );
}

const LINK_ERROR = { short: "linkShort", long: "linkLong", chars: "linkChars", start: "linkStart", taken: "linkTaken" };

/**
 * Public or private, and the link that goes with it. Used both while creating
 * (the action moves on) and later from the info screen (it saves).
 */
export function ChatTypeScreen({ kind, draft, chats, selfId = null, isRtl, t, onBack, onDone, onToast, onRevoke, nextIcon = ArrowRight, nextLabel }) {
  const [isPublic, setIsPublic] = useState(!!draft.isPublic);
  const [username, setUsername] = useState(draft.username || "");
  const isChannel = kind === "channel";
  const slug = username.trim().toLowerCase();
  const error = isPublic ? validateUsername(slug, chats, selfId) : null;
  const copy = () => { navigator.clipboard?.writeText(appLinkFor({ ...draft, isPublic: false }) || chatLink({ ...draft, isPublic: false })).catch(() => {}); onToast(t.chatLinkCopied); };
  const dir = isRtl ? "rtl" : "ltr";
  return (
    <StepScreen title={isChannel ? t.channelSettings : t.groupSettings} isRtl={isRtl} t={t} onBack={onBack}
      fab={() => onDone({ isPublic, username: isPublic ? slug : "" })} fabDisabled={!!error} fabIcon={nextIcon} fabLabel={nextLabel || t.next}>
      <Label as="h2" className="m-0 px-1">{isChannel ? t.channelType : t.groupType}</Label>
      <List role="radiogroup" aria-label={isChannel ? t.channelType : t.groupType}>
        <RadioRow on={isPublic} onClick={() => setIsPublic(true)}
          title={isChannel ? t.publicChannel : t.publicGroup} sub={isChannel ? t.publicChannelSub : t.publicGroupSub} />
        <RadioRow on={!isPublic} onClick={() => setIsPublic(false)}
          title={isChannel ? t.privateChannel : t.privateGroup} sub={isChannel ? t.privateChannelSub : t.privateGroupSub} />
      </List>

      {isPublic ? (
        <>
          <Label as="h2" className="m-0 mt-2 px-1">{t.linkLabel}</Label>
          {/* The link reads left to right in both languages; its message follows the page. */}
          <div dir="ltr">
            <Field value={username} onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ""))} aria-label={t.linkLabel}
              prefix={<span className="text-muted font-medium">{LINK_HOST}/</span>}
              autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={32}
              error={error && slug ? <span dir={dir} className="block text-start">{t[LINK_ERROR[error]]}</span> : null}
              hint={<span dir={dir} className={cx("flex items-center gap-1.5", !error && "text-ink font-medium")}>
                {!error && <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.6} />}
                {error ? t.linkRules : t.linkFree}
              </span>} />
          </div>
          <p className="m-0 px-1 text-[13px] leading-snug text-muted">{t.linkHint}</p>
        </>
      ) : (
        <>
          <InviteLinkCard link={draft.inviteLink} t={t} isRtl={isRtl} className="mt-2" hint={t.inviteLinkHint}
            onCopy={copy} onQr={() => onToast(t.qrSoon)} onRevoke={onRevoke} />
        </>
      )}
    </StepScreen>
  );
}

/** Everyone the athlete could add: contacts, people they added by hand, and teammates who showed their name. */
export function addablePeople(store) {
  const revealed = (store.buddy?.matches || []).filter((m) => m.revealed).map((m) => findUser(m.buddyId));
  return [...PEOPLE, ...store.customUsers, ...(store.remoteUsers || []), ...revealed].filter((u) => !(store.blocked || []).includes(u.id));
}

/**
 * The people picker: a search field, chips for whoever is ticked, and the
 * contact list with round checks. `exclude` hides people already in.
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
  const subOf = (u) => (u.online ? t.online : u.lastSeen ? `${t.lastSeen} ${num(relativeTime(u.lastSeen, t), isRtl)}` : t.lastSeenRecently);
  const count = t.membersPicked(picked.length);

  return (
    <StepScreen title={title} subtitle={isRtl ? num(count, true) : count} isRtl={isRtl} t={t} onBack={onBack} zIndex={zIndex}
      fab={() => onDone(picked)} fabDisabled={!allowEmpty && !picked.length} fabIcon={doneIcon} fabLabel={doneLabel || t.next}>
      <Field type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        prefix={<Search className="w-[18px] h-[18px] text-muted" strokeWidth={2} />} />

      {picked.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {picked.map((id) => {
            const u = findUser(id);
            return (
              <button key={id} type="button" onClick={() => toggle(id)} aria-label={`${t.removeFromChat} ${nameOf(u)}`}
                className="h-9 ps-1 pe-3 rounded-full bg-inv text-on-inv inline-flex items-center gap-1.5 border-0 cursor-pointer active:scale-[0.98] transition-transform">
                <Avatar user={u} size={28} showStatus={false} />
                <span className="text-[13px] font-semibold max-w-[140px] truncate">{nameOf(u)}</span>
                <X className="w-3.5 h-3.5 opacity-70" strokeWidth={2.4} />
              </button>
            );
          })}
        </div>
      )}

      <List>
        {people.length === 0 && <li className="list-none px-4 py-10 text-center text-sm text-muted">{t.noContactsMatch}</li>}
        {people.map((u) => {
          const on = picked.includes(u.id);
          return (
            // The whole row toggles; the round check is the control for keyboards and screen readers.
            <li key={u.id} onClick={() => toggle(u.id)}
              className="list-none min-h-[64px] flex items-center gap-3 ps-4 pe-4 py-2 cursor-pointer active:bg-sunk transition-colors">
              <RoundCheck checked={on} label={nameOf(u)} onToggle={(e) => { e.stopPropagation(); toggle(u.id); }} />
              <Avatar user={u} size={44} />
              <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[15px] font-semibold text-ink truncate">{nameOf(u)}</span>
                  <NameBadges verified={u.verified} premium={u.premium} size={14} />
                </span>
                <span className={cx("text-[13px] truncate", u.online ? "text-ink font-medium" : "text-muted")}>{subOf(u)}</span>
              </span>
            </li>
          );
        })}
      </List>
    </StepScreen>
  );
}

/** What an admin can do to one member: promote or demote, or remove them. */
export function MemberActionsSheet({ user, chat, isRtl, t, onToggleAdmin, onRemove, onClose }) {
  const isAdmin = chat.admins.includes(user.id);
  const name = isRtl ? user.nameFa || user.name : user.name;
  return (
    <Sheet title={name} isRtl={isRtl} onClose={onClose} closeLabel={t.close}>
      <List>
        <Row onClick={onToggleAdmin} isRtl={isRtl} title={isAdmin ? t.dismissAdmin : t.makeAdmin}
          icon={<IconWell size={40} tone="sunk"><ShieldCheck className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>} />
        <Row onClick={onRemove} isRtl={isRtl} danger title={t.removeFromChat}
          icon={<IconWell size={40} tone="alert"><UserMinus className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>} />
      </List>
    </Sheet>
  );
}
