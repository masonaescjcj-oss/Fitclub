import React from "react";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, StickyNote } from "lucide-react";
import { ME, assigneesOf, itemDone, localized } from "../../lib/checklistModel";
import { Check, cx, num } from "../ui/kit";
import { Avatar, DueChip, PRIORITY_STYLE } from "./ChecklistBits";

const PRIORITY_LABEL = { low: "priorityLow", medium: "priorityMedium", high: "priorityHigh" };

/**
 * One task row inside the checklist card. Tap the round check to tick it,
 * tap the text to open its detail sheet, drag the handle to reorder. On a
 * group list the row also shows who is expected to tick it and who has.
 */
export default function ChecklistRow({ item, list, isRtl, t, onToggle, onOpen }) {
  const controls = useDragControls();
  const n = (v) => num(v, isRtl);
  const done = itemDone(item, list);
  const isGroup = list.type === "group";
  const prio = PRIORITY_STYLE[item.priority] || PRIORITY_STYLE.none;
  const label = localized(item, isRtl, "text");

  const assignees = isGroup ? assigneesOf(item, list) : [];
  const people = assignees
    .map((id) => list.members.find((m) => m.id === id))
    .filter(Boolean);
  const myTick = item.doneBy?.[ME.id];
  const tickedCount = people.filter((m) => item.doneBy?.[m.id]).length;

  // On a group list the check reflects *your* tick; the strike-through reflects the whole task.
  const boxOn = isGroup ? !!myTick : done;
  const tickedAt = !isGroup && done && myTick
    ? new Date(myTick).toLocaleTimeString(isRtl ? "fa-IR" : "en-GB", { hour: "2-digit", minute: "2-digit" })
    : "";

  const hasMeta = (!done && item.due) || item.note || (isGroup && people.length > 0);
  const showPriority = !done && item.priority && item.priority !== "none";

  return (
    <Reorder.Item
      as="li"
      value={item}
      dragListener={false}
      dragControls={controls}
      layout="position"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18 }}
      whileDrag={{ scale: 1.02, zIndex: 30, boxShadow: "0 14px 34px rgba(18, 19, 16, 0.22)" }}
      className="group relative list-none -mx-2 px-2 rounded-2xl bg-card"
    >
      <div className={cx("flex items-center gap-2.5 border-t border-hair group-first:border-t-0", hasMeta ? "min-h-[62px] py-1.5" : "min-h-[54px]")}>
        <Check checked={boxOn} onToggle={(e) => { e.stopPropagation(); onToggle(); }} label={label} />

        <button type="button" onClick={onOpen}
          className="flex-1 min-w-0 min-h-[44px] flex flex-col justify-center gap-0.5 text-start bg-transparent border-0 p-0 cursor-pointer">
          <span className={cx("text-[15px] leading-snug break-words",
            done ? "text-muted line-through decoration-faint" : "font-semibold text-ink")}>
            {label}
          </span>

          {hasMeta && (
            <span className="flex items-center gap-2 flex-wrap">
              {!done && <DueChip due={item.due} t={t} />}
              {item.note && (
                <StickyNote className="w-3.5 h-3.5 text-muted" strokeWidth={2} aria-label={t.noteAttached} />
              )}
              {isGroup && people.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="flex items-center gap-0.5" dir="ltr">
                    {people.slice(0, 5).map((m) => (
                      <Avatar key={m.id} member={m} size={20} ring="" dimmed={!item.doneBy?.[m.id]} />
                    ))}
                  </span>
                  <span className="text-xs text-muted">{n(tickedCount)}/{n(people.length)}</span>
                </span>
              )}
            </span>
          )}
        </button>

        {showPriority && (
          <span className={cx("shrink-0 h-6 px-2.5 rounded-full inline-flex items-center text-[11px] font-bold", prio.pill)}>
            {t[PRIORITY_LABEL[item.priority]]}
          </span>
        )}
        {tickedAt && <span className="shrink-0 text-xs text-muted">{tickedAt}</span>}

        {!done && (
          <button type="button"
            onPointerDown={(e) => { e.preventDefault(); controls.start(e); }}
            aria-label={t.reorderHint} title={t.reorderHint}
            className="shrink-0 w-7 h-11 -me-1.5 flex items-center justify-center bg-transparent border-0 p-0 text-faint touch-none cursor-grab active:cursor-grabbing">
            <GripVertical className="w-4 h-4" strokeWidth={2} />
          </button>
        )}
      </div>
    </Reorder.Item>
  );
}
