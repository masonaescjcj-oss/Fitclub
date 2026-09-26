// Turns the athlete's own data — diary, training log, checklists — into the
// picture the coach reasons over. Pure functions; nothing here touches React,
// storage, or the network.

import { MEALS, dayKey, totalsFor } from "../nutrition/diaryStore";
import { findFood } from "../nutrition/foods";
import { targetsFor } from "../nutrition/profile";
import { exerciseName, findExercise } from "../training/exercises";
import { bestSetIn, e1rm, sessionSetsDone, sessionVolume, weeklyVolume } from "../training/programModel";
import { localized, progressOf } from "../checklistModel";

export const DEFAULT_INCLUDE = { nutrition: true, training: true, habits: true };

const r = (n) => Math.round(n || 0);
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const daysBetween = (a, b) => Math.round((b - a) / 86400000);
const isoDay = (iso) => iso.slice(0, 10);

/* ──────────────────────────── snapshot ──────────────────────────── */

function nutritionSection({ profile, day, diary, estimate, trend, now }) {
  // Targets for *today*, whatever day the diary happens to be scrolled to.
  const targets = targetsFor(profile, {
    trainingDay: day.trainingDay,
    estimatedTdee: profile.useAdaptive ? estimate?.tdee ?? null : null,
  });
  const totals = totalsFor(day);
  const remaining = {
    kcal: r(targets.kcal - totals.kcal),
    protein: r(targets.protein - totals.protein),
    carbs: r(targets.carbs - totals.carbs),
    fat: r(targets.fat - totals.fat),
  };

  const meals = MEALS.map((m) => {
    const entries = (day.entries || []).filter((e) => e.meal === m.id);
    if (!entries.length) return null;
    const names = entries.map((e) => {
      if (e.custom) return e.custom.name || "quick add";
      const food = findFood(e.foodId);
      return food ? `${food.nameEn} ${r(e.grams)}g` : "unknown";
    });
    return { id: m.id, name: m.en, kcal: r(totalsFor({ entries }).kcal), items: names };
  }).filter(Boolean);

  // The last week of real logging, today excluded: what the athlete actually does.
  const today = dayKey(now);
  const week = [];
  for (let i = 1; i <= 7; i += 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const entry = diary.days[dayKey(d)];
    if (entry && (entry.entries || []).length) week.push(totalsFor(entry));
  }
  const weekAvg = week.length
    ? {
        days: week.length,
        kcal: r(week.reduce((a, t) => a + t.kcal, 0) / week.length),
        protein: r(week.reduce((a, t) => a + t.protein, 0) / week.length),
      }
    : null;

  const lastWeight = trend.length ? trend[trend.length - 1] : null;
  const firstWeight = trend.length ? trend[Math.max(trend.length - 14, 0)] : null;

  return {
    profile: {
      gender: profile.gender, age: profile.age, heightCm: profile.height, weightKg: profile.weight,
      goal: profile.goal, trainingDaysPerWeek: profile.frequency?.replace("_", "–") || "3–4",
      intensity: profile.difficulty, dietType: profile.dietType,
    },
    targets: {
      kcal: r(targets.kcal), protein: r(targets.protein), carbs: r(targets.carbs), fat: r(targets.fat),
      fiber: r(targets.fiber), waterMl: r(targets.water), source: targets.source, maintenance: r(targets.maintenance),
    },
    today: {
      date: today,
      kcal: r(totals.kcal), protein: r(totals.protein), carbs: r(totals.carbs), fat: r(totals.fat), fiber: r(totals.fiber),
      remaining, waterMl: r(day.water), trainingDay: day.trainingDay, weightKg: day.weight ?? null, meals,
    },
    weekAvg,
    weight: lastWeight
      ? {
          latestKg: +lastWeight.raw.toFixed(1), trendKg: +lastWeight.trend.toFixed(1),
          changeKg: firstWeight ? +(lastWeight.trend - firstWeight.trend).toFixed(1) : 0,
          overDays: firstWeight ? daysBetween(new Date(`${firstWeight.key}T00:00:00`), new Date(`${lastWeight.key}T00:00:00`)) : 0,
          readings: trend.length,
        }
      : null,
    adaptive: estimate
      ? { tdee: estimate.tdee, weeklyChangeKg: estimate.weeklyChangeKg, daysOfData: estimate.daysOfData }
      : null,
  };
}

/** The program day that comes after the last one logged, cycling past rest days. */
export function nextProgramDay(program, sessions) {
  if (!program || !program.days.length) return null;
  const workoutDays = program.days.filter((d) => d.type !== "rest");
  if (!workoutDays.length) return null;
  const done = sessions
    .filter((s) => s.finishedAt && s.programId === program.id)
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
  if (!done.length) return workoutDays[0];
  const idx = workoutDays.findIndex((d) => d.id === done[0].dayId);
  return workoutDays[(idx + 1) % workoutDays.length];
}

function trainingSection({ training, now, isRtl }) {
  const sessions = (training.sessions || []).filter((s) => s.finishedAt);
  const ordered = [...sessions].sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
  const program = training.activeProgram;
  const next = nextProgramDay(program, sessions);
  const last = ordered[0] || null;

  const recent = ordered.slice(0, 5).map((s) => ({
    date: isoDay(s.startedAt),
    day: (isRtl && s.dayTitleFa) || s.dayTitle || "Workout",
    minutes: r(num(s.durationSec) / 60),
    sets: sessionSetsDone(s),
    volumeKg: r(sessionVolume(s)),
    prs: (s.prs || []).map((p) => `${exerciseName(p.exerciseId, false)} ${p.kind === "e1rm" ? "e1RM" : ""} ${p.value}${p.kind === "first" ? " (first log)" : ` (was ${p.prev})`}`.replace(/\s+/g, " ")),
    top: (s.exercises || [])
      .map((ex) => ({ ex, best: bestSetIn(ex) }))
      .filter((x) => x.best)
      .slice(0, 4)
      .map(({ ex, best }) => `${exerciseName(ex.exerciseId, false)} ${best.weight}×${best.reps}`),
  }));

  // Best estimated 1RM per exercise, for the lifts that show up most.
  const bests = {};
  for (const s of sessions) {
    for (const ex of s.exercises || []) {
      for (const set of ex.sets) {
        if (!set.done || num(set.weight) <= 0) continue;
        const v = e1rm(set.weight, set.reps);
        if (!bests[ex.exerciseId] || v > bests[ex.exerciseId].e1rm) {
          bests[ex.exerciseId] = { e1rm: r(v), weight: num(set.weight), reps: num(set.reps), count: (bests[ex.exerciseId]?.count || 0) + 1 };
        } else bests[ex.exerciseId].count += 1;
      }
    }
  }
  const lifts = Object.entries(bests)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6)
    .map(([id, b]) => ({ exercise: exerciseName(id, false), bestSet: `${b.weight}×${b.reps}`, e1rm: b.e1rm, mode: findExercise(id)?.mode || "reps" }));

  const weeks = weeklyVolume(sessions, 4, now).map((w) => ({ sessions: w.sessions, volumeKg: r(w.volume) }));

  return {
    program: program
      ? {
          name: (isRtl && program.nameFa) || program.name, weeks: program.weeks,
          author: program.author?.name ? `${program.author.name}${program.author.role === "coach" ? " (coach)" : ""}` : null,
          days: program.days.map((d) => (d.type === "rest" ? "Rest" : `${d.title}: ${d.exercises.map((e) => `${exerciseName(e.exerciseId, false)} ${e.sets}×${e.reps}`).join(", ")}`)),
        }
      : null,
    next: next
      ? {
          title: (isRtl && next.titleFa) || next.title,
          exercises: next.exercises.map((e) => `${exerciseName(e.exerciseId, false)} ${e.sets}×${e.reps}${e.weight ? ` @${e.weight}kg` : ""}`),
        }
      : null,
    daysSinceLast: last ? daysBetween(new Date(last.startedAt).setHours(0, 0, 0, 0), new Date(now).setHours(0, 0, 0, 0)) : null,
    recent,
    lifts,
    weeks,
    totalSessions: sessions.length,
  };
}

function habitsSection({ lists, isRtl }) {
  const active = (lists || []).filter((l) => !l.archived);
  return {
    lists: active.map((l) => {
      const p = progressOf(l);
      return {
        name: localized(l, isRtl),
        type: l.type, reset: l.reset?.mode || "none",
        done: p.done, total: p.total, streak: l.streak || 0, best: l.bestStreak || 0,
        open: l.items.filter((i) => !Object.keys(i.doneBy || {}).length).map((i) => localized(i, isRtl, "text")).filter(Boolean).slice(0, 8),
      };
    }),
    streak: active.reduce((m, l) => Math.max(m, l.streak || 0), 0),
  };
}

/**
 * Everything the coach may look at, as plain data. `include` lets the athlete
 * keep a whole area private; the prompt then says so rather than guessing.
 */
export function buildCoachSnapshot({
  nutrition, training, lists, name = "", isRtl = false, include = DEFAULT_INCLUDE, now = new Date(),
}) {
  const day = nutrition.diary.days[dayKey(now)] || { entries: [], water: 0, weight: null, trainingDay: null };
  return {
    name,
    language: isRtl ? "fa" : "en",
    now: now.toISOString(),
    nutrition: include.nutrition
      ? nutritionSection({ profile: nutrition.profile, day, diary: nutrition.diary, estimate: nutrition.estimate, trend: nutrition.trend, now })
      : null,
    training: include.training ? trainingSection({ training, now, isRtl }) : null,
    habits: include.habits ? habitsSection({ lists, isRtl }) : null,
  };
}

/* ──────────────────────────── prompt ──────────────────────────── */

const COACH_RULES = `You are the in-app coach of FitClub, a fitness and nutrition app. You talk to one athlete, and you can see their own logged data (profile, targets, today's food diary, training log, personal records, habit checklists). It is attached below, refreshed on every message.

How to coach:
- Ground every answer in the attached numbers. Quote them ("you have 640 kcal and 48 g protein left"), never invent data that is not there. If something you need is missing or the athlete chose not to share an area, say so in one line and coach with what you have.
- Be a coach, not an encyclopedia: give the decision, then the one reason that matters. Prefer concrete portions, weights, sets and reps over principles.
- Respect the athlete's own targets and program. Suggest changes as changes ("you could…"), and flag anything risky: eating below roughly the resting burn, big weekly weight swings, training the same muscles on consecutive days, pain.
- You are not a doctor. For injury, illness, medication, pregnancy, eating-disorder signs or anything medical, say plainly that a clinician should look at it, then help with what is safe.
- Reply in the athlete's language (see "language" in the data: "fa" means Persian, written naturally in Persian; "en" means English). Keep units metric: kg, g, kcal, ml.
- Keep responses focused, brief, and concise. Lead with the answer; use short paragraphs or a compact bulleted list when listing steps or food options. No headings unless the answer really has sections. No closing pep talk.`;

/** Compact, line-oriented text the model reads fast. */
export function snapshotToText(snap) {
  const out = [];
  out.push(`name: ${snap.name || "athlete"}`, `language: ${snap.language}`, `now: ${snap.now.slice(0, 16).replace("T", " ")}`);

  if (snap.nutrition) {
    const n = snap.nutrition;
    const p = n.profile;
    out.push("", "## Profile", `${p.gender}, ${p.age} y, ${p.heightCm} cm, ${p.weightKg} kg · goal: ${p.goal} · trains ${p.trainingDaysPerWeek} days/week (${p.intensity}) · diet style: ${p.dietType}`);
    const t = n.targets;
    out.push("", "## Daily targets", `${t.kcal} kcal (${t.source}; maintenance ≈ ${t.maintenance}) · protein ${t.protein} g · carbs ${t.carbs} g · fat ${t.fat} g · fiber ${t.fiber} g · water ${t.waterMl} ml`);
    const d = n.today;
    out.push("", `## Today (${d.date})`);
    out.push(`eaten: ${d.kcal} kcal · P ${d.protein} g · C ${d.carbs} g · F ${d.fat} g · fiber ${d.fiber} g`);
    out.push(`remaining: ${d.remaining.kcal} kcal · P ${d.remaining.protein} g · C ${d.remaining.carbs} g · F ${d.remaining.fat} g`);
    out.push(`water: ${d.waterMl} ml · training day: ${d.trainingDay === null ? "not set" : d.trainingDay ? "yes" : "rest"}${d.weightKg ? ` · weighed in: ${d.weightKg} kg` : ""}`);
    if (d.meals.length) for (const m of d.meals) out.push(`- ${m.name} (${m.kcal} kcal): ${m.items.join(", ")}`);
    else out.push("- nothing logged yet today");
    if (n.weekAvg) out.push("", `## Last 7 days (${n.weekAvg.days} logged)`, `average ${n.weekAvg.kcal} kcal · ${n.weekAvg.protein} g protein per day`);
    if (n.weight) {
      out.push("", "## Bodyweight", `latest ${n.weight.latestKg} kg (trend ${n.weight.trendKg} kg) · ${n.weight.changeKg >= 0 ? "+" : ""}${n.weight.changeKg} kg over ${n.weight.overDays} days · ${n.weight.readings} readings`);
      if (n.adaptive) out.push(`adaptive expenditure ≈ ${n.adaptive.tdee} kcal/day from ${n.adaptive.daysOfData} days · trend ${n.adaptive.weeklyChangeKg >= 0 ? "+" : ""}${n.adaptive.weeklyChangeKg} kg/week`);
    }
  } else out.push("", "## Nutrition", "(the athlete chose not to share nutrition data)");

  if (snap.training) {
    const tr = snap.training;
    out.push("", "## Training");
    if (tr.program) {
      out.push(`program: ${tr.program.name} (${tr.program.weeks} weeks${tr.program.author ? `, by ${tr.program.author}` : ""})`);
      tr.program.days.forEach((d, i) => out.push(`  day ${i + 1} — ${d}`));
    } else out.push("no active program");
    if (tr.next) out.push(`next up: ${tr.next.title} → ${tr.next.exercises.join(", ")}`);
    out.push(tr.daysSinceLast === null ? "no workouts logged yet" : `last workout: ${tr.daysSinceLast === 0 ? "today" : `${tr.daysSinceLast} day(s) ago`} · ${tr.totalSessions} logged in total`);
    if (tr.recent.length) {
      out.push("recent sessions:");
      for (const s of tr.recent) out.push(`- ${s.date} ${s.day}: ${s.minutes} min, ${s.sets} sets, ${s.volumeKg} kg volume${s.top.length ? ` · top: ${s.top.join(", ")}` : ""}${s.prs.length ? ` · PR: ${s.prs.join("; ")}` : ""}`);
    }
    if (tr.lifts.length) out.push(`best lifts (est. 1RM): ${tr.lifts.map((l) => `${l.exercise} ${l.bestSet}${l.mode === "reps" && l.e1rm ? ` → ${l.e1rm}` : ""}`).join(" · ")}`);
    out.push(`weekly volume, oldest→this week: ${tr.weeks.map((w) => `${w.volumeKg} kg/${w.sessions}s`).join(", ")}`);
  } else out.push("", "## Training", "(the athlete chose not to share training data)");

  if (snap.habits) {
    const h = snap.habits;
    out.push("", "## Habits & checklists", `best live streak: ${h.streak} periods`);
    for (const l of h.lists) out.push(`- ${l.name} (${l.type}, resets ${l.reset}): ${l.done}/${l.total} done · streak ${l.streak} (best ${l.best})${l.open.length ? ` · open: ${l.open.join(", ")}` : ""}`);
  } else out.push("", "## Habits", "(the athlete chose not to share checklist data)");

  return out.join("\n");
}

/**
 * System prompt as two blocks: the coaching rules first, marked for the
 * prompt cache because they never change; the athlete's data second, because
 * it changes with every bite and every set.
 */
export function coachSystemBlocks(snapshot) {
  return [
    { type: "text", text: COACH_RULES, cache_control: { type: "ephemeral" } },
    { type: "text", text: `# Athlete data\n${snapshotToText(snapshot)}` },
  ];
}

/* ──────────────────────────── suggestions ──────────────────────────── */

/** Questions worth asking right now, phrased with the athlete's real numbers. */
export function suggestionChips(snap, isRtl) {
  const chips = [];
  const n = snap.nutrition;
  const t = snap.training;
  const h = snap.habits;
  const fa = isRtl;

  if (n) {
    const left = n.today.remaining;
    if (n.today.kcal === 0) {
      chips.push(fa ? `امروز هنوز چیزی ثبت نکرده‌ام؛ روزم را چطور بچینم؟` : `Nothing logged yet — how should I plan today's meals?`);
    } else if (left.kcal > 150) {
      chips.push(fa ? `${left.kcal} کالری و ${left.protein} گرم پروتئین مانده؛ شام چی بخورم؟` : `I have ${left.kcal} kcal and ${left.protein} g protein left — what should dinner be?`);
    } else {
      chips.push(fa ? `امروز به هدف کالری رسیدم؛ روزم را بررسی کن` : `I've hit my calories for today — review my day`);
    }
    if (n.weight) {
      chips.push(fa ? `روند وزنم (${n.weight.changeKg >= 0 ? "+" : ""}${n.weight.changeKg} کیلو) با هدفم می‌خواند؟` : `Is my weight trend (${n.weight.changeKg >= 0 ? "+" : ""}${n.weight.changeKg} kg) right for my goal?`);
    }
  }
  if (t) {
    if (t.next) chips.push(fa ? `جلسه‌ی بعدی «${t.next.title}» است؛ چه وزنه‌هایی بزنم؟` : `Next is ${t.next.title} — what weights should I use?`);
    if (t.daysSinceLast !== null && t.daysSinceLast >= 3) chips.push(fa ? `${t.daysSinceLast} روز تمرین نکرده‌ام؛ چطور برگردم؟` : `It's been ${t.daysSinceLast} days since I trained — how do I get back?`);
    if (t.lifts.length) chips.push(fa ? `پیشرفت رکوردهایم را تحلیل کن` : `Analyse my lift progress`);
  }
  if (h && h.lists.length) {
    const open = h.lists.find((l) => l.open.length);
    if (open) chips.push(fa ? `${open.open.length} کار از «${open.name}» مانده؛ کدام مهم‌تر است؟` : `${open.open.length} items left in "${open.name}" — which matter most?`);
  }
  chips.push(fa ? `وضعیت این هفته‌ام را در سه خط بگو` : `Sum up my week in three lines`);
  // Persian reads Persian digits.
  return chips.slice(0, 5).map((c) => (fa ? c.replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]) : c));
}

/* ──────────────────────────── offline coach ──────────────────────────── */

const FOOD_IDEAS = {
  en: {
    protein: ["200 g chicken breast (≈ 62 g protein)", "250 g Greek yoghurt (≈ 25 g)", "200 g lentils, cooked (≈ 18 g)", "3 eggs + 100 g cottage cheese (≈ 30 g)"],
    carbs: ["150 g cooked rice (≈ 42 g carbs)", "a large banana (≈ 27 g)", "80 g oats (≈ 53 g)", "200 g potato (≈ 34 g)"],
    light: ["a big salad with 150 g chicken", "an omelette with vegetables", "Greek yoghurt with berries"],
  },
  fa: {
    protein: ["۲۰۰ گرم سینه‌ی مرغ (≈ ۶۲ گرم پروتئین)", "۲۵۰ گرم ماست یونانی (≈ ۲۵ گرم)", "۲۰۰ گرم عدس پخته (≈ ۱۸ گرم)", "۳ تخم‌مرغ + ۱۰۰ گرم پنیر کاتیج (≈ ۳۰ گرم)"],
    carbs: ["۱۵۰ گرم برنج پخته (≈ ۴۲ گرم کربوهیدرات)", "یک موز بزرگ (≈ ۲۷ گرم)", "۸۰ گرم جو دوسر (≈ ۵۳ گرم)", "۲۰۰ گرم سیب‌زمینی (≈ ۳۴ گرم)"],
    light: ["یک سالاد بزرگ با ۱۵۰ گرم مرغ", "املت با سبزیجات", "ماست یونانی با توت"],
  },
};

const topic = (q) => {
  const s = q.toLowerCase();
  if (/(eat|food|meal|dinner|lunch|breakfast|snack|protein|calor|kcal|hungry|diet|غذا|بخورم|وعده|شام|ناهار|صبحانه|پروتئین|کالری|رژیم|گشنه)/.test(s)) return "food";
  if (/(weight trend|scale|kg|lose|gain|cut|bulk|وزنم|ترازو|روند|کم کنم|اضافه کنم|کات|حجم)/.test(s) && /(weight|kg|scale|trend|وزن|ترازو|روند)/.test(s) && !/(lift|bench|squat|barbell|وزنه|پرس|اسکات)/.test(s)) return "weight";
  if (/(train|workout|lift|weights?|set|rep|program|gym|bench|squat|deadlift|pr\b|record|تمرین|وزنه|ست|تکرار|برنامه|باشگاه|رکورد|پرس|اسکات|ددلیفت|برگردم)/.test(s)) return "train";
  if (/(habit|checklist|task|streak|routine|list|چک|کار|عادت|استریک|روتین|لیست)/.test(s)) return "habits";
  return "summary";
};

/**
 * A grounded reply with no network: the same numbers the model would see,
 * turned into plain coaching. Used until the athlete adds an API key.
 */
export function demoReply(question, snap, isRtl) {
  const fa = isRtl;
  const n = snap.nutrition;
  const t = snap.training;
  const h = snap.habits;
  const ideas = FOOD_IDEAS[fa ? "fa" : "en"];
  const lines = [];
  const kind = topic(question || "");

  const foodAdvice = () => {
    if (!n) return lines.push(fa ? "داده‌ی تغذیه را برای من غیرفعال کرده‌ای؛ برای مشاوره‌ی وعده، آن را در تنظیمات فعال کن." : "Nutrition data is switched off for me — turn it on in settings and I can plan the meal.");
    const left = n.today.remaining;
    if (left.kcal <= 100) {
      lines.push(fa ? `امروز ${n.today.kcal} از ${n.targets.kcal} کالری را خورده‌ای؛ عملاً به هدف رسیده‌ای.` : `You've eaten ${n.today.kcal} of ${n.targets.kcal} kcal today — you're essentially at target.`);
      lines.push(fa ? (left.protein > 15 ? `تنها چیزی که کم داری ${left.protein} گرم پروتئین است: ${ideas.protein[1]} خوب جواب می‌دهد.` : "اگر باز هم گشنه‌ای، سبزیجات یا یک وعده‌ی سبک بی‌ضرر است: " + ideas.light[0] + ".") : (left.protein > 15 ? `The only gap is ${left.protein} g protein: ${ideas.protein[1]} covers it.` : `If you're still hungry, keep it light: ${ideas.light[0]}.`));
      return;
    }
    lines.push(fa
      ? `تا این‌جای امروز ${n.today.kcal} کالری خورده‌ای؛ ${left.kcal} کالری، ${left.protein} گرم پروتئین، ${left.carbs} گرم کربوهیدرات و ${left.fat} گرم چربی مانده.`
      : `So far today: ${n.today.kcal} kcal. You have ${left.kcal} kcal left, with ${left.protein} g protein, ${left.carbs} g carbs and ${left.fat} g fat to fill.`);
    const proteinHeavy = left.protein > 35;
    lines.push(fa ? "پیشنهاد من:" : "My pick:");
    lines.push(`- ${proteinHeavy ? ideas.protein[0] : ideas.protein[1]}`);
    if (left.carbs > 40) lines.push(`- ${left.carbs > 80 ? ideas.carbs[0] : ideas.carbs[1]}`);
    lines.push(fa ? "- سبزیجات آزاد؛ برای فیبر و سیری." : "- vegetables, as much as you like, for fibre and fullness.");
    if (n.today.trainingDay === true && n.today.meals.every((m) => m.id !== "postworkout")) {
      lines.push(fa ? "امروز روز تمرین است و وعده‌ی بعد تمرین ثبت نشده؛ پروتئین را نزدیک جلسه بخور." : "It's a training day and no post-workout meal is logged — put the protein near the session.");
    }
    if (n.today.waterMl < n.targets.waterMl * 0.5) lines.push(fa ? `آب: فقط ${n.today.waterMl} از ${n.targets.waterMl} میلی‌لیتر.` : `Water: only ${n.today.waterMl} of ${n.targets.waterMl} ml so far.`);
  };

  const weightAdvice = () => {
    if (!n) return lines.push(fa ? "برای بررسی روند وزن، داده‌ی تغذیه را فعال کن." : "Turn nutrition data on and I can read your weight trend.");
    if (!n.weight) return lines.push(fa ? "هنوز وزنی ثبت نکرده‌ای. هر روز صبح، بعد از دستشویی و قبل از صبحانه وزن کن؛ بعد از ۷ روز روند معنی‌دار می‌شود." : "No weigh-ins yet. Weigh in each morning after the bathroom and before breakfast; after 7 days the trend means something.");
    const w = n.weight;
    const perWeek = w.overDays ? +((w.changeKg / w.overDays) * 7).toFixed(2) : 0;
    const goal = n.profile.goal;
    lines.push(fa
      ? `روند وزنت ${w.trendKg} کیلو است؛ ${w.changeKg >= 0 ? "+" : ""}${w.changeKg} کیلو در ${w.overDays} روز (≈ ${perWeek >= 0 ? "+" : ""}${perWeek} کیلو در هفته).`
      : `Your trend weight is ${w.trendKg} kg: ${w.changeKg >= 0 ? "+" : ""}${w.changeKg} kg over ${w.overDays} days (≈ ${perWeek >= 0 ? "+" : ""}${perWeek} kg/week).`);
    const want = goal === "Weight Loss" ? [-1, -0.25] : goal === "Muscle Gain" ? [0.1, 0.5] : [-0.25, 0.25];
    const ok = perWeek >= want[0] && perWeek <= want[1];
    if (ok) lines.push(fa ? `برای هدف «${goal}» دقیقاً همین محدوده خوب است. چیزی را تغییر نده.` : `For "${goal}" that is exactly the range you want. Change nothing.`);
    else if (perWeek < want[0]) lines.push(fa ? `برای «${goal}» این کاهش زیاد است؛ روزانه ۱۵۰ تا ۲۰۰ کالری اضافه کن، ترجیحاً کربوهیدرات دور تمرین.` : `That is faster than "${goal}" needs. Add 150–200 kcal a day, ideally carbs around training.`);
    else lines.push(fa ? `برای «${goal}» این افزایش تند است؛ روزانه ۱۵۰ تا ۲۰۰ کالری کم کن و پروتئین را ثابت نگه دار.` : `That is quicker than "${goal}" wants. Trim 150–200 kcal a day and keep protein where it is.`);
    if (n.adaptive) lines.push(fa ? `مصرف واقعی‌ات طبق داده‌ها ≈ ${n.adaptive.tdee} کالری در روز است.` : `Your measured expenditure comes out at ≈ ${n.adaptive.tdee} kcal/day.`);
  };

  const trainAdvice = () => {
    if (!t) return lines.push(fa ? "داده‌ی تمرین برای من خاموش است؛ در تنظیمات فعالش کن." : "Training data is switched off for me — enable it in settings.");
    if (t.daysSinceLast !== null && t.daysSinceLast >= 3) {
      lines.push(fa ? `${t.daysSinceLast} روز از آخرین تمرینت گذشته. برگشت سبک بهتر از برگشت قهرمانانه است:` : `It's been ${t.daysSinceLast} days since your last session. Come back lighter, not heroic:`);
      lines.push(fa ? "- همان جلسه‌ی بعدی برنامه، ولی ست‌های کاری را با ~۹۰٪ وزنه‌ی قبلی بزن." : "- run the next programmed day, but work sets at ~90% of last time's weights.");
    }
    if (t.next) {
      lines.push(fa ? `جلسه‌ی بعدی: **${t.next.title}**` : `Next up: **${t.next.title}**`);
      for (const e of t.next.exercises.slice(0, 6)) lines.push(`- ${e}`);
    } else if (!t.program) lines.push(fa ? "برنامه‌ی فعالی نداری؛ از تب برنامه‌ها یکی انتخاب کن یا بساز." : "No active program — pick or build one in Programs.");
    if (t.recent.length) {
      const s = t.recent[0];
      lines.push(fa ? `آخرین جلسه (${s.day}): ${s.sets} ست، ${s.volumeKg} کیلو حجم در ${s.minutes} دقیقه${s.prs.length ? ` — رکورد: ${s.prs.join("، ")}` : ""}.` : `Last session (${s.day}): ${s.sets} sets, ${s.volumeKg} kg volume in ${s.minutes} min${s.prs.length ? ` — PR: ${s.prs.join(", ")}` : ""}.`);
    }
    if (t.lifts.length) {
      const l = t.lifts[0];
      lines.push(fa ? `بهترین ${l.exercise}: ${l.bestSet}${l.e1rm ? ` (≈ ${l.e1rm} کیلو یک‌تکرار)` : ""}. قانون: وقتی همه‌ی ست‌ها را با تکرار هدف زدی، دفعه‌ی بعد ۲٫۵ کیلو اضافه کن.` : `Best ${l.exercise}: ${l.bestSet}${l.e1rm ? ` (≈ ${l.e1rm} kg e1RM)` : ""}. Rule: when every set hits the target reps, add 2.5 kg next time.`);
    }
    const thisWeek = t.weeks[t.weeks.length - 1];
    const lastWeek = t.weeks[t.weeks.length - 2];
    if (thisWeek && lastWeek && lastWeek.volumeKg > 0) {
      const pct = r(((thisWeek.volumeKg - lastWeek.volumeKg) / lastWeek.volumeKg) * 100);
      lines.push(fa ? `حجم این هفته ${thisWeek.volumeKg} کیلو در برابر ${lastWeek.volumeKg} کیلو هفته‌ی قبل (${pct >= 0 ? "+" : ""}${pct}٪).` : `Volume this week ${thisWeek.volumeKg} kg vs ${lastWeek.volumeKg} kg last week (${pct >= 0 ? "+" : ""}${pct}%).`);
    }
  };

  const habitAdvice = () => {
    if (!h) return lines.push(fa ? "داده‌ی چک‌لیست خاموش است." : "Checklist data is switched off.");
    if (!h.lists.length) return lines.push(fa ? "هنوز چک‌لیستی نساخته‌ای؛ با سه عادت کوچک روزانه شروع کن." : "No checklists yet — start with three small daily habits.");
    lines.push(fa ? `بهترین استریک فعالت ${h.streak} دوره است.` : `Your best live streak is ${h.streak} periods.`);
    for (const l of h.lists.slice(0, 3)) {
      lines.push(fa ? `- ${l.name}: ${l.done}/${l.total} انجام شده${l.open.length ? ` — مانده: ${l.open.slice(0, 3).join("، ")}` : " — تمام!"}` : `- ${l.name}: ${l.done}/${l.total} done${l.open.length ? ` — open: ${l.open.slice(0, 3).join(", ")}` : " — complete!"}`);
    }
    const open = h.lists.find((l) => l.open.length);
    if (open) lines.push(fa ? `اول «${open.open[0]}» را ببند؛ کوتاه‌ترین کار، استریک را نگه می‌دارد.` : `Close "${open.open[0]}" first — the shortest item keeps the streak alive.`);
  };

  const summary = () => {
    if (n) lines.push(fa ? `تغذیه: ${n.today.kcal}/${n.targets.kcal} کالری، پروتئین ${n.today.protein}/${n.targets.protein} گرم.` : `Nutrition: ${n.today.kcal}/${n.targets.kcal} kcal, protein ${n.today.protein}/${n.targets.protein} g.`);
    if (t) lines.push(fa ? `تمرین: ${t.daysSinceLast === null ? "هنوز جلسه‌ای ثبت نشده" : t.daysSinceLast === 0 ? "امروز تمرین کردی" : `${t.daysSinceLast} روز از آخرین جلسه`}${t.next ? `؛ بعدی «${t.next.title}»` : ""}.` : `Training: ${t.daysSinceLast === null ? "nothing logged yet" : t.daysSinceLast === 0 ? "trained today" : `${t.daysSinceLast} day(s) since your last session`}${t.next ? `; next is ${t.next.title}` : ""}.`);
    if (h) lines.push(fa ? `عادت‌ها: استریک ${h.streak}، ${h.lists.reduce((a, l) => a + l.open.length, 0)} کار باز.` : `Habits: streak ${h.streak}, ${h.lists.reduce((a, l) => a + l.open.length, 0)} open items.`);
    if (n && n.today.remaining.protein > 30) lines.push(fa ? `اولویت امروز: ${n.today.remaining.protein} گرم پروتئین باقی‌مانده.` : `Priority today: the ${n.today.remaining.protein} g protein still to eat.`);
    else if (t && t.daysSinceLast >= 2 && t.next) lines.push(fa ? `اولویت امروز: جلسه‌ی «${t.next.title}».` : `Priority today: your ${t.next.title} session.`);
  };

  if (kind === "food") foodAdvice();
  else if (kind === "weight") weightAdvice();
  else if (kind === "train") trainAdvice();
  else if (kind === "habits") habitAdvice();
  else summary();

  return lines.join("\n");
}
