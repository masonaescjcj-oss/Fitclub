// The weekly check-in (src/lib/nutrition/weeklyReview.js): when the day's
// calories move, by how much, and why — and when they don't.
import { MAX_STEP, MAX_TOTAL, reviewDue, weeklyReview } from "../src/lib/nutrition/weeklyReview.js";
import { KCAL_FLOOR, bmr, targetsFor } from "../src/lib/nutrition/profile.js";

let pass = 0, fail = 0;
const check = (name, cond, got) => { cond ? pass++ : fail++; if (!cond) console.log("✗", name, got !== undefined ? `(got ${JSON.stringify(got).slice(0, 400)})` : ""); };

const today = "2026-09-26";
const dayKey = (n) => { const d = new Date(`${today}T00:00:00`); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const man = { gender: "male", age: 30, height: 180, weight: 90, goal: "Weight Loss", pace: "normal", frequency: "3_4", difficulty: "moderate", dietType: "standard" };

/** Weigh-ins every `every` days over `span` days, changing `perWeek` kg a week. */
const scale = (perWeek, { span = 20, every = 2, start = 90, eaten = null } = {}) => {
  const days = {};
  for (let n = span; n >= 0; n -= 1) {
    const k = dayKey(n);
    const d = {};
    if (n % every === 0) d.weight = +(start + (perWeek / 7) * (span - n)).toFixed(2);
    if (eaten) d.entries = [{ id: `e${n}`, custom: { kcal: eaten, protein: 150, carbs: 200, fat: 60 }, grams: 100, meal: "lunch" }];
    days[k] = d;
  }
  return days;
};
const planWith = (ate, of) => ({
  week: { start: dayKey(6), days: [0, 1, 2, 3, 4, 5, 6].map((n) => ({ date: dayKey(6 - n), meals: Array.from({ length: 4 }, (_, i) => ({ status: n * 4 + i < ate ? "ate" : n * 4 + i < of ? "skipped" : null })) })) },
});
const good = planWith(24, 28);

let r = weeklyReview({ profile: man, days: scale(-0.5, { every: 7 }), plan: good, today });
check("fewer than three weigh-ins in two weeks: ask for them", r.decision === "need_weights" && r.delta === 0, r);

r = weeklyReview({ profile: man, days: scale(-0.5), plan: good, today });
check("losing at the chosen pace: on track, nothing changes", r.decision === "on_track" && r.delta === 0 && Math.abs(r.weeklyKg + 0.5) < 0.05, r);

r = weeklyReview({ profile: man, days: scale(-0.1), plan: good, today });
check("losing slower than chosen, plan followed: fewer calories", r.decision === "lower" && r.delta < 0 && r.basis === "scale", r);
check("…by about half the gap, at most 200 a week", r.delta === Math.max(-MAX_STEP, Math.round(-(0.4 * 7700) / 7 / 2 / 10) * 10), r.delta);
r = weeklyReview({ profile: man, days: scale(-0.3), plan: good, today });
check("a small gap, a small change", r.decision === "lower" && r.delta === Math.round(-(0.2 * 7700) / 7 / 2 / 10) * 10, r.delta);

r = weeklyReview({ profile: man, days: scale(0.4), plan: good, today });
check("gaining on a cut: at most 200 kcal less in one week", r.decision === "lower" && r.delta === -MAX_STEP, r.delta);

r = weeklyReview({ profile: man, days: scale(-1.3), plan: good, today });
check("losing much faster than chosen: more calories, to keep muscle", r.decision === "raise" && r.delta > 0 && r.delta <= MAX_STEP, r);

r = weeklyReview({ profile: man, days: scale(-0.1), plan: planWith(10, 28), today });
check("under 60% of meals followed: follow the plan first, no change", r.decision === "follow_plan" && r.delta === 0 && r.followed < 0.6, r);

r = weeklyReview({ profile: { ...man, kcalAdjust: 500 }, days: scale(-1.3), plan: good, today });
check("the correction never goes past 600 in all", r.delta === MAX_TOTAL - 500, r.delta);

const small = { gender: "female", age: 30, height: 155, weight: 50, goal: "Weight Loss", pace: "normal", frequency: "2_3", difficulty: "light", dietType: "standard" };
const floor = Math.max(bmr(small), KCAL_FLOOR.female);
r = weeklyReview({ profile: small, days: scale(0, { start: 50 }), plan: good, today });
check("at the safety floor and still not losing: move more, don't eat less", r.decision === "at_floor" && r.delta === 0 && r.kcal <= floor + 60, r);

// Food logged beside the weigh-ins: the measured burn decides.
const measuredDays = scale(-0.5, { eaten: 2600 });
r = weeklyReview({ profile: man, days: measuredDays, plan: null, today });
const current = targetsFor(man).kcal;
check("with food logged, the measured burn decides", r.basis === "measured", r);
// Eating 2,600 and losing 0.5 kg a week means a burn of about 3,150, well above the formula: more food.
check("…and a higher real burn means more food for the same pace", r.decision === "raise" && r.delta === MAX_STEP && current < 2600, [r.decision, r.delta, current]);

// Keeping fit: drifting up means a little less.
r = weeklyReview({ profile: { ...man, goal: "Keep Fit" }, days: scale(0.5), plan: good, today });
check("keeping fit and drifting up: a little less", r.decision === "lower" && r.goalKg === 0, r);

// The correction is applied by the targets, and still never under the floor.
check("targets apply the correction", targetsFor({ ...man, kcalAdjust: -150 }).kcal === targetsFor(man).kcal - 150);
check("…but never below the floor", targetsFor({ ...small, kcalAdjust: -500 }).kcal >= floor - 1);
check("…and say what it is", targetsFor({ ...man, kcalAdjust: 120 }).adjust === 120);

// When it's due.
check("not due in the first week", !reviewDue({ reviews: [], days: { [dayKey(3)]: {} }, today }));
check("due a week after starting", reviewDue({ reviews: [], days: { [dayKey(7)]: {} }, today }));
check("not due again until a week after the last one", !reviewDue({ reviews: [{ date: dayKey(2) }], days: { [dayKey(30)]: {} }, today }) && reviewDue({ reviews: [{ date: dayKey(8) }], today }));
check("a meal plan counts as starting", reviewDue({ reviews: [], plan: { week: { start: dayKey(7) } }, today }));
check("nothing yet: nothing due", !reviewDue({ reviews: [], days: {}, today }));

console.log(`weekly review: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
