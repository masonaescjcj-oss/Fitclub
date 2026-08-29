import React from "react";
import { motion } from "framer-motion";
import { dateOfPeriodKey, historyCells } from "../../lib/checklistModel";

/**
 * Consistency strip: one cell per finished period, brightest when the period
 * was fully cleared. The trailing outlined cell is the period in progress.
 */
/** Ratio → two-digit hex alpha, so an empty period still reads as a faint tick. */
const alpha = (ratio) =>
  Math.round((0.2 + Math.min(Math.max(ratio, 0), 1) * 0.8) * 255).toString(16).padStart(2, "0");

export default function HistoryStrip({ list, t, max = 24 }) {
  const cells = historyCells(list, max);
  if (cells.length <= 1) return null;

  const label = (cell) => {
    const d = dateOfPeriodKey(cell.key);
    const when = d ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
    return `${when} · ${cell.done}/${cell.total}`;
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black text-neutral-500 uppercase tracking-wider">{t.lastDays}</span>
        <span className="text-[9px] font-black text-neutral-600 tabular-nums">
          {cells.filter((c) => c.total > 0 && c.done === c.total).length}/{cells.length}
        </span>
      </div>

      <div className="flex items-end gap-[3px]" dir="ltr">
        {cells.map((cell, i) => (
          <motion.span
            key={`${cell.key}-${i}`}
            initial={{ opacity: 0, scaleY: 0.4 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ delay: Math.min(i * 0.012, 0.3), duration: 0.2 }}
            title={label(cell)}
            className="flex-1 rounded-[3px] origin-bottom"
            style={{
              height: 22,
              minWidth: 4,
              // Intensity rides in the colour's alpha channel: the entrance
              // animation owns `opacity`, so encoding it there gets overwritten.
              background: cell.total === 0 ? "rgba(255,255,255,0.05)" : `${list.color}${alpha(cell.ratio)}`,
              outline: cell.current ? `1.5px solid ${list.color}` : "none",
              outlineOffset: cell.current ? 1 : 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}
