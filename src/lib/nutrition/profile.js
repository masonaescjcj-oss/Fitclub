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
  // Set once the athlete overrides the calculated numbers by hand.
  customTargets: null,
};

/** Training days per week → activity factor. */
const ACTIVITY = { "2_3": 1.375, "3_4": 1.465, "4_5": 1.55, "5_6": 1.725 };

/** Harder sessions burn more; a small nudge, not a second multiplier. */
const INTENSITY = { light: -0.05, moderate: 0, intense: 0.04, extreme: 0.08 };

/** Calorie shift applied to maintenance, by goal. */
const GOAL_FACTOR = {
  "Weight Loss": -0.2,
  "Muscle Gain": 0.1,
  "Keep Fit": 0,
  "Max Strength": 0.05,
};

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
  let kcal = maintenance * (1 + (GOAL_FACTOR[profile.goal] ?? 0));

  // Never prescribe below the resting burn plus a small margin.
  kcal = Math.max(kcal, bmr(profile) * 1.1);

  if (trainingDay === true) kcal *= 1.08;
  else if (trainingDay === false) kcal *= 0.94;

  const protein = Math.round((PROTEIN_PER_KG[profile.goal] ?? 1.6) * profile.weight);

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
