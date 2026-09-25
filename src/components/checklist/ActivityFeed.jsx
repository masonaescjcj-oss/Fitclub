import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { ME, activityFeed, localized } from "../../lib/checklistModel";
import { cx, num } from "../ui/kit";
import { Avatar } from "./ChecklistBits";

/** Relative time, coarse enough that it never needs a live ticker. */
function since(date, t, n) {
  const mins = Math.max(Math.round((Date.now() - date.getTime()) / 60000), 0);
  if (mins < 1) return t.justNow;
  if (mins < 60) return `${n(mins)} ${t.minsShort}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${n(hours)} ${t.hoursShort}`;
  return `${n(Math.floor(hours / 24))} ${t.days}`;
}

/**
 * Who ticked what this period, newest first, as a collapsible card.
 * Ticks clear on reset, so this only ever covers the current period.
 */
export default function ActivityFeed({ list, isRtl, t, open, onToggle }) {
  const n = (v) => num(v, isRtl);
  const events = activityFeed(list);
  if (!events.length) return null;

  return (
    <section aria-label={t.activity} className="rounded-3xl bg-card px-4 py-1">
      <button type="button" onClick={onToggle} aria-expanded={!!open}
        className="w-full h-12 flex items-center justify-between gap-3 bg-transparent border-0 p-0 cursor-pointer text-ink">
        <span className="text-base font-bold">{t.activity}</span>
        <span className="inline-flex items-center gap-1.5 text-sm text-muted">
          {n(events.length)}
          <ChevronDown className={cx("w-4 h-4 transition-transform", open && "rotate-180")} strokeWidth={2} />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }} className="m-0 p-0 list-none overflow-hidden">
            {events.map((e) => (
              <li key={e.id} className="flex items-center gap-3 min-h-[52px] py-1.5 border-t border-hair">
                <Avatar member={e.member} size={32} ring="" />
                <span className="flex-1 min-w-0 text-sm leading-snug text-muted">
                  <span className="font-semibold text-ink">{e.member.id === ME.id ? t.you : localized(e.member, isRtl)}</span>{" "}
                  {t.ticked}{" "}
                  <span className="text-ink">{localized(e.item, isRtl, "text")}</span>
                </span>
                <span className="shrink-0 text-xs text-muted">{since(e.at, t, n)}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  );
}
