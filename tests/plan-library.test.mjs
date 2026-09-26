// The ready plans (src/lib/plans/library.js): 60 meal plans and 60 workout
// programs, one for every combination of the filters, each of which the
// planners can really build for a person.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MEAL_PRESETS, PLACES, WEEK_DAYS, WORKOUT_PRESETS, findPreset, mealPresets, workoutPresets } from "../src/lib/plans/library.js";
import { BUDGETS, DEFAULT_SETTINGS, dayError, generateWeek } from "../src/lib/nutrition/planEngine.js";
import { foodMeta } from "../src/lib/nutrition/foodMeta.js";
import { DIET_TYPES, GOALS, targetsFor } from "../src/lib/nutrition/profile.js";
import { loadExerciseCatalog } from "../src/lib/training/catalog.js";
import { allExercises, findExercise } from "../src/lib/training/exercises.js";
import { fitsEquipment } from "../src/lib/training/patterns.js";
import { generateProgram } from "../src/lib/training/programGen.js";

let pass = 0, fail = 0;
const check = (name, cond, got) => { cond ? pass++ : fail++; if (!cond) console.log("✗", name, got !== undefined ? `(got ${JSON.stringify(got).slice(0, 400)})` : ""); };

check("60 ready meal plans", MEAL_PRESETS.length === 60, MEAL_PRESETS.length);
check("60 ready workout programs", WORKOUT_PRESETS.length === 60, WORKOUT_PRESETS.length);
check("every plan has its own id", new Set([...MEAL_PRESETS, ...WORKOUT_PRESETS].map((p) => p.id)).size === 120);
check("…and its own Persian name", new Set(MEAL_PRESETS.map((p) => p.nameFa)).size === 60 && new Set(WORKOUT_PRESETS.map((p) => p.nameFa)).size === 60
  && [...MEAL_PRESETS, ...WORKOUT_PRESETS].every((p) => /[؀-ۿ]/.test(p.nameFa) && !/\d/.test(p.nameFa)));
check("a plan is found by its id", findPreset(MEAL_PRESETS[5].id) === MEAL_PRESETS[5] && findPreset(WORKOUT_PRESETS[9].id) === WORKOUT_PRESETS[9] && findPreset("nope") === null);

// Every filter combination has at least one plan.
const emptyMeal = [];
for (const goal of GOALS) for (const dietType of DIET_TYPES) for (const budget of BUDGETS) if (!mealPresets({ goal, dietType, budget }).length) emptyMeal.push([goal, dietType, budget]);
check("every goal × diet × budget has a meal plan", emptyMeal.length === 0, emptyMeal);
const emptyWorkout = [];
for (const goal of GOALS) for (const location of PLACES) for (const days of WEEK_DAYS) if (!workoutPresets({ goal, location, days }).length) emptyWorkout.push([goal, location, days]);
check("every goal × place × days has a workout program", emptyWorkout.length === 0, emptyWorkout);
check("a filter left open lists all its plans", mealPresets({ goal: "Weight Loss" }).length === 15 && workoutPresets({ goal: "Keep Fit", location: "home", days: "all" }).length === 5);

// Each meal plan builds real days for a person.
const person = { gender: "female", age: 34, height: 166, weight: 68, frequency: "3_4", difficulty: "moderate", pace: "normal" };
const mealProblems = [];
for (const p of MEAL_PRESETS) {
  const who = { ...person, goal: p.goal, dietType: p.dietType };
  const target = targetsFor(who);
  const days = generateWeek({ start: "2026-09-26", days: 2, tries: 3, seed: 5, targetFor: () => target,
    settings: { ...DEFAULT_SETTINGS, budget: p.budget, meals: p.meals }, dietType: p.dietType, goal: p.goal });
  if (days.some((d) => d.meals.length !== p.meals)) mealProblems.push(`${p.id}: meal count`);
  const worst = Math.max(...days.map(dayError));
  if (worst > 0.08) mealProblems.push(`${p.id}: ${(worst * 100).toFixed(1)}% off`);
  const foods = days.flatMap((d) => d.meals.flatMap((m) => m.items.map((i) => foodMeta(i.foodId))));
  if (p.dietType === "vegetarian" && foods.some((m) => m.meat)) mealProblems.push(`${p.id}: meat in a vegetarian plan`);
  if (p.dietType === "keto" && foods.some((m) => ["starch", "fruit"].includes(m.group))) mealProblems.push(`${p.id}: starch on keto`);
}
check("every ready meal plan builds days on target, true to its diet", mealProblems.length === 0, mealProblems.slice(0, 6));

// Each workout program builds for a person, with what the place has.
const catalog = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "public", "exercises", "catalog.json"), "utf8"));
await loadExerciseCatalog({ force: true, fetch: async () => ({ ok: true, json: async () => catalog }) });
const library = allExercises();
const workoutProblems = [];
for (const p of WORKOUT_PRESETS) {
  const prog = generateProgram({ goal: p.goal, days: p.days, minutes: p.minutes, location: p.location, level: "intermediate", seed: 3, exercises: library });
  const train = prog.days.filter((d) => d.type !== "rest");
  if (train.length !== p.days) workoutProblems.push(`${p.id}: ${train.length} days`);
  for (const d of train) {
    if (d.exercises.length < 3) workoutProblems.push(`${p.id} ${d.title}: ${d.exercises.length} exercises`);
    for (const pe of d.exercises) if (!fitsEquipment(findExercise(pe.exerciseId), p.location)) workoutProblems.push(`${p.id}: ${findExercise(pe.exerciseId).nameEn} at ${p.location}`);
  }
}
check("every ready workout program builds, with what its place has", workoutProblems.length === 0, workoutProblems.slice(0, 6));

console.log(`plan library: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
