import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, Trash2, X } from "lucide-react";
import { ME, PRIORITIES, localized } from "../../lib/checklistModel";
import { Avatar, PRIORITY_STYLE } from "./ChecklistBits";

const PRIORITY_LABEL = { none: "priorityNone", low: "priorityLow", medium: "priorityMedium", high: "priorityHigh" };

/** Edit one task: text, priority, due date, note, and (on group lists) assignees. */
export default function ItemDetailSheet({ item, list, isRtl, t, onSave, onDelete, onClose }) {
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

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="relative w-full sm:max-w-lg bg-[#0d0d0f] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl max-h-[90dvh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <h2 className="text-base font-black text-white">{t.editTask}</h2>
          <button type="button" onClick={onClose} aria-label={t.close}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-hide">
          <textarea
            autoFocus
            rows={2}
            value={draft.text}
            onChange={(e) => set({ text: e.target.value })}
            placeholder={t.taskPlaceholder}
            className="w-full p-3 rounded-2xl bg-[#141416] border border-white/10 text-sm font-bold text-white placeholder:text-neutral-600 resize-none focus:outline-none focus:border-white/30"
          />

          <div className="space-y-2">
            <span className="block text-[10px] font-black text-neutral-500 uppercase tracking-wider">{t.priority}</span>
            <div className="flex gap-1.5">
              {PRIORITIES.map((p) => {
                const on = draft.priority === p;
                const style = PRIORITY_STYLE[p];
                return (
                  <button key={p} type="button" onClick={() => set({ priority: p })}
                    className={`flex-1 h-10 rounded-xl border text-[10px] font-black flex items-center justify-center gap-1.5 transition-all ${
                      on ? "bg-white/[0.09] border-white/30 text-white" : "bg-[#141416] border-white/10 text-neutral-500 hover:border-white/20"
                    }`}>
                    {p !== "none" && <span className="w-2 h-2 rounded-full" style={{ background: style.dot }} />}
                    {t[PRIORITY_LABEL[p]]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <span className="block text-[10px] font-black text-neutral-500 uppercase tracking-wider">{t.due}</span>
            <div className="flex gap-2">
              <input type="date" value={draft.due} onChange={(e) => set({ due: e.target.value })}
                className="flex-1 h-11 px-3 rounded-2xl bg-[#141416] border border-white/10 text-xs font-bold text-white focus:outline-none focus:border-white/30" />
              {draft.due && (
                <button type="button" onClick={() => set({ due: "" })}
                  className="px-4 h-11 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black text-neutral-400 hover:text-white transition-all">
                  {t.clear}
                </button>
              )}
            </div>
          </div>

          {isGroup && (
            <div className="space-y-2">
              <span className="block text-[10px] font-black text-neutral-500 uppercase tracking-wider">
                {t.assignTo} · {draft.assignees.length === 0 ? t.everyone : draft.assignees.length}
              </span>
              <div className="space-y-1.5">
                {list.members.map((m) => {
                  // No explicit assignees means the whole list is on the hook.
                  const on = draft.assignees.length === 0 || draft.assignees.includes(m.id);
                  const ticked = !!item.doneBy?.[m.id];
                  return (
                    <button key={m.id} type="button" onClick={() => toggleAssignee(m.id)}
                      className={`w-full flex items-center gap-2.5 p-2 rounded-xl border transition-all ${
                        on ? "bg-white/[0.06] border-white/20" : "bg-black/40 border-white/5"
                      }`}>
                      <Avatar member={m} size={28} ring="#0d0d0f" dimmed={!on} />
                      <span className="flex-1 text-xs font-bold text-white truncate text-start">
                        {m.id === ME.id ? t.you : localized(m, isRtl)}
                      </span>
                      {ticked && <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />}
                      {draft.assignees.includes(m.id) && (
                        <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: list.color }}>
                          <Check className="w-3 h-3 text-white stroke-[3]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <span className="block text-[10px] font-black text-neutral-500 uppercase tracking-wider">{t.note}</span>
            <textarea rows={3} value={draft.note} onChange={(e) => set({ note: e.target.value })}
              placeholder={t.notePlaceholder}
              className="w-full p-3 rounded-2xl bg-[#141416] border border-white/10 text-xs font-medium text-neutral-200 placeholder:text-neutral-600 resize-none focus:outline-none focus:border-white/30" />
          </div>

          <button type="button" onClick={onDelete}
            className="w-full h-11 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-black text-xs flex items-center justify-center gap-2 hover:bg-rose-500/20 transition-all">
            <Trash2 className="w-4 h-4" /> {t.deleteTask}
          </button>
        </div>

        <div className="p-4 border-t border-white/10 flex gap-2 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/10 text-neutral-300 font-black text-sm hover:bg-white/10 transition-all">
            {t.cancel}
          </button>
          <button type="button" onClick={submit} disabled={!draft.text.trim()}
            className="flex-1 h-12 rounded-2xl text-white font-black text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98]"
            style={{ background: list.color }}>
            {t.save}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
