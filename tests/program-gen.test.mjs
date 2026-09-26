// The workout planner (src/lib/training/programGen.js, patterns.js): what an
// exercise is read as, the programs it builds for each kind of person,
// swapping one exercise for another, and what to aim for next session.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadExerciseCatalog } from "../src/lib/training/catalog.js";
import { allExercises, findExercise } from "../src/lib/training/exercises.js";
import { classify, fitsEquipment } from "../src/lib/training/patterns.js";
import { candidates, deloadTarget, dosage, generateProgram, isDeloadWeek, nextTargets, programWeek, splitFor, swapExercise } from "../src/lib/training/programGen.js";
import { createSession } from "../src/lib/training/programModel.js";

let pass = 0, fail = 0;
const check = (name, cond, got) => { cond ? pass++ : fail++; if (!cond) console.log("✗", name, got !== undefined ? `(got ${JSON.stringify(got).slice(0, 400)})` : ""); };

const catalog = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "public", "exercises", "catalog.json"), "utf8"));
await loadExerciseCatalog({ force: true, fetch: async () => ({ ok: true, json: async () => catalog }) });
const library = allExercises();
check("the whole library is loaded", library.length > 3400, library.length);
const bySlug = (slug) => library.find((e) => e.slug === slug);
const ex = (nameEn, extra = {}) => ({ nameEn, muscles: [], equipmentSlugs: [], ...extra });

/* ── reading an exercise ── */
const reads = [
  ["Barbell Squat", "squat"], ["Barbell Deadlift", "hinge"], ["Barbell Bench Press", "push_h"],
  ["Pull-up", "pull_v"], ["Cable Seated Row", "pull_h"], ["Barbell Standing Military Press", "push_v"],
  ["Dumbbell Lateral Raises", "shoulder_iso"], ["Dumbbell Kickback", "triceps"], ["Glute Kickback", "glute_iso"],
  ["Sled Push", "cardio"], ["Lever Seated Leg Curl", "ham_iso"], ["Lower Back Curl", "hinge"],
  ["Hanging Leg Raise", "core"], ["Dumbbell Walking Lunges", "lunge"], ["Barbell Curl", "biceps"],
  ["Lever Standing Calf Raise", "calf"], ["Farmer's Carry", "carry"], ["Seated Hamstring Stretch", "mobility"],
  ["Cable Standing Face Pull", "rear_iso"], ["Dumbbell Fly", "chest_iso"], ["Lever Leg Extension", "quad_iso"],
];
const wrong = reads.filter(([n, p]) => classify(ex(n)).pattern !== p).map(([n, p]) => [n, p, classify(ex(n)).pattern]);
check("exercises are read as the movement they are", wrong.length === 0, wrong);
check("a stretch typed as one is mobility whatever its name", classify(ex("Barbell Squat Hold", { type: "stretching" })).pattern === "mobility");
check("a name that says nothing is never guessed at", classify(ex("Quadratus Lumborum Release Thing")).pattern === "other");
check("the big movements count as compound", classify(ex("Barbell Squat")).compound && !classify(ex("Barbell Curl")).compound);
check("levels: one-arm push-up is advanced, a machine press is easy",
  classify(ex("One Arm Push-up")).level === 3 && classify(ex("Lever Chest Press")).level === 1 && classify(ex("Barbell Bench Press")).level === 2);
check("jumping loads the knees", classify(ex("Jump Squat")).load.includes("knee"));
check("deadlifts load the lower back, a glute bridge doesn't",
  classify(ex("Barbell Deadlift")).load.includes("lower_back") && !classify(ex("Glute Bridge")).load.includes("lower_back"));
check("pressing overhead loads the shoulders", classify(ex("Dumbbell Seated Shoulder Press")).load.includes("shoulder"));
const placed = library.filter((e) => classify(e).pattern !== "other").length;
check("most of the library can be placed in a program", placed / library.length > 0.8, `${placed}/${library.length}`);

/* ── equipment ── */
check("at home with nothing: a push-up yes, a pull-up bar or a treadmill no",
  fitsEquipment(ex("Push-up", { equipmentSlugs: ["bodyweight"] }), "home")
  && !fitsEquipment(ex("Pull-up", { equipmentSlugs: ["bodyweight"] }), "home")
  && !fitsEquipment(ex("Run on Treadmill"), "home"));
check("…and no dumbbells", !fitsEquipment(ex("Dumbbell Curl", { equipmentSlugs: ["dumbbell"] }), "home"));
check("…but a dip off a bench or the floor is fine", fitsEquipment(ex("Bench Dip on Floor", { equipmentSlugs: ["bodyweight"] }), "home"));
check("with dumbbells at home there is still no pull-up bar", !fitsEquipment(ex("Pull-up", { equipmentSlugs: ["bodyweight"] }), "home_gear"));
check("at home with gear: dumbbells yes, a barbell no",
  fitsEquipment(ex("Dumbbell Curl", { equipmentSlugs: ["dumbbell"] }), "home_gear") && !fitsEquipment(ex("Barbell Bench Press", { equipmentSlugs: ["barbell"] }), "home_gear"));
check("the gym has everything", fitsEquipment(ex("Lever Hack Squat", { equipmentSlugs: ["leverage-machine"] }), "gym"));

/* ── splits and dosage ── */
const trainingDays = (d) => splitFor(d).week.filter(Boolean).length;
check("the split trains as many days as asked, 2–6, in a 7-day week",
  [2, 3, 4, 5, 6].every((d) => trainingDays(d) === d && splitFor(d).week.length === 7), [2, 3, 4, 5, 6].map(trainingDays));
check("an out-of-range answer is clamped", trainingDays(9) === 6 && trainingDays(1) === 2);
check("4 days is upper/lower, 6 is push/pull/legs", splitFor(4).id === "ul4" && splitFor(6).id === "ppl6");
check("strength: heavy fives on the big lifts", dosage({ goal: "Max Strength", level: "intermediate", compound: true, pattern: "squat" }).reps === 5
  && dosage({ goal: "Max Strength", level: "intermediate", compound: true, pattern: "squat" }).restSec >= 120);
check("muscle: 8 on compounds, 12 on accessories",
  dosage({ goal: "Muscle Gain", compound: true, pattern: "push_h" }).reps === 8 && dosage({ goal: "Muscle Gain", compound: false, pattern: "biceps" }).reps === 12);
check("fat loss: short rests", dosage({ goal: "Weight Loss", compound: true, pattern: "squat" }).restSec <= 60);
check("timed cardio is in seconds", dosage({ goal: "Weight Loss", pattern: "cardio", mode: "time" }).reps >= 300);

/* ── programs for every kind of person ── */
const people = [];
for (const goal of ["Weight Loss", "Muscle Gain", "Keep Fit", "Max Strength"])
  for (const location of ["gym", "home_gear", "home"])
    for (const level of ["beginner", "intermediate", "advanced"])
      people.push({ goal, location, level, days: 3 + (people.length % 4), minutes: [45, 60, 90][people.length % 3] });
people.push({ goal: "Muscle Gain", location: "gym", level: "intermediate", days: 4, minutes: 60, injuries: ["knee", "shoulder", "lower_back", "wrist"] });
people.push({ goal: "Keep Fit", location: "home", level: "beginner", days: 2, minutes: 30, injuries: ["knee"] });

const problems = [];
let slowest = 0;
for (const who of people) {
  const t0 = Date.now();
  const p = generateProgram({ ...who, seed: 7, exercises: library });
  slowest = Math.max(slowest, Date.now() - t0);
  const train = p.days.filter((d) => d.type !== "rest");
  const say = (what) => problems.push(`${JSON.stringify(who)}: ${what}`);
  if (train.length !== Math.min(6, Math.max(2, who.days))) say(`${train.length} training days`);
  if (p.days.length !== 7) say(`${p.days.length} days in the week`);
  const cap = { beginner: 6, intermediate: 7, advanced: 8 }[who.level] + (who.goal === "Weight Loss" ? 1 : 0);
  for (const d of train) {
    if (d.exercises.length < 3) say(`${d.titleFa} has ${d.exercises.length} exercises`);
    if (d.exercises.length > cap) say(`${d.titleFa} has ${d.exercises.length} exercises (cap ${cap})`);
    const ids = d.exercises.map((e) => e.exerciseId);
    if (new Set(ids).size !== ids.length) say(`${d.titleFa} repeats an exercise`);
    for (const pe of d.exercises) {
      const rec = findExercise(pe.exerciseId);
      if (!rec) { say(`unknown exercise ${pe.exerciseId}`); continue; }
      const c = classify(rec);
      if (!fitsEquipment(rec, who.location)) say(`${rec.nameEn} doesn't fit ${who.location}`);
      if (c.load.some((j) => (who.injuries || []).includes(j))) say(`${rec.nameEn} loads an injured ${c.load}`);
      if (c.level > (who.level === "advanced" ? 3 : 2)) say(`${rec.nameEn} is too hard for ${who.level}`);
      if (["other", "mobility"].includes(c.pattern)) say(`${rec.nameEn} is ${c.pattern}`);
      if (!(pe.sets >= 1 && pe.reps >= 1 && pe.restSec >= 30)) say(`${rec.nameEn} has no dosage`);
    }
  }
  if (who.goal === "Weight Loss" && !train.every((d) => classify(findExercise(d.exercises.at(-1)?.exerciseId) || {})?.pattern === "cardio")) say("a fat-loss day doesn't end with conditioning");
  if (p.source !== "generated" || p.generator?.goal !== who.goal || p.generator?.location !== who.location) say("the program doesn't remember what it was made from");
  if (!p.nameFa || !/[؀-ۿ]/.test(p.nameFa)) say("no Persian name");
}
check(`every program is doable for its person (${people.length} people)`, problems.length === 0, problems.slice(0, 6));
check("a program is made in well under half a second", slowest < 500, slowest);

// What a coach would write down first.
const ppl = generateProgram({ goal: "Muscle Gain", days: 6, minutes: 60, level: "intermediate", location: "gym", seed: 3, exercises: library });
const firstOf = (p, i) => findExercise(p.days.filter((d) => d.type !== "rest")[i].exercises[0].exerciseId);
check("gym push day opens with the bench press", firstOf(ppl, 0).slug === "barbell-bench-press", firstOf(ppl, 0).slug);
check("gym legs day opens with a barbell squat", firstOf(ppl, 2).slug === "barbell-squat", firstOf(ppl, 2).slug);
const strength = generateProgram({ goal: "Max Strength", days: 3, minutes: 90, level: "intermediate", location: "gym", seed: 3, exercises: library });
check("strength days open on a barbell lift", strength.days.filter((d) => d.type !== "rest").every((d) => (findExercise(d.exercises[0].exerciseId).equipmentSlugs || []).includes("barbell")));
const home = generateProgram({ goal: "Keep Fit", days: 3, minutes: 45, level: "beginner", location: "home", seed: 3, exercises: library });
check("with nothing at home, only bodyweight", home.days.flatMap((d) => d.exercises).every((pe) => (findExercise(pe.exerciseId).equipmentSlugs || []).every((e) => ["bodyweight", "towel", "bottle", "other", "stick-pvc"].includes(e))));

// Deterministic by seed; session length decides how much.
const a = generateProgram({ goal: "Muscle Gain", days: 4, minutes: 60, seed: 11, exercises: library });
const b = generateProgram({ goal: "Muscle Gain", days: 4, minutes: 60, seed: 11, exercises: library });
const exercisesOf = (p) => p.days.map((d) => d.exercises.map((e) => e.exerciseId).join(",")).join("|");
check("the same answers and seed give the same program", exercisesOf(a) === exercisesOf(b));
const count = (p) => p.days.reduce((s, d) => s + d.exercises.length, 0);
const short = generateProgram({ goal: "Muscle Gain", days: 4, minutes: 30, level: "advanced", seed: 11, exercises: library });
const long = generateProgram({ goal: "Muscle Gain", days: 4, minutes: 90, level: "advanced", seed: 11, exercises: library });
check("a 30-minute session has fewer exercises than a 90-minute one", count(short) < count(long), [count(short), count(long)]);
const focus = generateProgram({ goal: "Muscle Gain", days: 3, minutes: 90, level: "advanced", seed: 11, focus: ["Biceps"], exercises: library });
const bicepsIn = (p) => p.days.flatMap((d) => d.exercises).filter((pe) => classify(findExercise(pe.exerciseId)).pattern === "biceps").length;
check("a focus area gets more work", bicepsIn(focus) > bicepsIn(generateProgram({ goal: "Muscle Gain", days: 3, minutes: 90, level: "advanced", seed: 11, exercises: library })));

// Candidates respect the person.
const kneeSafe = candidates("lunge", { exercises: library, location: "gym", injuries: ["knee"], random: () => 0.5, limit: 50 });
check("with sore knees, no lunge that loads them", kneeSafe.every((x) => !x.c.load.includes("knee")));

/* ── swapping ── */
const bench = bySlug("barbell-bench-press");
const alts = swapExercise(bench, { exercises: library, location: "gym" });
check("a swap offers other ways to do the same movement", alts.length >= 5 && alts.every((e) => classify(e).pattern === "push_h" && e.id !== bench.id), alts.map((e) => e.nameEn));
check("…the same muscle first", (alts[0].muscles || [])[0] === (bench.muscles || [])[0], [alts[0].nameEn, alts[0].muscles]);
const homeAlts = swapExercise(bench, { exercises: library, location: "home" });
check("…and only what can be done where they train", homeAlts.length > 0 && homeAlts.every((e) => fitsEquipment(e, "home")), homeAlts.map((e) => e.nameEn));
const shoulderAlts = swapExercise(bySlug("barbell-standing-military-press") || ex("Barbell Standing Military Press"), { exercises: library, location: "gym", injuries: ["shoulder"] });
check("…and nothing that loads an injured joint", shoulderAlts.every((e) => !classify(e).load.includes("shoulder")));
check("nothing to swap gives nothing", swapExercise(null).length === 0);

/* ── progression ── */
const sets = (list) => list.map(([weight, reps]) => ({ weight, reps, done: true }));
const squat = bySlug("barbell-squat");
const db = bySlug("dumbbell-bench-press");
check("no history: start from the plan", nextTargets({ sets: 3, reps: 8, weight: 40 }, [], bench).reason === "start");
let t = nextTargets({ sets: 3, reps: 8 }, [sets([[60, 8], [60, 8], [60, 9]])], bench);
check("every set at the top: 2.5 kg more on a barbell press, reps start lower", t.reason === "up" && t.weight === 62.5 && t.reps === 6, t);
t = nextTargets({ sets: 3, reps: 5 }, [sets([[100, 5], [100, 5], [100, 5]])], squat);
check("…5 kg more on a squat", t.reason === "up" && t.weight === 105, t);
t = nextTargets({ sets: 3, reps: 10 }, [sets([[20, 10], [20, 10], [20, 10]])], db);
check("…2 kg more on dumbbells", t.reason === "up" && t.weight === 22, t);
t = nextTargets({ sets: 3, reps: 8 }, [sets([[60, 7], [60, 6], [60, 6]])], bench);
check("short of the top: same weight, one more rep", t.reason === "rep" && t.weight === 60 && t.reps === 8, t);
t = nextTargets({ sets: 3, reps: 8 }, [sets([[60, 8], [60, 7], [60, 6]])], bench);
check("the top reached on one set only: hold the weight until every set gets there", t.reason === "hold" && t.weight === 60 && t.reps === 8, t);
t = nextTargets({ sets: 3, reps: 10 }, [sets([[80, 6], [80, 5], [80, 5]]), sets([[80, 7], [80, 6], [80, 5]])], bench);
check("well short twice running: the weight comes down about 10%", t.reason === "down" && t.weight === 72.5 && t.reps === 10, t);
t = nextTargets({ sets: 3, reps: 10 }, [sets([[80, 6], [80, 5], [80, 5]])], bench);
check("…but one bad day is not enough", t.reason !== "down", t);
t = nextTargets({ sets: 3, reps: 12 }, [sets([[0, 10], [0, 9]])], bySlug("push-up"));
check("bodyweight: one more rep", t.reason === "rep" && t.weight === null && t.reps === 11, t);
t = nextTargets({ sets: 3, reps: 8 }, [[{ weight: 60, reps: 8, done: false }]], bench);
check("sets not ticked done don't count", t.reason === "start", t);

// Every fifth week is a light one.
const made = { createdAt: new Date(Date.now() - 4 * 7 * 86400000 - 3600000).toISOString() };
check("week 5 of a program is a light week, weeks 1–4 and 6 aren't",
  programWeek(made) === 5 && isDeloadWeek(5) && isDeloadWeek(10) && ![1, 2, 3, 4, 6].some(isDeloadWeek), programWeek(made));
const light = deloadTarget({ sets: 4, reps: 8 }, nextTargets({ sets: 4, reps: 8 }, [sets([[100, 8], [100, 8], [100, 8], [100, 8]])], squat), squat);
check("a light week: about 60% of the sets at 90% of last time's weight", light.reason === "deload" && light.sets === 2 && light.weight === 90 && light.reps === 8, light);
const lightSession = createSession({ program: { id: "p1" }, day: { id: "d1", exercises: [{ exerciseId: squat.id, sets: 4, reps: 8, restSec: 150 }] }, targets: { [squat.id]: light } });
check("…and the session has only those sets", lightSession.exercises[0].sets.length === 2 && lightSession.exercises[0].sets[0].weight === 90);

// The session starts from the target.
const program = { id: "p1", days: [{ id: "d1", exercises: [{ exerciseId: bench.id, sets: 3, reps: 8, restSec: 120 }] }] };
const session = createSession({ program, day: program.days[0], lastPerf: { [bench.id]: [{ weight: 60, reps: 8 }] }, targets: { [bench.id]: { weight: 62.5, reps: 6, reason: "up" } } });
check("a new session is filled in with the progression's target", session.exercises[0].sets.every((s) => s.weight === 62.5 && s.reps === 6) && session.exercises[0].target?.reason === "up", session.exercises[0]);
const fresh = createSession({ program, day: program.days[0], lastPerf: { [bench.id]: [{ weight: 60, reps: 8 }] }, targets: { [bench.id]: { weight: null, reps: 8, reason: "start" } } });
check("…and from last time when there is no target yet", fresh.exercises[0].sets[0].weight === 60 && !fresh.exercises[0].target);

console.log(`program generator: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
