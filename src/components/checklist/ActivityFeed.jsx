import React from "react";
import { ChevronDown } from "lucide-react";
import { ME, activityFeed, localized } from "../../lib/checklistModel";
import { Avatar } from "./ChecklistBits";

/** Relative time, coarse enough that it never needs a live ticker. */
function since(date, t) {
  const mins = Math.max(Math.round((Date.now() - date.getTime()) / 60000), 0);
  if (mins < 1) return t.justNow;
  if (mins < 60) return `${mins} ${t.minsShort}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${t.hoursShort}`;
  return `${Math.floor(hours / 24)} ${t.days}`;
}

/**
 * Who ticked what this period, newest first.
 * Ticks clear on reset, so this only ever covers the current period.
 */
export default function ActivityFeed({ list, isRtl, t, open, onToggle }) {
  const events = activityFeed(list);
  if (!events.length) return null;

  return (
    <div className="pt-3 space-y-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 text-[10px] font-black text-neutral-500 uppercase tracking-wider hover:text-neutral-300 transition-colors"
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
        {t.activity} · {events.length}
      </button>

      {open && (
        <div className="space-y-1.5">
          {events.map((e) => (
            <div key={e.id} className="flex items-center gap-2.5 p-2 rounded-xl bg-[#0f0f11] border border-white/[0.06]">
              <Avatar member={e.member} size={22} ring="#0f0f11" />
              <span className="flex-1 min-w-0 text-[11px] font-bold text-neutral-300 truncate">
                <span className="text-white">
                  {e.member.id === ME.id ? t.you : localized(e.member, isRtl)}
                </span>{" "}
                {t.ticked}{" "}
                <span className="text-neutral-400">{localized(e.item, isRtl, "text")}</span>
              </span>
              <span className="text-[9px] font-black text-neutral-600 shrink-0 tabular-nums">
                {since(e.at, t)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
