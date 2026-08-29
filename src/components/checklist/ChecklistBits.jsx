import React from "react";
import { motion } from "framer-motion";
import { Infinity as InfinityIcon, Timer } from "lucide-react";
import { ME, periodEnd } from "../../lib/checklistModel";

/** Circular progress meter. The ring reads at a glance; the number confirms it. */
export function ProgressRing({ ratio, size = 62, stroke = 6, color = "#844783", children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - Math.min(Math.max(ratio, 0), 1)) }}
          transition={{ type: "spring", stiffness: 160, damping: 22 }}
          style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        {children}
      </div>
    </div>
  );
}

/** Small round member badge. Falls back to an initial when there's no emoji. */
export function Avatar({ member, size = 26, ring = "#09090b", dimmed = false }) {
  const label = member.avatar || (member.name || "?").slice(0, 1).toUpperCase();
  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 transition-opacity ${dimmed ? "opacity-35" : ""}`}
      style={{
        width: size, height: size,
        fontSize: size * 0.5,
        background: `${member.color || "#844783"}33`,
        border: `1.5px solid ${member.color || "#844783"}`,
        boxShadow: `0 0 0 2px ${ring}`,
      }}
      title={member.name}
    >
      <span className="leading-none">{label}</span>
    </div>
  );
}

export function AvatarStack({ members, size = 24, max = 4 }) {
  const shown = members.slice(0, max);
  const rest = members.length - shown.length;
  return (
    <div className="flex items-center" dir="ltr">
      {shown.map((m, i) => (
        <div key={m.id} style={{ marginLeft: i ? -size * 0.32 : 0, zIndex: shown.length - i }}>
          <Avatar member={m} size={size} />
        </div>
      ))}
      {rest > 0 && (
        <div
          className="rounded-full bg-neutral-800 border border-white/15 text-[9px] font-black text-neutral-300 flex items-center justify-center"
          style={{ width: size, height: size, marginLeft: -size * 0.32 }}
        >
          +{rest}
        </div>
      )}
    </div>
  );
}

/** Human-readable time until the list next clears itself. */
export function ResetCountdown({ list, t, className = "" }) {
  const end = periodEnd(list.reset);
  if (!end) {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        <InfinityIcon className="w-3.5 h-3.5" />
        {t.noReset}
      </span>
    );
  }

  const mins = Math.max(Math.round((end.getTime() - Date.now()) / 60000), 0);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  const value =
    days >= 1 ? `${days} ${t.days}`
      : hours >= 1 ? `${hours} ${t.hoursShort}`
      : `${mins} ${t.minsShort}`;

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <Timer className="w-3.5 h-3.5" />
      {t.resetsIn} {value}
    </span>
  );
}

/** One-line summary of a reset rule, e.g. "Weekly · Sat". */
export function describeReset(list, t) {
  const r = list.reset || {};
  switch (r.mode) {
    case "daily":
      return `${t.resetDaily}${r.resetHour ? ` · ${String(r.resetHour).padStart(2, "0")}:00` : ""}`;
    case "weekly":
      return `${t.resetWeekly} · ${t.weekDays[r.weekStart ?? 6]}`;
    case "monthly":
      return `${t.resetMonthly} · ${r.monthDay ?? 1}`;
    case "interval":
      return `${t.everyNDays} ${r.every ?? 2} ${t.days}`;
    default:
      return t.resetNone;
  }
}

export const PRIORITY_STYLE = {
  none: { dot: "transparent", text: "text-neutral-500" },
  low: { dot: "#38bdf8", text: "text-sky-400" },
  medium: { dot: "#f59e0b", text: "text-amber-400" },
  high: { dot: "#f43f5e", text: "text-rose-400" },
};

/** Due-date chip. Turns red once the date has passed. */
export function DueChip({ due, t }) {
  if (!due) return null;
  const d = new Date(`${due}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  const overdue = diff < 0;
  const label = diff === 0 ? t.today : diff === 1 ? t.tomorrow : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return (
    <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black border ${
      overdue ? "bg-rose-500/15 border-rose-500/40 text-rose-400" : "bg-white/5 border-white/10 text-neutral-400"
    }`}>
      {overdue ? t.overdue : label}
    </span>
  );
}

export { ME };
