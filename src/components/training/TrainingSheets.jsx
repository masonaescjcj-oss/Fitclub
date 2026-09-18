import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, BadgeCheck, Check, Copy, Link2, Plus, Search, Trash2, X } from "lucide-react";
import { EXERCISES, MUSCLES, exerciseName, findExercise, searchExercises } from "../../lib/training/exercises";
import {
  PROGRAM_COLORS, createDay, createProgramExercise, decodeShare, encodeShare, expandMealPlan, shareLink,
} from "../../lib/training/programModel";

const EMOJI = ["🏋️", "⚡", "💪", "🔥", "🤸", "🏃", "🧘", "🥇", "🦾", "🎯", "🧗", "🚴"];

export function Sheet({ title, isRtl, t, onClose, children, footer, tall = false }) {
  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className={`relative w-full sm:max-w-lg bg-[#0d0d0f] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden ${tall ? "h-[92dvh]" : "max-h-[90dvh]"}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <h2 className="text-base font-black text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label={t.close}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">{children}</div>
        {footer && <div className="p-4 border-t border-white/10 flex gap-2 shrink-0">{footer}</div>}
      </motion.div>
    </div>
  );
}

const field = "w-full h-11 px-3 rounded-2xl bg-[#141416] border border-white/10 text-sm font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-white/30";
const Label = ({ children }) => (
  <span className="block text-[10px] font-black text-neutral-500 uppercase tracking-wider mb-1.5">{children}</span>
);

/** Who made a plan, with the coach badge Telegram-style beside the name. */
export function AuthorChip({ author, t }) {
  if (!author?.name) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-neutral-400">
      {t.byAuthor} <span className="text-neutral-200">{author.name}</span>
      {author.role === "coach" && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-400 text-[9px] font-black">
          <BadgeCheck className="w-3 h-3" /> {t.coach}
        </span>
      )}
    </span>
  );
}

/* ──────────────────────────── exercise picker ──────────────────────────── */

function ExercisePicker({ isRtl, t, onPick, onClose }) {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState(null);
  const list = useMemo(() => searchExercises(q, muscle), [q, muscle]);
  return (
    <Sheet title={t.addExercise} isRtl={isRtl} t={t} onClose={onClose} tall>
      <div className="relative">
        <Search className={`w-4 h-4 text-neutral-500 absolute top-1/2 -translate-y-1/2 ${isRtl ? "right-3" : "left-3"}`} />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchExercises}
          className={`${field} ${isRtl ? "pr-10" : "pl-10"}`} />
      </div>
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        <button type="button" onClick={() => setMuscle(null)}
          className={`px-3 h-8 rounded-lg text-[10px] font-black whitespace-nowrap border ${muscle === null ? "bg-white/10 border-white/30 text-white" : "bg-[#141416] border-white/10 text-neutral-400"}`}>
          {t.allMuscles}
        </button>
        {MUSCLES.map((m) => (
          <button key={m.id} type="button" onClick={() => setMuscle(muscle === m.id ? null : m.id)}
            className={`px-3 h-8 rounded-lg text-[10px] font-black whitespace-nowrap border ${muscle === m.id ? "bg-white/10 border-white/30 text-white" : "bg-[#141416] border-white/10 text-neutral-400"}`}>
            {isRtl ? m.fa : m.en}
          </button>
        ))}
      </div>
      <div className="space-y-1.5">
        {list.map((e) => (
          <button key={e.id} type="button" onClick={() => onPick(e)}
            className="w-full p-3 rounded-2xl bg-[#141416] border border-white/10 flex items-center gap-3 hover:border-white/25 text-start">
            <span className="flex-1 min-w-0">
              <span className="block text-xs font-black text-white truncate">{isRtl ? e.nameFa : e.nameEn}</span>
              <span className="block text-[9px] font-bold text-neutral-500">{e.equipment}</span>
            </span>
            <Plus className="w-4 h-4 text-neutral-600" />
          </button>
        ))}
      </div>
    </Sheet>
  );
}

/* ──────────────────────────── program builder ──────────────────────────── */

export function ProgramBuilderSheet({ program, isRtl, t, author, onSave, onClose }) {
  const isNew = !program;
  const [p, setP] = useState(() => ({
    name: program?.name || "", nameFa: program?.nameFa || "", emoji: program?.emoji || "🏋️",
    color: program?.color || PROGRAM_COLORS[0], weeks: program?.weeks || 6, description: program?.description || "",
    days: program?.days?.map((d) => ({ ...d, exercises: d.exercises.map((e) => ({ ...e })) })) || [],
  }));
  const [pickFor, setPickFor] = useState(null); // day index awaiting an exercise
  const set = (patch) => setP((s) => ({ ...s, ...patch }));
  const patchDay = (i, fn) => set({ days: p.days.map((d, k) => (k === i ? fn(d) : d)) });
  const patchEx = (di, ei, patch) => patchDay(di, (d) => ({ ...d, exercises: d.exercises.map((e, k) => (k === ei ? { ...e, ...patch } : e)) }));
  const move = (di, ei, dir) => patchDay(di, (d) => {
    const arr = [...d.exercises]; const j = ei + dir;
    if (j < 0 || j >= arr.length) return d;
    [arr[ei], arr[j]] = [arr[j], arr[ei]];
    return { ...d, exercises: arr };
  });

  const valid = p.name.trim() && p.days.length > 0 && p.days.every((d) => d.type === "rest" || d.exercises.length > 0);
  const numField = `${field} text-center`;

  return (
    <>
      <Sheet title={isNew ? t.newProgram : t.editProgram} isRtl={isRtl} t={t} onClose={onClose} tall
        footer={
          <>
            <button type="button" onClick={onClose} className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/10 text-neutral-300 font-black text-sm">{t.cancel}</button>
            <button type="button" disabled={!valid} onClick={() => onSave({ ...p, name: p.name.trim(), author })}
              className="flex-1 h-12 rounded-2xl text-white font-black text-sm disabled:opacity-40" style={{ background: p.color }}>
              {t.save}
            </button>
          </>
        }>
        <div className="flex items-center gap-2">
          <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0"
            style={{ background: `${p.color}22`, border: `1px solid ${p.color}55` }}>{p.emoji}</span>
          <input autoFocus={isNew} value={p.name} onChange={(e) => set({ name: e.target.value })} placeholder={t.programNamePh} className={field} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {EMOJI.map((e) => (
            <button key={e} type="button" onClick={() => set({ emoji: e })}
              className={`w-8 h-8 rounded-lg text-base flex items-center justify-center ${p.emoji === e ? "bg-white/15 ring-1 ring-white/40" : "bg-white/5"}`}>{e}</button>
          ))}
        </div>
        <div className="flex gap-2">
          {PROGRAM_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => set({ color: c })} aria-label={c}
              className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: c, boxShadow: p.color === c ? `0 0 0 2px #0d0d0f, 0 0 0 4px ${c}` : "none" }}>
              {p.color === c && <Check className="w-4 h-4 text-white stroke-[3]" />}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-[1fr_96px] gap-2">
          <div><Label>{t.description}</Label><input value={p.description} onChange={(e) => set({ description: e.target.value })} className={field} /></div>
          <div><Label>{t.weeksLabel}</Label><input type="number" min="1" max="52" value={p.weeks} onChange={(e) => set({ weeks: Math.max(1, Math.min(52, +e.target.value || 1)) })} className={numField} /></div>
        </div>

        {/* days */}
        <div className="space-y-3 pt-2 border-t border-white/10">
          {p.days.length === 0 && <p className="text-xs font-bold text-neutral-600 text-center py-4">{t.noDays}</p>}
          {p.days.map((d, di) => (
            <div key={d.id} className="p-3 rounded-2xl bg-[#141416] border border-white/10 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-neutral-500 w-12 shrink-0">{t.day} {di + 1}</span>
                <input value={d.title} onChange={(e) => patchDay(di, (x) => ({ ...x, title: e.target.value }))}
                  placeholder={d.type === "rest" ? t.rest : t.dayTitlePh} className={`${field} h-9`} disabled={d.type === "rest"} />
                <button type="button" onClick={() => patchDay(di, (x) => ({ ...x, type: x.type === "rest" ? "workout" : "rest", title: x.type === "rest" ? "" : "Rest", titleFa: x.type === "rest" ? "" : "استراحت" }))}
                  className={`px-2.5 h-9 rounded-xl text-[10px] font-black border shrink-0 ${d.type === "rest" ? "bg-neutral-700/60 border-white/10 text-neutral-300" : "bg-white/5 border-white/10 text-neutral-400"}`}>
                  {d.type === "rest" ? t.restDayType : t.workoutDay}
                </button>
                <button type="button" onClick={() => set({ days: p.days.filter((_, k) => k !== di) })} aria-label={t.remove}
                  className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-neutral-500 hover:text-rose-400 shrink-0"><Trash2 className="w-4 h-4" /></button>
              </div>

              {d.type !== "rest" && (
                <div className="space-y-1.5">
                  {d.exercises.map((e, ei) => {
                    const ex = findExercise(e.exerciseId);
                    return (
                      <div key={e.id} className="p-2 rounded-xl bg-black/40 border border-white/[0.06] space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="flex-1 text-xs font-black text-white truncate">{exerciseName(e.exerciseId, isRtl)}</span>
                          <button type="button" onClick={() => move(di, ei, -1)} aria-label={t.moveUp} className="w-7 h-7 rounded-lg bg-white/5 text-neutral-500 flex items-center justify-center"><ArrowUp className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => move(di, ei, 1)} aria-label={t.moveDown} className="w-7 h-7 rounded-lg bg-white/5 text-neutral-500 flex items-center justify-center"><ArrowDown className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => patchDay(di, (x) => ({ ...x, exercises: x.exercises.filter((_, k) => k !== ei) }))} aria-label={t.remove}
                            className="w-7 h-7 rounded-lg bg-white/5 text-neutral-500 hover:text-rose-400 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5" dir="ltr">
                          {[["sets", t.sets, 1, 20], ["reps", ex?.mode === "time" ? t.seconds : ex?.mode === "distance" ? t.meters : t.reps, 1, 5000], ["weight", t.kg, 0, 1000], ["restSec", t.restSeconds, 0, 900]].map(([k, lbl, min, max]) => (
                            <label key={k} className="block">
                              <span className="block text-[8px] font-black text-neutral-600 uppercase text-center mb-0.5 truncate">{lbl}</span>
                              <input type="number" min={min} max={max} value={e[k] ?? ""} placeholder="—"
                                onChange={(ev) => patchEx(di, ei, { [k]: ev.target.value === "" ? null : Math.min(max, Math.max(min, +ev.target.value)) })}
                                className="w-full h-8 rounded-lg bg-[#141416] border border-white/10 text-center text-[11px] font-black text-white focus:outline-none tabular-nums" />
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <button type="button" onClick={() => setPickFor(di)}
                    className="w-full h-9 rounded-xl border border-dashed border-white/15 text-[11px] font-black text-neutral-400 hover:text-white flex items-center justify-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> {t.addExercise}
                  </button>
                </div>
              )}
            </div>
          ))}
          <button type="button" onClick={() => set({ days: [...p.days, createDay({ title: "" })] })}
            className="w-full h-11 rounded-2xl bg-white/5 border border-white/10 text-xs font-black text-neutral-300 hover:bg-white/10 flex items-center justify-center gap-1.5">
            <Plus className="w-4 h-4" /> {t.addDay}
          </button>
        </div>
      </Sheet>

      {pickFor !== null && (
        <ExercisePicker isRtl={isRtl} t={t} onClose={() => setPickFor(null)}
          onPick={(ex) => {
            patchDay(pickFor, (d) => ({ ...d, exercises: [...d.exercises, createProgramExercise({ exerciseId: ex.id, reps: ex.mode === "time" ? 45 : ex.mode === "distance" ? 200 : 10 })] }));
            setPickFor(null);
          }} />
      )}
    </>
  );
}

/* ──────────────────────────── share ──────────────────────────── */

function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text).catch(() => {});
  return Promise.resolve();
}

export function ShareSheet({ payload, title, isRtl, t, coachMode, onToggleCoach, onClose }) {
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState("");
  const payloadKey = useMemo(() => JSON.stringify(payload), [payload]);
  useEffect(() => {
    let alive = true;
    setCode(""); // never show a code that belongs to the previous payload
    encodeShare(JSON.parse(payloadKey)).then((c) => { if (alive) setCode(c); });
    return () => { alive = false; };
  }, [payloadKey]);
  useEffect(() => { if (!copied) return undefined; const id = setTimeout(() => setCopied(""), 1500); return () => clearTimeout(id); }, [copied]);
  const link = code ? shareLink(code) : "";

  return (
    <Sheet title={title || t.shareTitle} isRtl={isRtl} t={t} onClose={onClose}>
      <p className="text-[11px] font-medium text-neutral-400">{t.shareHint}</p>

      <button type="button" role="switch" aria-checked={coachMode} onClick={() => onToggleCoach(!coachMode)}
        className="w-full flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#141416] border border-white/10">
        <span className="text-start">
          <span className="block text-xs font-black text-white">{t.coachMode}</span>
          <span className="block text-[10px] font-medium text-neutral-500">{t.coachModeHint}</span>
        </span>
        <span className={`w-11 h-6 rounded-full p-0.5 shrink-0 ${coachMode ? "bg-sky-500" : "bg-white/10"}`}>
          <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${coachMode ? (isRtl ? "-translate-x-5" : "translate-x-5") : ""}`} />
        </span>
      </button>

      <div className="p-3 rounded-2xl bg-[#141416] border border-white/10 space-y-2">
        <Label>{t.copyLink}</Label>
        <div className="flex items-center gap-2" dir="ltr">
          <Link2 className="w-4 h-4 text-neutral-500 shrink-0" />
          <input readOnly value={link || t.generating} className="flex-1 min-w-0 bg-transparent text-[11px] font-mono text-neutral-300 focus:outline-none truncate" onFocus={(e) => e.target.select()} />
          <button type="button" disabled={!code} onClick={() => copyText(link).then(() => setCopied("link"))}
            className="px-3 h-9 rounded-xl bg-[#844783] text-white text-[11px] font-black disabled:opacity-40 shrink-0 flex items-center gap-1">
            {copied === "link" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied === "link" ? t.copied : t.copyLink}
          </button>
        </div>
      </div>

      <div className="p-3 rounded-2xl bg-[#141416] border border-white/10 space-y-2">
        <Label>{t.copyCode}</Label>
        <textarea readOnly rows={3} value={code || t.generating} onFocus={(e) => e.target.select()} dir="ltr"
          className="w-full bg-black/40 rounded-xl p-2 text-[10px] font-mono text-neutral-400 break-all resize-none focus:outline-none" />
        <button type="button" disabled={!code} onClick={() => copyText(code).then(() => setCopied("code"))}
          className="w-full h-10 rounded-xl bg-white/5 border border-white/10 text-[11px] font-black text-neutral-200 disabled:opacity-40 flex items-center justify-center gap-1">
          {copied === "code" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied === "code" ? t.copied : t.copyCode}
        </button>
      </div>
    </Sheet>
  );
}

/* ──────────────────────────── import ──────────────────────────── */

export function ImportSheet({ initialCode, isRtl, t, onImportProgram, onApplyMeal, onClose }) {
  const [input, setInput] = useState(initialCode || "");
  const [state, setState] = useState({ status: "idle" });

  const check = async (value) => {
    if (!value.trim()) { setState({ status: "idle" }); return; }
    setState({ status: "checking" });
    try {
      const payload = await decodeShare(value);
      setState({ status: "ok", payload });
    } catch (e) {
      setState({ status: "error", code: e.message });
    }
  };
  useEffect(() => { if (initialCode) check(initialCode); }, [initialCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const payload = state.status === "ok" ? state.payload : null;
  const isProgram = payload?.t === "program";
  const exCount = isProgram ? payload.days.reduce((n, d) => n + (d.x?.length || 0), 0) : 0;
  const meal = payload && !isProgram ? expandMealPlan(payload) : null;

  return (
    <Sheet title={t.importTitle} isRtl={isRtl} t={t} onClose={onClose}
      footer={payload && (
        <button type="button"
          onClick={() => (isProgram ? onImportProgram(payload) : onApplyMeal(meal))}
          className="flex-1 h-12 rounded-2xl bg-[#844783] text-white font-black text-sm">
          {isProgram ? t.addToMine : t.applyPlan}
        </button>
      )}>
      {initialCode && <p className="text-[11px] font-black text-[#c07dbf]">✨ {t.importFromUrl}</p>}
      <p className="text-[11px] font-medium text-neutral-400">{t.importHint}</p>
      <textarea rows={3} value={input} onChange={(e) => { setInput(e.target.value); check(e.target.value); }}
        placeholder={t.pastePh} dir="ltr" autoFocus={!initialCode}
        className="w-full rounded-2xl bg-[#141416] border border-white/10 p-3 text-[11px] font-mono text-white placeholder:text-neutral-600 resize-none focus:outline-none focus:border-white/30" />

      {state.status === "error" && (
        <p className="text-xs font-bold text-rose-400">{state.code === "too_large" ? t.tooLarge : t.invalidCode}</p>
      )}

      {payload && (
        <div className="p-4 rounded-2xl border space-y-2" style={{ background: `${payload.c || "#844783"}18`, borderColor: `${payload.c || "#844783"}55` }}>
          <Label>{t.preview}</Label>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{isProgram ? payload.e || "🏋️" : "🥗"}</span>
            <span className="min-w-0">
              <span className="block text-base font-black text-white truncate">{isProgram ? (isRtl && payload.nf ? payload.nf : payload.n) : meal.name}</span>
              <AuthorChip author={isProgram ? { name: payload.a?.n, role: payload.a?.r } : meal.author} t={t} />
            </span>
          </div>
          {isProgram ? (
            <>
              <p className="text-[11px] font-bold text-neutral-400" dir="ltr">
                {payload.days.length} {t.day} · {exCount} {t.exercises.toLowerCase()} · {payload.w} {t.weeks}
              </p>
              <ul className="space-y-0.5">
                {payload.days.map((d, i) => (
                  <li key={i} className="text-[11px] text-neutral-300 flex justify-between gap-2">
                    <span className="truncate">{t.day} {i + 1} — {d.r ? t.rest : (isRtl && d.tf ? d.tf : d.t)}</span>
                    {!d.r && <span className="text-neutral-500 shrink-0">{d.x.map((x) => exerciseName(x[0], isRtl)).slice(0, 2).join(", ")}{d.x.length > 2 ? " …" : ""}</span>}
                  </li>
                ))}
              </ul>
              {payload.d && <p className="text-[11px] text-neutral-400 italic">{payload.d}</p>}
            </>
          ) : (
            <>
              <p className="text-[11px] font-bold text-neutral-300" dir="ltr">
                {t.targets}: {meal.targets.kcal} kcal · P{meal.targets.protein} C{meal.targets.carbs} F{meal.targets.fat}
              </p>
              <p className="text-[11px] font-bold text-neutral-500">{meal.meals.length} {t.savedMeals}{meal.notes ? ` · ${meal.notes}` : ""}</p>
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}

export { EXERCISES };
