import React from "react";
import { motion } from "framer-motion";
import { Plus, User, Users, X } from "lucide-react";
import { localized, progressOf } from "../../lib/checklistModel";
import { AvatarStack, describeReset } from "./ChecklistBits";

function Row({ list, isRtl, t, active, onPick }) {
  const { done, total } = progressOf(list);
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onPick}
      className={`w-full p-3 rounded-2xl border flex items-center gap-3 text-start transition-all ${
        active ? "bg-white/[0.07] border-white/25" : "bg-[#141416] border-white/10 hover:border-white/20"
      }`}
    >
      <span
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
        style={{ background: `${list.color}22`, border: `1px solid ${list.color}55` }}
      >
        {list.emoji}
      </span>

      <span className="flex-1 min-w-0">
        <span className="block text-sm font-black text-white truncate">
          {localized(list, isRtl)}
        </span>
        <span className="block text-[10px] font-bold text-neutral-500 truncate">
          {describeReset(list, t)} · {done}/{total}
        </span>
      </span>

      {list.type === "group"
        ? <AvatarStack members={list.members} size={20} max={3} />
        : <span className="text-[10px] font-black tabular-nums" style={{ color: list.color }}>{pct}%</span>}
    </button>
  );
}

/** Bottom-sheet list switcher, split by personal vs shared. */
export default function ListDrawer({ lists, activeId, isRtl, t, onPick, onCreate, onClose }) {
  const personal = lists.filter((l) => l.type !== "group");
  const group = lists.filter((l) => l.type === "group");

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
      />

      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="relative w-full sm:max-w-lg bg-[#0d0d0f] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl max-h-[85dvh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <h2 className="text-base font-black text-white">{t.myLists}</h2>
          <button type="button" onClick={onClose} aria-label={t.close}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-hide">
          <section className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-[10px] font-black text-neutral-500 uppercase tracking-wider px-1">
              <User className="w-3 h-3" /> {t.personal}
            </h3>
            {personal.map((l) => (
              <Row key={l.id} list={l} isRtl={isRtl} t={t} active={l.id === activeId} onPick={() => onPick(l.id)} />
            ))}
          </section>

          <section className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-[10px] font-black text-neutral-500 uppercase tracking-wider px-1">
              <Users className="w-3 h-3" /> {t.groupLists}
            </h3>
            {group.length === 0 && (
              <p className="text-xs text-neutral-600 font-medium px-1 py-2">{t.groupDesc}</p>
            )}
            {group.map((l) => (
              <Row key={l.id} list={l} isRtl={isRtl} t={t} active={l.id === activeId} onPick={() => onPick(l.id)} />
            ))}
          </section>
        </div>

        <div className="p-4 border-t border-white/10 shrink-0">
          <button
            type="button"
            onClick={onCreate}
            className="w-full h-12 rounded-2xl bg-[#844783] text-white font-black text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> {t.newList}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
