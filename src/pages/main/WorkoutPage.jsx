import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import {
  Copy, Download, Dumbbell, History, Moon, MoreHorizontal, Pencil, Play, Plus, Search, Share2, Sparkles, Trash2, TrendingDown, TrendingUp, Trophy,
} from "lucide-react";
import ExerciseMedia from "../../components/training/ExerciseMedia";
import ActiveWorkoutModal from "../../components/modals/ActiveWorkoutModal";
import ProgramGeneratorSheet from "../../components/training/ProgramGeneratorSheet";
import { isDeloadWeek, programWeek } from "../../lib/training/programGen";
import { PLACES, WEEK_DAYS, workoutPresets } from "../../lib/plans/library";
import {
  AuthorChip, ImportSheet, ProgramBuilderSheet, ProgramMark, ShareSheet, Sheet,
} from "../../components/training/TrainingSheets";
import {
  Button, Card, Chip, CtaButton, Empty, Field, IconButton, IconWell, Label, List, PageHead, Row, Screen, SectionHead,
  Segmented, Tag, Toast, cx, num,
} from "../../components/ui/kit";
import {
  equipmentLabel, exerciseName, findBySlug, findExercise, muscleLabel, searchExercises,
} from "../../lib/training/exercises";
import {
  EQUIPMENT_TAGS, MUSCLE_TAGS, findEquipment, findMuscle, tagLabel, slugify,
} from "../../lib/training/taxonomy";
import { useExerciseCatalog, useExerciseDetails } from "../../lib/training/useExerciseCatalog";
import {
  bestSetIn, compactProgram, exerciseBests, exerciseTrend, lastPerformance, sessionSetsDone, sessionVolume,
} from "../../lib/training/programModel";
import { useTrainingT } from "../../lib/training/trainingI18n";
import { useTrainingStore } from "../../lib/training/trainingContext";
import { useNutritionStore } from "../../lib/nutrition/nutritionContext";
import { applyMealPlan } from "../../lib/nutrition/mealPlan";
import { loadSession } from "../../lib/session";

// Train: the week's volume, the sessions coming up in the active split, the
// latest record, and three more views: every program, the exercise library,
// and progress over time. The live workout opens as its own ink screen.

const SEGMENTS = ["plan", "programs", "exercises", "progress"];
const DAY_MS = 86400000;

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d, k) => { const x = new Date(d); x.setDate(x.getDate() + k); return x; };
const dayStart = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const fmt = (d, isRtl, opts) => new Intl.DateTimeFormat(isRtl ? "fa-IR-u-ca-persian" : "en-GB", opts).format(d);
const grouped = (v) => Math.round(v).toLocaleString("en-US");
const compact = (v) => (v >= 10000 ? `${Math.round(v / 1000)}k` : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${Math.round(v)}`);

/** The seven days of this week, Monday-first in English and Saturday-first in Persian (as on Today). */
function weekDays(isRtl, now) {
  const start = dayStart(now);
  start.setDate(start.getDate() - ((start.getDay() - (isRtl ? 6 : 1) + 7) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function agoLabel(iso, isRtl) {
  const days = Math.round((dayStart(new Date()) - dayStart(new Date(iso))) / DAY_MS);
  return new Intl.RelativeTimeFormat(isRtl ? "fa" : "en", { numeric: "auto" }).format(-days, "day");
}

/** Planned load of a program day: sets × reps × weight for the lifts that have one. */
function plannedVolume(day) {
  return (day?.exercises || []).reduce((a, e) => {
    const ex = findExercise(e.exerciseId);
    return ex && ex.mode !== "reps" ? a : a + (e.sets || 0) * (e.reps || 0) * (e.weight || 0);
  }, 0);
}

const isWorkout = (d) => d && d.type !== "rest" && d.exercises.length > 0;

/**
 * The active split laid onto the calendar. The next session is the workout
 * after the last one finished (the same rule Today uses); it falls today,
 * or tomorrow when today's is done, and the rest of the split follows day by day.
 */
function projectPlan(store, today) {
  const program = store.activeProgram;
  if (!program || !program.days.length) return null;
  const days = program.days;
  const workouts = days.filter(isWorkout);
  const finished = store.sessions.filter((s) => s.finishedAt && s.programId === program.id)
    .sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));
  const last = finished[finished.length - 1];
  const doneToday = !!last && ymd(new Date(last.finishedAt)) === ymd(today);
  const weekNo = Math.min(Math.floor((Date.now() - new Date(program.createdAt).getTime()) / (7 * DAY_MS)) + 1, program.weeks || 1);
  let from = 0;
  if (workouts.length) {
    const lastIndex = last ? workouts.findIndex((d) => d.id === last.dayId) : -1;
    from = days.indexOf(workouts[(lastIndex + 1) % workouts.length]);
  }
  const start = doneToday ? addDays(today, 1) : dayStart(today);
  const cycle = days.map((_, k) => ({ day: days[(from + k) % days.length], date: addDays(start, k) }));
  return { program, weekNo, doneToday, cycle };
}

/** The newest record, else the heaviest set ever logged. */
function highlightLift(sessions) {
  const done = sessions.filter((s) => s.finishedAt).sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
  for (const s of done) {
    const pr = (s.prs || [])[0];
    if (!pr) continue;
    const ex = (s.exercises || []).find((e) => e.exerciseId === pr.exerciseId);
    const best = ex ? bestSetIn(ex) : null;
    return { kind: "pr", at: s.finishedAt, exerciseId: pr.exerciseId, weight: best?.weight ?? pr.value, reps: best?.reps };
  }
  let top = null;
  for (const s of done) {
    for (const ex of s.exercises || []) {
      for (const set of ex.sets) {
        const w = Number(set.weight) || 0;
        if (set.done && w > (top?.weight || 0)) top = { kind: "top", at: s.finishedAt, exerciseId: ex.exerciseId, weight: w, reps: set.reps };
      }
    }
  }
  return top;
}

export default function WorkoutPage({ isRtl, onOpen, initialSegment = null, onSegmentShown }) {
  const t = useTrainingT(isRtl);
  const store = useTrainingStore();
  const nutrition = useNutritionStore();
  // Redraws Train (the library, the sheets, the live workout) once the exercise catalog lands.
  useExerciseCatalog();
  const [segment, setSegment] = useState(SEGMENTS.includes(initialSegment) ? initialSegment : "plan");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (initialSegment) onSegmentShown?.(); }, []);
  const [live, setLive] = useState(!!store.draft);
  const [builder, setBuilder] = useState(undefined); // undefined closed | null new | program edit
  const [share, setShare] = useState(null);           // program to share
  const [importing, setImporting] = useState(false);
  const [generating, setGenerating] = useState(false); // false | true | a ready program's answers
  const [trendFor, setTrendFor] = useState(null);     // exercise id
  const [menuFor, setMenuFor] = useState(null);       // program whose actions are open
  const [toast, setToast] = useState("");

  const author = { name: loadSession().name || "Isaac", role: store.coachMode ? "coach" : "user" };
  const active = store.activeProgram;
  const n = (v) => num(v, isRtl);
  const sep = isRtl ? "، " : " · ";

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(""), 1600); };
  const startDay = (day) => { store.startSession(active.id, day.id); setLive(true); };
  const programName = (p) => (isRtl && p.nameFa ? p.nameFa : p.name);

  const plan = useMemo(() => projectPlan(store, new Date()), [store]);
  const draft = store.draft;

  return (
    <Screen isRtl={isRtl} tabbed>
      <PageHead
        eyebrow={plan ? <span className="block truncate">{programName(active)}{sep}{t.weekOf(n(plan.weekNo), n(active.weeks || 1))}{isDeloadWeek(programWeek(active)) ? `${sep}${t.deloadWeek}` : ""}</span> : undefined}
        title={t.title}
        right={onOpen ? (
          <IconButton label={t.workoutHistory} onClick={() => onOpen("history")}><History className="w-5 h-5" strokeWidth={2} /></IconButton>
        ) : null} />

      <Segmented value={segment} onChange={setSegment} options={SEGMENTS.map((id) => ({ id, label: t[id] }))} />

      {/* A workout left open */}
      {draft && !live && (
        <Card tone="hero" className="flex flex-col gap-3" aria-label={t.workoutOpen}>
          <div className="flex items-center justify-between gap-2">
            <Label className="!text-hero-muted">{t.workoutOpen}</Label>
            <Tag tone="hero" className="font-semibold">
              {n(sessionSetsDone(draft))} / {n(draft.exercises.reduce((a, e) => a + e.sets.length, 0))} {t.sets}
            </Tag>
          </div>
          <h2 className="m-0 font-display font-extrabold text-[30px] leading-[0.95] tracking-[-0.035em] break-words">
            {(isRtl && draft.dayTitleFa) || draft.dayTitle}
          </h2>
          <CtaButton tone="accent" isRtl={isRtl} onClick={() => setLive(true)}>
            <span className="inline-flex items-center gap-2"><Play className="w-4 h-4" strokeWidth={2.2} />{t.resumeWorkout}</span>
          </CtaButton>
        </Card>
      )}

      {/* Until a program is made for them, the plan offers it first. */}
      {segment === "plan" && plan && !store.programs.some((p) => p.source === "generated") && (
        <Card className="flex items-center gap-3" aria-label={t.makeProgram}>
          <IconWell tone="accent" size={44}><Sparkles className="w-5 h-5" strokeWidth={2} /></IconWell>
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <span className="text-[15px] font-bold leading-snug text-ink">{t.makeProgram}</span>
            <span className="text-[13px] leading-snug text-muted">{t.makeProgramHint}</span>
          </div>
          <Button tone="ink" size="sm" className="shrink-0" onClick={() => setGenerating(true)}>{t.makeShort}</Button>
        </Card>
      )}

      {segment === "plan" && (plan ? (
        <PlanView t={t} n={n} sep={sep} isRtl={isRtl} store={store} plan={plan} programName={programName}
          onStart={startDay} onShare={() => setShare(active)} onImport={() => setImporting(true)}
          onPrograms={() => setSegment("programs")} />
      ) : (
        <Card>
          <Empty icon={<Dumbbell className="w-6 h-6" strokeWidth={2} />} title={t.noActiveTitle} body={t.noActive}
            action={(
              <div className="flex flex-col items-center gap-2">
                <Button tone="ink" icon={<Sparkles className="w-[18px] h-[18px]" strokeWidth={2} />} onClick={() => setGenerating(true)}>{t.makeProgram}</Button>
                <Button tone="soft" size="sm" onClick={() => setSegment("programs")}>{t.browsePrograms}</Button>
              </div>
            )} />
        </Card>
      ))}

      {segment === "programs" && (
        <>
          <Card tone="hero" className="flex flex-col gap-3" aria-label={t.makeProgram}>
            <div className="flex items-start gap-3">
              <IconWell tone="accent" size={44}><Sparkles className="w-5 h-5" strokeWidth={2} /></IconWell>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <h2 className="m-0 text-[18px] font-bold leading-snug">{t.makeProgram}</h2>
                <p className="m-0 text-[13px] leading-relaxed text-hero-muted">{t.makeProgramHint}</p>
              </div>
            </div>
            <CtaButton tone="accent" isRtl={isRtl} onClick={() => setGenerating(true)}>{t.makeProgram}</CtaButton>
          </Card>
          <ReadyPrograms t={t} n={n} sep={sep} isRtl={isRtl} programs={store.programs}
            onOpen={(preset) => setGenerating(preset)} />

          <div className="grid grid-cols-2 gap-2.5">
            <Button tone="ink" icon={<Plus className="w-[18px] h-[18px]" strokeWidth={2.2} />} onClick={() => setBuilder(null)}>{t.newProgram}</Button>
            <Button tone="card" icon={<Download className="w-[18px] h-[18px]" strokeWidth={2} />} onClick={() => setImporting(true)}>{t.importShort}</Button>
          </div>

          {[["generated", t.madeForYou], ["mine", t.myPrograms], ["imported", t.imported], ["builtin", t.builtin]].map(([source, title]) => {
            const list = store.programs.filter((p) => p.source === source);
            if (!list.length) return null;
            return (
              <section key={source} className="flex flex-col gap-2.5">
                <SectionHead title={title} />
                {list.map((p) => {
                  const isActive = p.id === active?.id;
                  const workoutDays = p.days.filter((d) => d.type !== "rest").length;
                  return (
                    <Card key={p.id} className="flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <ProgramMark name={p.name} active={isActive} />
                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <h3 className="m-0 min-w-0 text-[17px] font-bold leading-snug text-ink">{programName(p)}</h3>
                            {isActive && <Tag tone="accent" className="h-6 px-2.5 font-bold shrink-0">{t.active}</Tag>}
                          </div>
                          <span className="text-[13px] text-muted">{n(workoutDays)} {t.daysWeek}{sep}{n(p.weeks)} {t.weeks}</span>
                          <AuthorChip author={p.author} t={t} />
                        </div>
                      </div>
                      {(isRtl ? p.descriptionFa : p.description) && <p className="m-0 text-sm leading-relaxed text-muted">{isRtl ? p.descriptionFa : p.description}</p>}
                      <div className="flex items-center gap-2">
                        {!isActive && (
                          <Button tone="ink" size="sm" onClick={() => { store.setActiveProgram(p.id); setSegment("plan"); }}>{t.setActive}</Button>
                        )}
                        <Button tone="soft" size="sm" icon={<Share2 className="w-3.5 h-3.5" strokeWidth={2} />} onClick={() => setShare(p)}>{t.share}</Button>
                        <IconButton label={t.more} tone="soft" size={40} className="ms-auto" onClick={() => setMenuFor(p)}>
                          <MoreHorizontal className="w-5 h-5" strokeWidth={2} />
                        </IconButton>
                      </div>
                    </Card>
                  );
                })}
              </section>
            );
          })}
        </>
      )}

      {segment === "exercises" && (
        <Library isRtl={isRtl} t={t} n={n} sep={sep} sessions={store.sessions} onOpen={setTrendFor} />
      )}

      {segment === "progress" && <Progress isRtl={isRtl} t={t} n={n} sep={sep} store={store} onOpen={onOpen} />}

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
        {generating && (
          <ProgramGeneratorSheet isRtl={isRtl} t={t} programs={store.programs}
            initial={generating === true ? null : { goal: generating.goal, days: generating.days, minutes: generating.minutes, location: generating.location }}
            title={generating === true ? null : (isRtl ? generating.nameFa : generating.name)}
            onUse={(input) => { store.generateAndUseProgram(input); setGenerating(false); setSegment("plan"); flash(t.genMade); }}
            onClose={() => setGenerating(false)} />
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
            onImportProgram={(compactP) => { const p = store.importProgram(compactP); store.setActiveProgram(p.id); setImporting(false); setSegment("plan"); flash(t.importedOk); }}
            onApplyMeal={(meal) => { applyMealPlan(nutrition, meal); setImporting(false); flash(t.appliedOk); }}
            onClose={() => setImporting(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {menuFor && (
          <Sheet title={programName(menuFor)} isRtl={isRtl} t={t} onClose={() => setMenuFor(null)}>
            <List>
              {menuFor.source !== "builtin" && (
                <Row isRtl={isRtl} chevron title={t.editProgram}
                  icon={<IconWell size={36}><Pencil className="w-4 h-4" strokeWidth={2} /></IconWell>}
                  onClick={() => { setBuilder(menuFor); setMenuFor(null); }} />
              )}
              <Row isRtl={isRtl} title={t.duplicate}
                icon={<IconWell size={36}><Copy className="w-4 h-4" strokeWidth={2} /></IconWell>}
                onClick={() => { store.duplicateProgram(menuFor.id, `${t.copyOf} ${menuFor.name}`, author); setMenuFor(null); flash(t.copied); }} />
              <Row isRtl={isRtl} chevron title={t.shareProgram}
                icon={<IconWell size={36}><Share2 className="w-4 h-4" strokeWidth={2} /></IconWell>}
                onClick={() => { setShare(menuFor); setMenuFor(null); }} />
              {menuFor.source !== "builtin" && (
                <Row isRtl={isRtl} danger title={t.deleteProgram}
                  icon={<IconWell size={36} tone="alert"><Trash2 className="w-4 h-4" strokeWidth={2} /></IconWell>}
                  onClick={() => { if (window.confirm(t.deleteProgramConfirm)) { store.removeProgram(menuFor.id); setMenuFor(null); } }} />
              )}
            </List>
          </Sheet>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {trendFor && (
          <TrendSheet key={trendFor} exerciseId={trendFor} sessions={store.sessions} isRtl={isRtl} t={t} n={n} sep={sep}
            onOpenExercise={setTrendFor} onClose={() => setTrendFor(null)} />
        )}
      </AnimatePresence>

      {toast && <Toast>{toast}</Toast>}
    </Screen>
  );
}

// Lives in lib so the app shell can apply a shared plan without loading this page.
export { applyMealPlan };

/* ─────────────────────────────── ready programs ─────────────────────────────── */

const READY_GOALS = [["Weight Loss", "goalLoss"], ["Muscle Gain", "goalMuscle"], ["Keep Fit", "goalFit"], ["Max Strength", "goalStrength"]];
const READY_PLACES = { gym: "whereGym", home_gear: "whereGear", home: "whereHome" };

/** The library's 60 programs by goal, place and days a week; each opens in the planner to preview and use. */
function ReadyPrograms({ t, n, sep, isRtl, programs, onOpen }) {
  const last = [...programs].reverse().find((p) => p.source === "generated" && p.generator)?.generator;
  const [goal, setGoal] = useState(last?.goal || "Muscle Gain");
  const [place, setPlace] = useState(last?.location || "gym");
  const [days, setDays] = useState("all");
  const list = workoutPresets({ goal, location: place, days: days === "all" ? null : +days });
  return (
    <section className="flex flex-col gap-2.5" aria-label={t.readyPrograms}>
      <SectionHead title={t.readyPrograms} />
      <div className="flex flex-wrap gap-1.5">
        {READY_GOALS.map(([g, k]) => <Chip key={g} active={goal === g} onClick={() => setGoal(g)}>{t[k]}</Chip>)}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PLACES.map((p) => <Chip key={p} active={place === p} onClick={() => setPlace(p)}>{t[READY_PLACES[p]]}</Chip>)}
      </div>
      <Segmented label={t.readyDays} value={days} onChange={setDays}
        options={[{ id: "all", label: t.all }, ...WEEK_DAYS.map((d) => ({ id: String(d), label: n(d) }))]} />
      <List>
        {list.map((p) => (
          <Row key={p.id} isRtl={isRtl} chevron onClick={() => onOpen(p)}
            icon={<IconWell size={40}><span className="text-[15px] font-bold">{n(p.days)}</span></IconWell>}
            title={isRtl ? p.nameFa : p.name}
            subtitle={`${n(p.days)} ${t.daysWeek}${sep}${n(p.minutes)} ${t.min}`} />
        ))}
      </List>
    </section>
  );
}

/* ─────────────────────────────── charts ─────────────────────────────── */

const HATCH = { backgroundImage: "repeating-linear-gradient(135deg, rgb(var(--ui-line)) 0 6px, rgb(var(--ui-bg)) 6px 12px)" };
const BAR_TONES = {
  done: "bg-inv",
  today: "bg-accent ring-2 ring-inset ring-jet",
  planned: "",
  none: "bg-line",
};

/**
 * Column bars on a card. Each item: `ratio` 0..1 of the tallest, `kind`
 * (done ink, today accent, planned hatched, none a stub), `label` under it
 * and an optional `top` value above it.
 */
function Bars({ items, max = 80 }) {
  return (
    <div aria-hidden="true" className="flex items-end justify-between gap-2.5 pt-1.5">
      {items.map((it) => (
        <span key={it.key} className="flex-1 min-w-0 flex flex-col items-center justify-end gap-1.5">
          {it.top != null && <span className="text-[10px] leading-none text-muted tabular-nums whitespace-nowrap">{it.top}</span>}
          <span className={cx("w-full rounded-[10px]", BAR_TONES[it.kind])}
            style={{ height: it.kind === "none" ? 6 : Math.max(8, Math.round(it.ratio * max)), ...(it.kind === "planned" ? HATCH : null) }} />
          <span className={cx("text-[11px] leading-none whitespace-nowrap", it.bold ? "font-bold text-ink" : "text-muted")}>{it.label || " "}</span>
        </span>
      ))}
    </div>
  );
}

function Swatch({ kind }) {
  return <span className={cx("w-2.5 h-2.5 rounded-[3px] shrink-0", BAR_TONES[kind])} style={kind === "planned" ? HATCH : undefined} />;
}

/* ─────────────────────────────── plan ─────────────────────────────── */

function PlanView({ t, n, sep, isRtl, store, plan, programName, onStart, onShare, onImport, onPrograms }) {
  const [expanded, setExpanded] = useState(false);
  const todayKey = ymd(new Date());
  const program = plan.program;

  // Volume per day this week: logged sessions, then the split's plan for what's still ahead.
  const week = useMemo(() => {
    const days = weekDays(isRtl, new Date(`${todayKey}T00:00:00`));
    const done = {};
    for (const s of store.sessions) {
      if (!s.finishedAt) continue;
      const k = ymd(new Date(s.finishedAt));
      done[k] = (done[k] || 0) + sessionVolume(s);
    }
    const planned = {};
    for (const c of plan.cycle) planned[ymd(c.date)] = c.day;
    const rows = days.map((d) => {
      const key = ymd(d);
      const vol = done[key] || 0;
      const p = key >= todayKey ? planned[key] : null;
      const kind = vol > 0 ? "done" : isWorkout(p) ? (key === todayKey ? "today" : "planned") : "none";
      return { key, d, vol, kind, est: kind === "today" || kind === "planned" ? plannedVolume(p) : 0 };
    });
    const top = Math.max(...rows.map((r) => Math.max(r.vol, r.est)), 1);
    const total = rows.reduce((a, r) => a + r.vol, 0);
    // Last week up to the same weekday, so early in the week isn't a false drop.
    const span = rows.findIndex((r) => r.key === todayKey) + 1;
    const lastFrom = addDays(days[0], -7);
    const lastTo = addDays(days[0], span - 7);
    const lastTotal = store.sessions.filter((s) => s.finishedAt && new Date(s.finishedAt) >= lastFrom && new Date(s.finishedAt) < lastTo)
      .reduce((a, s) => a + sessionVolume(s), 0);
    return {
      total,
      delta: lastTotal > 0 ? Math.round(((total - lastTotal) / lastTotal) * 100) : null,
      items: rows.map((r) => ({
        key: r.key, kind: r.kind, bold: r.key === todayKey,
        ratio: r.kind === "done" ? r.vol / top : r.est ? r.est / top : 0.55,
        label: fmt(r.d, isRtl, { weekday: "narrow" }),
      })),
    };
  }, [store.sessions, plan, isRtl, todayKey]);

  const upcoming = expanded ? plan.cycle : plan.cycle.filter((c) => isWorkout(c.day)).slice(0, 4);
  const lift = highlightLift(store.sessions);
  const Trend = week.delta !== null && week.delta < 0 ? TrendingDown : TrendingUp;
  const workoutDays = program.days.filter((d) => d.type !== "rest").length;

  return (
    <>
      <Card pad={false} className="rounded-4xl px-[18px] pt-[18px] pb-3.5 flex flex-col gap-2.5" aria-labelledby="train-vol">
        <div className="flex items-center justify-between gap-2">
          <h2 id="train-vol" className="m-0 text-[15px] font-semibold text-ink">{t.volumeThisWeek}</h2>
          {week.delta !== null && (
            <span className="h-[26px] px-2.5 rounded-full inline-flex items-center gap-1 text-xs font-bold bg-jet text-accent dark:ring-1 dark:ring-inset dark:ring-line">
              <Trend className="w-3.5 h-3.5" strokeWidth={2.4} />
              <span dir="ltr">{week.delta > 0 ? "+" : week.delta < 0 ? "−" : ""}{n(Math.abs(week.delta))}%</span> {t.vsLastWeek}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display font-extrabold text-[40px] leading-none tracking-[-0.04em] text-ink">{n(grouped(week.total))}</span>
          <span className="text-[15px] text-muted">{t.kgSoFar}</span>
        </div>
        <Bars items={week.items} max={86} />
        <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><Swatch kind="done" />{t.legendDone}</span>
          <span className="inline-flex items-center gap-1.5"><Swatch kind="today" />{t.legendToday}</span>
          <span className="inline-flex items-center gap-1.5"><Swatch kind="planned" />{t.legendPlanned}</span>
        </div>
      </Card>

      <div className="mt-1 flex items-center justify-between gap-3">
        <h2 className="m-0 font-display font-bold text-[22px] tracking-[-0.02em] text-ink">{t.upNext}</h2>
        <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}
          className="h-11 -my-3 px-1 text-sm font-semibold text-ink underline underline-offset-[3px] bg-transparent border-0 cursor-pointer">
          {expanded ? t.showLess : t.fullPlan}
        </button>
      </div>

      <List>
        {upcoming.map(({ day, date }, i) => {
          const key = ymd(date);
          const isToday = key === todayKey;
          const first = i === 0;
          const well = (
            <span className={cx("w-12 h-12 shrink-0 rounded-2xl flex flex-col items-center justify-center gap-0.5",
              first && isWorkout(day) ? "bg-jet text-accent dark:ring-1 dark:ring-inset dark:ring-line" : "bg-sunk text-ink",
              !isWorkout(day) && "opacity-60")}>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.06em] leading-none">{fmt(date, isRtl, { weekday: "short" })}</span>
              <span className="text-[15px] font-bold leading-none">{fmt(date, isRtl, { day: "numeric" })}</span>
            </span>
          );
          if (!isWorkout(day)) {
            return (
              <Row key={`${day.id}-${key}`} icon={well} isRtl={isRtl}
                title={<span className="text-muted">{day.type === "rest" ? t.rest : (isRtl && day.titleFa) || day.title || t.rest}</span>}
                subtitle={t.recovery} right={<Moon className="w-[18px] h-[18px]" strokeWidth={2} />} />
            );
          }
          const name = (isRtl && day.titleFa) || day.title;
          return (
            <Row key={`${day.id}-${key}`} icon={well} isRtl={isRtl} chevron onClick={() => onStart(day)}
              title={(
                <span className="inline-flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold">{name}</span>
                  {isToday && <span className="h-[22px] px-2 rounded-full bg-accent text-on-accent inline-flex items-center text-[11px] font-bold">{t.today}</span>}
                </span>
              )}
              subtitle={`${n(program.generator?.minutes || day.exercises.length * 8)} ${t.min}${sep}${n(day.exercises.length)} ${t.exercisesLc}`} />
          );
        })}
      </List>

      {lift && (
        <section aria-label={lift.kind === "pr" ? t.latestPr : t.heaviestLift}
          className="ui-hero rounded-3xl bg-hero text-hero-fg p-4 flex items-center gap-3.5">
          <IconWell tone="accent" size={52}><Trophy className="w-6 h-6" strokeWidth={2} /></IconWell>
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <Label className="!text-hero-muted">{lift.kind === "pr" ? t.latestPr : t.heaviestLift}{sep}{agoLabel(lift.at, isRtl)}</Label>
            <span className="font-display font-extrabold text-2xl leading-tight tracking-[-0.03em] break-words">
              {exerciseName(lift.exerciseId, isRtl)}{" "}
              <span className="whitespace-nowrap">{n(lift.weight)} {t.kg}{lift.reps ? ` × ${n(lift.reps)}` : ""}</span>
            </span>
            <span className="text-[13px] text-hero-muted">{t.beatIt}</span>
          </div>
        </section>
      )}

      <SectionHead title={t.currentProgram} action={t.change} onAction={onPrograms} />
      <Card className="flex items-center gap-3">
        <ProgramMark name={program.name} />
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <span className="text-[15px] font-bold leading-snug text-ink">{programName(program)}</span>
          <span className="text-[13px] text-muted">{n(workoutDays)} {t.daysWeek}{sep}{n(program.weeks)} {t.weeks}</span>
          <AuthorChip author={program.author} t={t} />
        </div>
        <IconButton label={t.shareProgram} tone="soft" onClick={onShare}><Share2 className="w-[18px] h-[18px]" strokeWidth={2} /></IconButton>
        <IconButton label={t.importTitle} tone="soft" onClick={onImport}><Download className="w-[18px] h-[18px]" strokeWidth={2} /></IconButton>
      </Card>
    </>
  );
}

/* ─────────────────────────────── exercises ─────────────────────────────── */

const PAGE = 40;

/** One labelled, sideways-scrolling row of filter chips; tapping the active chip clears it. */
function FilterRow({ label, all, options, value, onChange, isRtl }) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div className="-mx-5 px-5 flex gap-2 overflow-x-auto scrollbar-hide">
        <Chip active={value === null} onClick={() => onChange(null)}>{all}</Chip>
        {options.map((o) => (
          <Chip key={o.slug} active={value === o.slug} onClick={() => onChange(value === o.slug ? null : o.slug)}>{tagLabel(o, isRtl)}</Chip>
        ))}
      </div>
    </div>
  );
}

function Library({ isRtl, t, n, sep, sessions, onOpen }) {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState(null); // muscle tag
  const [gear, setGear] = useState(null);     // equipment tag
  const [limit, setLimit] = useState(PAGE);
  // Not memoised: Train re-renders when the catalog lands, and a filter over the list is cheap.
  const list = searchExercises(q, null, { muscleTag: muscle, equipment: gear });
  const filtered = !!(q.trim() || muscle || gear);
  const refine = (fn) => (value) => { fn(value); setLimit(PAGE); };
  const clear = () => { setQ(""); setMuscle(null); setGear(null); setLimit(PAGE); };
  const shown = list.slice(0, limit);
  return (
    <>
      <Field type="search" value={q} onChange={(e) => refine(setQ)(e.target.value)} placeholder={t.searchExercises} aria-label={t.searchExercises}
        prefix={<Search className="w-[18px] h-[18px] text-muted" strokeWidth={2} />} />
      <FilterRow label={t.muscleGroup} all={t.allMuscles} options={MUSCLE_TAGS} value={muscle} onChange={refine(setMuscle)} isRtl={isRtl} />
      <FilterRow label={t.equipment} all={t.anyEquipment} options={EQUIPMENT_TAGS} value={gear} onChange={refine(setGear)} isRtl={isRtl} />
      <SectionHead title={t.exerciseCount(n(list.length), list.length)} action={filtered ? t.clearFilters : null} onAction={clear} />
      {list.length === 0 ? (
        <Card>
          <Empty icon={<Search className="w-6 h-6" strokeWidth={2} />} title={t.noMatches} body={t.noMatchesBody}
            action={filtered ? <Button tone="soft" size="sm" onClick={clear}>{t.clearFilters}</Button> : null} />
        </Card>
      ) : (
        <>
          <List>
            {shown.map((e) => {
              const best = exerciseBests(sessions, e.id);
              return (
                <Row key={e.id} onClick={() => onOpen(e.id)} isRtl={isRtl} chevron
                  icon={<span className="w-11 h-11 rounded-[14px] overflow-hidden shrink-0"><ExerciseMedia exerciseId={e.id} name={e.nameEn} thumb /></span>}
                  title={exerciseName(e, isRtl)}
                  subtitle={[muscleLabel(e, isRtl), equipmentLabel(e, isRtl)].filter(Boolean).join(sep)}
                  right={best.maxWeight > 0 ? (
                    <span className="flex flex-col items-end gap-0.5">
                      <span className="font-mono text-[10px] uppercase tracking-label text-muted">{t.e1rm}</span>
                      <span className="text-[15px] font-bold text-ink tabular-nums">{n(Math.round(best.bestE1rm))} {t.kg}</span>
                    </span>
                  ) : null} />
              );
            })}
          </List>
          {list.length > limit && (
            <Button tone="card" block onClick={() => setLimit((v) => v + PAGE)}>{t.showMore(n(Math.min(PAGE, list.length - limit)))}</Button>
          )}
        </>
      )}
    </>
  );
}

/** A localized list from the catalog: Persian when it has one, else English (drawn left to right). */
function pickLang(loc, isRtl) {
  if (isRtl && loc?.fa?.length) return { items: loc.fa, ltr: false };
  return { items: loc?.en || [], ltr: isRtl };
}


function TrendSheet({ exerciseId, sessions, isRtl, t, n, sep, onClose, onOpenExercise }) {
  // A big library keeps each exercise's steps apart; they arrive when it's opened.
  const ex = useExerciseDetails(exerciseId);
  const points = exerciseTrend(sessions, exerciseId);
  const best = exerciseBests(sessions, exerciseId);
  const last = lastPerformance(sessions, exerciseId);
  const max = Math.max(...points.map((p) => p.e1rm), 1);
  const sparse = points.length > 6;
  const hasMedia = !!ex?.media;

  const steps = pickLang(ex?.steps, isRtl);
  const benefits = pickLang(ex?.benefits, isRtl);
  const about = isRtl ? ex?.description?.fa || ex?.description?.en : ex?.description?.en;
  const aboutLtr = isRtl && !ex?.description?.fa;
  const muscles = (ex?.muscles || []).map(findMuscle).filter(Boolean);
  const gear = (ex?.equipmentSlugs || []).map(findEquipment).filter(Boolean);
  // Only alternatives the app has; each opens its own sheet.
  const variations = (ex?.variations || []).filter((s) => slugify(s) === s).map(findBySlug).filter(Boolean);
  const stepNo = (i) => (steps.ltr ? i + 1 : n(i + 1));

  return (
    <Sheet title={exerciseName(exerciseId, isRtl)} isRtl={isRtl} t={t} onClose={onClose}>
      {hasMedia && (
        <Card pad={false} className="overflow-hidden aspect-[4/3] shrink-0">
          <ExerciseMedia exerciseId={exerciseId} name={ex?.nameEn} />
        </Card>
      )}
      <div className="flex items-stretch gap-2.5">
        {!hasMedia && (
          <span className="w-[88px] h-[88px] rounded-3xl overflow-hidden shrink-0"><ExerciseMedia exerciseId={exerciseId} name={ex?.nameEn} /></span>
        )}
        {[[t.topSet, best.maxWeight], [t.e1rm, Math.round(best.bestE1rm)]].map(([label, value]) => (
          <Card key={label} className="flex-1 min-w-0 flex flex-col justify-between gap-2">
            <Label className="truncate">{label}</Label>
            <span className="font-display font-extrabold text-[26px] leading-none tracking-[-0.03em] text-ink">
              {value ? <>{n(value)}<span className="ms-1 text-sm font-semibold text-muted">{t.kg}</span></> : "–"}
            </span>
          </Card>
        ))}
      </div>

      {(muscles.length > 0 || gear.length > 0) && (
        <Card className="flex flex-col gap-3">
          {[[t.muscleGroup, muscles], [t.equipment, gear]].filter(([, items]) => items.length).map(([label, items]) => (
            <div key={label} className="flex flex-col gap-2">
              <Label>{label}</Label>
              <div className="flex flex-wrap gap-1.5">
                {items.map((m) => <Tag key={m.slug}>{tagLabel(m, isRtl)}</Tag>)}
              </div>
            </div>
          ))}
        </Card>
      )}

      {points.length >= 2 ? (
        <Card className="flex flex-col gap-3">
          <Label>{t.trend}{sep}{t.e1rm}</Label>
          <Bars max={92} items={points.map((p, i) => ({
            key: `${p.at}-${i}`,
            kind: i === points.length - 1 ? "today" : "done",
            ratio: p.e1rm / max,
            top: n(p.e1rm),
            bold: i === points.length - 1,
            label: !sparse || i === 0 || i === points.length - 1 ? fmt(new Date(p.at), isRtl, { day: "numeric", month: "numeric" }) : "",
          }))} />
        </Card>
      ) : (
        <p className="m-0 py-4 text-center text-sm text-muted">{t.noTrend}</p>
      )}
      {last && (
        <p className="m-0 text-[13px] text-muted">
          <span className="font-semibold text-ink">{t.lastTime}: </span>
          {last.map((s) => `${n(s.weight || 0)} × ${n(s.reps)}`).join(sep)}
        </p>
      )}

      {about && <p dir={aboutLtr ? "ltr" : undefined} className="m-0 text-[15px] leading-[1.45] text-muted">{about}</p>}

      {steps.items.length > 0 && (
        <Card className="flex flex-col gap-3">
          <Label>{t.instructions}</Label>
          <ol dir={steps.ltr ? "ltr" : undefined} className="m-0 p-0 list-none flex flex-col gap-3">
            {steps.items.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-px w-6 h-6 rounded-full bg-inv text-on-inv text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">{stepNo(i)}</span>
                <span className="flex-1 min-w-0 text-[15px] leading-[1.45] text-ink">{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {benefits.items.length > 0 && (
        <Card className="flex flex-col gap-3">
          <Label>{t.benefits}</Label>
          <ul dir={benefits.ltr ? "ltr" : undefined} className="m-0 p-0 list-none flex flex-col gap-2">
            {benefits.items.map((b, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[15px] leading-[1.45] text-ink">
                <span aria-hidden="true" className="mt-[9px] w-1.5 h-1.5 rounded-full bg-ink/40 shrink-0" />{b}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {ex?.musclesWorked?.length > 0 && (
        <Card className="flex flex-col gap-2.5">
          <Label>{t.musclesWorked}</Label>
          <div dir={isRtl ? "ltr" : undefined} className="flex flex-wrap gap-1.5">
            {ex.musclesWorked.map((m) => <Tag key={m}>{m}</Tag>)}
          </div>
        </Card>
      )}

      {variations.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <SectionHead title={t.variations} className="mt-0" />
          <List>
            {variations.map((v) => (
              <Row key={v.id} isRtl={isRtl} chevron onClick={() => onOpenExercise(v.id)}
                icon={<span className="w-10 h-10 rounded-xl overflow-hidden shrink-0"><ExerciseMedia exerciseId={v.id} name={v.nameEn} thumb /></span>}
                title={exerciseName(v, isRtl)} subtitle={muscleLabel(v, isRtl)} />
            ))}
          </List>
        </section>
      )}
    </Sheet>
  );
}

/* ─────────────────────────────── progress ─────────────────────────────── */

function Progress({ isRtl, t, n, sep, store, onOpen }) {
  const sessions = [...store.sessions].filter((s) => s.finishedAt).sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
  const prs = sessions.flatMap((s) => (s.prs || []).map((pr) => ({ ...pr, at: s.startedAt }))).slice(0, 8);
  const maxVol = Math.max(...store.weekly.map((w) => w.volume), 1);
  const stats = [
    [t.totalVolume, n(compact(store.stats.volume)), t.kg],
    [t.workouts, n(store.stats.count), ""],
    [t.totalBurn, n(compact(store.stats.calories)), "kcal"],
  ];
  return (
    <>
      <Card className="grid grid-cols-3">
        {stats.map(([label, value, unit], i) => (
          <span key={label} className={cx("min-w-0 flex flex-col gap-1.5 px-3", i === 0 ? "ps-0" : "border-s border-hair", i === 2 && "pe-0")}>
            <span className="font-display font-extrabold text-[26px] leading-none tracking-[-0.03em] text-ink whitespace-nowrap">
              {value}{unit && <span className="ms-1 text-xs font-semibold text-muted tracking-normal">{unit}</span>}
            </span>
            <span className="text-xs text-muted">{label}</span>
          </span>
        ))}
      </Card>

      <Card pad={false} className="rounded-4xl px-[18px] pt-[18px] pb-3.5 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="m-0 text-[15px] font-semibold text-ink">{t.weeklyVolume}</h2>
          {onOpen && (
            <button type="button" onClick={() => onOpen("workoutReport")}
              className="h-11 -my-3 px-1 text-sm font-semibold text-ink underline underline-offset-[3px] bg-transparent border-0 cursor-pointer">
              {t.fullReport}
            </button>
          )}
        </div>
        <Bars max={96} items={store.weekly.map((w, i) => {
          const current = i === store.weekly.length - 1;
          return {
            key: String(w.from.getTime()),
            kind: w.volume ? (current ? "today" : "done") : "none",
            ratio: w.volume / maxVol,
            top: w.volume ? n(compact(w.volume)) : "–",
            bold: current,
            label: fmt(w.from, isRtl, { day: "numeric", month: "short" }),
          };
        })} />
      </Card>

      {prs.length > 0 && (
        <>
          <SectionHead title={t.personalRecords} />
          <List>
            {prs.map((pr, i) => (
              <Row key={i} isRtl={isRtl}
                icon={<IconWell tone="inv" size={40}><Trophy className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>}
                title={exerciseName(pr.exerciseId, isRtl)}
                subtitle={pr.kind === "first" ? t.prFirst : `${pr.kind === "weight" ? t.prWeight : t.prE1rm}${sep}${t.prFrom(`${n(pr.prev)} ${t.kg}`)}`}
                right={pr.kind === "first" ? null : <span className="text-[15px] font-bold text-ink">{n(pr.value)} {t.kg}</span>} />
            ))}
          </List>
        </>
      )}

      <SectionHead title={t.history} action={onOpen && sessions.length ? t.seeAll : null} onAction={() => onOpen?.("history")} />
      {sessions.length === 0 ? (
        <Card><Empty icon={<Dumbbell className="w-6 h-6" strokeWidth={2} />} title={t.history} body={t.noSessions} /></Card>
      ) : (
        <List>
          {sessions.map((s) => (
            <Row key={s.id} isRtl={isRtl}
              icon={<IconWell tone="sunk" size={40}><Dumbbell className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>}
              title={(isRtl && s.dayTitleFa) || s.dayTitle}
              subtitle={(
                <>
                  <span className="block">{fmt(new Date(s.startedAt), isRtl, { weekday: "short", day: "numeric", month: "short" })}{sep}{s.programName}</span>
                  <span className="flex flex-wrap items-center gap-x-1">
                    {n(Math.round(s.durationSec / 60))} {t.min}{sep}{n(grouped(sessionVolume(s)))} {t.kg}{sep}{n(sessionSetsDone(s))} {t.sets}
                    {s.prs?.length ? <span className="inline-flex items-center gap-1">{sep}<Trophy className="w-3.5 h-3.5" strokeWidth={2} />{n(s.prs.length)}</span> : null}
                  </span>
                </>
              )}
              right={(
                <IconButton label={t.deleteSession} tone="ghost" size={40}
                  onClick={() => { if (window.confirm(t.deleteSessionConfirm)) store.removeSession(s.id); }}>
                  <Trash2 className="w-[18px] h-[18px] text-muted" strokeWidth={2} />
                </IconButton>
              )} />
          ))}
        </List>
      )}
    </>
  );
}
