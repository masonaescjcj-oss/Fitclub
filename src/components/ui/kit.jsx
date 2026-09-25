// "Ink & Volt" building blocks. Every redesigned screen is composed from
// these, so type, radius, colour and touch targets stay the same everywhere.
//
// Rules the pieces encode:
// - Cards have no borders; the paper ground separates them.
// - Accent (volt by default) sits on ink, or as a fill under ink text.
// - Lilac always means the coach.
// - Every tap target is at least 44 px.
// - Labels are Geist Mono caps; big numbers and titles are Bricolage 800.
//
// Only token colours are used here (canvas, card, ink, …). The legacy
// light-theme remap in theme-light.css rewrites classes like bg-white and
// text-white, so they would misbehave inside a redesigned screen.

import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check as CheckIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

export const cx = (...parts) => parts.filter(Boolean).join(" ");

/** Persian digits for Persian screens; numbers stay Latin otherwise. */
export function num(value, isRtl) {
  const s = String(value);
  return isRtl ? s.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]) : s;
}

/* ─────────────────────────────── layout ─────────────────────────────── */

/** A full redesigned screen. `tabbed` leaves room for the floating tab bar. */
export function Screen({ isRtl, tabbed = false, className = "", children, ...rest }) {
  return (
    <div dir={isRtl ? "rtl" : "ltr"} {...rest}
      className={cx("ui min-h-[100dvh] w-full px-5 pt-[max(env(safe-area-inset-top),20px)] flex flex-col gap-3.5",
        tabbed ? "pb-32" : "pb-10", className)}>
      {children}
    </div>
  );
}

/** The mono caps label used for eyebrows and section names. */
export function Label({ as: Tag = "span", className = "", children, ...rest }) {
  return (
    <Tag {...rest} className={cx("font-mono text-[11px] font-medium uppercase tracking-label text-muted", className)}>
      {children}
    </Tag>
  );
}

/**
 * Screen heading: eyebrow above a big display title, actions on the far side.
 * `lg` (38) is a tab's title, `md` (32) a greeting, `xl` (42) a hero.
 */
export function PageHead({ eyebrow, title, right, size = "lg", className = "" }) {
  const sizes = { md: "text-[32px] leading-none tracking-[-0.035em]", lg: "text-[38px] leading-[0.95] tracking-[-0.04em]", xl: "text-[42px] leading-[0.95] tracking-[-0.04em]" };
  return (
    <header className={cx("flex items-end justify-between gap-3 pt-3", className)}>
      <div className="flex flex-col gap-1.5 min-w-0">
        {eyebrow && <Label>{eyebrow}</Label>}
        <h1 className={cx("m-0 font-display font-extrabold text-ink", sizes[size])}>{title}</h1>
      </div>
      {right && <div className="flex gap-2 shrink-0">{right}</div>}
    </header>
  );
}

/** A sub-screen bar: round back button, a title, and optional actions. */
export function TopBar({ title, onBack, isRtl, right, backLabel }) {
  const Back = isRtl ? ArrowRight : ArrowLeft;
  return (
    <div className="flex items-center gap-3 pt-3">
      {onBack && (
        <IconButton label={backLabel || (isRtl ? "بازگشت" : "Back")} onClick={onBack} tone="card">
          <Back className="w-5 h-5" strokeWidth={2} />
        </IconButton>
      )}
      <h1 className="m-0 flex-1 min-w-0 truncate font-display font-extrabold text-[28px] leading-none tracking-[-0.035em] text-ink">{title}</h1>
      {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
    </div>
  );
}

/** A section heading inside a screen, with an optional action on the far side. */
export function SectionHead({ title, action, onAction, className = "" }) {
  return (
    <div className={cx("flex items-center justify-between gap-3 mt-2", className)}>
      <Label as="h2" className="m-0">{title}</Label>
      {action && (
        <button type="button" onClick={onAction}
          className="h-11 -my-3 px-1 text-sm font-semibold text-ink underline underline-offset-[3px]">{action}</button>
      )}
    </div>
  );
}

/* ─────────────────────────────── surfaces ─────────────────────────────── */

const CARD_TONES = {
  card: "bg-card text-ink",
  sunk: "bg-sunk text-ink",
  hero: "ui-hero bg-hero text-hero-fg",
  accent: "bg-accent text-on-accent",
  coach: "bg-coach text-on-accent",
  inv: "bg-inv text-on-inv",
};

/** A rounded surface. `hero` is the ink card; `accent` and `coach` are fills. */
export function Card({ tone = "card", as: Tag = "section", pad = true, className = "", children, ...rest }) {
  const round = tone === "hero" ? "rounded-4xl" : "rounded-3xl";
  const padding = pad ? (tone === "hero" ? "p-5" : "p-4") : "";
  return (
    <Tag {...rest} className={cx(round, padding, CARD_TONES[tone], className)}>
      {children}
    </Tag>
  );
}

/** A card of rows separated by hairlines. */
export function List({ className = "", children, ...rest }) {
  return (
    <ul {...rest} className={cx("m-0 p-0 py-1 list-none rounded-3xl bg-card divide-y divide-hair", className)}>
      {children}
    </ul>
  );
}

/**
 * One row: optional leading icon/avatar, title and subtitle, and a trailing
 * value or chevron. Clickable when `onClick` is given.
 */
export function Row({ icon, title, subtitle, right, onClick, chevron, isRtl, danger, className = "", as, ...rest }) {
  const Chevron = isRtl ? ChevronLeft : ChevronRight;
  const Tag = as || (onClick ? "button" : "div");
  const body = (
    <Tag type={Tag === "button" ? "button" : undefined} onClick={onClick} {...rest}
      className={cx("w-full min-h-[56px] flex items-center gap-3.5 px-4 py-2.5 text-start bg-transparent border-0",
        onClick && "cursor-pointer active:bg-sunk transition-colors", className)}>
      {icon}
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className={cx("text-[15px] font-semibold leading-snug", danger ? "text-alert" : "text-ink")}>{title}</span>
        {subtitle && <span className="text-[13px] leading-snug text-muted">{subtitle}</span>}
      </span>
      {right != null && <span className="shrink-0 text-sm text-muted">{right}</span>}
      {chevron && <Chevron className="w-[18px] h-[18px] shrink-0 text-muted" strokeWidth={2} />}
    </Tag>
  );
  return <li className="list-none">{body}</li>;
}

/** A round icon well for list rows and notifications. */
export function IconWell({ tone = "sunk", square = false, size = 32, className = "", children }) {
  const tones = {
    sunk: "bg-sunk text-ink",
    inv: "bg-jet text-accent dark:ring-1 dark:ring-inset dark:ring-line",
    accent: "bg-accent text-on-accent",
    coach: "bg-coach text-on-accent",
    sand: "bg-sand text-on-accent",
    sage: "bg-sage text-on-accent",
    mist: "bg-mist text-on-accent",
    alert: "bg-alert/15 text-alert",
  };
  return (
    <span style={{ width: size, height: size }}
      className={cx("shrink-0 flex items-center justify-center", square ? "rounded-[14px]" : "rounded-full", tones[tone], className)}>
      {children}
    </span>
  );
}

/* ─────────────────────────────── buttons ─────────────────────────────── */

const BUTTON_TONES = {
  ink: "bg-inv text-on-inv",
  accent: "bg-accent text-on-accent",
  soft: "bg-sunk text-ink",
  card: "bg-card text-ink",
  hero: "bg-hero-2 text-hero-fg",
  ghost: "bg-transparent text-ink",
  danger: "bg-transparent text-alert",
};

/** A pill button. `size` sm 36 · md 48 · lg 56. */
export function Button({ tone = "ink", size = "md", block = false, icon, className = "", children, ...rest }) {
  const sizes = { sm: "h-9 px-4 text-sm", md: "h-12 px-5 text-[15px]", lg: "h-14 px-6 text-base" };
  return (
    <button type="button" {...rest}
      className={cx("inline-flex items-center justify-center gap-2 rounded-full font-semibold border-0 cursor-pointer select-none",
        "transition-transform active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed",
        sizes[size], BUTTON_TONES[tone], block && "w-full", className)}>
      {icon}
      {children}
    </button>
  );
}

/**
 * The primary call to action: label on the start side, a round arrow on the
 * end. On ink the arrow is accent; on accent the arrow is ink.
 */
export function CtaButton({ tone = "ink", isRtl, className = "", children, ...rest }) {
  const Arrow = isRtl ? ArrowLeft : ArrowRight;
  const shell = tone === "accent" ? "bg-accent text-on-accent" : "bg-inv text-on-inv";
  const knob = tone === "accent" ? "bg-hero text-accent" : "bg-accent text-on-accent";
  return (
    <button type="button" {...rest}
      className={cx("w-full h-14 rounded-full flex items-center justify-between ps-6 pe-2 text-base font-bold border-0 cursor-pointer",
        "transition-transform active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed", shell, className)}>
      <span className="truncate">{children}</span>
      <span className={cx("w-10 h-10 rounded-full flex items-center justify-center shrink-0", knob)}>
        <Arrow className="w-5 h-5" strokeWidth={2.2} />
      </span>
    </button>
  );
}

/** A 44 px round icon button. */
export function IconButton({ label, tone = "card", size = 44, className = "", children, badge, ...rest }) {
  const tones = {
    card: "bg-card text-ink",
    soft: "bg-sunk text-ink",
    inv: "bg-inv text-on-inv",
    hero: "bg-hero-2 text-hero-fg",
    accent: "bg-accent text-on-accent",
    ghost: "bg-transparent text-ink",
  };
  return (
    <button type="button" aria-label={label} title={label} {...rest} style={{ width: size, height: size }}
      className={cx("relative shrink-0 rounded-full flex items-center justify-center border-0 cursor-pointer transition-transform active:scale-95",
        tones[tone], className)}>
      {children}
      {badge}
    </button>
  );
}

/** A small count or dot badge for an icon button's corner. */
export function Badge({ count, tone = "inv", className = "" }) {
  const tones = { inv: "bg-inv text-on-inv dark:bg-accent dark:text-on-accent", accent: "bg-accent text-on-accent", alert: "bg-alert text-hero-fg" };
  if (!count) {
    return <span aria-hidden="true" className={cx("absolute top-[9px] end-[10px] w-[9px] h-[9px] rounded-full ring-2 ring-card", tones[tone], className)} />;
  }
  return (
    <span className={cx("absolute -top-1 -end-1 min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center ring-2 ring-canvas", tones[tone], className)}>
      {count > 9 ? "9+" : count}
    </span>
  );
}

/* ─────────────────────────────── selection ─────────────────────────────── */

/** Filter chip. Ink when on, soft when off. */
export function Chip({ active, onClick, className = "", children, onCard = false, ...rest }) {
  return (
    <button type="button" aria-pressed={!!active} onClick={onClick} {...rest}
      className={cx("h-9 px-4 rounded-full text-sm font-medium border-0 cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5 transition-colors",
        active ? "bg-inv text-on-inv" : onCard ? "bg-sunk text-ink" : "bg-card text-ink", className)}>
      {children}
    </button>
  );
}

/** A two-to-four way segmented control on a soft track. */
export function Segmented({ options, value, onChange, className = "", onCard = false }) {
  return (
    <div role="tablist" className={cx("flex p-1 rounded-full", onCard ? "bg-sunk" : "bg-card", className)}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button key={o.id} type="button" role="tab" aria-selected={on} onClick={() => onChange(o.id)}
            className={cx("flex-1 h-9 rounded-full text-sm border-0 cursor-pointer transition-colors whitespace-nowrap px-2",
              on ? (onCard ? "bg-card shadow-lift font-semibold text-ink" : "bg-inv text-on-inv font-semibold") : "bg-transparent text-muted font-medium")}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** An ink track with an accent knob. */
export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={!!checked} aria-label={label} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx("w-[52px] h-8 shrink-0 rounded-full p-[3px] flex border-0 cursor-pointer transition-colors disabled:opacity-40",
        checked ? "bg-jet dark:bg-accent justify-end" : "bg-line justify-start")}>
      <motion.span layout transition={{ type: "spring", stiffness: 500, damping: 34 }}
        className={cx("w-[26px] h-[26px] rounded-full", checked ? "bg-accent dark:bg-jet" : "bg-card shadow-lift")} />
    </button>
  );
}

/** A round checkbox: ink with an accent tick when done, a faint ring when open. */
export function Check({ checked, onToggle, label, size = 26, className = "" }) {
  return (
    <button type="button" role="checkbox" aria-checked={!!checked} aria-label={label} onClick={onToggle}
      className={cx("w-11 h-11 -ms-2 shrink-0 flex items-center justify-center border-0 bg-transparent cursor-pointer p-0", className)}>
      <motion.span animate={{ scale: checked ? [1, 1.15, 1] : 1 }} transition={{ duration: 0.25 }}
        style={{ width: size, height: size }}
        className={cx("rounded-full flex items-center justify-center",
          checked ? "bg-jet text-accent dark:bg-accent dark:text-on-accent" : "ring-2 ring-inset ring-faint")}>
        {checked && <CheckIcon className="w-[15px] h-[15px]" strokeWidth={3} />}
      </motion.span>
    </button>
  );
}

/* ─────────────────────────────── data ─────────────────────────────── */

/** A progress ring. Ink on line by default; children sit in the middle. */
export function Ring({ value = 0, size = 64, stroke = 8, color = "rgb(var(--ui-fg))", track = "rgb(var(--ui-line))", className = "", children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <span className={cx("relative inline-flex items-center justify-center shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }} />
      </svg>
      {children && <span className="relative flex flex-col items-center justify-center text-center">{children}</span>}
    </span>
  );
}

/** A horizontal progress bar. */
export function Bar({ value = 0, height = 6, color = "bg-inv", track = "bg-line", className = "" }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <span className={cx("block w-full rounded-full overflow-hidden", track, className)} style={{ height }}>
      <motion.span className={cx("block h-full rounded-full", color)} initial={{ width: 0 }} animate={{ width: `${v * 100}%` }}
        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }} />
    </span>
  );
}

/** A labelled bar: name and "eaten / target" above the track. */
export function Meter({ label, value, target, unit = "", color, isRtl, height = 6 }) {
  return (
    <span className="flex flex-col gap-1.5">
      <span className="flex justify-between text-xs">
        <span className="font-semibold">{label}</span>
        <span className="text-muted">{num(Math.round(value), isRtl)} / {num(Math.round(target), isRtl)}{unit && ` ${unit}`}</span>
      </span>
      <Bar value={target ? value / target : 0} color={color} height={height} />
    </span>
  );
}

/** A big display number with a small label under it. */
export function Metric({ value, label, size = 28, className = "", labelClass = "text-muted" }) {
  return (
    <span className={cx("flex flex-col gap-0.5", className)}>
      <span className="font-display font-extrabold leading-none tracking-[-0.03em]" style={{ fontSize: size }}>{value}</span>
      {label && <span className={cx("text-xs", labelClass)}>{label}</span>}
    </span>
  );
}

/** A small pill for metadata. */
export function Tag({ tone = "sunk", className = "", children }) {
  const tones = {
    sunk: "bg-sunk text-ink",
    card: "bg-card text-ink",
    hero: "bg-hero-2 text-hero-fg/85",
    accent: "bg-accent text-on-accent",
    coach: "bg-coach text-on-accent",
    inv: "bg-inv text-on-inv",
    alert: "bg-alert/15 text-alert",
  };
  return (
    <span className={cx("h-7 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap", tones[tone], className)}>
      {children}
    </span>
  );
}

/* ─────────────────────────────── people ─────────────────────────────── */

const TONES = ["bg-sand", "bg-coach", "bg-sage", "bg-mist", "bg-jet"];

export function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = [...parts[0]][0] || "";
  const second = parts.length > 1 ? [...parts[parts.length - 1]][0] || "" : [...parts[0]][1] || "";
  return (first + second).toUpperCase();
}

/** Initials on one of five tones, picked from the name so a person keeps theirs. */
export function Avatar({ name, src, size = 44, tone, className = "" }) {
  const hash = [...String(name || "")].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const bg = tone || TONES[hash % TONES.length];
  const fg = bg === "bg-jet" ? "text-accent" : "text-on-accent";
  return (
    <span style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
      className={cx("shrink-0 rounded-full flex items-center justify-center font-bold overflow-hidden", bg, fg, className)}>
      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : initials(name)}
    </span>
  );
}

/* ─────────────────────────────── inputs ─────────────────────────────── */

/** A labelled text field on a soft well; focus draws an ink ring. */
export const Field = React.forwardRef(function Field({ label, hint, error, prefix, suffix, className = "", inputClass = "", onCard = false, ...rest }, ref) {
  return (
    <label className={cx("flex flex-col gap-2", className)}>
      {label && <span className="text-[13px] font-medium text-muted">{label}</span>}
      <span className={cx("h-[52px] rounded-2xl flex items-center gap-2.5 px-4 transition-shadow",
        onCard ? "bg-sunk" : "bg-card",
        error ? "ring-2 ring-inset ring-alert" : "focus-within:ring-2 focus-within:ring-inset focus-within:ring-ink")}>
        {prefix && <span className="font-semibold text-ink shrink-0">{prefix}</span>}
        <input ref={ref} {...rest}
          className={cx("flex-1 min-w-0 h-full border-0 bg-transparent text-base text-ink outline-none focus-visible:outline-none placeholder:text-muted/70", inputClass)} />
        {suffix && <span className="shrink-0 text-muted">{suffix}</span>}
      </span>
      {(error || hint) && <span className={cx("text-[13px]", error ? "text-alert" : "text-muted")}>{error || hint}</span>}
    </label>
  );
});

/* ─────────────────────────────── overlays ─────────────────────────────── */

/**
 * A bottom sheet. Render it conditionally (or pass `open`); Escape and the
 * scrim close it. `footer` sits pinned under the scrolling body.
 */
export function Sheet({ open = true, title, onClose, isRtl, footer, children, closeLabel, tall = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <div dir={isRtl ? "rtl" : "ltr"} className="ui fixed inset-0 z-[70] flex items-end justify-center !bg-transparent">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="absolute inset-0 bg-hero/45 backdrop-blur-[2px]" />
          <motion.div role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 36 }}
            className={cx("relative w-full md:max-w-lg bg-canvas rounded-t-4xl shadow-sheet flex flex-col overflow-hidden",
              tall ? "h-[92dvh]" : "max-h-[90dvh]")}>
            <span aria-hidden="true" className="mx-auto mt-2.5 w-10 h-1 rounded-full bg-line shrink-0" />
            <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-2 shrink-0">
              <h2 className="m-0 font-display font-extrabold text-[22px] tracking-[-0.02em] text-ink">{title}</h2>
              <IconButton label={closeLabel || (isRtl ? "بستن" : "Close")} tone="card" size={40} onClick={onClose}>
                <X className="w-[18px] h-[18px]" strokeWidth={2} />
              </IconButton>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-5 pt-2 flex flex-col gap-4 scrollbar-hide">{children}</div>
            {footer && <div className="px-5 pt-3 pb-[max(env(safe-area-inset-bottom),20px)] flex gap-2.5 shrink-0">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** A quiet empty state: icon, a line, an optional action. */
export function Empty({ icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-10 px-6">
      {icon && <IconWell size={56} tone="sunk">{icon}</IconWell>}
      <p className="m-0 text-[17px] font-bold text-ink">{title}</p>
      {body && <p className="m-0 text-sm leading-relaxed text-muted max-w-[280px]">{body}</p>}
      {action}
    </div>
  );
}

/** A floating toast above the tab bar. */
export function Toast({ children }) {
  return (
    <div className="fixed bottom-28 inset-x-0 flex justify-center z-[95] pointer-events-none">
      <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="ui !bg-inv !text-on-inv px-4 h-10 rounded-full inline-flex items-center gap-2 text-sm font-semibold shadow-bar">
        <CheckIcon className="w-4 h-4 text-accent" strokeWidth={2.6} />{children}
      </motion.span>
    </div>
  );
}
