/**
 * Exercise database. Ids ex1–ex6 are kept from the original plan so the
 * ExerciseGraphic figures still match; everything else matches by name.
 *
 * `mode` decides what the second number in a set means:
 *   reps → repetitions, time → seconds, distance → metres.
 *
 * Every built-in also carries its liftmanual.com slug, muscles and equipment
 * (see liftmanual.js). When public/exercises/catalog.json exists, catalog.js
 * merges it in at start-up: a catalog exercise with a built-in's slug enriches
 * that built-in (steps, media, …) and keeps its id; the rest are added with
 * id = slug. findExercise, searchExercises and allExercises read the merged
 * list synchronously; useExerciseCatalog() re-renders a screen once it lands.
 */

import { findEquipment, findMuscle, lmLabel } from "./liftmanual";

/**
 * What findExercise() returns.
 *
 * @typedef {Object} AppExercise
 * @property {string} id           what programs, sessions and history store
 * @property {string} muscle       coarse group, one of MUSCLES
 * @property {string} nameEn
 * @property {string} nameFa
 * @property {string} equipment    display text ("Dumbbells", "Pull-up Bar")
 * @property {"reps"|"time"|"distance"} mode
 * @property {string} slug         liftmanual slug
 * @property {string[]} muscles    liftmanual muscle slugs, primary first
 * @property {string[]} equipmentSlugs  liftmanual equipment slugs
 * @property {string} type         strength | cardio | stretching
 * The rest arrive with the catalog (see CatalogExercise in liftmanual.js):
 * @property {string[]} [musclesWorked]
 * @property {{en?: string, fa?: string}} [description]
 * @property {{en: string[], fa?: string[]}} [steps]
 * @property {{en: string[], fa?: string[]}} [benefits]
 * @property {string[]} [variations]
 * @property {{gif?: string, webp?: string, mp4?: string, poster?: string}} [media]
 * @property {string} [source]
 */

export const MUSCLES = [
  { id: "legs", en: "Legs", fa: "پا" },
  { id: "back", en: "Back", fa: "پشت و زیربغل" },
  { id: "chest", en: "Chest", fa: "سینه" },
  { id: "shoulders", en: "Shoulders", fa: "سرشانه" },
  { id: "arms", en: "Arms", fa: "بازو" },
  { id: "core", en: "Core", fa: "مرکز بدن" },
  { id: "cardio", en: "Cardio", fa: "هوازی" },
];

const x = (id, muscle, nameEn, nameFa, equipment, mode = "reps") => ({ id, muscle, nameEn, nameFa, equipment, mode });

const BUILT_INS = [
  /* originals — ids preserved for the graphics */
  x("ex1", "legs", "Jump Squat", "اسکات پرشی", "Bodyweight"),
  x("ex2", "back", "Barbell Deadlift", "ددلیفت با هالتر", "Barbell"),
  x("ex3", "cardio", "Power Sled Push", "هل دادن سورتمه قدرتی", "Sled", "distance"),
  x("ex4", "legs", "Barbell Squat", "اسکات پشت با هالتر", "Barbell"),
  x("ex5", "legs", "Smith Leg Press", "پرس پا اسمیت", "Machine"),
  x("ex6", "legs", "Dumbbell Romanian Deadlift", "ددلیفت رومانیایی با دمبل", "Dumbbells"),

  /* legs */
  x("front_squat", "legs", "Front Squat", "اسکات از جلو", "Barbell"),
  x("goblet_squat", "legs", "Goblet Squat", "اسکات گابلت", "Kettlebell"),
  x("bulgarian_split", "legs", "Bulgarian Split Squat", "اسکات اسپلیت بلغاری", "Dumbbells"),
  x("lunge", "legs", "Walking Lunges", "لانژ راه‌رفتنی", "Dumbbells"),
  x("rdl_bar", "legs", "Romanian Deadlift", "ددلیفت رومانیایی", "Barbell"),
  x("sumo_dl", "legs", "Sumo Deadlift", "ددلیفت سومو", "Barbell"),
  x("hip_thrust", "legs", "Hip Thrust", "هیپ تراست", "Barbell"),
  x("leg_curl", "legs", "Leg Curl", "پشت پا دستگاه", "Machine"),
  x("leg_ext", "legs", "Leg Extension", "جلو پا دستگاه", "Machine"),
  x("calf_raise", "legs", "Standing Calf Raise", "ساق پا ایستاده", "Machine"),
  x("box_jump", "legs", "Box Jumps", "پرش روی باکس", "Box"),
  x("cone_hops", "legs", "Lateral Cone Hops", "پرش جانبی روی موانع", "Cones"),
  x("kb_swing", "legs", "Kettlebell Swings", "سوئینگ کتل‌بل", "Kettlebell"),

  /* back */
  x("pullup", "back", "Pull-Ups", "بارفیکس", "Pull-up Bar"),
  x("lat_pulldown", "back", "Lat Pulldown", "زیربغل سیم‌کش", "Cable"),
  x("barbell_row", "back", "Barbell Row", "زیربغل هالتر خم", "Barbell"),
  x("db_row", "back", "Dumbbell Row", "زیربغل دمبل تک", "Dumbbells"),
  x("seated_row", "back", "Seated Cable Row", "زیربغل قایقی", "Cable"),
  x("face_pull", "back", "Face Pull", "فیس پول", "Cable"),
  x("good_morning", "back", "Good Morning", "گود مورنینگ", "Barbell"),

  /* chest */
  x("bench_press", "chest", "Barbell Bench Press", "پرس سینه با هالتر", "Barbell"),
  x("incline_db", "chest", "Incline Dumbbell Press", "پرس بالا سینه دمبل", "Dumbbells"),
  x("db_fly", "chest", "Dumbbell Fly", "قفسه سینه دمبل", "Dumbbells"),
  x("pushup", "chest", "Push-Ups", "شنا سوئدی", "Bodyweight"),
  x("dips", "chest", "Dips", "پارالل", "Dip Bars"),

  /* shoulders */
  x("ohp", "shoulders", "Overhead Shoulder Press", "پرس سرشانه هالتر", "Barbell"),
  x("db_shoulder", "shoulders", "Dumbbell Shoulder Press", "پرس سرشانه دمبل", "Dumbbells"),
  x("lateral_raise", "shoulders", "Lateral Raises", "نشر جانب دمبل", "Dumbbells"),
  x("rear_delt", "shoulders", "Rear Delt Fly", "نشر خم", "Dumbbells"),

  /* arms */
  x("bb_curl", "arms", "Barbell Bicep Curls", "جلو بازو هالتر", "Barbell"),
  x("hammer_curl", "arms", "Hammer Curls", "جلو بازو چکشی", "Dumbbells"),
  x("rope_pushdown", "arms", "Tricep Rope Pushdowns", "پشت بازو طنابی سیم‌کش", "Cable"),
  x("skull_crusher", "arms", "Skull Crushers", "پشت بازو خوابیده هالتر", "Barbell"),

  /* core */
  x("plank", "core", "Plank", "پلانک", "Bodyweight", "time"),
  x("plank_taps", "core", "Plank Shoulder Taps", "پلانک و لمس شانه", "Bodyweight"),
  x("hanging_raise", "core", "Hanging Leg Raises", "بالا کشیدن پا در حالت آویزان", "Pull-up Bar"),
  x("cable_crunch", "core", "Cable Crunch", "کرانچ سیم‌کش", "Cable"),
  x("mb_slam", "core", "Medicine Ball Slams", "کوبیدن مدیسین بال", "Medicine Ball"),
  x("farmer_carry", "core", "Farmer's Carry", "حمل کشاورز", "Dumbbells", "distance"),

  /* cardio */
  x("ladder", "cardio", "Ladder Agility Drills", "تمرین نردبان چابکی", "Agility Ladder", "time"),
  x("burpee", "cardio", "Burpees", "برپی", "Bodyweight"),
  x("rowing", "cardio", "Rowing Machine Intervals", "اینتروال دستگاه روئینگ", "Rower", "distance"),
  x("treadmill", "cardio", "Treadmill Run", "دویدن روی تردمیل", "Treadmill", "time"),
  x("bike", "cardio", "Stationary Bike", "دوچرخه ثابت", "Bike", "time"),
  x("jump_rope", "cardio", "Jump Rope", "طناب زدن", "Rope", "time"),
];

/*
 * liftmanual slug, muscles and equipment of each built-in. Slugs were checked
 * against liftmanual.com where a page exists; lateral-cone-hops and
 * rowing-machine have none, so a catalog can only add those as new entries.
 * Equipment the site has no category for (sled, rower, treadmill, bike,
 * rope) is left empty.
 */
const LIFTMANUAL = {
  ex1: ["jump-squat", "quadriceps glutes", "bodyweight"],
  ex2: ["barbell-deadlift", "glutes hamstrings back", "barbell"],
  ex3: ["power-sled-push", "cardio quadriceps glutes", ""],
  ex4: ["barbell-squat", "quadriceps glutes", "barbell"],
  ex5: ["smith-leg-press", "quadriceps glutes", "smith-machine"],
  ex6: ["dumbbell-romanian-deadlift", "hamstrings glutes", "dumbbell"],
  front_squat: ["barbell-front-squat", "quadriceps glutes", "barbell"],
  goblet_squat: ["kettlebell-goblet-squat", "quadriceps glutes", "kettlebell"],
  bulgarian_split: ["dumbbell-bulgarian-split-squat", "quadriceps glutes", "dumbbell"],
  lunge: ["dumbbell-walking-lunge", "quadriceps glutes", "dumbbell"],
  rdl_bar: ["barbell-romanian-deadlift", "hamstrings glutes", "barbell"],
  sumo_dl: ["barbell-sumo-deadlift", "glutes hamstrings thighs", "barbell"],
  hip_thrust: ["barbell-hip-thrust", "glutes hamstrings", "barbell"],
  leg_curl: ["lever-lying-leg-curl", "hamstrings", "leverage-machine"],
  leg_ext: ["lever-leg-extension", "quadriceps", "leverage-machine"],
  calf_raise: ["lever-standing-calf-raise", "calves", "leverage-machine"],
  box_jump: ["jump-box", "quadriceps glutes calves", "bodyweight"],
  cone_hops: ["lateral-cone-hops", "calves quadriceps", "bodyweight"],
  kb_swing: ["kettlebell-swing", "glutes hamstrings", "kettlebell"],
  pullup: ["pull-up", "latissimus-dorsi biceps", "bodyweight"],
  lat_pulldown: ["cable-wide-grip-lat-pulldown", "latissimus-dorsi biceps", "cable"],
  barbell_row: ["barbell-bent-over-row", "back latissimus-dorsi", "barbell"],
  db_row: ["dumbbell-one-arm-bent-over-row", "back latissimus-dorsi", "dumbbell"],
  seated_row: ["cable-seated-row", "back latissimus-dorsi", "cable"],
  face_pull: ["cable-standing-face-pull", "rear-deltoid traps", "cable"],
  good_morning: ["barbell-good-morning", "hamstrings back", "barbell"],
  bench_press: ["barbell-bench-press", "chest front-deltoid triceps", "barbell"],
  incline_db: ["dumbbell-incline-bench-press", "chest front-deltoid", "dumbbell"],
  db_fly: ["dumbbell-fly", "chest", "dumbbell"],
  pushup: ["push-up", "chest triceps", "bodyweight"],
  dips: ["chest-dip", "chest triceps", "bodyweight"],
  ohp: ["barbell-standing-military-press", "shoulders triceps", "barbell"],
  db_shoulder: ["dumbbell-seated-shoulder-press", "shoulders triceps", "dumbbell"],
  lateral_raise: ["dumbbell-lateral-raise", "side-deltoid", "dumbbell"],
  rear_delt: ["dumbbell-rear-delt-fly", "rear-deltoid", "dumbbell"],
  bb_curl: ["barbell-curl", "biceps", "barbell"],
  hammer_curl: ["dumbbell-hammer-curl", "biceps forearms", "dumbbell"],
  rope_pushdown: ["cable-pushdown", "triceps", "cable"],
  skull_crusher: ["barbell-lying-triceps-extension-skull-crusher", "triceps", "barbell"],
  plank: ["front-plank", "abs", "bodyweight"],
  plank_taps: ["shoulder-tap", "abs shoulders", "bodyweight"],
  hanging_raise: ["hanging-leg-raise", "abs", "bodyweight"],
  cable_crunch: ["cable-kneeling-crunch", "abs", "cable"],
  mb_slam: ["medicine-ball-overhead-slam", "abs shoulders", "medicine-ball"],
  farmer_carry: ["farmers-walk", "forearms traps", "dumbbell"],
  ladder: ["ladder-drill", "cardio", "bodyweight"],
  burpee: ["burpee", "cardio", "bodyweight"],
  rowing: ["rowing-machine", "cardio back", ""],
  treadmill: ["run-on-treadmill", "cardio", ""],
  bike: ["stationary-bike-walk", "cardio", ""],
  jump_rope: ["jump-rope", "cardio", ""],
};

const words = (s) => (s ? s.split(" ") : []);

export const EXERCISES = BUILT_INS.map((e) => {
  const [slug, muscles, gear] = LIFTMANUAL[e.id];
  return { ...e, slug, muscles: words(muscles), equipmentSlugs: words(gear), type: e.muscle === "cardio" ? "cardio" : "strength" };
});

/* ─────────────── the live list: built-ins, plus the catalog once loaded ─────────────── */

let registry = EXERCISES;
let byId = new Map(EXERCISES.map((e) => [e.id, e]));
let bySlug = new Map(EXERCISES.map((e) => [e.slug, e]));
let version = 0;
const listeners = new Set();

/** Every exercise the app knows right now. */
export const allExercises = () => registry;

/** Swaps in a merged list (catalog.js does this once). Listeners run after. */
export function setExerciseRegistry(list) {
  registry = list;
  byId = new Map(list.map((e) => [e.id, e]));
  bySlug = new Map(list.map((e) => [e.slug, e]));
  version += 1;
  for (const fn of [...listeners]) {
    try { fn(); } catch { /* one screen failing to refresh must not stop the rest */ }
  }
}

/** Calls `fn` whenever the list changes; returns the unsubscribe. */
export function subscribeExercises(fn) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Bumps each time the list changes (for useSyncExternalStore). */
export const exercisesVersion = () => version;

export const findExercise = (id) => byId.get(id) || null;

/** The exercise with this liftmanual slug, built-in or from the catalog. */
export const findBySlug = (slug) => bySlug.get(slug) || null;

export const exerciseName = (exOrId, isRtl) => {
  const e = typeof exOrId === "string" ? findExercise(exOrId) : exOrId;
  if (!e) return typeof exOrId === "string" ? exOrId : "";
  return isRtl ? e.nameFa || e.nameEn : e.nameEn;
};

// Names, slug, equipment and muscles in both languages, built once per exercise.
const haystacks = new WeakMap();
function haystack(e) {
  let h = haystacks.get(e);
  if (h === undefined) {
    const labels = (list, find) => (list || []).flatMap((s) => { const x = find(s); return x ? [x.en, x.fa] : []; });
    h = [e.nameEn, e.nameFa, e.equipment, e.slug, ...labels(e.muscles, findMuscle), ...labels(e.equipmentSlugs, findEquipment)]
      .filter(Boolean).join("\n").toLowerCase();
    haystacks.set(e, h);
  }
  return h;
}

/**
 * Exercises matching a search, optionally narrowed to a coarse group
 * (`muscle`, one of MUSCLES), a liftmanual muscle slug (`lmMuscle`) and a
 * liftmanual equipment slug (`equipment`).
 */
export function searchExercises(query, muscle = null, { lmMuscle = null, equipment = null } = {}) {
  const q = String(query || "").trim().toLowerCase();
  return registry.filter((e) => {
    if (muscle && e.muscle !== muscle) return false;
    if (lmMuscle && !(e.muscles || []).includes(lmMuscle)) return false;
    if (equipment && !(e.equipmentSlugs || []).includes(equipment)) return false;
    return !q || haystack(e).includes(q);
  });
}

// Persian for the built-ins' own equipment words the liftmanual list has no entry for.
const EQUIPMENT_FA = {
  Box: "باکس", Cones: "مانع", "Pull-up Bar": "میله بارفیکس", "Dip Bars": "میله پارالل", Sled: "سورتمه",
  "Agility Ladder": "نردبان چابکی", Rower: "دستگاه روئینگ", Treadmill: "تردمیل", Bike: "دوچرخه ثابت", Rope: "طناب",
};

/** The equipment line in the current language. */
export function equipmentLabel(e, isRtl) {
  if (!e) return "";
  if (!isRtl) return e.equipment || (e.equipmentSlugs || []).map((s) => findEquipment(s)?.en).filter(Boolean).join(", ");
  return EQUIPMENT_FA[e.equipment] || (e.equipmentSlugs || []).map((s) => findEquipment(s)?.fa).filter(Boolean).join("، ") || e.equipment || "";
}

/** The primary liftmanual muscles in the current language (at most `max`), else the coarse group. */
export function muscleLabel(e, isRtl, max = 2) {
  if (!e) return "";
  const names = (e.muscles || []).slice(0, max).map((s) => lmLabel(findMuscle(s), isRtl)).filter(Boolean);
  if (names.length) return names.join(isRtl ? "، " : ", ");
  const m = MUSCLES.find((x) => x.id === e.muscle);
  return m ? (isRtl ? m.fa : m.en) : "";
}

/** Label for the second number of a set, by exercise mode. */
export const unitOf = (exercise, t) => {
  if (!exercise) return t.reps;
  if (exercise.mode === "time") return t.seconds;
  if (exercise.mode === "distance") return t.meters;
  return t.reps;
};
