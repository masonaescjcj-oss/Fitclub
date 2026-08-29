// Food diary persistence, keyed by calendar day.

import { findFood, macrosFor } from "./foods";

const KEY = "fitclub.diary.v1";

export const MEALS = [
  { id: "breakfast", en: "Breakfast", fa: "صبحانه", emoji: "🌅" },
  { id: "lunch", en: "Lunch", fa: "ناهار", emoji: "🍽️" },
  { id: "dinner", en: "Dinner", fa: "شام", emoji: "🌙" },
  { id: "snack", en: "Snacks", fa: "میان‌وعده", emoji: "🍏" },
];

export const dayKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const emptyDay = () => ({ entries: [], water: 0, weight: null, trainingDay: null });

/**
 * One logged food. `foodId` points at the database; `custom` carries macros
 * typed in by hand (quick-add), which no database lookup can supply.
 */
export function createEntry({ foodId = null, custom = null, grams = 100, meal = "breakfast" }) {
  return { id: uid(), foodId, custom, grams, meal, at: new Date().toISOString() };
}

/** Resolved macros for an entry, whether it came from the database or quick-add. */
export function entryMacros(entry) {
  if (entry.custom) {
    return {
      kcal: entry.custom.kcal || 0,
      protein: entry.custom.protein || 0,
      carbs: entry.custom.carbs || 0,
      fat: entry.custom.fat || 0,
      fiber: entry.custom.fiber || 0,
      sodium: entry.custom.sodium || 0,
    };
  }
  const food = findFood(entry.foodId);
  if (!food) return { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 };
  return macrosFor(food, entry.grams);
}

const ZERO = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 };

export function sumMacros(entries) {
  return entries.reduce((acc, e) => {
    const m = entryMacros(e);
    return {
      kcal: acc.kcal + m.kcal,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
      fiber: acc.fiber + m.fiber,
      sodium: acc.sodium + m.sodium,
    };
  }, { ...ZERO });
}

export const totalsFor = (day) => sumMacros(day?.entries || []);
export const mealEntries = (day, mealId) => (day?.entries || []).filter((e) => e.meal === mealId);

/* ──────────────────────────── storage ──────────────────────────── */

function normalize(state) {
  const days = {};
  for (const [k, v] of Object.entries(state.days || {})) {
    days[k] = {
      ...emptyDay(),
      ...v,
      entries: (v.entries || []).map((e) => ({ ...createEntry({}), ...e })),
    };
  }
  return {
    days,
    recentFoodIds: state.recentFoodIds || [],
    savedMeals: state.savedMeals || [],
  };
}

export function loadDiary() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {
    // Corrupt or unavailable — start with an empty diary rather than crashing.
  }
  return { days: {}, recentFoodIds: [], savedMeals: [] };
}

export function saveDiary(state) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Quota or private mode; the session still works in memory.
  }
}

/* ──────────────────────── weight trend & TDEE ──────────────────────── */

/**
 * Exponentially smoothed bodyweight. Daily scale readings swing on water and
 * gut content, so the trend — not the raw number — is what a decision rests on.
 */
export function weightTrend(days, alpha = 0.25) {
  const points = Object.entries(days)
    .filter(([, d]) => typeof d.weight === "number")
    .sort(([a], [b]) => (a < b ? -1 : 1));

  let smoothed = null;
  return points.map(([key, d]) => {
    smoothed = smoothed === null ? d.weight : alpha * d.weight + (1 - alpha) * smoothed;
    return { key, raw: d.weight, trend: smoothed };
  });
}

const KCAL_PER_KG = 7700; // energy in roughly a kilo of body mass

/**
 * Least-squares daily weight change, in kg/day, fitted to the raw readings.
 *
 * The smoothed trend above is the right thing to *show* — but it lags the real
 * change by about (1-alpha)/alpha days, so differencing its endpoints would
 * understate a cut and quietly inflate the estimated burn. A regression over
 * the raw points has no such lag while still ignoring day-to-day noise.
 */
function weightSlope(points) {
  if (points.length < 2) return null;
  const t0 = new Date(`${points[0].key}T00:00:00`).getTime();
  const xs = points.map((p) => (new Date(`${p.key}T00:00:00`).getTime() - t0) / 86400000);
  const ys = points.map((p) => p.raw);

  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i += 1) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? null : num / den;
}

/**
 * Expenditure inferred from what was eaten and what the scale did — the idea
 * MacroFactor is built on. Returns null until there is enough data to mean
 * anything: a fortnight of logging beats any formula, a few days beats nothing.
 */
export function estimateTdee(days, { minDays = 7, window = 21 } = {}) {
  const trend = weightTrend(days);
  if (trend.length < 2) return null;

  const recent = trend.slice(-window);
  const first = recent[0];
  const last = recent[recent.length - 1];

  const spanDays = Math.round(
    (new Date(`${last.key}T00:00:00`) - new Date(`${first.key}T00:00:00`)) / 86400000
  );
  if (spanDays < minDays) return null;

  // Only days with real intake logged can inform the average.
  const logged = Object.entries(days)
    .filter(([k, d]) => k >= first.key && k <= last.key && (d.entries || []).length > 0)
    .map(([, d]) => totalsFor(d).kcal);

  if (logged.length < minDays) return null;

  const avgIntake = logged.reduce((a, b) => a + b, 0) / logged.length;
  const dailyChangeKg = weightSlope(recent);
  if (dailyChangeKg === null) return null;

  return {
    tdee: Math.round(avgIntake - dailyChangeKg * KCAL_PER_KG),
    avgIntake: Math.round(avgIntake),
    weeklyChangeKg: +(dailyChangeKg * 7).toFixed(2),
    daysOfData: logged.length,
    spanDays,
  };
}
