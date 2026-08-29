import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Infinity as InfinityIcon, Repeat, Trash2, User, UserPlus, Users, X } from "lucide-react";
import { LIST_COLORS, ME, localized } from "../../lib/checklistModel";
import { FRIEND_POOL } from "../../lib/checklistStore";
import { Avatar } from "./ChecklistBits";

const EMOJI = ["✅", "🔥", "🎯", "💪", "🥗", "🧘", "🏃", "⚡", "🎒", "📚", "💧", "🌙", "🏆", "📅", "🧠", "❤️"];

const MODES = [
  { id: "none", icon: InfinityIcon, label: "resetNone", hint: "resetNoneHint" },
  { id: "daily", icon: Repeat, label: "resetDaily", hint: "resetDailyHint" },
  { id: "weekly", icon: Repeat, label: "resetWeekly", hint: "resetWeeklyHint" },
  { id: "monthly", icon: Repeat, label: "resetMonthly", hint: "resetMonthlyHint" },
  { id: "interval", icon: Repeat, label: "resetInterval", hint: "resetIntervalHint" },
];

function Field({ label, hint, children }) {
  return (
    <div className="space-y-2">
      <span className="block">
        <span className="block text-[10px] font-black text-neutral-500 uppercase tracking-wider">{label}</span>
        {hint && <span className="block text-[10px] font-medium text-neutral-600 normal-case mt-0.5">{hint}</span>}
      </span>
      {children}
    </div>
  );
}

/** Create or edit a list: identity, sharing, and the reset schedule. */
export default function ListEditorModal({ list, isRtl, t, onSave, onDelete, onClose }) {
  const isNew = !list;
  const [draft, setDraft] = useState(() => ({
    name: list ? localized(list, isRtl) : "",
    emoji: list?.emoji ?? "✅",
    color: list?.color ?? LIST_COLORS[0],
    type: list?.type ?? "personal",
    groupRule: list?.groupRule ?? "everyone",
    members: list?.members ?? [ME],
    reset: { mode: "daily", resetHour: 0, weekStart: 6, monthDay: 1, every: 2, ...(list?.reset || {}) },
  }));

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const setReset = (patch) => setDraft((d) => ({ ...d, reset: { ...d.reset, ...patch } }));

  const available = useMemo(
    () => FRIEND_POOL.filter((f) => !draft.members.some((m) => m.id === f.id)),
    [draft.members]
  );

  const toggleFriend = (friend) =>
    set({
      members: draft.members.some((m) => m.id === friend.id)
        ? draft.members.filter((m) => m.id !== friend.id)
        : [...draft.members, friend],
    });

  const submit = () => {
    const name = draft.name.trim();
    if (!name) return;
    onSave({
      ...draft,
      name,
      // Switching back to personal drops everyone but you.
      members: draft.type === "group" ? draft.members : [ME],
    });
  };

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="relative w-full sm:max-w-lg bg-[#0d0d0f] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl max-h-[90dvh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <h2 className="text-base font-black text-white">{isNew ? t.newList : t.editList}</h2>
          <button type="button" onClick={onClose} aria-label={t.close}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
          {/* Name + icon */}
          <Field label={t.listName}>
            <div className="flex items-center gap-2">
              <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0"
                style={{ background: `${draft.color}22`, border: `1px solid ${draft.color}55` }}>
                {draft.emoji}
              </span>
              <input
                autoFocus={isNew}
                value={draft.name}
                onChange={(e) => set({ name: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder={t.listNamePlaceholder}
                className="flex-1 h-12 px-4 rounded-2xl bg-[#141416] border border-white/10 text-sm font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-white/30"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {EMOJI.map((e) => (
                <button key={e} type="button" onClick={() => set({ emoji: e })}
                  className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${
                    draft.emoji === e ? "bg-white/15 ring-1 ring-white/40" : "bg-white/5 hover:bg-white/10"
                  }`}>
                  {e}
                </button>
              ))}
            </div>
          </Field>

          <Field label={t.color}>
            <div className="flex flex-wrap gap-2">
              {LIST_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => set({ color: c })}
                  aria-label={c}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  style={{ background: c, boxShadow: draft.color === c ? `0 0 0 2px #0d0d0f, 0 0 0 4px ${c}` : "none" }}>
                  {draft.color === c && <Check className="w-4 h-4 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </Field>

          {/* Personal vs group */}
          <Field label={t.listType}>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "personal", icon: User, label: t.personal, desc: t.personalDesc },
                { id: "group", icon: Users, label: t.group, desc: t.groupDesc },
              ].map((opt) => {
                const Icon = opt.icon;
                const on = draft.type === opt.id;
                return (
                  <button key={opt.id} type="button" onClick={() => set({ type: opt.id })}
                    className={`p-3 rounded-2xl border text-start transition-all ${
                      on ? "bg-white/[0.07] border-white/30" : "bg-[#141416] border-white/10 hover:border-white/20"
                    }`}>
                    <Icon className="w-4 h-4 mb-1.5" style={{ color: on ? draft.color : "#71717a" }} />
                    <span className="block text-xs font-black text-white">{opt.label}</span>
                    <span className="block text-[9px] font-medium text-neutral-500 leading-snug mt-0.5">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Group-only settings */}
          {draft.type === "group" && (
            <>
              <Field label={t.groupRule}>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "everyone", label: t.ruleEveryone, desc: t.ruleEveryoneHint },
                    { id: "anyone", label: t.ruleAnyone, desc: t.ruleAnyoneHint },
                  ].map((opt) => {
                    const on = draft.groupRule === opt.id;
                    return (
                      <button key={opt.id} type="button" onClick={() => set({ groupRule: opt.id })}
                        className={`p-3 rounded-2xl border text-start transition-all ${
                          on ? "bg-white/[0.07] border-white/30" : "bg-[#141416] border-white/10 hover:border-white/20"
                        }`}>
                        <span className="block text-xs font-black text-white">{opt.label}</span>
                        <span className="block text-[9px] font-medium text-neutral-500 leading-snug mt-0.5">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label={`${t.members} · ${draft.members.length}`}>
                <div className="space-y-1.5">
                  {draft.members.map((m) => (
                    <div key={m.id} className="flex items-center gap-2.5 p-2 rounded-xl bg-[#141416] border border-white/10">
                      <Avatar member={m} size={28} ring="#141416" />
                      <span className="flex-1 text-xs font-bold text-white truncate">
                        {m.id === ME.id ? t.you : localized(m, isRtl)}
                      </span>
                      {m.id !== ME.id && (
                        <button type="button" onClick={() => toggleFriend(m)} aria-label={t.removeMember}
                          className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-neutral-500 hover:text-rose-400">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {available.length > 0 ? (
                  <div className="pt-2 space-y-1.5">
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-neutral-500 uppercase">
                      <UserPlus className="w-3 h-3" /> {t.addFriends}
                    </span>
                    {available.map((f) => (
                      <button key={f.id} type="button" onClick={() => toggleFriend(f)}
                        className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-black/40 border border-white/5 hover:border-white/20 transition-all">
                        <Avatar member={f} size={28} ring="#0d0d0f" />
                        <span className="flex-1 text-xs font-bold text-neutral-300 truncate text-start">{localized(f, isRtl)}</span>
                        <span className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-neutral-400">+</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-neutral-600 font-medium pt-1">{t.noFriendsLeft}</p>
                )}
              </Field>
            </>
          )}

          {/* Reset schedule */}
          <Field label={t.resetTitle} hint={t.resetDesc}>
            <div className="space-y-1.5">
              {MODES.map((m) => {
                const Icon = m.icon;
                const on = draft.reset.mode === m.id;
                return (
                  <button key={m.id} type="button" onClick={() => setReset({ mode: m.id, anchor: Date.now() })}
                    className={`w-full p-3 rounded-2xl border flex items-center gap-3 text-start transition-all ${
                      on ? "bg-white/[0.07] border-white/30" : "bg-[#141416] border-white/10 hover:border-white/20"
                    }`}>
                    <Icon className="w-4 h-4 shrink-0" style={{ color: on ? draft.color : "#71717a" }} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-black text-white">{t[m.label]}</span>
                      <span className="block text-[9px] font-medium text-neutral-500">{t[m.hint]}</span>
                    </span>
                    {on && <Check className="w-4 h-4 shrink-0" style={{ color: draft.color }} />}
                  </button>
                );
              })}
            </div>

            {/* Mode-specific detail */}
            {draft.reset.mode === "weekly" && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {t.weekDays.map((d, i) => (
                  <button key={i} type="button" onClick={() => setReset({ weekStart: i })}
                    className={`px-2.5 h-8 rounded-lg text-[10px] font-black transition-all ${
                      draft.reset.weekStart === i ? "text-white" : "bg-white/5 text-neutral-400 hover:bg-white/10"
                    }`}
                    style={draft.reset.weekStart === i ? { background: draft.color } : undefined}>
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
            )}

            {draft.reset.mode === "monthly" && (
              <label className="flex items-center gap-2 pt-1">
                <span className="text-[10px] font-black text-neutral-400">{t.dayOfMonth}</span>
                <input type="number" min="1" max="28" value={draft.reset.monthDay}
                  onChange={(e) => setReset({ monthDay: Math.min(Math.max(+e.target.value || 1, 1), 28) })}
                  className="w-16 h-9 px-2 rounded-lg bg-[#141416] border border-white/10 text-xs font-bold text-white text-center focus:outline-none focus:border-white/30" />
              </label>
            )}

            {draft.reset.mode === "interval" && (
              <label className="flex items-center gap-2 pt-1">
                <span className="text-[10px] font-black text-neutral-400">{t.everyNDays}</span>
                <input type="number" min="1" max="90" value={draft.reset.every}
                  onChange={(e) => setReset({ every: Math.min(Math.max(+e.target.value || 1, 1), 90) })}
                  className="w-16 h-9 px-2 rounded-lg bg-[#141416] border border-white/10 text-xs font-bold text-white text-center focus:outline-none focus:border-white/30" />
                <span className="text-[10px] font-black text-neutral-400">{t.days}</span>
              </label>
            )}

            {draft.reset.mode !== "none" && (
              <label className="flex items-center gap-2 pt-1">
                <span className="text-[10px] font-black text-neutral-400">{t.resetHour}</span>
                <select value={draft.reset.resetHour}
                  onChange={(e) => setReset({ resetHour: +e.target.value })}
                  className="h-9 px-2 rounded-lg bg-[#141416] border border-white/10 text-xs font-bold text-white focus:outline-none focus:border-white/30">
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                  ))}
                </select>
              </label>
            )}
          </Field>

          {!isNew && (
            <button type="button" onClick={onDelete}
              className="w-full h-11 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-black text-xs flex items-center justify-center gap-2 hover:bg-rose-500/20 transition-all">
              <Trash2 className="w-4 h-4" /> {t.deleteList}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex gap-2 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/10 text-neutral-300 font-black text-sm hover:bg-white/10 transition-all">
            {t.cancel}
          </button>
          <button type="button" onClick={submit} disabled={!draft.name.trim()}
            className="flex-1 h-12 rounded-2xl text-white font-black text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.98]"
            style={{ background: draft.color }}>
            {isNew ? t.createList : t.save}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
