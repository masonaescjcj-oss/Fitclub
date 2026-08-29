import React from "react";
import { motion } from "framer-motion";

export const MACRO_COLORS = {
  protein: "#e0567d",
  carbs: "#f59e0b",
  fat: "#38bdf8",
  fiber: "#10b981",
};

export const round = (n) => Math.round(n || 0);

/** Big calorie dial: consumed against target, with what's left in the middle. */
export function CalorieRing({ eaten, target, size = 148, stroke = 12, t }) {
  const ratio = target ? eaten / target : 0;
  const clamped = Math.min(Math.max(ratio, 0), 1);
  const over = eaten > target;
  const left = Math.abs(target - eaten);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = over ? "#f43f5e" : "#844783";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - clamped) }}
          transition={{ type: "spring", stiffness: 140, damping: 24 }}
          style={{ filter: `drop-shadow(0 0 10px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none gap-1">
        <span className="text-3xl font-black text-white tabular-nums">{round(left)}</span>
        <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: over ? "#f43f5e" : "#a1a1aa" }}>
          {over ? t.over : t.remaining}
        </span>
        <span className="text-[9px] font-bold text-neutral-600 tabular-nums mt-0.5">
          {round(eaten)} / {round(target)}
        </span>
      </div>
    </div>
  );
}

/** One macro: a labelled bar that turns red past target. */
export function MacroBar({ label, eaten, target, color, unit = "g", sub = null }) {
  const ratio = target ? Math.min(eaten / target, 1) : 0;
  const over = eaten > target * 1.05;

  return (
    <div className="space-y-1 flex-1 min-w-0">
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[10px] font-black uppercase tracking-wide truncate" style={{ color }}>{label}</span>
        <span className="text-[10px] font-black text-neutral-400 tabular-nums shrink-0" dir="ltr">
          {round(eaten)}<span className="text-neutral-600">/{round(target)}{unit}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
        <motion.div
          initial={false}
          animate={{ width: `${ratio * 100}%` }}
          transition={{ type: "spring", stiffness: 160, damping: 24 }}
          className="h-full rounded-full"
          style={{ background: over ? "#f43f5e" : color }}
        />
      </div>
      {sub && <span className="block text-[9px] font-bold text-neutral-600">{sub}</span>}
    </div>
  );
}

/** Compact stat used in the coach card. */
export function Stat({ label, value, tone = "text-white", sub }) {
  return (
    <div className="min-w-0">
      <span className="block text-[9px] font-black text-neutral-500 uppercase tracking-wider truncate">{label}</span>
      <span className={`block text-sm font-black tabular-nums ${tone}`}>{value}</span>
      {sub && <span className="block text-[9px] font-bold text-neutral-600 truncate">{sub}</span>}
    </div>
  );
}

/** Sparkline for the weight trend: raw dots, smoothed line. */
export function TrendSpark({ points, width = 260, height = 54, color = "#844783" }) {
  if (points.length < 2) return null;
  const values = points.flatMap((p) => [p.raw, p.trend]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i) => (i / (points.length - 1)) * width;
  const y = (v) => height - ((v - min) / span) * height;

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.trend).toFixed(1)}`).join(" ");

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
      {points.map((p, i) => (
        <circle key={p.key} cx={x(i)} cy={y(p.raw)} r={1.8} fill="rgba(255,255,255,0.28)" />
      ))}
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(points.length - 1)} cy={y(points[points.length - 1].trend)} r={3.5} fill={color} />
    </svg>
  );
}
