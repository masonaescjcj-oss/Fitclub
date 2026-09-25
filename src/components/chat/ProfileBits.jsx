import React from "react";
import { ArrowLeft, ArrowRight, Cake, Copy, Gem, HardHat, HeartHandshake, QrCode, RefreshCw, Rocket, Trophy } from "lucide-react";
import { IconButton, Label, List, cx } from "../ui/kit";
import { Avatar } from "./ChatBits";

/**
 * Pieces of the messenger's profile screens, in the app's own language: a
 * round back button and an Edit pill, a big centred avatar with the name
 * under it, a row of round actions, and white cards of rows underneath.
 */

/** The status glyph lives with the avatar in ChatBits; profiles use the same one. */
export { StatusIcon } from "./ChatBits";

/** Gifts keep their emoji as data (it lands in the chat as a sticker); tiles draw an icon. */
export const GIFT_ICONS = { cake: Cake, cap: HardHat, trophy: Trophy, bear: HeartHandshake, rocket: Rocket, ring: Gem };
export const GIFT_TONES = ["bg-sand", "bg-mist", "bg-accent", "bg-coach", "bg-sage", "bg-jet"];

/** One gift as a tile: an icon on its tone, the name, and whatever sits under it. */
export function GiftTile({ gift, index, isRtl, children, className = "" }) {
  const Icon = GIFT_ICONS[gift.id] || Trophy;
  const tone = GIFT_TONES[index % GIFT_TONES.length];
  return (
    <span className={cx("relative rounded-[22px] bg-sunk p-3 flex flex-col items-center gap-2 text-center", className)}>
      <span className={cx("w-12 h-12 rounded-full flex items-center justify-center", tone,
        tone === "bg-jet" ? "text-accent dark:ring-1 dark:ring-inset dark:ring-line" : "text-on-accent")}>
        <Icon className="w-6 h-6" strokeWidth={2} />
      </span>
      <span className="text-xs font-semibold leading-tight text-ink">{isRtl ? gift.nameFa : gift.nameEn}</span>
      {children}
    </span>
  );
}

/**
 * The top of a profile: back and Edit on one row, then the avatar, the name
 * with its badges, a subtitle, and anything else (a tag, a description).
 * `color` and `emoji` are accepted for older callers; the avatar is drawn
 * from `chat`/`user` by ChatBits, or passed whole as `avatar`.
 */
export function Hero({ color, emoji, chat, user, avatar, name, subtitle, badges, isRtl, t, onBack, editLabel, onEdit, right, children }) {
  const Back = isRtl ? ArrowRight : ArrowLeft;
  return (
    <>
      <div className="flex items-center justify-between gap-2 pt-3">
        <IconButton label={t.close} tone="card" onClick={onBack}>
          <Back className="w-5 h-5" strokeWidth={2} />
        </IconButton>
        <div className="flex items-center gap-2">
          {right}
          {onEdit && (
            <button type="button" onClick={onEdit}
              className="h-11 px-[18px] rounded-full bg-card text-ink text-[15px] font-semibold border-0 cursor-pointer transition-transform active:scale-[0.98]">
              {editLabel}
            </button>
          )}
        </div>
      </div>
      <section aria-label={typeof name === "string" ? name : undefined} className="flex flex-col items-center text-center">
        {avatar || <Avatar chat={chat} user={user} size={104} showStatus={false} />}
        {/* Long names wrap (balanced) rather than cut off; the badges ride the last line. */}
        <h1 className={cx("m-0 mt-4 max-w-full font-display font-extrabold leading-[1.05] tracking-[-0.04em] text-ink break-words [text-wrap:balance]",
          String(name || "").length > 16 ? "text-[28px]" : "text-[34px]")}>
          {name}
          {badges && <span className="inline-flex items-center gap-1 ms-1.5 align-middle -translate-y-0.5">{badges}</span>}
        </h1>
        {subtitle && <span className="mt-2 text-sm text-muted">{subtitle}</span>}
        {children}
      </section>
    </>
  );
}

/** Round actions under the name: message, call, mute, search, more. */
export function ActionRow({ actions }) {
  return (
    <div className="flex justify-center gap-1.5 mt-1">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <button key={a.id} type="button" onClick={a.onClick} aria-label={a.label}
            className="w-[68px] flex flex-col items-center gap-1.5 bg-transparent border-0 p-0 cursor-pointer group">
            <span className="w-11 h-11 rounded-full bg-card text-ink flex items-center justify-center transition-transform group-active:scale-95">
              <Icon className="w-5 h-5" strokeWidth={2} />
            </span>
            <span className="block max-w-full truncate text-xs font-semibold text-ink first-letter:uppercase">{a.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** A mono caps label over a card, with a count or note on the far side. */
export function SectionHeader({ label, trailing }) {
  return (
    <div className="flex items-center justify-between gap-3 mt-2 px-1">
      <Label as="h2" className="m-0 inline-flex items-center gap-1.5">{label}</Label>
      {trailing && <span className="text-[13px] text-muted inline-flex items-center gap-1">{trailing}</span>}
    </div>
  );
}

/** A white card of rows split by hairlines. Children are list items. */
export function Card({ children, className = "" }) {
  return <List className={cx("overflow-hidden", className)}>{children}</List>;
}

/**
 * A label over a value, the way Telegram lists a phone or a bio. Links are
 * ink and semibold; `onClick` makes the whole row a button, and `action`
 * puts an icon (a copy glyph) on the far side.
 */
export function InfoRow({ label, value, dir, link = false, onClick, action, actionLabel }) {
  if (!value) return null;
  const Tag = onClick ? "button" : "div";
  return (
    <li className="list-none">
      <Tag type={onClick ? "button" : undefined} onClick={onClick} aria-label={actionLabel ? `${actionLabel}: ${value}` : undefined}
        className={cx("w-full min-h-[56px] flex items-center gap-3 px-4 py-2.5 text-start bg-transparent border-0",
          onClick && "cursor-pointer active:bg-sunk transition-colors")}>
        <span className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="text-[13px] text-muted">{label}</span>
          <span className={cx("text-[15px] leading-snug break-words text-ink", link ? "font-semibold" : "font-medium")}>
            <span dir={dir}>{value}</span>
          </span>
        </span>
        {action && <span className="shrink-0 w-9 h-9 rounded-full bg-sunk text-ink flex items-center justify-center">{action}</span>}
      </Tag>
    </li>
  );
}

/** The copy glyph InfoRow uses for "Copy ID". */
export const CopyGlyph = () => <Copy className="w-4 h-4" strokeWidth={2} />;

/** A chat teased inside a profile — the channel someone runs, a shared group. */
export function ChatPreviewCard({ chat, user, title, preview, time, onClick }) {
  return (
    <li className="list-none">
      <button type="button" onClick={onClick}
        className="w-full min-h-[64px] flex items-center gap-3 px-4 py-2.5 text-start bg-transparent border-0 cursor-pointer active:bg-sunk transition-colors">
        <Avatar chat={chat} user={user} size={48} showStatus={false} />
        <span className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="flex items-baseline gap-2">
            <span className="flex-1 min-w-0 text-[15px] font-semibold text-ink truncate">{title}</span>
            {time && <span className="text-xs text-muted shrink-0" dir="auto">{time}</span>}
          </span>
          {preview && <span className="block text-[13px] text-muted truncate">{preview}</span>}
        </span>
      </button>
    </li>
  );
}

/**
 * A chat's link on the ink card: the address in display type with its slug
 * in accent, an accent Copy button, QR, and Revoke for private invites.
 */
export function LinkCard({ label, link, hint, t, isRtl, onCopy, onQr, onRevoke }) {
  const cut = link.lastIndexOf("/");
  const host = cut >= 0 ? link.slice(0, cut + 1) : "";
  const slug = cut >= 0 ? link.slice(cut + 1) : link;
  return (
    <section aria-label={label} className="ui-hero rounded-3xl bg-hero text-hero-fg p-4 flex flex-col gap-3">
      <Label className="!text-hero-muted">{label}</Label>
      <span className={cx("font-display font-bold leading-tight tracking-[-0.02em] break-all",
        link.length <= 20 ? "text-[22px]" : link.length <= 28 ? "text-[19px]" : "text-base")}>
        <span dir="ltr">{host}<span className="text-accent">{slug}</span></span>
      </span>
      <div className="flex gap-2">
        <button type="button" onClick={onCopy}
          className="flex-1 h-11 rounded-full bg-accent text-on-accent inline-flex items-center justify-center gap-2 text-sm font-bold border-0 cursor-pointer transition-transform active:scale-[0.98]">
          <Copy className="w-4 h-4" strokeWidth={2.2} />{t.copyLink}
        </button>
        {onQr && (
          <IconButton label={isRtl ? "کد QR" : "Show QR code"} tone="hero" onClick={onQr}>
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
