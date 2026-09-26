/**
 * The weekly check-in: what the scale did against the pace the person chose,
 * how closely they followed the plan, and whether the day's calories should
 * move. Pure: the diary, profile, meal plan and workouts come in; a decision
 * with its reason and numbers comes out, for the Fuel card to show and apply.
 *
 * The rules, in order:
 *  1. Fewer than three weigh-ins in the last two weeks: nothing to judge by,
 *     ask for weigh-ins.
 *  2. Under 60% of planned meals followed (and too little logged to know what
 *     was really eaten): the plan hasn't been tried yet, keep the numbers.
 *  3. With a week or more of food logged beside the weigh-ins, the measured
 *     burn (diaryStore.estimateTdee) says what the day should be for the pace.
 *     Without it, the gap between the scale's pace and the chosen one does,
 *     damped by half, since a week of weights is noisy.
 *  4. A change is at most 200 kcal a week and 600 in all, and never takes the
 *     day under the safety floor; stuck at the floor, the advice is to move
 *     more, not eat less.
 *  5. Under 60 kcal of change: on track, nothing to do.
 */

import { estimateTdee, weightSlope } from "./diaryStore";
import { kcalFloor, paceFor, targetsFor } from "./profile";
import { adherence } from "./mealPlanStore";

const DAY_MS = 86400000;
const KCAL_PER_KG = 7700;
export const REVIEW_EVERY_DAYS = 7;
export const MAX_STEP = 200;
export const MAX_TOTAL = 600;

const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const back = (today, n) => { const d = new Date(`${today}T00:00:00`); d.setDate(d.getDate() - n); return key(d); };
const round10 = (v) => Math.round(v / 10) * 10;

/**
 * Whether a check-in is due today: a week after the last one, or a week
 * after the person started (their first diary day or meal plan) when there
 * hasn't been one.
 */
export function reviewDue({ reviews = [], days = {}, plan = null, today }) {
  const last = reviews[reviews.length - 1];
  const since = last?.date || [Object.keys(days).sort()[0], plan?.week?.start].filter(Boolean).sort()[0];
  if (!since) return false;
  return (new Date(`${today}T00:00:00`) - new Date(`${since}T00:00:00`)) / DAY_MS >= REVIEW_EVERY_DAYS;
}

/**
 * The check-in for `today`.
 *
 * @returns {{
 *   date: string,
 *   weighIns: number, weeklyKg: number|null, goalKg: number,
 *   followed: number|null, loggedDays: number, workouts: { done: number, planned: number },
 *   kcal: number, decision: "need_weights"|"follow_plan"|"on_track"|"lower"|"raise"|"at_floor",
 *   delta: number, basis: "measured"|"scale"|null,
 * }}
 */
export function weeklyReview({ profile, days = {}, plan = null, sessions = [], plannedWorkouts = 0, today }) {
  const from14 = back(today, 13);
  const from7 = back(today, 6);
  const weights = Object.entries(days)
    .filter(([k, d]) => k >= from14 && k <= today && typeof d.weight === "number")
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, d]) => ({ key: k, raw: d.weight }));
  // The slope over up to three weeks of weigh-ins: steadier than one week's.
  const from21 = back(today, 20);
  const longer = Object.entries(days)
    .filter(([k, d]) => k >= from21 && k <= today && typeof d.weight === "number")
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, d]) => ({ key: k, raw: d.weight }));
  const slope = longer.length >= 3 ? weightSlope(longer) : null;
  const weeklyKg = slope === null ? null : Math.round(slope * 7 * 100) / 100;

  const loggedDays = Object.entries(days).filter(([k, d]) => k >= from7 && k <= today && (d.entries || []).length > 0).length;
  const followed = plan ? adherence(plan, today) : null;
  const done = sessions.filter((s) => s.finishedAt && s.finishedAt.slice(0, 10) >= from7).length;

  const current = targetsFor({ ...profile, customTargets: null });
  const goalKg = current.pace?.weeklyKg ?? 0;
  const adjust = profile.kcalAdjust || 0;
  const floor = kcalFloor(profile);
  const base = {
    date: today, weighIns: weights.length, weeklyKg, goalKg, followed, loggedDays,
    workouts: { done, planned: plannedWorkouts }, kcal: current.kcal, delta: 0, basis: null,
  };

  if (weights.length < 3 || weeklyKg === null) return { ...base, decision: "need_weights" };

  // Enough logged food to know what was really eaten: the measured burn decides.
  const estimate = estimateTdee(days);
  let wanted = null;
  let basis = null;
  if (estimate && estimate.daysOfData >= 7) {
    wanted = paceFor(profile, estimate.tdee).kcal;
    basis = "measured";
  } else {
    if (followed !== null && followed < 0.6) return { ...base, decision: "follow_plan" };
    // Behind the pace (a cut losing slower, a gain gaining slower) → the gap in kcal, halved.
    const gap = weeklyKg - goalKg;
    wanted = current.kcal - (gap * KCAL_PER_KG) / 7 / 2;
    basis = "scale";
  }

  let delta = round10(wanted - current.kcal);
  delta = Math.max(-MAX_STEP, Math.min(MAX_STEP, delta));
  // The total correction stays within ±600.
  delta = Math.max(-MAX_TOTAL - adjust, Math.min(MAX_TOTAL - adjust, delta));
  // Never under the floor.
  if (current.kcal + delta < floor) delta = Math.min(0, Math.ceil((floor - current.kcal) / 10) * 10);
  if (Math.abs(delta) < 60) {
    // Less was called for but the floor stops it: move more instead of eating less.
    const blocked = wanted < current.kcal - 60 && current.kcal <= floor + 60;
    return { ...base, basis, decision: blocked ? "at_floor" : "on_track" };
  }
  return { ...base, basis, delta, decision: delta < 0 ? "lower" : "raise" };
}
