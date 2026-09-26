/**
 * The person's meal plan: their planner settings, "always" swap rules, and
 * the current week of planned meals (planEngine.js builds it). Kept in
 * localStorage under fitclub.mealplan.v1 and synced with the account
 * (backend/sync.js).
 *
 * A planned meal carries its own state: `status` is null (not yet), "ate"
 * (logged into the diary exactly as planned) or "skipped"; `logged` holds
 * the diary entry ids a tick created, so un-ticking removes them again.
 */

import { DEFAULT_SETTINGS, generateWithinCap, seedOf } from "./planEngine";

const KEY = "fitclub.mealplan.v1";

export const emptyPlan = () => ({ v: 1, settings: { ...DEFAULT_SETTINGS }, rules: [], week: null });

export function loadMealPlan() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { ...emptyPlan(), ...p, settings: { ...DEFAULT_SETTINGS, ...(p.settings || {}) } };
    }
  } catch {
    // Unreadable or disabled storage: start without a plan.
  }
  return emptyPlan();
}

export function saveMealPlan(plan) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(plan));
  } catch {
    // The plan still works this session; it just won't persist.
  }
}

/**
 * A fresh week from `start` for this profile. `targetFor(date)` gives each
 * day's targets. A new seed every time, so "make a new plan" really does.
 */
export function buildWeek({ plan, profile, targetFor, start, nonce = Date.now() }) {
  const { days, cost, withinCap } = generateWithinCap({
    start,
    targetFor,
    settings: plan.settings,
    dietType: profile.dietType || "standard",
    goal: profile.goal,
    rules: plan.rules,
    seed: seedOf(`${start}:${nonce}`),
  });
  return { start, days, cost, withinCap, builtAt: new Date(nonce).toISOString() };
}

/** The planned day for a date, or null. */
export const planDay = (plan, date) => plan?.week?.days?.find((d) => d.date === date) || null;

/** Whether the week has run out (its last day is before `today`). */
export const weekOver = (plan, today) => {
  const days = plan?.week?.days || [];
  return !days.length || days[days.length - 1].date < today;
};

/** How closely the plan was followed up to `today`: meals eaten as planned ÷ meals due. */
export function adherence(plan, today) {
  let due = 0;
  let ate = 0;
  for (const d of plan?.week?.days || []) {
    if (d.date > today) continue;
    for (const m of d.meals) {
      if (d.date === today && !m.status) continue; // today's meals still ahead aren't missed yet
      due += 1;
      if (m.status === "ate") ate += 1;
    }
  }
  return due ? ate / due : null;
}
