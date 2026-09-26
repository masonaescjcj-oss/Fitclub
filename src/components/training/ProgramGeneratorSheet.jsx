import React, { useMemo, useState } from "react";
import { Shuffle, Sparkles } from "lucide-react";
import { Sheet } from "./TrainingSheets";
import ExerciseMedia from "./ExerciseMedia";
import { Button, Card, Chip, Label, Segmented, num } from "../ui/kit";
import { INJURIES, SESSION_MINUTES, generateProgram } from "../../lib/training/programGen";
import { exerciseName, findExercise } from "../../lib/training/exercises";
import { useExerciseCatalog } from "../../lib/training/useExerciseCatalog";
import { loadProfile } from "../../lib/nutrition/profile";

// "Make me a program": the planner's questions on one sheet, the program
// they produce right under them (rebuilt as each answer changes), and one
// button to make it the active program.

const GOALS = [["Weight Loss", "goalLoss"], ["Muscle Gain", "goalMuscle"], ["Keep Fit", "goalFit"], ["Max Strength", "goalStrength"]];
const LEVELS = [["beginner", "levelBeginner"], ["intermediate", "levelIntermediate"], ["advanced", "levelAdvanced"]];
const PLACES = [["gym", "whereGym"], ["home_gear", "whereGear"], ["home", "whereHome"]];
const FREQUENCY_DAYS = { "2_3": 3, "3_4": 4, "4_5": 5, "5_6": 6 };

/** Where the questions start: the last program made for them, else their profile. */
export function generatorDefaults(programs = []) {
  const last = [...programs].reverse().find((p) => p.source === "generated" && p.generator)?.generator;
  if (last) return { goal: last.goal, days: last.days, minutes: last.minutes, level: last.level, location: last.location, injuries: last.injuries || [], focus: last.focus || [] };
  let profile = {};
  try { profile = loadProfile() || {}; } catch { /* no profile yet */ }
  return {
    goal: GOALS.some(([g]) => g === profile.goal) ? profile.goal : "Keep Fit",
    days: FREQUENCY_DAYS[profile.frequency] || 3,
    minutes: 60, level: "intermediate", location: "gym", injuries: [], focus: [],
  };
}

export default function ProgramGeneratorSheet({ isRtl, t, programs, onUse, onClose }) {
  const version = useExerciseCatalog();
  const [input, setInput] = useState(() => generatorDefaults(programs));
  const [seed, setSeed] = useState(7);
  const set = (patch) => setInput((x) => ({ ...x, ...patch }));
  const n = (v) => num(v, isRtl);
  const sep = isRtl ? "، " : " · ";
  // Sets × reps; timed work in minutes or seconds, distance in metres.
  const dose = (pe, ex) => {
    if (ex?.mode === "time") return pe.reps >= 60 ? `${n(Math.round(pe.reps / 60))} ${t.min}` : `${n(pe.sets)} × ${n(pe.reps)} ${t.seconds}`;
    if (ex?.mode === "distance") return `${n(pe.sets)} × ${n(pe.reps)} ${t.meters}`;
    return `${n(pe.sets)} × ${n(pe.reps)}`;
  };

  // A few milliseconds: rebuilt on every answer.
  const program = useMemo(() => {
    try { return generateProgram({ ...input, seed }); } catch { return null; }
  }, [input, seed, version]); // eslint-disable-line react-hooks/exhaustive-deps

  const footer = (
    <div className="grid grid-cols-[auto_1fr] gap-2.5">
      <Button tone="card" icon={<Shuffle className="w-4 h-4" strokeWidth={2} />} onClick={() => setSeed((s) => s + 1)}>{t.genShuffle}</Button>
      <Button tone="ink" disabled={!program} onClick={() => onUse({ ...input, seed })}>{t.genUse}</Button>
    </div>
  );

  return (
    <Sheet title={t.makeProgram} isRtl={isRtl} t={t} onClose={onClose} footer={footer} tall>
      <div className="flex flex-col gap-4 pb-2">
        <Field label={t.genGoal}>
          <Segmented label={t.genGoal} value={input.goal} onChange={(goal) => set({ goal })}
            options={GOALS.map(([id, k]) => ({ id, label: t[k] }))} />
        </Field>
        <Field label={t.genDays}>
          <Segmented label={t.genDays} value={String(input.days)} onChange={(v) => set({ days: +v })}
            options={[2, 3, 4, 5, 6].map((d) => ({ id: String(d), label: n(d) }))} />
        </Field>
        <Field label={t.genMinutes}>
          <Segmented label={t.genMinutes} value={String(input.minutes)} onChange={(v) => set({ minutes: +v })}
            options={SESSION_MINUTES.map((m) => ({ id: String(m), label: n(m) }))} />
        </Field>
        <Field label={t.genLevel}>
          <Segmented label={t.genLevel} value={input.level} onChange={(level) => set({ level })}
            options={LEVELS.map(([id, k]) => ({ id, label: t[k] }))} />
        </Field>
        <Field label={t.genWhere}>
          <div className="flex flex-wrap gap-1.5">
            {PLACES.map(([id, k]) => (
              <Chip key={id} active={input.location === id} onClick={() => set({ location: id })}>{t[k]}</Chip>
            ))}
          </div>
        </Field>
        <Field label={t.genInjuries}>
          <div className="flex flex-wrap gap-1.5">
            {INJURIES.map((inj) => {
              const on = input.injuries.includes(inj.id);
              return (
                <Chip key={inj.id} active={on}
                  onClick={() => set({ injuries: on ? input.injuries.filter((x) => x !== inj.id) : [...input.injuries, inj.id] })}>
                  {isRtl ? inj.fa : inj.en}
                </Chip>
              );
            })}
          </div>
        </Field>

        {program && (
          <Card className="flex flex-col gap-3" aria-label={t.genTitle}>
            <div className="flex items-start gap-2">
              <Sparkles className="w-[18px] h-[18px] mt-0.5 text-ink shrink-0" strokeWidth={2} />
              <span className="text-[17px] font-bold leading-snug text-ink">{isRtl ? program.nameFa : program.name}</span>
            </div>
            <ul className="m-0 p-0 list-none flex flex-col gap-3.5">
              {program.days.filter((d) => d.type !== "rest").map((d) => (
                <li key={d.id} className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-ink">
                    {isRtl ? d.titleFa : d.title}
                    <span className="font-normal text-muted">{sep}{n(d.exercises.length)} {t.exercisesLc}</span>
                  </span>
                  <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
                    {d.exercises.map((pe) => {
                      const ex = findExercise(pe.exerciseId);
                      return (
                        <li key={pe.id} className="flex items-center gap-2.5 min-w-0">
                          <span className="w-9 h-9 rounded-xl overflow-hidden shrink-0"><ExerciseMedia exercise={ex} name={ex?.nameEn} thumb /></span>
                          <span className="flex-1 min-w-0 truncate text-[13px] text-ink">{exerciseName(pe.exerciseId, isRtl)}</span>
                          <span className="shrink-0 text-[12px] text-muted tabular-nums">{dose(pe, ex)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
            <p className="m-0 text-[12px] leading-relaxed text-muted">{t.genReplaces}</p>
          </Card>
        )}
      </div>
    </Sheet>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
