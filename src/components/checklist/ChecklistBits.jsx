import React from "react";
import { Infinity as InfinityIcon, Timer } from "lucide-react";
import { ME, periodEnd } from "../../lib/checklistModel";
import { Avatar as KitAvatar, Ring, cx, num } from "../ui/kit";

/**
 * Circular progress meter on the kit's ring: ink on line by default, accent
 * on the ink hero. The number in the middle confirms what the ring shows.
 */
export function ProgressRing({ ratio, size = 62, stroke = 6, color = "rgb(var(--ui-fg))", track = "rgb(var(--ui-line))", children }) {
  const value = Math.min(Math.max(ratio || 0, 0), 1);
  // A round cap on an empty arc still draws a dot, so hide the arc at zero.
  return (
    <Ring value={value} size={size} stroke={stroke} color={value > 0 ? color : "transparent"} track={track}>
      {children}
    </Ring>
  );
}

/**
 * A member's badge: initials on one of the kit's avatar tones, so a person
 * keeps the same colour everywhere. You are always sand, as on Today.
 * `ring` is a ring-colour class that lifts the badge off whatever it overlaps.
 */
export function Avatar({ member, size = 26, ring = "ring-card", dimmed = false }) {
  return (
    <span title={member.name} className={cx("inline-flex shrink-0 rounded-full transition-opacity", dimmed && "opacity-35")}>
      <KitAvatar name={member.name || "?"} size={size} tone={member.id === ME.id ? "bg-sand" : undefined}
        className={ring ? cx("ring-2", ring) : ""} />
    </span>
  );
}

export function AvatarStack({ members, size = 24, max = 4, ring = "ring-card" }) {
  const shown = members.slice(0, max);
  const rest = members.length - shown.length;
  return (
    <span className="flex items-center" dir="ltr">
      {shown.map((m, i) => (
        <span key={m.id} className="relative flex" style={{ marginLeft: i ? -size * 0.3 : 0, zIndex: shown.length - i }}>
          <Avatar member={m} size={size} ring={ring} />
        </span>
      ))}
      {rest > 0 && (
        <span className={cx("relative rounded-full bg-sunk text-muted font-bold flex items-center justify-center ring-2", ring)}
          style={{ width: size, height: size, marginLeft: -size * 0.3, fontSize: Math.round(size * 0.36) }}>
          +{rest}
        </span>
      )}
    </span>
  );
}

/** Human-readable time until the list next clears itself. */
export function ResetCountdown({ list, t, className = "" }) {
  const n = (v) => num(v, t.rtl);
  const end = periodEnd(list.reset);
  if (!end) {
    return (
      <span className={cx("inline-flex items-center gap-1.5", className)}>
        <InfinityIcon className="w-4 h-4 shrink-0" strokeWidth={2} />
        {t.noReset}
      </span>
    );
  }

  const mins = Math.max(Math.round((end.getTime() - Date.now()) / 60000), 0);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  const value =
    days >= 1 ? `${n(days)} ${t.days}`
      : hours >= 1 ? `${n(hours)} ${t.hoursShort}`
      : `${n(mins)} ${t.minsShort}`;

  return (
    <span className={cx("inline-flex items-center gap-1.5", className)}>
      <Timer className="w-4 h-4 shrink-0" strokeWidth={2} />
      {t.resetsIn} {value}
    </span>
  );
}

/** One-line summary of a reset rule, e.g. "Weekly · Sat" (Persian uses "،"). */
export function describeReset(list, t) {
  const r = list.reset || {};
  const n = (v) => num(v, t.rtl);
  const sep = t.sep || " · ";
  switch (r.mode) {
    case "daily":
      return `${t.resetDaily}${r.resetHour ? `${sep}${n(String(r.resetHour).padStart(2, "0"))}:${n("00")}` : ""}`;
    case "weekly":
      return `${t.resetWeekly}${sep}${t.weekDays[r.weekStart ?? 6]}`;
    case "monthly":
      return `${t.resetMonthly}${sep}${n(r.monthDay ?? 1)}`;
    case "interval":
      return `${t.everyNDays} ${n(r.every ?? 2)} ${t.days}`;
    default:
      return t.resetNone;
  }
}

/**
 * Priority, drawn with the data colours: high is ink (accent on ink, as on
 * the board), medium ochre, low grape. `dot` is a CSS colour for small marks.
 */
export const PRIORITY_STYLE = {
  none: { dot: "transparent", text: "text-muted", pill: "bg-sunk text-muted" },
  low: { dot: "rgb(var(--ui-grape))", text: "text-grape", pill: "bg-grape/15 text-grape" },
  medium: { dot: "rgb(var(--ui-ochre))", text: "text-ochre", pill: "bg-ochre/15 text-ochre" },
  high: { dot: "rgb(var(--ui-fg))", text: "text-ink", pill: "bg-jet text-accent dark:bg-accent dark:text-on-accent" },
};

/** Due date as quiet meta text. Turns alert once the date has passed. */
export function DueChip({ due, t }) {
  if (!due) return null;
  const d = new Date(`${due}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  const overdue = diff < 0;
  const label = overdue ? t.overdueLong || t.overdue
    : diff === 0 ? t.dueToday || t.today
    : diff === 1 ? t.dueTomorrow || t.tomorrow
    : `${t.dueOn || t.due} ${d.toLocaleDateString(t.rtl ? "fa-IR" : "en-GB", { month: "short", day: "numeric" })}`;
  return (
    <span className={cx("text-xs", overdue ? "text-alert font-semibold" : "text-muted")}>{label}</span>
  );
}

export { ME };
