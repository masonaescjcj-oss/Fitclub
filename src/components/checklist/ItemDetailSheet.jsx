import React, { useState } from "react";
import { Check as CheckIcon, Trash2 } from "lucide-react";
import { ME, PRIORITIES, localized } from "../../lib/checklistModel";
import { Button, Field, Label, Segmented, Sheet, cx, num } from "../ui/kit";
import { Avatar, PRIORITY_STYLE } from "./ChecklistBits";

const PRIORITY_LABEL = { none: "priorityNone", low: "priorityLow", medium: "priorityMedium", high: "priorityHigh" };

/** A multi-line text well that matches the kit's Field. */
export function TextArea({ label, className = "", ...rest }) {
  return (
    <label className={cx("flex flex-col gap-2", className)}>
      {label && <span className="text-[13px] font-medium text-muted">{label}</span>}
      <textarea {...rest}
        className="w-full px-4 py-3.5 rounded-2xl bg-card border-0 text-base leading-[1.45] text-ink placeholder:text-muted/70 resize-none !outline-none focus:ring-2 focus:ring-inset focus:ring-ink" />
    </label>
  );
}

/** A round selection mark for rows that are themselves the button. */
export function Tick({ on }) {
  return (
    <span aria-hidden="true"
      className={cx("w-[26px] h-[26px] shrink-0 rounded-full flex items-center justify-center",
        on ? "bg-jet text-accent dark:bg-accent dark:text-on-accent" : "ring-2 ring-inset ring-faint")}>
      {on && <CheckIcon className="w-[15px] h-[15px]" strokeWidth={3} />}
    </span>
  );
}

/** Edit one task: text, priority, due date, note, and (on group lists) assignees. */
export default function ItemDetailSheet({ item, list, isRtl, t, onSave, onDelete, onClose, open = true }) {
  const [draft, setDraft] = useState(() => ({
    text: localized(item, isRtl, "text"),
    note: item.note || "",
    priority: item.priority || "none",
    due: item.due || "",
    assignees: item.assignees || [],
  }));

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));

  const toggleAssignee = (id) =>
    set({
      assignees: draft.assignees.includes(id)
        ? draft.assignees.filter((a) => a !== id)
        : [...draft.assignees, id],
    });

  const submit = () => {
    const text = draft.text.trim();
    if (!text) return;
    // Writing `text` overrides any seeded textEn/textFa for this item.
    onSave({ text, textEn: undefined, textFa: undefined, note: draft.note.trim(), priority: draft.priority, due: draft.due || null, assignees: draft.assignees });
  };

  const isGroup = list.type === "group";
  const sep = t.sep || " · ";

  const priorityOptions = PRIORITIES.map((p) => ({
    id: p,
    label: (
      <span className="inline-flex items-center justify-center gap-1.5">
        {p !== "none" && <span aria-hidden="true" className="w-2 h-2 rounded-full" style={{ background: PRIORITY_STYLE[p].dot }} />}
        {t[PRIORITY_LABEL[p]]}
      </span>
    ),
  }));

  return (
    <Sheet open={open} title={t.editTask} onClose={onClose} isRtl={isRtl} closeLabel={t.close} tall
      footer={(
        <>
          <Button tone="card" size="lg" className="flex-1" onClick={onClose}>{t.cancel}</Button>
          <Button tone="ink" size="lg" className="flex-1" onClick={submit} disabled={!draft.text.trim()}>{t.save}</Button>
        </>
      )}>
      <TextArea autoFocus rows={2} value={draft.text} aria-label={t.editTask}
        onChange={(e) => set({ text: e.target.value })} placeholder={t.taskPlaceholder} />

      <div className="flex flex-col gap-2">
        <Label>{t.priority}</Label>
        <Segmented options={priorityOptions} value={draft.priority} onChange={(p) => set({ priority: p })} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t.due}</Label>
        <div className="flex items-end gap-2">
          <Field type="date" value={draft.due} onChange={(e) => set({ due: e.target.value })}
            aria-label={t.due} className="flex-1" />
          {draft.due && (
            <Button tone="card" size="md" className="h-[52px]" onClick={() => set({ due: "" })}>{t.clear}</Button>
          )}
        </div>
      </div>

      {isGroup && (
        <div className="flex flex-col gap-2">
          <Label>{t.assignTo}{sep}{draft.assignees.length === 0 ? t.everyone : num(draft.assignees.length, isRtl)}</Label>
          <ul className="m-0 p-0 py-1 list-none rounded-3xl bg-card divide-y divide-hair">
            {list.members.map((m) => {
              // No explicit assignees means the whole list is on the hook.
              const on = draft.assignees.length === 0 || draft.assignees.includes(m.id);
              const picked = draft.assignees.includes(m.id);
              const ticked = !!item.doneBy?.[m.id];
              return (
                <li key={m.id} className="list-none">
                  <button type="button" onClick={() => toggleAssignee(m.id)} aria-pressed={picked}
                    className="w-full min-h-[56px] flex items-center gap-3.5 px-4 py-2 text-start bg-transparent border-0 cursor-pointer active:bg-sunk transition-colors">
                    <Avatar member={m} size={36} ring="" dimmed={!on} />
                    <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="text-[15px] font-semibold text-ink truncate">{m.id === ME.id ? t.you : localized(m, isRtl)}</span>
                      <span className="text-[13px] text-muted">{ticked ? t.tickedIt : t.notYet}</span>
                    </span>
                    <Tick on={picked} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label>{t.note}</Label>
        <TextArea rows={3} value={draft.note} aria-label={t.note} onChange={(e) => set({ note: e.target.value })}
          placeholder={t.notePlaceholder} />
      </div>

      <Button tone="danger" size="md" className="self-start -ms-1 px-1" onClick={onDelete}
        icon={<Trash2 className="w-[18px] h-[18px]" strokeWidth={2} />}>
        {t.deleteTask}
      </Button>
    </Sheet>
  );
}
