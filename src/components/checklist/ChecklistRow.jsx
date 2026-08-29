import React from "react";
import { Reorder, motion, useDragControls } from "framer-motion";
import { Check, GripVertical, MessageSquare } from "lucide-react";
import { ME, assigneesOf, itemDone, localized } from "../../lib/checklistModel";
import { Avatar, DueChip, PRIORITY_STYLE } from "./ChecklistBits";

/**
 * One task. Tap the box to tick it, tap the row to open its detail sheet,
 * drag the handle to reorder. On a group list the row also shows who is
 * expected to tick it and who already has.
 */
export default function ChecklistRow({ item, list, isRtl, t, onToggle, onOpen }) {
  const controls = useDragControls();
  const done = itemDone(item, list);
  const isGroup = list.type === "group";
  const prio = PRIORITY_STYLE[item.priority] || PRIORITY_STYLE.none;
  const label = localized(item, isRtl, "text");

  const assignees = isGroup ? assigneesOf(item, list) : [];
  const people = assignees
    .map((id) => list.members.find((m) => m.id === id))
    .filter(Boolean);
  const myTick = !!item.doneBy?.[ME.id];
  const tickedCount = people.filter((m) => item.doneBy?.[m.id]).length;

  // On a group list the box reflects *your* tick; the ring reflects the whole task.
  const boxOn = isGroup ? myTick : done;

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.18 }}
      whileDrag={{ scale: 1.03, zIndex: 30, boxShadow: "0 18px 40px rgba(0,0,0,0.65)" }}
      className={`group relative rounded-2xl border transition-colors ${
        done
          ? "bg-[#101012] border-white/[0.06]"
          : "bg-[#141416] border-white/10 hover:border-white/20"
      }`}
    >
      {/* Priority spine */}
      {item.priority !== "none" && !done && (
        <span
          className="absolute top-3 bottom-3 w-[3px] rounded-full ltr:left-0 rtl:right-0"
          style={{ background: prio.dot }}
        />
      )}

      <div className="flex items-center gap-3 p-3">
        {/* Checkbox */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          aria-pressed={boxOn}
          aria-label={label}
          className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-lg"
        >
          <motion.span
            whileTap={{ scale: 0.8 }}
            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
              boxOn ? "text-white" : "border-neutral-600 bg-black/40 hover:border-neutral-400"
            }`}
            style={boxOn ? { background: list.color, borderColor: list.color } : undefined}
          >
            {boxOn && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}>
                <Check className="w-4 h-4 stroke-[3.5]" />
              </motion.span>
            )}
          </motion.span>
        </button>

        {/* Text + meta */}
        <button
          type="button"
          onClick={onOpen}
          className="flex-1 min-w-0 text-start focus:outline-none"
        >
          <div className="flex items-center gap-1.5">
            {item.emoji && <span className="text-sm shrink-0">{item.emoji}</span>}
            <span className={`text-sm font-bold truncate transition-all ${done ? "line-through text-neutral-600" : "text-white"}`}>
              {label}
            </span>
          </div>

          {(item.due || item.note || isGroup) && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <DueChip due={item.due} t={t} />
              {item.note && <MessageSquare className="w-3 h-3 text-neutral-500" />}
              {isGroup && people.length > 0 && (
                <span className="flex items-center gap-1" dir="ltr">
                  {people.slice(0, 5).map((m) => (
                    <Avatar key={m.id} member={m} size={18} dimmed={!item.doneBy?.[m.id]} />
                  ))}
                  <span className="text-[9px] font-black text-neutral-500 ms-0.5">
                    {tickedCount}/{people.length}
                  </span>
                </span>
              )}
            </div>
          )}
        </button>

        {/* Drag handle */}
        <button
          type="button"
          onPointerDown={(e) => { e.preventDefault(); controls.start(e); }}
          aria-label={t.reorderHint}
          className="shrink-0 p-1 -m-1 text-neutral-700 hover:text-neutral-400 touch-none cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </div>
    </Reorder.Item>
  );
}
