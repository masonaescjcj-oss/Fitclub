import React, { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Clock, Dumbbell, Flame, Minus, Plus, Trophy, X } from "lucide-react";
import ExerciseGraphic from "../ExerciseGraphic";
import { exerciseName, findExercise, unitOf } from "../../lib/training/exercises";
import { estimateCalories, lastPerformance, sessionSetsDone, sessionVolume } from "../../lib/training/programModel";
import { useTrainingT } from "../../lib/training/trainingI18n";

const fmt = (sec) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

/**
 * The live workout. Every set is logged as weight × reps and persisted as it
 * happens, so a refresh mid-session loses nothing. Elapsed time is derived from
 * the session's start rather than a ticking counter, for the same reason.
 */
export default function ActiveWorkoutModal({ store, isRtl, onClose, onFinished }) {
  const t = useTrainingT(isRtl);
  const draft = store.draft;
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [rest, setRest] = useState(null);
  const [finished, setFinished] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (rest === null) return undefined;
    if (rest <= 0) { setRest(null); return undefined; }
    const id = setTimeout(() => setRest((r) => (r === null ? null : r - 1)), 1000);
    return () => clearTimeout(id);
  }, [rest]);

  const exercises = draft?.exercises || [];
  const current = exercises[index] || null;
  const exercise = current ? findExercise(current.exerciseId) : null;
  const elapsed = draft ? Math.max(Math.floor((now - new Date(draft.startedAt).getTime()) / 1000), 0) : 0;
  const setsDone = draft ? sessionSetsDone(draft) : 0;
  const calories = estimateCalories(elapsed, setsDone);

  const last = useMemo(
    () => (current ? lastPerformance(store.sessions, current.exerciseId) : null),
    [store.sessions, current]
  );

  if (!draft && !finished) return null;

  const patchSet = (setIdx, patch) =>
    store.updateDraft((d) => ({
      ...d,
      exercises: d.exercises.map((ex, i) =>
        i !== index ? ex : { ...ex, sets: ex.sets.map((s, k) => (k === setIdx ? { ...s, ...patch } : s)) }
      ),
    }));

  const toggleDone = (setIdx) => {
    const set = current.sets[setIdx];
    if (!set.done) setRest(current.restSec || 90);
    patchSet(setIdx, { done: !set.done });
  };

  const addSet = () =>
    store.updateDraft((d) => ({
      ...d,
      exercises: d.exercises.map((ex, i) => {
        if (i !== index) return ex;
        const prev = ex.sets[ex.sets.length - 1];
        return { ...ex, sets: [...ex.sets, { weight: prev?.weight ?? null, reps: prev?.reps ?? null, done: false }] };
      }),
    }));

  const removeSet = () =>
    store.updateDraft((d) => ({
      ...d,
      exercises: d.exercises.map((ex, i) => (i !== index || ex.sets.length <= 1 ? ex : { ...ex, sets: ex.sets.slice(0, -1) })),
    }));

  const finish = () => {
    const done = store.finishDraft(elapsed);
    setFinished(done);
    onFinished?.(done);
  };

  const close = () => {
    if (finished) { onClose(); return; }
    if (setsDone === 0 || window.confirm(t.discardConfirm)) { store.discardDraft(); onClose(); }
  };

  const unit = unitOf(exercise, t);
  const inputCls = "w-full h-11 rounded-xl bg-black/40 border border-white/10 text-center text-sm font-black text-white focus:outline-none focus:border-[#844783] tabular-nums";

  return (
    <div dir={isRtl ? "rtl" : "ltr"}
      className="fixed inset-0 z-[100] w-full min-h-[100dvh] bg-[#090a0d] text-white flex flex-col overflow-y-auto font-sans select-none px-4 py-4">

      {/* HUD */}
      <div className="border-b border-white/[0.08] pb-3 shrink-0 flex items-center justify-between">
        <button type="button" onClick={close} aria-label={t.close}
          className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white active:scale-95">
          <X className="w-5 h-5" />
        </button>
        <div className="text-center flex flex-col items-center min-w-0 px-2">
          <span className="text-[10px] font-black text-[#d17cd0] uppercase tracking-wider truncate max-w-[180px]">
            {(isRtl ? (finished || draft).dayTitleFa : null) || (finished || draft).dayTitle}
          </span>
          <div className="flex items-center gap-1 mt-1.5 w-32">
            {exercises.map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${
                i < index ? "bg-[#844783]" : i === index && !finished ? "bg-white animate-pulse" : "bg-white/10"}`} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/[0.06] border border-white/10 px-3.5 py-1.5 rounded-full" dir="ltr">
          <span className={`w-2 h-2 rounded-full ${finished ? "bg-neutral-500" : "bg-emerald-500 animate-pulse"}`} />
          <span className="text-xs font-mono font-black">{fmt(finished ? finished.durationSec : elapsed)}</span>
        </div>
      </div>

      {finished ? (
        /* ── summary ── */
        <div className="my-auto py-8 flex flex-col items-center text-center space-y-5 max-w-sm mx-auto w-full">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-500 to-[#844783] p-1 shadow-[0_0_40px_rgba(16,185,129,0.4)] flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
              <Trophy className="w-12 h-12 text-amber-300" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase">{t.completed} 🎉</h2>
            <p className="text-xs text-neutral-400 mt-1">{t.completedSub}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 w-full">
            {[
              [Clock, t.duration, fmt(finished.durationSec), "text-amber-400"],
              [Dumbbell, t.volume, `${Math.round(sessionVolume(finished)).toLocaleString()} ${t.kg}`, "text-cyan-400"],
              [Flame, t.calories, `${estimateCalories(finished.durationSec, sessionSetsDone(finished))}`, "text-orange-400"],
            ].map(([Icon, label, value, tone]) => (
              <div key={label} className="p-3 rounded-2xl bg-white/[0.04] border border-white/10">
                <Icon className={`w-4 h-4 mx-auto mb-1 ${tone}`} />
                <span className="text-[10px] font-bold text-neutral-400 block">{label}</span>
                <span className="text-sm font-black tabular-nums">{value}</span>
              </div>
            ))}
          </div>

          <div className="w-full p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-start space-y-2">
            <span className="block text-[10px] font-black text-amber-400 uppercase tracking-wider">🏆 {t.newPRs}</span>
            {finished.prs.length === 0 ? (
              <p className="text-xs text-neutral-500 font-medium">{t.noPRs}</p>
            ) : finished.prs.map((pr) => (
              <div key={`${pr.exerciseId}-${pr.kind}`} className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-white truncate">{exerciseName(pr.exerciseId, isRtl)}</span>
                <span className="text-[11px] font-bold text-emerald-400 shrink-0" dir="ltr">
                  {pr.kind === "first" ? t.prFirst : `${pr.prev} → ${pr.value} ${t.kg} · ${pr.kind === "weight" ? t.prWeight : t.prE1rm}`}
                </span>
              </div>
            ))}
          </div>

          <button type="button" onClick={onClose}
            className="w-full h-14 bg-white text-black font-black rounded-full text-base active:scale-95 transition-all">
            {t.doneReturn}
          </button>
        </div>
      ) : (
        <>
          <div className="my-auto py-3 space-y-3 flex-grow flex flex-col justify-center max-w-md mx-auto w-full">
            {rest !== null && (
              <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-between">
                <span className="text-xs font-black text-amber-400 uppercase">{t.restTimer}</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-mono font-black text-amber-400 tabular-nums">{rest}s</span>
                  <button type="button" onClick={() => setRest((r) => (r || 0) + 15)}
                    className="text-[10px] bg-amber-500/20 border border-amber-500/30 px-2 py-1 rounded-lg text-amber-300 font-black">+15s</button>
                  <button type="button" onClick={() => setRest(null)}
                    className="text-[10px] bg-amber-500/20 border border-amber-500/30 px-2 py-1 rounded-lg text-amber-300 font-black">{t.skip}</button>
                </div>
              </div>
            )}

            <div className="p-4 rounded-[28px] bg-white/[0.04] border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-neutral-400 uppercase tracking-wider">
                  {isRtl ? `حرکت ${index + 1} از ${exercises.length}` : `EXERCISE ${index + 1} OF ${exercises.length}`}
                </span>
                <span className="px-3 py-0.5 rounded-full bg-[#844783]/20 border border-[#844783]/40 text-[#d17cd0] text-[10px] font-black uppercase">
                  {exercise?.equipment || "—"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-20 h-20 rounded-2xl bg-neutral-950/90 border border-white/10 overflow-hidden shrink-0">
                  <ExerciseGraphic exerciseId={current.exerciseId} name={exercise?.nameEn} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-black leading-tight">{exerciseName(current.exerciseId, isRtl)}</h3>
                  {last ? (
                    <p className="text-[10px] font-bold text-neutral-500 mt-1" dir="ltr">
                      {t.lastTime}: {last.map((s) => `${s.weight || 0}×${s.reps}`).join(" · ")}
                    </p>
                  ) : (
                    <p className="text-[10px] font-bold text-neutral-600 mt-1">{t.target}: {current.sets.length} {t.sets}</p>
                  )}
                  {current.note && <p className="text-[10px] text-neutral-400 mt-1">{current.note}</p>}
                </div>
              </div>

              {/* set rows */}
              <div className="pt-2 border-t border-white/[0.08] space-y-1.5">
                <div className="grid grid-cols-[32px_1fr_1fr_44px] gap-2 px-1 text-[9px] font-black text-neutral-500 uppercase" dir="ltr">
                  <span>#</span><span className="text-center">{t.kg}</span><span className="text-center">{unit}</span><span />
                </div>
                {current.sets.map((s, k) => (
                  <div key={k} dir="ltr"
                    className={`grid grid-cols-[32px_1fr_1fr_44px] gap-2 items-center p-1.5 rounded-2xl transition-colors ${s.done ? "bg-[#844783]/20" : "bg-white/[0.03]"}`}>
                    <span className="text-xs font-black text-neutral-400 text-center">{k + 1}</span>
                    <input type="number" inputMode="decimal" step="0.5" min="0" value={s.weight ?? ""} placeholder="—"
                      onChange={(e) => patchSet(k, { weight: num(e.target.value) })} className={inputCls} aria-label={`${t.kg} ${k + 1}`} />
                    <input type="number" inputMode="numeric" min="0" value={s.reps ?? ""} placeholder="—"
                      onChange={(e) => patchSet(k, { reps: num(e.target.value) })} className={inputCls} aria-label={`${unit} ${k + 1}`} />
                    <button type="button" onClick={() => toggleDone(k)} aria-pressed={s.done} aria-label={`${t.markDone} ${k + 1}`}
                      className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                        s.done ? "bg-[#844783] text-white" : "bg-white/[0.06] border border-white/10 text-neutral-500"}`}>
                      <Check className="w-5 h-5 stroke-[3]" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={addSet}
                    className="flex-1 h-9 rounded-xl bg-white/[0.05] border border-dashed border-white/15 text-[11px] font-black text-neutral-300 flex items-center justify-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> {t.addSet}
                  </button>
                  <button type="button" onClick={removeSet} disabled={current.sets.length <= 1} aria-label={t.removeSet}
                    className="w-11 h-9 rounded-xl bg-white/[0.05] border border-white/10 text-neutral-400 disabled:opacity-30 flex items-center justify-center">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-4 text-[10px] font-black text-neutral-500" dir="ltr">
              <span>✅ {setsDone} {t.sets}</span>
              <span>🏋️ {Math.round(sessionVolume(draft)).toLocaleString()} {t.kg}</span>
              <span>🔥 ~{calories} kcal</span>
            </div>
          </div>

          <div className="space-y-3 pt-2 shrink-0 max-w-md mx-auto w-full">
            <button type="button" onClick={() => (index < exercises.length - 1 ? setIndex(index + 1) : finish())}
              className="w-full h-14 bg-gradient-to-r from-[#844783] to-[#a356a2] text-white font-black rounded-full text-base flex items-center justify-center gap-2 shadow-[0_0_35px_rgba(132,71,131,0.5)] active:scale-[0.98] transition-all">
              <span>{index < exercises.length - 1 ? t.nextExercise : `${t.finishWorkout} 🎉`}</span>
              {isRtl ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
            <div className="flex items-center justify-between text-xs text-neutral-400 font-bold px-2 h-5">
              {index > 0 ? (
                <button type="button" onClick={() => setIndex(index - 1)} className="flex items-center gap-1 hover:text-white">
                  {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                  <span>{t.prevExercise}</span>
                </button>
              ) : <span />}
              {index < exercises.length - 1 && (
                <button type="button" onClick={finish} className="hover:text-white">{t.finishWorkout}</button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
