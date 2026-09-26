import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowLeftRight, ArrowRight, Check, ChevronDown, Clock, Dumbbell, Flag, Flame, Minus, Plus, Timer, Trophy, X } from "lucide-react";
import ExerciseMedia from "../training/ExerciseMedia";
import { CtaButton, Label, Ring, Sheet, cx, num } from "../ui/kit";
import { swapExercise } from "../../lib/training/programGen";
import { equipmentLabel, exerciseName, findExercise, unitOf } from "../../lib/training/exercises";
import { estimateCalories, lastPerformance, sessionSetsDone, sessionVolume } from "../../lib/training/programModel";
import { useTrainingT } from "../../lib/training/trainingI18n";

const clock = (sec) => `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
const shortClock = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
const toNum = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
const round2 = (v) => Math.round(v * 100) / 100;

// Number inputs without the browser's spinners.
const bare = "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

/** A 44–48 px round button on the ink screen. */
function RoundButton({ label, onClick, size = 44, tone = "card", disabled, children }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} style={{ width: size, height: size }}
      className={cx("shrink-0 rounded-full flex items-center justify-center border-0 cursor-pointer text-ink transition-transform active:scale-95 disabled:opacity-30",
        tone === "card" ? "bg-card" : "bg-hero-2")}>
      {children}
    </button>
  );
}

/**
 * The live workout, drawn as the ink screen: the exercise in big type, the
 * set being lifted on its own card, every set below it, and a rest timer.
 * Every set is logged as weight × reps and persisted as it happens, so a
 * refresh mid-session loses nothing. Elapsed time is derived from the
 * session's start rather than a ticking counter, for the same reason.
 *
 * The screen always wears the night palette (data-theme="dark" on its root),
 * whatever the app theme, so every token below resolves to its ink value.
 */
export default function ActiveWorkoutModal({ store, isRtl, onClose, onFinished }) {
  const t = useTrainingT(isRtl);
  const draft = store.draft;
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [rest, setRest] = useState(null);
  const [restTotal, setRestTotal] = useState(0);
  const [finished, setFinished] = useState(null);
  const [swapping, setSwapping] = useState(false);
  const n = (v) => num(v, isRtl);
  const sep = isRtl ? "، " : " · ";

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
  // Swaps stay within what the program was built for: the place, the level, the injuries.
  const built = store.programs?.find((p) => p.id === draft?.programId)?.generator || {};
  const swapOptions = useMemo(() => (swapping && exercise
    ? swapExercise(exercise, { location: built.location || "gym", level: built.level || "advanced", injuries: built.injuries || [] })
    : []), [swapping, exercise, built.location, built.level, built.injuries]);
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

  const startRest = (sec) => { setRest(sec); setRestTotal(sec); };

  const toggleDone = (setIdx) => {
    const set = current.sets[setIdx];
    if (!set.done) startRest(current.restSec || 90);
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

  const session = finished || draft;
  const dayTitle = (isRtl ? session.dayTitleFa : null) || session.dayTitle;
  const Forward = isRtl ? ArrowLeft : ArrowRight;
  const Back = isRtl ? ArrowRight : ArrowLeft;

  return (
    <div data-theme="dark" dir={isRtl ? "rtl" : "ltr"} role="dialog" aria-modal="true" aria-label={dayTitle}
      className="ui fixed inset-0 z-[100] overflow-y-auto">
      <div className={cx("min-h-full w-full md:max-w-lg mx-auto px-5 pt-[calc(env(safe-area-inset-top)+6px)] flex flex-col",
        finished && "pb-[max(env(safe-area-inset-bottom),24px)]")}>

        {/* top bar: end, the day and the clock, minimise */}
        <div className="flex items-center justify-between gap-3">
          <RoundButton label={finished ? t.close : t.discard} onClick={close}><X className="w-5 h-5" strokeWidth={2} /></RoundButton>
          <div className="min-w-0 flex flex-col items-center gap-0.5">
            <Label className="truncate max-w-[210px]">{dayTitle}</Label>
            <span dir="ltr" className="font-mono text-lg font-semibold tracking-[0.02em] tabular-nums">
              {n(clock(finished ? finished.durationSec : elapsed))}
            </span>
          </div>
          {finished ? <span className="w-11 h-11 shrink-0" aria-hidden="true" /> : (
            <RoundButton label={t.minimise} onClick={onClose}><ChevronDown className="w-5 h-5" strokeWidth={2} /></RoundButton>
          )}
        </div>

        {finished ? (
          <Summary t={t} n={n} isRtl={isRtl} finished={finished} onClose={onClose} />
        ) : (
          <>
            <div className="mt-5 flex gap-[5px]" aria-hidden="true">
              {exercises.map((ex, i) => {
                const f = ex.sets.length ? ex.sets.filter((s) => s.done).length / ex.sets.length : 0;
                return (
                  <span key={i} className={cx("flex-1 h-[5px] rounded-full relative overflow-hidden", i === index ? "bg-faint/70" : "bg-hero-2")}>
                    <span className="absolute inset-y-0 start-0 rounded-full bg-accent transition-[width] duration-300" style={{ width: `${f * 100}%` }} />
                  </span>
                );
              })}
            </div>

            {current ? (
              <Current t={t} n={n} sep={sep} isRtl={isRtl} index={index} count={exercises.length}
                current={current} exercise={exercise} last={last}
                onPatch={patchSet} onToggle={toggleDone} onAdd={addSet} onRemove={removeSet}
                onSwap={() => setSwapping(true)} />
            ) : (
              <p className="m-0 mt-10 text-[15px] text-muted">{t.noDays}</p>
            )}

            <div className="flex-grow min-h-6" />

            {/* pinned: the running totals, the next action, and moving between exercises */}
            <div className="sticky bottom-0 -mx-5 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] bg-canvas
              before:content-[''] before:absolute before:inset-x-0 before:-top-6 before:h-6 before:pointer-events-none before:bg-gradient-to-t before:from-canvas before:to-canvas/0">
              {rest !== null && (
                <div className="mb-3 rounded-[22px] bg-card p-3 ps-3.5 flex items-center gap-2.5" role="timer" aria-live="off">
                  <Ring value={restTotal ? rest / restTotal : 0} size={44} stroke={4} color="rgb(var(--ui-accent))" track="rgb(var(--ui-hero-2))">
                    <Timer className="w-[18px] h-[18px] text-accent" strokeWidth={2} />
                  </Ring>
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <Label>{t.restTimer}</Label>
                    <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                      <span dir="ltr" className="font-display font-extrabold text-2xl leading-none tracking-[-0.02em]">{n(shortClock(rest))}</span>
                      <span className="text-[15px] font-semibold text-muted">{t.leftWord}</span>
                    </span>
                  </div>
                  <button type="button" onClick={() => { setRest((r) => (r || 0) + 15); setRestTotal((x) => Math.max(x, (rest || 0) + 15)); }}
                    className="h-10 px-3 rounded-full bg-hero-2 text-ink text-sm font-semibold border-0 cursor-pointer active:scale-95 transition-transform">
                    +{n(15)} {isRtl ? "ث" : "s"}
                  </button>
                  <button type="button" onClick={() => setRest(null)}
                    className="h-10 px-3 rounded-full bg-hero-2 text-ink text-sm font-semibold border-0 cursor-pointer active:scale-95 transition-transform">
                    {t.skip}
                  </button>
                </div>
              )}

              {rest === null && (
              <p className="m-0 mb-3 flex justify-center flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
                <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5" strokeWidth={2.4} />{n(setsDone)} {t.sets}</span>
                <span className="inline-flex items-center gap-1.5"><Dumbbell className="w-3.5 h-3.5" strokeWidth={2} />{n(Math.round(sessionVolume(draft)).toLocaleString("en-US"))} {t.kg}</span>
                <span className="inline-flex items-center gap-1.5"><Flame className="w-3.5 h-3.5" strokeWidth={2} />~{n(calories)} kcal</span>
              </p>
              )}

              <PrimaryAction t={t} n={n} current={current} index={index} count={exercises.length} Forward={Forward}
                onComplete={toggleDone} onNext={() => setIndex(index + 1)} onFinish={finish} />

              <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 h-11 text-[13px] font-semibold whitespace-nowrap">
                <span className="justify-self-start">
                  {index > 0 && (
                    <button type="button" onClick={() => setIndex(index - 1)}
                      className="h-11 px-1 inline-flex items-center gap-1.5 bg-transparent border-0 text-muted cursor-pointer">
                      <Back className="w-4 h-4" strokeWidth={2} />{t.prevExercise}
                    </button>
                  )}
                </span>
                <span className="justify-self-center">
                  <button type="button" onClick={finish}
                    className="h-11 px-1 bg-transparent border-0 text-ink/85 underline underline-offset-[3px] cursor-pointer whitespace-nowrap">
                    {t.finishWorkout}
                  </button>
                </span>
                <span className="justify-self-end">
                  {index < exercises.length - 1 && (
                    <button type="button" onClick={() => setIndex(index + 1)}
                      className="h-11 px-1 inline-flex items-center gap-1.5 bg-transparent border-0 text-muted cursor-pointer">
                      {t.nextExercise}<Forward className="w-4 h-4" strokeWidth={2} />
                    </button>
                  )}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
      <Sheet open={swapping} z={95} title={t.swapTitle} isRtl={isRtl} onClose={() => setSwapping(false)} closeLabel={t.close}>
        <p className="m-0 -mt-2 text-sm text-muted">{t.swapHint}</p>
        <ul className="m-0 p-0 list-none rounded-3xl bg-card divide-y divide-hair">
          {swapOptions.map((ex) => (
            <li key={ex.id}>
              <button type="button" onClick={() => { store.swapDraftExercise(index, ex.id); setSwapping(false); }}
                className="w-full min-h-[64px] px-3 py-2 flex items-center gap-3 text-start bg-transparent border-0 cursor-pointer active:bg-sunk">
                <span className="w-12 h-12 rounded-xl overflow-hidden shrink-0"><ExerciseMedia exercise={ex} exerciseId={ex.id} name={ex.nameEn} thumb /></span>
                <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <span className="text-[15px] font-semibold text-ink">{exerciseName(ex, isRtl)}</span>
                  <span className="text-[13px] text-muted truncate">{equipmentLabel(ex, isRtl)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}

/** Complete the next set; once every set is in, move on or finish. */
function PrimaryAction({ t, n, current, index, count, Forward, onComplete, onNext, onFinish }) {
  const focusIdx = current ? current.sets.findIndex((s) => !s.done) : -1;
  let label = t.finishWorkout;
  let icon = <Flag className="w-5 h-5" strokeWidth={2.2} />;
  let action = onFinish;
  if (focusIdx >= 0) {
    label = t.completeSet(n(focusIdx + 1));
    icon = <Check className="w-5 h-5" strokeWidth={2.6} />;
    action = () => onComplete(focusIdx);
  } else if (index < count - 1) {
    label = t.nextExercise;
    icon = <Forward className="w-5 h-5" strokeWidth={2.2} />;
    action = onNext;
  }
  return (
    <button type="button" onClick={action}
      className="w-full h-[60px] rounded-full bg-accent text-on-accent border-0 cursor-pointer flex items-center justify-center gap-2.5 text-[17px] font-bold transition-transform active:scale-[0.98]">
      {icon}{label}
    </button>
  );
}

/** The exercise being lifted: its name, the working set on a card, and every set. */
function Current({ t, n, sep, isRtl, index, count, current, exercise, last, onPatch, onToggle, onAdd, onRemove, onSwap }) {
  const sets = current.sets;
  const focusIdx = sets.findIndex((s) => !s.done);
  const allDone = focusIdx === -1;
  const fi = allDone ? sets.length - 1 : focusIdx;
  const focus = sets[fi];
  const mode = exercise?.mode || "reps";
  const unit = unitOf(exercise, t);

  // The big number is the load when the lift has one, else reps, seconds or metres.
  const usesWeight = sets.some((s) => toNum(s.weight) > 0) || (last || []).some((s) => toNum(s.weight) > 0);
  const step = usesWeight ? 2.5 : mode === "time" ? 5 : mode === "distance" ? 10 : 1;
  const field = usesWeight ? "weight" : "reps";
  const big = focus?.[field];
  const bigText = big === null || big === undefined ? "–" : n(big);
  const unitLine = usesWeight ? `${t.kg} × ${focus?.reps != null ? n(focus.reps) : "–"}${mode !== "reps" ? ` ${unit}` : ""}` : unit;
  const adjust = (dir) => {
    const next = Math.max(0, round2((toNum(big) || 0) + dir * step));
    onPatch(fi, { [field]: next });
  };

  const prev = last ? last[fi] || last[last.length - 1] : null;
  let lastLine = `${t.target}: ${n(sets.length)} ${t.sets}`;
  if (prev) {
    const w = toNum(prev.weight) || 0;
    lastLine = `${t.lastTime} ${w ? `${n(w)} ${t.kg} × ` : ""}${n(prev.reps ?? 0)}${!w || mode !== "reps" ? ` ${unit}` : ""}`;
    const diff = usesWeight ? round2((toNum(focus?.weight) || 0) - w) : 0;
    if (w && diff) lastLine += `${sep}${diff > 0 ? "+" : "−"}${n(Math.abs(diff))} ${t.kg}`;
  }

  const target = sets[0]?.reps;
  const meta = [
    equipmentLabel(exercise, isRtl),
    target ? `${n(sets.length)} × ${n(target)}${mode !== "reps" ? ` ${unit}` : ""}` : null,
    current.restSec ? t.restFor(n(current.restSec)) : null,
  ].filter(Boolean);

  return (
    <>
      <div className="mt-[22px] flex items-start gap-3">
        <div className="flex-1 min-w-0 flex flex-col">
          <Label>
            {t.exerciseOf(n(index + 1), n(count))}{sep}{allDone ? t.allSetsDone : t.setOf(n(focusIdx + 1), n(sets.length))}
          </Label>
          <h1 className="m-0 mt-2 font-display font-extrabold text-[44px] leading-[0.95] tracking-[-0.045em] text-ink break-words">
            {exerciseName(current.exerciseId, isRtl)}
          </h1>
          {meta.length > 0 && (
            <span className="mt-2 text-sm text-muted">
              {meta.map((part, i) => <React.Fragment key={i}>{i > 0 && sep}<bdi>{part}</bdi></React.Fragment>)}
            </span>
          )}
          {current.note && <span className="mt-1 text-[13px] text-muted">{current.note}</span>}
          {current.target?.reason === "up" && <span className="mt-1.5 text-[13px] text-accent">{t.progUp(n(round2(current.target.weight - (current.target.from ?? current.target.weight))))}</span>}
          {current.target?.reason === "down" && <span className="mt-1.5 text-[13px] text-muted">{t.progDown}</span>}
          {current.target?.reason === "rep" && <span className="mt-1.5 text-[13px] text-muted">{t.progRep}</span>}
          {current.target?.reason === "hold" && <span className="mt-1.5 text-[13px] text-muted">{t.progHold}</span>}
          {!sets.some((s) => s.done) && (
            <button type="button" onClick={onSwap}
              className="mt-2.5 self-start h-9 px-3.5 rounded-full bg-hero-2 text-ink text-[13px] font-semibold border-0 cursor-pointer inline-flex items-center gap-1.5 active:scale-95 transition-transform">
              <ArrowLeftRight className="w-3.5 h-3.5" strokeWidth={2.2} />{t.swap}
            </button>
          )}
        </div>
        <span className="mt-1 w-16 h-16 rounded-2xl overflow-hidden shrink-0 ring-1 ring-line">
          <ExerciseMedia exerciseId={current.exerciseId} name={exercise?.nameEn} />
        </span>
      </div>

      <div className="mt-[18px] rounded-4xl bg-card py-[18px] pe-[18px] ps-5 flex items-center justify-between gap-3">
        <div className="min-w-0 flex flex-col gap-1.5">
          <span className="flex items-baseline flex-wrap gap-x-1.5">
            <span className="font-display font-extrabold leading-[0.85] tracking-[-0.05em] text-accent tabular-nums"
              style={{ fontSize: bigText.length > 4 ? 60 : 76 }}>{bigText}</span>
            <span className="text-lg font-semibold text-ink/85">{unitLine}</span>
          </span>
          <span className="text-[13px] text-muted">{lastLine}</span>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <RoundButton size={48} tone="hero" label={`${t.increase} ${step}`} onClick={() => adjust(1)}><Plus className="w-5 h-5" strokeWidth={2.2} /></RoundButton>
          <RoundButton size={48} tone="hero" label={`${t.decrease} ${step}`} onClick={() => adjust(-1)} disabled={!toNum(big)}>
            <Minus className="w-5 h-5" strokeWidth={2.2} />
          </RoundButton>
        </div>
      </div>

      <ol aria-label={t.sets} className="m-0 mt-3.5 p-0 list-none flex flex-col gap-1.5">
        {sets.map((s, k) => {
          const now = k === focusIdx;
          const input = cx("h-9 rounded-lg border-0 bg-sunk/70 text-center tabular-nums !outline-none focus:ring-2 focus:ring-inset focus:ring-accent placeholder:text-muted/60",
            bare, now ? "text-ink font-semibold text-base" : s.done ? "text-ink/85 text-[15px]" : "text-muted text-[15px]");
          return (
            <li key={k} aria-current={now ? "step" : undefined}
              className={cx("rounded-2xl flex items-center gap-2 ps-4 pe-1", now ? "h-[52px] bg-card ring-2 ring-inset ring-accent" : "h-12 bg-card/60")}>
              <span className={cx("w-5 shrink-0 font-mono text-[13px]", now ? "text-ink font-semibold" : "text-muted")}>{n(k + 1)}</span>
              <span className="flex-1 min-w-0 flex items-center gap-1.5">
                <input type="number" inputMode="decimal" step="0.5" min="0" value={s.weight ?? ""} placeholder="–"
                  onChange={(e) => onPatch(k, { weight: toNum(e.target.value) })} className={cx(input, "w-[62px]")}
                  aria-label={`${t.kg} ${k + 1}`} />
                <span className="text-sm text-muted shrink-0">{t.kg} ×</span>
                <input type="number" inputMode="numeric" min="0" value={s.reps ?? ""} placeholder="–"
                  onChange={(e) => onPatch(k, { reps: toNum(e.target.value) })} className={cx(input, "w-[52px]")}
                  aria-label={`${unit} ${k + 1}`} />
                {mode !== "reps" && <span className="text-sm text-muted shrink-0">{unit}</span>}
              </span>
              {now && (
                <span className="h-[26px] px-2.5 rounded-full bg-accent text-on-accent text-xs font-bold inline-flex items-center shrink-0">{t.now}</span>
              )}
              <button type="button" onClick={() => onToggle(k)} aria-pressed={!!s.done} aria-label={`${t.markDone} ${k + 1}`}
                className="w-11 h-11 shrink-0 flex items-center justify-center bg-transparent border-0 cursor-pointer p-0">
                <span className={cx("w-7 h-7 rounded-full flex items-center justify-center transition-colors",
                  s.done ? "bg-accent text-on-accent" : "ring-[1.5px] ring-inset ring-faint")}>
                  {s.done && <Check className="w-4 h-4" strokeWidth={3} />}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={onAdd}
          className="flex-1 h-11 rounded-full bg-card/60 text-ink/85 text-sm font-semibold border-0 cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform">
          <Plus className="w-4 h-4" strokeWidth={2.2} />{t.addSet}
        </button>
        <button type="button" onClick={onRemove} disabled={sets.length <= 1} aria-label={t.removeSet} title={t.removeSet}
          className="w-14 h-11 rounded-full bg-card/60 text-ink/85 border-0 cursor-pointer inline-flex items-center justify-center disabled:opacity-30 active:scale-[0.98] transition-transform">
          <Minus className="w-4 h-4" strokeWidth={2.2} />
        </button>
      </div>
    </>
  );
}

/** The finish line: time, volume, burn, and any records set today. */
function Summary({ t, n, isRtl, finished, onClose }) {
  const sep = isRtl ? "، " : " · ";
  const stats = [
    [Clock, t.duration, n(clock(finished.durationSec)), ""],
    [Dumbbell, t.volume, n(Math.round(sessionVolume(finished)).toLocaleString("en-US")), t.kg],
    [Flame, t.calories, n(estimateCalories(finished.durationSec, sessionSetsDone(finished))), "kcal"],
  ];
  return (
    <div className="flex-1 flex flex-col justify-center gap-5 py-8">
      <span className="w-[88px] h-[88px] rounded-full bg-accent text-on-accent flex items-center justify-center">
        <Trophy className="w-10 h-10" strokeWidth={2} />
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="m-0 font-display font-extrabold text-[44px] leading-[0.95] tracking-[-0.045em] text-ink">{t.completedTitle}</h2>
        <p className="m-0 text-[15px] text-muted">{t.completedSub}</p>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {stats.map(([Icon, label, value, unit]) => (
          <div key={label} className="rounded-3xl bg-card p-4 flex flex-col gap-2.5 min-w-0">
            <Icon className="w-[18px] h-[18px] text-accent" strokeWidth={2} />
            <span className="flex flex-col gap-1 min-w-0">
              <span dir="ltr" className="self-start max-w-full font-display font-extrabold text-[22px] leading-none tracking-[-0.03em] text-ink truncate">{value}</span>
              <span className="text-xs text-muted truncate">{label}{unit ? ` (${unit})` : ""}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-3xl bg-card px-4 pt-3.5 pb-1 flex flex-col">
        <Label className="pb-2">{t.newPRs}</Label>
        {finished.prs.length === 0 ? (
          <p className="m-0 py-3 border-t border-hair text-sm text-muted">{t.noPRs}</p>
        ) : finished.prs.map((pr) => (
          <div key={`${pr.exerciseId}-${pr.kind}`} className="min-h-[52px] py-2 border-t border-hair flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-accent text-on-accent flex items-center justify-center shrink-0"><Trophy className="w-4 h-4" strokeWidth={2} /></span>
            <span className="flex-1 min-w-0 flex flex-col">
              <span className="text-[15px] font-semibold text-ink truncate">{exerciseName(pr.exerciseId, isRtl)}</span>
              <span className="text-[13px] text-muted">
                {pr.kind === "first" ? t.prFirst : `${pr.kind === "weight" ? t.prWeight : t.prE1rm}${sep}${t.prFrom(`${n(pr.prev)} ${t.kg}`)}`}
              </span>
            </span>
            {pr.kind !== "first" && <span className="shrink-0 font-display font-extrabold text-lg text-accent">{n(pr.value)} {t.kg}</span>}
          </div>
        ))}
      </div>

      <CtaButton tone="accent" isRtl={isRtl} onClick={onClose}>{t.doneReturn}</CtaButton>
    </div>
  );
}
