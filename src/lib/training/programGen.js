/**
 * The workout planner: a week of sessions from the questionnaire's answers.
 *
 *   generateProgram(input) → a program in programModel's shape
 *   swapExercise(…)        → exercises that can take one's place
 *   nextTargets(…)         → the weight and reps to aim for next session
 *
 * How a week is built
 *  1. Days a week choose the split: 2–3 full body, 4 upper/lower, 5 upper/
 *     lower + push/pull/legs, 6 push/pull/legs twice. Rest days fall between.
 *  2. Each day is a list of slots by movement pattern (patterns.js), the big
 *     movements first. The session's length decides how many slots are kept.
 *  3. Each slot takes the best exercise for this person: one the place's
 *     equipment allows, at their level, not loading an injured joint;
 *     well-known movements first (the app's own 51, then short plain names),
 *     and not one already used this week.
 *  4. Sets, reps and rest follow the goal: strength heavy and long rests,
 *     muscle 8–12, fat loss higher reps, short rests and a conditioning
 *     finisher.
 *
 * Pure: the exercise list and a seed come in, so a test can pin the result.
 */

import { allExercises } from "./exercises";
import { classify, fitsEquipment } from "./patterns";
import { createDay, createProgram, createProgramExercise, PROGRAM_COLORS } from "./programModel";
import { rng, seedOf } from "../nutrition/planEngine";

export const LEVELS = ["beginner", "intermediate", "advanced"];
export const INJURIES = [
  { id: "knee", en: "Knees", fa: "زانو" },
  { id: "shoulder", en: "Shoulders", fa: "شانه" },
  { id: "lower_back", en: "Lower back", fa: "کمر" },
  { id: "wrist", en: "Wrists", fa: "مچ دست" },
];
export const SESSION_MINUTES = [30, 45, 60, 90];

/* ─────────────────────────────── splits ─────────────────────────────── */

// Slot lists per day kind, most important first. "a|b" means either.
const DAY_SLOTS = {
  fullA: ["squat", "push_h", "pull_h", "hinge", "shoulder_iso", "core", "biceps", "triceps"],
  fullB: ["hinge", "push_v", "pull_v", "lunge", "chest_iso", "core", "triceps", "calf"],
  fullC: ["lunge", "push_h", "pull_v", "hinge", "rear_iso", "core", "biceps", "calf"],
  upper: ["push_h", "pull_h", "push_v", "pull_v", "shoulder_iso", "triceps", "biceps", "rear_iso"],
  upper2: ["push_v", "pull_v", "push_h", "pull_h", "chest_iso", "biceps", "triceps", "rear_iso"],
  lower: ["squat", "hinge", "lunge", "ham_iso", "calf", "core", "quad_iso"],
  lower2: ["hinge", "squat", "lunge", "glute_iso", "calf", "core", "ham_iso"],
  push: ["push_h", "push_v", "chest_iso", "shoulder_iso", "triceps", "triceps"],
  pull: ["pull_v", "pull_h", "rear_iso", "biceps", "biceps", "core"],
  legs: ["squat", "hinge", "lunge", "quad_iso", "ham_iso", "calf", "core"],
};

const NAMES = {
  fullA: ["Full Body A", "فول بادی A"], fullB: ["Full Body B", "فول بادی B"], fullC: ["Full Body C", "فول بادی C"],
  upper: ["Upper A", "بالاتنه A"], upper2: ["Upper B", "بالاتنه B"], lower: ["Lower A", "پایین‌تنه A"], lower2: ["Lower B", "پایین‌تنه B"],
  push: ["Push", "پوش (هل دادن)"], pull: ["Pull", "پول (کشیدن)"], legs: ["Legs", "پا"],
};

/** The week: which day kinds, and where the rest days go (7 days, Saturday first). */
export function splitFor(days) {
  const d = Math.min(6, Math.max(2, Math.round(days)));
  switch (d) {
    case 2: return { id: "full2", en: "Full body, 2 days", fa: "فول بادی، ۲ روز", week: ["fullA", null, null, "fullB", null, null, null] };
    case 3: return { id: "full3", en: "Full body, 3 days", fa: "فول بادی، ۳ روز", week: ["fullA", null, "fullB", null, "fullC", null, null] };
    case 4: return { id: "ul4", en: "Upper / lower, 4 days", fa: "بالاتنه / پایین‌تنه، ۴ روز", week: ["upper", "lower", null, "upper2", "lower2", null, null] };
    case 5: return { id: "ulppl5", en: "Upper / lower + push / pull / legs, 5 days", fa: "بالاتنه / پایین‌تنه + پوش / پول / پا، ۵ روز", week: ["upper", "lower", null, "push", "pull", "legs", null] };
    default: return { id: "ppl6", en: "Push / pull / legs, 6 days", fa: "پوش / پول / پا، ۶ روز", week: ["push", "pull", "legs", "push", "pull", "legs", null] };
  }
}

/* ─────────────────────────────── dosage ─────────────────────────────── */

/** Sets, reps (or seconds) and rest for a slot, by goal and level. */
export function dosage({ goal, level, compound, pattern, mode }) {
  const beginner = level === "beginner";
  if (pattern === "cardio" || pattern === "plyo") {
    if (mode === "time") return { sets: 1, reps: goal === "Weight Loss" ? 600 : 420, restSec: 60 };
    if (mode === "distance") return { sets: 3, reps: 250, restSec: 90 };
    return { sets: 3, reps: 12, restSec: 60 };
  }
  if (pattern === "core") return mode === "time" ? { sets: 3, reps: 40, restSec: 45 } : { sets: 3, reps: 15, restSec: 45 };
  if (pattern === "carry") return { sets: 3, reps: mode === "distance" ? 40 : 40, restSec: 60 };
  const sets = compound ? (beginner ? 3 : 4) : 3;
  switch (goal) {
    case "Max Strength": return compound ? { sets: beginner ? 3 : 5, reps: 5, restSec: 150 } : { sets, reps: 10, restSec: 75 };
    case "Muscle Gain": return compound ? { sets, reps: 8, restSec: 120 } : { sets, reps: 12, restSec: 60 };
    case "Weight Loss": return compound ? { sets: 3, reps: 12, restSec: 60 } : { sets: 3, reps: 15, restSec: 45 };
    default: return compound ? { sets: 3, reps: 10, restSec: 90 } : { sets: 3, reps: 12, restSec: 60 };
  }
}

/** How many slots fit in a session: warm-up, then each exercise's sets of ~40 s work plus rest. */
function slotsThatFit(minutes, slots, goal, level) {
  let left = minutes * 60 - 5 * 60;
  let n = 0;
  const kept = [];
  for (const pattern of slots) {
    const { sets, reps, restSec } = dosage({ goal, level, compound: ["squat", "hinge", "lunge", "push_h", "push_v", "pull_h", "pull_v"].includes(pattern), pattern });
    const cost = sets * (Math.min(reps * 4, 60) + restSec);
    // A slot that doesn't fit is skipped; a cheaper one after it may still fit.
    if (left - cost < 0 && n >= 3) { kept.push(false); continue; }
    left -= cost;
    n += 1;
    kept.push(true);
  }
  return kept;
}

/* ─────────────────────────────── picking exercises ─────────────────────────────── */

const LEVEL_NUM = { beginner: 1, intermediate: 2, advanced: 3 };
// Words that mark a niche variant rather than the movement itself.
const NICHE = /\b(chain|chains|sled|strongman|landmine|suspender|suspension|sliding|towel|throw|hold|sec|pulse|iso|tempo|variation|against|with|to|and|pause|partial|banded|band|lever|bosu|stability|medicine|isometric|alternating|side view|circle|twist)\b/i;

/**
 * The staples of each pattern, by place, best first (library slugs): what a
 * coach would write down before any variation.
 */
const STAPLES = {
  gym: {
    squat: ["barbell-squat", "barbell-front-squat", "lever-seated-leg-press", "dumbbell-goblet-squat", "lever-hack-squat"],
    hinge: ["barbell-deadlift", "barbell-romanian-deadlift", "barbell-hip-thrust", "dumbbell-romanian-deadlift", "kettlebell-swing"],
    lunge: ["dumbbell-bulgarian-split-squat", "dumbbell-walking-lunge", "dumbbell-lunge"],
    push_h: ["barbell-bench-press", "dumbbell-incline-bench-press", "dumbbell-bench-press", "lever-chest-press"],
    push_v: ["barbell-standing-military-press", "dumbbell-seated-shoulder-press"],
    pull_h: ["barbell-bent-over-row", "cable-seated-row", "dumbbell-one-arm-bent-over-row", "lever-lying-t-bar-row"],
    pull_v: ["pull-up", "cable-wide-grip-lat-pulldown"],
    chest_iso: ["dumbbell-fly", "lever-pec-deck-fly"],
    shoulder_iso: ["dumbbell-lateral-raise"],
    rear_iso: ["cable-standing-face-pull", "dumbbell-rear-delt-fly"],
    biceps: ["barbell-curl", "dumbbell-hammer-curl"],
    triceps: ["cable-pushdown", "barbell-lying-triceps-extension-skull-crusher", "chest-dip"],
    quad_iso: ["lever-leg-extension"], ham_iso: ["lever-lying-leg-curl"], calf: ["lever-standing-calf-raise"],
    core: ["front-plank", "hanging-leg-raise", "cable-kneeling-crunch"],
    cardio: ["run-on-treadmill", "rowing-machine", "stationary-bike-walk", "jump-rope"],
  },
  home_gear: {
    squat: ["dumbbell-goblet-squat", "dumbbell-squat", "air-squat"],
    hinge: ["dumbbell-romanian-deadlift", "dumbbell-glute-bridge", "dumbbell-stiff-leg-deadlift", "heel-glute-bridge"],
    lunge: ["dumbbell-bulgarian-split-squat", "dumbbell-lunge", "dumbbell-walking-lunge", "forward-lunge"],
    push_h: ["dumbbell-bench-press", "push-up", "dumbbell-incline-bench-press"],
    push_v: ["dumbbell-seated-shoulder-press", "pike-push-up"],
    pull_h: ["dumbbell-one-arm-bent-over-row", "dumbbell-bent-over-row", "inverted-row"],
    chest_iso: ["dumbbell-fly"], shoulder_iso: ["dumbbell-lateral-raise"], rear_iso: ["dumbbell-rear-delt-fly", "band-pull-apart"],
    biceps: ["dumbbell-hammer-curl"], triceps: ["bench-dip-on-floor", "diamond-push-up"],
    calf: ["standing-calf-raise"], core: ["front-plank", "lying-leg-raise", "side-plank"],
    cardio: ["jumping-jack", "burpee", "mountain-climber", "high-knee-run"],
  },
  home: {
    squat: ["air-squat"], hinge: ["heel-glute-bridge", "glute-bridge-march", "hip-thrusts"], lunge: ["forward-lunge"],
    push_h: ["push-up", "decline-push-up"], push_v: ["pike-push-up"], pull_h: ["inverted-row", "superman-row"],
    triceps: ["bench-dip-on-floor", "diamond-push-up"], calf: ["standing-calf-raise"],
    core: ["front-plank", "side-plank", "lying-leg-raise"],
    cardio: ["jumping-jack", "burpee", "mountain-climber", "high-knee-run", "skater"],
  },
};

const PREFERRED_EQUIPMENT = {
  gym: ["barbell", "dumbbell", "cable", "machine", "leverage-machine", "smith-machine", "ez-curl-bar", "bodyweight", "pull-up-bar"],
  home_gear: ["dumbbell", "bodyweight", "bench", "resistance-band"],
  home: ["bodyweight"],
};

function score(ex, c, { location, level, used, random, builtinIds, goal }) {
  let s = 0;
  const staple = (STAPLES[location]?.[c.pattern] || []).indexOf(ex.slug);
  if (staple >= 0) s += 2.4 - 0.3 * staple;
  if (builtinIds.has(ex.id)) s += 0.6;
  // Heavy goals want loaded lifts; a push-up isn't a strength test.
  if (location === "gym" && c.compound && (goal === "Max Strength" || goal === "Muscle Gain")
    && (ex.equipmentSlugs || []).every((e) => e === "bodyweight") && !["pull_v"].includes(c.pattern)) s -= 1.2;
  const words = String(ex.nameEn || "").split(/\s+/).length;
  s -= 0.18 * Math.max(0, words - 2);
  if (NICHE.test(ex.nameEn || "")) s -= 0.9;
  const prefer = PREFERRED_EQUIPMENT[location] || [];
  if ((ex.equipmentSlugs || []).some((e) => prefer.slice(0, 3).includes(e))) s += 0.3;
  s -= 0.6 * Math.abs(c.level - Math.min(LEVEL_NUM[level] || 2, 2.5));
  // Accessories vary through the week; the big lifts may come back (strength wants them twice).
  if (used.has(ex.id)) s -= c.compound ? (goal === "Max Strength" ? 0.2 : 1.4) : 2;
  return s + random() * 0.35;
}

/** Exercises that can fill a pattern for this person, best first. */
export function candidates(pattern, { exercises = allExercises(), location = "gym", level = "intermediate", injuries = [], used = new Set(), exclude = null, random = Math.random, limit = 12, goal = "Keep Fit" } = {}) {
  const builtinIds = new Set(exercises.filter((e) => !String(e.id).includes("-")).map((e) => e.id));
  // Only advanced moves are ruled out below advanced; a beginner is steered to the easier ones by score.
  const cap = level === "advanced" ? 3 : 2;
  const out = [];
  for (const ex of exercises) {
    const c = classify(ex);
    if (c.pattern !== pattern) continue;
    if (exclude?.has(ex.id)) continue;
    if (c.level > cap) continue;
    if (!fitsEquipment(ex, location)) continue;
    if (c.load.some((j) => injuries.includes(j))) continue;
    out.push({ ex, c, s: score(ex, c, { location, level, used, random, builtinIds, goal }) });
  }
  return out.sort((a, b) => b.s - a.s).slice(0, limit);
}

/* ─────────────────────────────── the program ─────────────────────────────── */

// Onboarding's focus areas → the accessory patterns that get an extra slot.
const FOCUS_PATTERN = {
  Shoulder: "shoulder_iso", Deltoids: "shoulder_iso", Biceps: "biceps", Triceps: "triceps", Chest: "chest_iso",
  Legs: "quad_iso", Abs: "core", "Calf muscles": "calf", Hips: "glute_iso", Trapezius: "shoulder_iso",
};

const GOAL_NAMES = {
  "Weight Loss": ["Fat loss", "چربی‌سوزی"], "Muscle Gain": ["Muscle", "عضله‌سازی"],
  "Keep Fit": ["Fitness", "تناسب اندام"], "Max Strength": ["Strength", "قدرت"],
};

/**
 * A program for this person.
 *
 * @param {Object} input
 * @param {string} input.goal          profile.goal
 * @param {number} input.days          sessions a week, 2–6
 * @param {number} [input.minutes]     per session, 30–90
 * @param {string} [input.level]       beginner | intermediate | advanced
 * @param {string} [input.location]    gym | home_gear | home
 * @param {string[]} [input.injuries]  knee | shoulder | lower_back | wrist
 * @param {string[]} [input.focus]     onboarding focus areas
 * @param {number} [input.seed]
 * @param {Array}  [input.exercises]   the library (allExercises())
 */
export function generateProgram({ goal = "Keep Fit", days = 3, minutes = 60, level = "intermediate", location = "gym", injuries = [], focus = [], seed = 1, exercises = allExercises() }) {
  const random = rng(seed);
  const split = splitFor(days);
  const used = new Set();
  const extra = [...new Set(focus.map((f) => FOCUS_PATTERN[f]).filter(Boolean))];
  const week = split.week.map((kind) => {
    if (!kind) return createDay({ title: "Rest", titleFa: "استراحت", type: "rest" });
    let slots = [...DAY_SLOTS[kind]];
    // Strength opens every session on a heavy barbell lift: the lunge day squats first.
    if (goal === "Max Strength" && slots[0] === "lunge") slots = ["squat", ...slots.slice(1, 3), "lunge", ...slots.slice(4)];
    // A focus area adds its accessory to the days that train that part.
    for (const p of extra) if (!slots.includes(p) && (kind.startsWith("full") || DAY_SLOTS[kind].some((q) => sameRegion(p, q)))) slots.splice(4, 0, p);
    const keep = slotsThatFit(minutes, slots, goal, level);
    // A beginner's session stays short enough to learn every movement in it.
    slots = slots.filter((_, i) => keep[i]).slice(0, { beginner: 6, intermediate: 7 }[level] || 8);
    // Fat loss ends with conditioning.
    if (goal === "Weight Loss") slots.push("cardio");
    const exercisesOfDay = [];
    const today = new Set();
    for (const pattern of slots) {
      // Never the same exercise twice in one session (two biceps slots are two different curls).
      const pick = candidates(pattern, { exercises, location, level, injuries, used, exclude: today, random, limit: 3, goal })[0];
      // Nothing decent for this slot here (a curl with no weights): leave it out.
      if (!pick || pick.s < -1.5) continue;
      used.add(pick.ex.id);
      today.add(pick.ex.id);
      const d = dosage({ goal, level, compound: pick.c.compound, pattern, mode: pick.ex.mode });
      exercisesOfDay.push(createProgramExercise({ exerciseId: pick.ex.id, sets: d.sets, reps: d.reps, weight: null, restSec: d.restSec }));
    }
    const [en, fa] = NAMES[kind];
    return createDay({ title: en, titleFa: fa, exercises: exercisesOfDay });
  });
  const [gEn, gFa] = GOAL_NAMES[goal] || GOAL_NAMES["Keep Fit"];
  return createProgram({
    name: `${gEn}: ${split.en}`,
    nameFa: `${gFa}: ${split.fa}`,
    emoji: goal === "Max Strength" ? "🏋️" : goal === "Muscle Gain" ? "💪" : goal === "Weight Loss" ? "🔥" : "⚡",
    color: PROGRAM_COLORS[seedOf(split.id) % PROGRAM_COLORS.length],
    description: `${split.en}, ${minutes} min, ${level}, ${location === "gym" ? "gym" : location === "home" ? "home, no equipment" : "home with dumbbells and bands"}.`,
    weeks: 8,
    author: { name: "FitClub", role: "coach" },
    source: "generated",
    days: week,
    generator: { goal, days, minutes, level, location, injuries, focus, seed },
  });
}

const REGION = {
  shoulder_iso: "upper", rear_iso: "upper", biceps: "upper", triceps: "upper", chest_iso: "upper",
  push_h: "upper", push_v: "upper", pull_h: "upper", pull_v: "upper",
  quad_iso: "lower", ham_iso: "lower", glute_iso: "lower", calf: "lower", squat: "lower", hinge: "lower", lunge: "lower",
  core: "core",
};
const sameRegion = (a, b) => REGION[a] && REGION[a] === REGION[b];

/* ─────────────────────────────── swaps ─────────────────────────────── */

/**
 * Exercises that can take this one's place in a session: the same movement
 * pattern, the same primary muscle first, doable where the person trains.
 */
export function swapExercise(exercise, { exercises = allExercises(), location = "gym", level = "advanced", injuries = [], limit = 10 } = {}) {
  if (!exercise) return [];
  const c = classify(exercise);
  const primary = (exercise.muscles || [])[0];
  const list = candidates(c.pattern, { exercises, location, level, injuries, random: () => 0.5, limit: 60, goal: "Keep Fit" })
    .filter((x) => x.ex.id !== exercise.id)
    .map((x) => ({ ...x, s: x.s + ((x.ex.muscles || [])[0] === primary ? 0.8 : 0) }))
    .sort((a, b) => b.s - a.s);
  return list.slice(0, limit).map((x) => x.ex);
}

/* ─────────────────────────────── progression ─────────────────────────────── */

const LOWER = new Set(["squat", "hinge", "lunge"]);

/**
 * What to aim for next time on one exercise, from the sets logged last time
 * (double progression): every set at the top of the rep target → more
 * weight and the reps start again lower; any set well short twice running →
 * the weight comes down 10%; otherwise the same weight, one more rep.
 *
 * @param {Object} planned   { sets, reps, weight } from the program
 * @param {Array}  history   earlier sessions' sets for this exercise, newest first: [[{weight, reps, done}], …]
 * @param {Object} exercise  the library record (for its pattern and equipment)
 * @returns {{ weight: number|null, reps: number, from: number|null, reason: "start"|"up"|"hold"|"rep"|"down" }}
 *   `from` is last time's working weight, so a screen can say by how much it changed.
 */
export function nextTargets(planned, history, exercise) {
  const last = (history?.[0] || []).filter((s) => s.done);
  const target = planned.reps || 10;
  if (!last.length) return { weight: planned.weight ?? null, reps: target, reason: "start" };
  const weight = Math.max(...last.map((s) => s.weight || 0)) || null;
  if (!weight) return { weight: null, reps: Math.min(target + 2, Math.max(...last.map((s) => s.reps || 0)) + 1), from: null, reason: "rep" };
  const allTop = last.length >= (planned.sets || 1) && last.every((s) => (s.reps || 0) >= target);
  const short = (sets) => sets.filter((s) => s.done && (s.reps || 0) < target - 2).length >= 2;
  const c = classify(exercise || {});
  const dumbbell = (exercise?.equipmentSlugs || []).includes("dumbbell");
  const step = dumbbell ? 2 : LOWER.has(c?.pattern) ? 5 : 2.5;
  if (allTop) return { weight: +(weight + step).toFixed(1), reps: Math.max(target - 2, 1), from: weight, reason: "up" };
  if (short(last) && short((history?.[1] || []))) return { weight: Math.max(0, Math.round((weight * 0.9) / step) * step), reps: target, from: weight, reason: "down" };
  const best = Math.max(...last.map((s) => s.reps || 0));
  return { weight, reps: Math.min(target, best + 1), from: weight, reason: best >= target ? "hold" : "rep" };
}
