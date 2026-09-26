// Athlete profile + the energy and macro maths the diary measures against.
// Pure functions; the store below is the only part that touches localStorage.

const KEY = "fitclub.profile.v1";

export const GOALS = ["Weight Loss", "Muscle Gain", "Keep Fit", "Max Strength"];
export const DIET_TYPES = ["standard", "high_protein", "vegetarian", "keto"];

/** Defaults mirror the onboarding wizard so the two never disagree. */
export const DEFAULT_PROFILE = {
  name: "Isaac",
  gender: "male",
  age: 26,
  height: 174,      // cm
  weight: 76,       // kg
  goal: "Keep Fit",
  frequency: "3_4", // training days per week
  difficulty: "moderate",
  dietType: "high_protein",
  // How fast to lose or gain: slow | normal | fast (paceFor below).
  pace: "normal",
  // Set once the athlete overrides the calculated numbers by hand.
  customTargets: null,
};

/** Training days per week → activity factor. */
const ACTIVITY = { "2_3": 1.375, "3_4": 1.465, "4_5": 1.55, "5_6": 1.725 };

/** Harder sessions burn more; a small nudge, not a second multiplier. */
const INTENSITY = { light: -0.05, moderate: 0, intense: 0.04, extreme: 0.08 };

export const PACES = ["slow", "normal", "fast"];

/**
 * Kilograms a week, by goal and pace. Losing can go faster than gaining:
 * muscle comes slowly, and a faster surplus is mostly fat.
 */
export const PACE_KG = {
  "Weight Loss": { slow: 0.25, normal: 0.5, fast: 0.75 },
  "Muscle Gain": { slow: 0.125, normal: 0.25, fast: 0.4 },
  "Max Strength": { slow: 0.1, normal: 0.15, fast: 0.25 },
};

/** Energy in a kilogram of body weight change, roughly. */
const KCAL_PER_KG = 7700;

/** The lowest day FitClub prescribes without a clinician: never under these. */
export const KCAL_FLOOR = { female: 1200, male: 1500 };

/** Never under the resting burn, nor the floor above. */
export const kcalFloor = (profile) => Math.max(bmr(profile), KCAL_FLOOR[profile.gender] || KCAL_FLOOR.male);

/**
 * The day's calories for a pace, with the safety limits applied:
 *  - losing: at most 1% of body weight a week, a deficit of at most 25% of
 *    maintenance, and never below the resting burn or the floor above;
 *  - gaining: a surplus of at most 15% of maintenance.
 * Returns the calories and what that pace really is after the limits.
 */
export function paceFor(profile, maintenance) {
  const table = PACE_KG[profile.goal];
  const floor = kcalFloor(profile);
  if (!table) return { kcal: Math.max(maintenance, floor), weeklyKg: 0, capped: false };
  const wanted = table[profile.pace] ?? table.normal;
  let kcal;
  if (profile.goal === "Weight Loss") {
    const kg = Math.min(wanted, (profile.weight || 70) * 0.01);
    const deficit = Math.min((kg * KCAL_PER_KG) / 7, maintenance * 0.25);
    kcal = Math.max(maintenance - deficit, floor);
  } else {
    const surplus = Math.min((wanted * KCAL_PER_KG) / 7, maintenance * 0.15);
    kcal = Math.max(maintenance + surplus, floor);
  }
  const weeklyKg = Math.round(((kcal - maintenance) * 7 / KCAL_PER_KG) * 100) / 100;
  // Capped: the limits gave a slower pace than asked for (a hair of rounding aside).
  const capped = Math.abs(Math.abs(weeklyKg) - wanted) > 0.02;
  return { kcal, weeklyKg, capped };
}

/** Protein in grams per kg of bodyweight. A deficit needs the most. */
const PROTEIN_PER_KG = {
  "Weight Loss": 2.2,
  "Muscle Gain": 1.8,
  "Keep Fit": 1.6,
  "Max Strength": 2.0,
};

/** Mifflin-St Jeor — the resting burn, before any activity. */
export function bmr({ gender, weight, height, age }) {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return Math.round(gender === "female" ? base - 161 : base + 5);
}

/** Total daily energy expenditure: what maintenance looks like. */
export function tdee(profile) {
  const factor = (ACTIVITY[profile.frequency] ?? 1.465) + (INTENSITY[profile.difficulty] ?? 0);
  return Math.round(bmr(profile) * factor);
}

/**
 * Daily targets for one day.
 * `trainingDay` shifts calories around maintenance without changing the weekly
 * total — the pattern RP and Carbon use to fuel sessions and ease off on rest days.
 */
export function targetsFor(profile, { trainingDay = null, estimatedTdee = null } = {}) {
  if (profile.customTargets) {
    const c = profile.customTargets;
    return { ...c, kcal: Math.round(c.kcal), source: "custom" };
  }

  const maintenance = estimatedTdee || tdee(profile);
  // The goal's pace, inside the safety limits (never below the resting burn plus a margin).
  const pace = paceFor(profile, maintenance);
  // The weekly review's correction (weeklyReview.js), still never under the floor.
  const adjust = Math.round(profile.kcalAdjust || 0);
  let kcal = Math.max(pace.kcal + adjust, kcalFloor(profile));

  if (trainingDay === true) kcal *= 1.08;
  else if (trainingDay === false) kcal *= 0.94;

  // Plant proteins come with carbs: past 1.8 g/kg a vegetarian day can't be
  // built from whole foods without overshooting them.
  const perKg = PROTEIN_PER_KG[profile.goal] ?? 1.6;
  const protein = Math.round((profile.dietType === "vegetarian" ? Math.min(perKg, 1.8) : perKg) * profile.weight);

  let fat;
  let carbs;
  if (profile.dietType === "keto") {
    carbs = 30;
    fat = Math.max(Math.round((kcal - protein * 4 - carbs * 4) / 9), Math.round(profile.weight * 0.8));
  } else {
    const fatShare = profile.dietType === "high_protein" ? 0.25 : 0.3;
    fat = Math.max(Math.round((kcal * fatShare) / 9), Math.round(profile.weight * 0.8));
    carbs = Math.max(Math.round((kcal - protein * 4 - fat * 9) / 4), 0);
  }

  return {
    kcal: Math.round(kcal),
    protein,
    carbs,
    fat,
    fiber: Math.round((kcal / 1000) * 14),   // the standard 14 g per 1000 kcal
    water: Math.round(profile.weight * 35),  // ml
    source: estimatedTdee ? "adaptive" : "calculated",
    maintenance: Math.round(maintenance),
    pace: { weeklyKg: pace.weeklyKg, capped: pace.capped },
    adjust,
  };
}

export const proteinPerKg = (grams, weight) => (weight ? grams / weight : 0);

/* ──────────────────────────── storage ──────────────────────────── */

export function loadProfile() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    // Unreadable or disabled storage — fall back to the defaults.
  }
  return { ...DEFAULT_PROFILE };
}

export function saveProfile(profile) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    // Session still works, it just won't persist.
  }
}

/**
 * Copies the onboarding wizard's answers into the stored profile.
 * The wizard's ids were already chosen to match this module's vocabulary,
 * so this is a projection rather than a translation.
 */
export function applyOnboardingToProfile(form) {
  if (!form) return loadProfile();
  const next = {
    ...loadProfile(),
    ...(form.goal ? { goal: form.goal } : {}),
    ...(form.gender ? { gender: form.gender } : {}),
    ...(form.frequency ? { frequency: form.frequency } : {}),
    ...(form.difficulty ? { difficulty: form.difficulty } : {}),
    ...(form.dietType ? { dietType: form.dietType } : {}),
    ...(form.pace ? { pace: form.pace } : {}),
    ...(Number.isFinite(+form.age) ? { age: +form.age } : {}),
    ...(Number.isFinite(+form.height) ? { height: +form.height } : {}),
    ...(Number.isFinite(+form.weight) ? { weight: +form.weight } : {}),
  };
  saveProfile(next);
  return next;
}
