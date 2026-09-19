import React, { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  BadgeCheck, Coffee, Copy, Download, Dumbbell, Flame, Pencil, Play, Plus, Search, Share2, Trash2, Trophy,
} from "lucide-react";
import ExerciseGraphic from "../../components/ExerciseGraphic";
import ActiveWorkoutModal from "../../components/modals/ActiveWorkoutModal";
import { AuthorChip, ImportSheet, ProgramBuilderSheet, ShareSheet, Sheet } from "../../components/training/TrainingSheets";
import { EXERCISES, MUSCLES, exerciseName, findExercise, searchExercises } from "../../lib/training/exercises";
import {
  compactProgram, exerciseBests, exerciseTrend, lastPerformance, sessionSetsDone, sessionVolume, estimateCalories,
} from "../../lib/training/programModel";
import { useTrainingT } from "../../lib/training/trainingI18n";
import { useTrainingStore } from "../../lib/training/trainingContext";
import { useNutritionStore } from "../../lib/nutrition/nutritionContext";
import { loadSession } from "../../lib/session";

const SEGMENTS = ["plan", "programs", "exercises", "progress"];
const fmtDuration = (sec) => `${Math.round(sec / 60)}`;
const dateLabel = (iso) => new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

export default function WorkoutPage({ isRtl }) {
  const t = useTrainingT(isRtl);
  const store = useTrainingStore();
  const nutrition = useNutritionStore();
  const [segment, setSegment] = useState("plan");
  const [live, setLive] = useState(!!store.draft);
  const [builder, setBuilder] = useState(undefined); // undefined closed | null new | program edit
  const [share, setShare] = useState(null);           // program to share
  const [importing, setImporting] = useState(false);
  const [trendFor, setTrendFor] = useState(null);     // exercise id
  const [toast, setToast] = useState("");

  const author = { name: loadSession().name || "Isaac", role: store.coachMode ? "coach" : "user" };
  const active = store.activeProgram;

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(""), 1600); };

  const startDay = (day) => { store.startSession(active.id, day.id); setLive(true); };

  const programName = (p) => (isRtl && p.nameFa ? p.nameFa : p.name);
  const dayName = (d) => (d.type === "rest" ? t.rest : (isRtl && d.titleFa ? d.titleFa : d.title));

  return (
    <div className="w-full min-h-[100dvh] bg-black text-white px-4 pt-5 pb-28 space-y-4">
      {/* Segment switcher */}
      <div className="p-1 rounded-2xl bg-[#141416] border border-white/10 grid grid-cols-4 gap-1">
        {SEGMENTS.map((s) => (
          <button key={s} type="button" onClick={() => setSegment(s)}
            className={`h-9 rounded-xl text-[11px] font-black transition-all ${segment === s ? "bg-white text-black" : "text-neutral-400 hover:text-white"}`}>
            {t[s]}
          </button>
        ))}
      </div>

      {/* Resume banner for a workout left open */}
      {store.draft && !live && (
        <button type="button" onClick={() => setLive(true)}
          className="w-full p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center gap-3 text-start">
          <Play className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="flex-1 text-xs font-black text-emerald-300 truncate">{isRtl ? "ادامه تمرین باز" : "Resume open workout"} — {store.draft.dayTitle}</span>
        </button>
      )}

      {/* ── PLAN ── */}
      {segment === "plan" && (active ? (
        <>
          <div className="p-5 rounded-3xl border relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${active.color}33, var(--card))`, borderColor: `${active.color}55` }}>
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: active.color }}>{t.currentSplit}</span>
            <div className="flex items-start justify-between gap-3 mt-1">
              <div className="min-w-0">
                <h2 className="text-2xl font-black leading-tight">{active.emoji} {programName(active)}</h2>
                <p className="text-sm font-bold text-neutral-400 mt-1">{active.days.filter((d) => d.type !== "rest").length} {t.daysWeek} · {active.weeks} {t.weeks}</p>
                <div className="mt-1"><AuthorChip author={active.author} t={t} /></div>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <button type="button" onClick={() => setShare(active)} aria-label={t.shareProgram}
                  className="w-9 h-9 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white"><Share2 className="w-4 h-4" /></button>
                <button type="button" onClick={() => setImporting(true)} aria-label={t.importTitle}
                  className="w-9 h-9 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white"><Download className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {active.days.map((day, i) => {
              const isRest = day.type === "rest";
              const est = day.exercises.length * 8;
              return (
                <div key={day.id} className={`p-4 rounded-3xl border flex items-center gap-4 ${isRest ? "bg-[#0f0f11] border-white/5 opacity-70" : "bg-[#141416] border-white/10"}`}>
                  <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 ${isRest ? "bg-neutral-900 border border-white/5" : "text-white"}`}
                    style={isRest ? undefined : { background: `linear-gradient(135deg, ${active.color}, ${active.color}99)` }}>
                    <span className="text-[9px] font-black uppercase opacity-80">{t.day}</span>
                    <span className="text-xl font-black leading-none">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-base font-black truncate ${isRest ? "text-neutral-400" : "text-white"}`}>{dayName(day)}</h3>
                    <p className="text-xs font-bold text-neutral-500 mt-0.5">
                      {isRest ? `☕ ${t.recovery}` : `🔥 ${t.session} · ${day.exercises.length} ${t.exercises.toLowerCase()} · ~${est} ${t.min}`}
                    </p>
                  </div>
                  {isRest ? (
                    <span className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-neutral-600"><Coffee className="w-5 h-5" /></span>
                  ) : (
                    <button type="button" onClick={() => startDay(day)}
                      className="px-5 h-12 rounded-full bg-white text-black text-sm font-black active:scale-95 transition-transform shadow-lg">{t.start}</button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <p className="py-16 text-center text-sm font-bold text-neutral-500">{t.noActive}</p>
      ))}

      {/* ── PROGRAMS ── */}
      {segment === "programs" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setBuilder(null)}
              className="h-12 rounded-2xl bg-[#844783] text-white text-sm font-black flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> {t.newProgram}</button>
            <button type="button" onClick={() => setImporting(true)}
              className="h-12 rounded-2xl bg-[#141416] border border-white/10 text-white text-sm font-black flex items-center justify-center gap-2"><Download className="w-4 h-4" /> {t.importTitle}</button>
          </div>

          {[["mine", t.myPrograms], ["imported", t.imported], ["builtin", t.builtin]].map(([source, title]) => {
            const list = store.programs.filter((p) => p.source === source);
            if (!list.length) return null;
            return (
              <section key={source} className="space-y-2">
                <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-wider px-1">{title}</h3>
                {list.map((p) => {
                  const isActive = p.id === active?.id;
                  return (
                    <div key={p.id} className={`p-4 rounded-3xl border space-y-3 ${isActive ? "border-white/30" : "border-white/10"} bg-[#141416]`}>
                      <div className="flex items-start gap-3">
                        <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ background: `${p.color}22`, border: `1px solid ${p.color}55` }}>{p.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-white truncate">{programName(p)}</h4>
                            {isActive && <span className="px-2 py-0.5 rounded-full text-[9px] font-black text-white shrink-0" style={{ background: p.color }}>{t.active}</span>}
                          </div>
                          <p className="text-[11px] font-bold text-neutral-500">{p.days.filter((d) => d.type !== "rest").length} {t.daysWeek} · {p.weeks} {t.weeks}</p>
                          <AuthorChip author={p.author} t={t} />
                        </div>
                      </div>
                      {p.description && <p className="text-[11px] text-neutral-400">{p.description}</p>}
                      <div className="flex flex-wrap gap-1.5">
                        {!isActive && <Act icon={Play} label={t.setActive} onClick={() => { store.setActiveProgram(p.id); setSegment("plan"); }} tone="text-emerald-400" />}
                        {p.source !== "builtin" && <Act icon={Pencil} label={t.editProgram} onClick={() => setBuilder(p)} />}
                        <Act icon={Copy} label={t.duplicate} onClick={() => { store.duplicateProgram(p.id, `${t.copyOf} ${p.name}`, author); flash(t.copied); }} />
                        <Act icon={Share2} label={t.share} onClick={() => setShare(p)} />
                        {p.source !== "builtin" && <Act icon={Trash2} label={t.delete} tone="text-rose-400" onClick={() => { if (window.confirm(t.deleteProgramConfirm)) store.removeProgram(p.id); }} />}
                      </div>
                    </div>
                  );
                })}
              </section>
            );
          })}
        </>
      )}

      {/* ── EXERCISES ── */}
      {segment === "exercises" && <Library isRtl={isRtl} t={t} sessions={store.sessions} onOpen={setTrendFor} />}

      {/* ── PROGRESS ── */}
      {segment === "progress" && <Progress isRtl={isRtl} t={t} store={store} />}

      {/* overlays */}
      {live && (
        <ActiveWorkoutModal store={store} isRtl={isRtl}
          onClose={() => setLive(false)}
          onFinished={() => nutrition.setTrainingDay(true)} />
      )}
      <AnimatePresence>
        {builder !== undefined && (
          <ProgramBuilderSheet program={builder} isRtl={isRtl} t={t} author={author}
            onSave={(patch) => {
              if (builder) store.updateProgram(builder.id, patch);
              else { const p = store.addProgram(patch); store.setActiveProgram(p.id); }
              setBuilder(undefined);
            }}
            onClose={() => setBuilder(undefined)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {share && (
          <ShareSheet payload={compactProgram({ ...share, author })} title={t.shareProgram} isRtl={isRtl} t={t}
            coachMode={store.coachMode} onToggleCoach={store.setCoachMode} onClose={() => setShare(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {importing && (
          <ImportSheet isRtl={isRtl} t={t}
            onImportProgram={(compact) => { const p = store.importProgram(compact); store.setActiveProgram(p.id); setImporting(false); setSegment("plan"); flash(t.importedOk); }}
            onApplyMeal={(meal) => { applyMealPlan(nutrition, meal); setImporting(false); flash(t.appliedOk); }}
            onClose={() => setImporting(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {trendFor && <TrendSheet exerciseId={trendFor} sessions={store.sessions} isRtl={isRtl} t={t} onClose={() => setTrendFor(null)} />}
      </AnimatePresence>

      {toast && (
        <div className="fixed bottom-24 inset-x-0 flex justify-center z-[95] pointer-events-none">
          <span className="px-4 py-2 rounded-full bg-white/15 backdrop-blur text-xs font-black text-white">{toast}</span>
        </div>
      )}
    </div>
  );
}

/** Applies a shared nutrition plan: targets plus its saved meals. */
export function applyMealPlan(nutrition, meal) {
  const { kcal, protein, carbs, fat } = meal.targets;
  nutrition.setCustomTargets({
    kcal, protein, carbs, fat,
    fiber: Math.round((kcal / 1000) * 14),
    water: Math.round((nutrition.profile?.weight || 70) * 35),
  });
  for (const m of meal.meals) nutrition.saveMeal(m.name, m.items);
}

function Act({ icon: Icon, label, onClick, tone = "text-neutral-300" }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-2.5 h-8 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black flex items-center gap-1 hover:bg-white/10 ${tone}`}>
      <Icon className="w-3 h-3" /> {label}
    </button>
  );
}

function Library({ isRtl, t, sessions, onOpen }) {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState(null);
  const list = useMemo(() => searchExercises(q, muscle), [q, muscle]);
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className={`w-4 h-4 text-neutral-500 absolute top-1/2 -translate-y-1/2 ${isRtl ? "right-3" : "left-3"}`} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchExercises}
          className={`w-full h-11 ${isRtl ? "pr-10 pl-3" : "pl-10 pr-3"} rounded-2xl bg-[#141416] border border-white/10 text-sm font-bold text-white placeholder:text-neutral-600 focus:outline-none focus:border-white/30`} />
      </div>
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {[{ id: null, en: t.allMuscles, fa: t.allMuscles }, ...MUSCLES].map((m) => (
          <button key={String(m.id)} type="button" onClick={() => setMuscle(m.id)}
            className={`px-3 h-8 rounded-lg text-[10px] font-black whitespace-nowrap border ${muscle === m.id ? "bg-white/10 border-white/30 text-white" : "bg-[#141416] border-white/10 text-neutral-400"}`}>
            {isRtl ? m.fa : m.en}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {list.map((e) => {
          const best = exerciseBests(sessions, e.id);
          return (
            <button key={e.id} type="button" onClick={() => onOpen(e.id)}
              className="w-full p-3 rounded-2xl bg-[#141416] border border-white/10 flex items-center gap-3 text-start hover:border-white/25">
              <span className="w-12 h-12 rounded-xl bg-neutral-950 border border-white/10 overflow-hidden shrink-0"><ExerciseGraphic exerciseId={e.id} name={e.nameEn} /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-black text-white truncate">{isRtl ? e.nameFa : e.nameEn}</span>
                <span className="block text-[10px] font-bold text-neutral-500">{e.equipment}</span>
              </span>
              {best.maxWeight > 0 && (
                <span className="text-end shrink-0">
                  <span className="block text-[9px] font-black text-amber-400 uppercase">{t.e1rm}</span>
                  <span className="block text-sm font-black text-white tabular-nums">{Math.round(best.bestE1rm)} {t.kg}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TrendSheet({ exerciseId, sessions, isRtl, t, onClose }) {
  const ex = findExercise(exerciseId);
  const points = exerciseTrend(sessions, exerciseId);
  const best = exerciseBests(sessions, exerciseId);
  const last = lastPerformance(sessions, exerciseId);
  const max = Math.max(...points.map((p) => p.e1rm), 1);
  return (
    <Sheet title={exerciseName(exerciseId, isRtl)} isRtl={isRtl} t={t} onClose={onClose}>
      <div className="flex items-center gap-3">
        <span className="w-20 h-20 rounded-2xl bg-neutral-950 border border-white/10 overflow-hidden shrink-0"><ExerciseGraphic exerciseId={exerciseId} name={ex?.nameEn} /></span>
        <div className="grid grid-cols-2 gap-2 flex-1">
          <Stat label={t.topSet} value={best.maxWeight ? `${best.maxWeight} ${t.kg}` : "—"} />
          <Stat label={t.e1rm} value={best.bestE1rm ? `${Math.round(best.bestE1rm)} ${t.kg}` : "—"} />
        </div>
      </div>
      {points.length >= 2 ? (
        <div className="p-3 rounded-2xl bg-[#141416] border border-white/10">
          <span className="block text-[10px] font-black text-neutral-500 uppercase tracking-wider mb-2">{t.trend} · {t.e1rm}</span>
          <div className="flex items-end gap-1.5 h-28" dir="ltr">
            {points.map((p, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${p.weight}×${p.reps}`}>
                <span className="text-[9px] font-black text-neutral-400 tabular-nums">{p.e1rm}</span>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-[#844783] to-[#c07dbf]" style={{ height: `${Math.max((p.e1rm / max) * 80, 6)}%` }} />
                <span className="text-[8px] font-bold text-neutral-600">{new Date(p.at).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs font-bold text-neutral-600 text-center py-6">{t.noTrend}</p>
      )}
      {last && (
        <p className="text-[11px] font-bold text-neutral-400" dir="ltr">{t.lastTime}: {last.map((s) => `${s.weight || 0}×${s.reps}`).join(" · ")}</p>
      )}
    </Sheet>
  );
}

function Stat({ label, value }) {
  return (
    <div className="p-3 rounded-2xl bg-[#141416] border border-white/10">
      <span className="block text-[9px] font-black text-neutral-500 uppercase tracking-wider">{label}</span>
      <span className="block text-sm font-black text-white tabular-nums">{value}</span>
    </div>
  );
}

function Progress({ isRtl, t, store }) {
  const sessions = [...store.sessions].filter((s) => s.finishedAt).sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
  const prs = sessions.flatMap((s) => (s.prs || []).map((pr) => ({ ...pr, at: s.startedAt }))).slice(0, 8);
  const maxVol = Math.max(...store.weekly.map((w) => w.volume), 1);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[[t.totalVolume, `${Math.round(store.stats.volume).toLocaleString()} ${t.kg}`, "text-amber-400"], [t.workouts, store.stats.count, "text-[#c07dbf]"], [t.totalBurn, `${store.stats.calories.toLocaleString()} kcal`, "text-emerald-400"]].map(([l, v, tone]) => (
          <div key={l} className="p-3 rounded-2xl bg-[#141416] border border-white/10">
            <span className={`block text-[9px] font-black uppercase ${tone}`}>{l}</span>
            <span className="block text-sm font-black text-white tabular-nums mt-0.5">{v}</span>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-3xl bg-[#141416] border border-white/10">
        <span className="block text-[10px] font-black text-neutral-500 uppercase tracking-wider mb-3">{t.weeklyVolume}</span>
        <div className="flex items-end gap-3 h-28" dir="ltr">
          {store.weekly.map((w, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] font-black text-neutral-400 tabular-nums">{w.volume ? `${Math.round(w.volume / 1000)}k` : "—"}</span>
              <div className="w-full rounded-t-xl bg-gradient-to-t from-[#844783] to-[#a356a2]" style={{ height: `${Math.max((w.volume / maxVol) * 80, 4)}%` }} />
              <span className="text-[9px] font-bold text-neutral-600">{w.from.toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}</span>
            </div>
          ))}
        </div>
      </div>

      {prs.length > 0 && (
        <div className="p-4 rounded-3xl bg-[#141416] border border-white/10 space-y-2">
          <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-400 uppercase tracking-wider"><Trophy className="w-3.5 h-3.5" /> {t.personalRecords}</span>
          {prs.map((pr, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-xs">
              <span className="font-black text-white truncate">{exerciseName(pr.exerciseId, isRtl)}</span>
              <span className="font-bold text-emerald-400 shrink-0" dir="ltr">{pr.kind === "first" ? t.prFirst : `${pr.prev} → ${pr.value} ${t.kg}`}</span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-wider px-1">{t.history}</h3>
        {sessions.length === 0 && <p className="py-8 text-center text-xs font-bold text-neutral-600">{t.noSessions}</p>}
        {sessions.map((s) => (
          <div key={s.id} className="p-4 rounded-2xl bg-[#141416] border border-white/10 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#844783]/20 border border-[#844783]/40 flex items-center justify-center text-[#c07dbf] shrink-0"><Dumbbell className="w-5 h-5" /></span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-black text-white truncate">{(isRtl && s.dayTitleFa) || s.dayTitle} <span className="text-neutral-500 font-bold">· {s.programName}</span></span>
              <span className="block text-[10px] font-bold text-neutral-500" dir="ltr">{dateLabel(s.startedAt)} · {fmtDuration(s.durationSec)} {t.min} · {Math.round(sessionVolume(s)).toLocaleString()} {t.kg} · {sessionSetsDone(s)} {t.sets}{s.prs?.length ? ` · 🏆 ${s.prs.length}` : ""}</span>
            </span>
            <button type="button" onClick={() => { if (window.confirm(t.deleteSessionConfirm)) store.removeSession(s.id); }} aria-label={t.deleteSession}
              className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-neutral-600 hover:text-rose-400 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

export { BadgeCheck, Flame, EXERCISES, estimateCalories };
