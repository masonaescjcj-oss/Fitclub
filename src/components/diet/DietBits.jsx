import React from "react";
import { motion } from "framer-motion";
import { Ring, cx, num } from "../ui/kit";

/**
 * Macro colours are the redesign's data colours: protein is ink, carbs grape,
 * fat ochre. They read CSS variables, so night mode flips them for free.
 * `MACRO_COLORS` is for inline data-vis styles; `MACRO_BG` for classNames.
 */
export const MACRO_COLORS = {
  protein: "rgb(var(--ui-fg))",
  carbs: "rgb(var(--ui-grape))",
  fat: "rgb(var(--ui-ochre))",
  fiber: "rgb(var(--ui-muted))",
};

export const MACRO_BG = {
  protein: "bg-ink",
  carbs: "bg-grape",
  fat: "bg-ochre",
  fiber: "bg-muted",
};

const ALERT = "rgb(var(--ui-alert))";

export const round = (n) => Math.round(n || 0);

/** A rounded number with thousands separators, in Persian digits on Persian screens. */
export const fmtNum = (value, isRtl) => num(round(value).toLocaleString("en-US"), isRtl);

/** The small coloured dot that keys a macro to its bar. */
export function MacroDot({ macro, className = "" }) {
  return <span aria-hidden="true" className={cx("w-2 h-2 rounded-full shrink-0", MACRO_BG[macro], className)} />;
}

/** Calorie dial: consumed against target, with what's eaten in the middle. */
export function CalorieRing({ eaten, target, size = 104, stroke = 12, t, isRtl }) {
  const over = target > 0 && eaten > target;
  return (
    <Ring value={target ? eaten / target : 0} size={size} stroke={stroke}
      color={over ? ALERT : MACRO_COLORS.protein}>
      <span className="text-[17px] font-bold leading-tight text-ink">{fmtNum(eaten, isRtl)}</span>
      <span className="text-[11px] text-muted">{t.eaten}</span>
    </Ring>
  );
}

/** One macro: dot and name, "eaten / target g", and a bar that turns alert past target. */
export function MacroBar({ label, eaten, target, color, unit = "g", sub = null, isRtl, macro }) {
  const ratio = target ? Math.min(eaten / target, 1) : 0;
  const over = target > 0 && eaten > target * 1.05;
  const fill = over ? ALERT : color || MACRO_COLORS[macro] || MACRO_COLORS.protein;

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-[13px]">
        <span className="inline-flex items-center gap-2 font-semibold text-ink min-w-0">
          <span aria-hidden="true" className="w-2 h-2 rounded-full shrink-0" style={{ background: color || MACRO_COLORS[macro] }} />
          <span className="truncate">{label}</span>
          {sub && <span className="font-normal text-muted truncate">{sub}</span>}
        </span>
        <span className={cx("shrink-0", over ? "text-alert font-semibold" : "text-muted")}>
          {fmtNum(eaten, isRtl)} / {fmtNum(target, isRtl)} {unit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-line overflow-hidden">
        <motion.div
          initial={false}
          animate={{ width: `${ratio * 100}%` }}
          transition={{ type: "spring", stiffness: 160, damping: 26 }}
          className="h-full rounded-full"
          style={{ background: fill }}
        />
      </div>
    </div>
  );
}

/** Compact stat used in the coach card. `tone` is an optional text class. */
export function Stat({ label, value, tone = "", sub }) {
  return (
    <div className="min-w-0 flex flex-col gap-0.5">
      <span className="text-[12px] font-medium opacity-70 truncate">{label}</span>
      <span className={cx("font-display font-extrabold text-[24px] leading-none tracking-[-0.03em] truncate", tone)}>{value}</span>
      {sub && <span className="text-[12px] leading-snug opacity-70">{sub}</span>}
    </div>
  );
}

/** Sparkline for the weight trend: raw dots, smoothed line. */
export function TrendSpark({ points, width = 260, height = 54, color = "rgb(var(--ui-fg))" }) {
  if (points.length < 2) return null;
  const values = points.flatMap((p) => [p.raw, p.trend]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i) => (i / (points.length - 1)) * width;
  const y = (v) => height - ((v - min) / span) * height;

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.trend).toFixed(1)}`).join(" ");

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible" aria-hidden="true">
      {points.map((p, i) => (
        <circle key={p.key} cx={x(i)} cy={y(p.raw)} r={1.8} fill={color} opacity={0.3} />
      ))}
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(points.length - 1)} cy={y(points[points.length - 1].trend)} r={3.5} fill={color} />
    </svg>
  );
}
