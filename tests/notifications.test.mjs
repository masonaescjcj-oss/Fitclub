// App alerts derived from the training, checklist and diary stores.
// node --import ./tests/register.mjs tests/notifications.test.mjs
import {
  appAlerts, formatCountdown, isRecord, loadReadIds, plannedDay, saveReadIds, unreadAppAlerts, withReadState,
  READ_KEY, STREAK_MILESTONES,
} from "../src/lib/notifications.js";
import { createDay, createProgram, createProgramExercise } from "../src/lib/training/programModel.js";
import { ME, createItem, createList, periodKey, ymd } from "../src/lib/checklistModel.js";
import { createEntry, dayKey } from "../src/lib/nutrition/diaryStore.js";
import { DEFAULT_PROFILE } from "../src/lib/nutrition/profile.js";

let passed = 0;
let failed = 0;
function check(name, cond, got) {
  if (cond) passed += 1;
  else {
    failed += 1;
    console.log(`✗ ${name}${got !== undefined ? ` (got ${JSON.stringify(got)})` : ""}`);
  }
}

const at = (d, h, m = 0) => { const x = new Date(d); x.setHours(h, m, 0, 0); return x; };
const shift = (d, days, h) => { const x = new Date(d); x.setDate(x.getDate() + days); if (h !== undefined) x.setHours(h, 0, 0, 0); return x; };
const BASE = new Date(2026, 8, 25);        // a Friday
const EVENING = at(BASE, 20);
const NOON = at(BASE, 12);
const EARLY = at(BASE, 3);
const ids = (alerts) => alerts.map((a) => a.id);
const kinds = (alerts) => alerts.map((a) => a.kind);

/* ── fixtures ── */

const push = createDay({ id: "d-push", title: "Push", titleFa: "پوش", exercises: [
  createProgramExercise({ exerciseId: "bench_press" }), createProgramExercise({ exerciseId: "ohp" }), createProgramExercise({ exerciseId: "dips" }),
] });
const rest = createDay({ id: "d-rest", title: "Rest", titleFa: "استراحت", type: "rest" });
const pull = createDay({ id: "d-pull", title: "Pull", titleFa: "پول", exercises: [createProgramExercise({ exerciseId: "pullup" })] });
const program = createProgram({ id: "p1", name: "Split", days: [push, rest, pull] });

const session = (id, dayId, finishedAt, prs = []) => ({
  id, programId: "p1", dayId, dayTitle: dayId, startedAt: new Date(new Date(finishedAt) - 3600000).toISOString(),
  finishedAt: new Date(finishedAt).toISOString(), durationSec: 3600, exercises: [], prs,
});
const training = (patch = {}) => ({ activeProgram: program, sessions: [], draft: null, ...patch });

const dailyList = (patch = {}, now = EVENING) => {
  const list = createList({ id: "habits", nameEn: "Daily Habits", nameFa: "عادت‌های روزانه", reset: { mode: "daily", resetHour: 0 }, ...patch });
  list.items = patch.items || [createItem({ id: "i1", textEn: "Water" }), createItem({ id: "i2", textEn: "Read", doneBy: { [ME.id]: now.toISOString() } })];
  list.periodKey = periodKey(list.reset, now);
  return list;
};

const onlyTraining = (t, now) => appAlerts({ training: t, now });
const onlyChecklist = (lists, now) => appAlerts({ checklist: { lists }, now });
const nutrition = (days, profile = DEFAULT_PROFILE) => ({ diary: { days }, profile });
const onlyNutrition = (n, now) => appAlerts({ nutrition: n, now }).filter((a) => a.kind !== "weigh-in");

/* ── training: today's session ── */
{
  const a = onlyTraining(training(), NOON);
  check("planned session alert when nothing is done today", a.length === 1 && a[0].id === `today-${ymd(NOON)}`, ids(a));
  check("first planned day is the first workout", a[0].bodyEn.startsWith("Push: 3 exercises"), a[0].bodyEn);
  check("persian body uses persian digits", a[0].bodyFa.includes("۳ حرکت") && !/\d/.test(a[0].bodyFa), a[0].bodyFa);
  check("id is stable across the day", onlyTraining(training(), EVENING)[0].id === a[0].id);
  check("id changes the next day", onlyTraining(training(), shift(NOON, 1))[0].id === `today-${ymd(shift(NOON, 1))}`);
  check("session alert dated this morning", new Date(a[0].at).getHours() === 6, a[0].at);
  check("before the morning it is dated midnight, never the future", new Date(onlyTraining(training(), EARLY)[0].at) <= EARLY);

  const next = plannedDay(training({ sessions: [session("s1", "d-push", shift(NOON, -2))] }));
  check("next day skips rest days", next.day.id === "d-pull", next?.day?.id);
  const wrap = plannedDay(training({ sessions: [session("s1", "d-push", shift(NOON, -3)), session("s2", "d-pull", shift(NOON, -2))] }));
  check("split wraps round", wrap.day.id === "d-push", wrap?.day?.id);
  check("programs + activeProgramId also work", plannedDay({ programs: [program], activeProgramId: "p1", sessions: [] })?.day.id === "d-push");
  check("no program, no alert", onlyTraining({ activeProgram: null, sessions: [] }, NOON).length === 0);

  const trained = onlyTraining(training({ sessions: [session("s1", "d-push", at(BASE, 9))] }), NOON);
  check("no planned alert once a workout is finished today", !kinds(trained).includes("session"), ids(trained));
}

/* ── training: a workout left open ── */
{
  const draft = { id: "dr1", dayTitle: "Push", dayTitleFa: "پوش", startedAt: at(BASE, 10).toISOString(),
    exercises: [{ sets: [{ done: true }, { done: false }] }, { sets: [{ done: true }] }] };
  const a = onlyTraining(training({ draft }), NOON);
  check("stale draft gives a left-open alert", ids(a).join() === "draft-dr1", ids(a));
  check("draft counts done sets", a[0].bodyEn.includes("2 of 3 sets"), a[0].bodyEn);
  check("draft is dated when it started", a[0].at === draft.startedAt);
  const fresh = onlyTraining(training({ draft: { ...draft, startedAt: at(BASE, 11, 30).toISOString() } }), NOON);
  check("a workout in progress is not nagged", fresh.length === 0, ids(fresh));
}

/* ── training: records ── */
{
  const weight = { exerciseId: "bench_press", kind: "weight", value: 65, prev: 62.5 };
  const e1 = { exerciseId: "ohp", kind: "e1rm", value: 52, prev: 50 };
  const first = { exerciseId: "dips", kind: "first", value: 0, prev: 0 };
  check("isRecord: weight and e1rm yes, first log no", isRecord(weight) && isRecord(e1) && !isRecord(first) && !isRecord(null));
  const t = training({ sessions: [
    session("s-new", "d-push", shift(EVENING, -2), [weight, e1, first]),
    session("s-first", "d-pull", shift(EVENING, -1), [first]),
    session("s-old", "d-push", shift(EVENING, -9), [weight]),
  ] });
  const prs = onlyTraining(t, EVENING).filter((a) => a.kind === "pr");
  check("one alert per session with a real record in the last 7 days", ids(prs).join() === "pr-s-new", ids(prs));
  check("record title counts the records", prs[0].titleEn === "2 new personal records", prs[0].titleEn);
  check("record body names the lifts", prs[0].bodyEn.includes("Barbell Bench Press 65 kg") && prs[0].bodyEn.includes("e1RM 52 kg"), prs[0].bodyEn);
  check("persian record body", prs[0].bodyFa.includes("۶۵ کیلو"), prs[0].bodyFa);
}

/* ── checklist: streak milestones ── */
{
  check("milestones are 7/14/30/60/100", STREAK_MILESTONES.join() === "7,14,30,60,100");
  const fourteen = onlyChecklist([dailyList({ streak: 14, bestStreak: 21, items: [] })], EVENING);
  const m = fourteen.find((a) => a.kind === "streak");
  check("14-day streak alert", m && m.id === `streak-14-habits-${ymd(BASE)}`, ids(fourteen));
  check("milestone title", m.titleEn === "14-day streak" && m.titleFa === "استریک ۱۴ روزه", [m.titleEn, m.titleFa]);
  check("milestone body gives the gap to the best", m.bodyEn.includes("7 more to match your best"), m.bodyEn);
  check("reached at the reset that made it", new Date(m.at).getTime() === at(BASE, 0).getTime(), m.at);

  // Two days later the same run is at 16: the 14 alert keeps its id.
  const later = shift(EVENING, 2);
  const sixteen = onlyChecklist([dailyList({ streak: 16, bestStreak: 21, items: [] }, later)], later).find((a) => a.kind === "streak");
  check("same run, same milestone id", sixteen && sixteen.id === m.id, sixteen?.id);
  check("body says where the run is now", sixteen.bodyEn.includes("Now at 16"), sixteen.bodyEn);

  const thirty = onlyChecklist([dailyList({ streak: 33, bestStreak: 33, items: [] })], EVENING).filter((a) => a.kind === "streak");
  check("only the highest milestone reached shows", thirty.length === 1 && thirty[0].id.startsWith("streak-30-"), ids(thirty));
  check("no milestone under 7", onlyChecklist([dailyList({ streak: 6, items: [] })], EVENING).filter((a) => a.kind === "streak").length === 0);

  const weekly = createList({ id: "wk", nameEn: "Weekly Goals", reset: { mode: "weekly", resetHour: 0, weekStart: 6 }, streak: 7 });
  weekly.periodKey = periodKey(weekly.reset, NOON);
  const w = onlyChecklist([weekly], NOON).find((a) => a.kind === "streak");
  check("weekly lists count in weeks", w && w.titleEn === "7-week streak" && w.titleFa === "استریک ۷ هفته‌ای", w && [w.titleEn, w.titleFa]);
  const archived = onlyChecklist([dailyList({ streak: 14, archived: true })], EVENING);
  check("archived lists stay quiet", archived.length === 0, ids(archived));
}

/* ── checklist: at risk and countdown ── */
{
  const risk = onlyChecklist([dailyList({ streak: 5 })], EVENING).find((a) => a.kind === "streak-risk");
  check("open items late in the day put the streak at risk", risk && risk.id === `risk-habits-${ymd(BASE)}`, risk?.id);
  check("risk body has the countdown", risk.bodyEn.includes("resets in 4 h") && risk.bodyEn.includes("1 of 2 done"), risk.bodyEn);
  check("risk dated when the late window opened", new Date(risk.at).getHours() === 18, risk.at);
  check("same id later that evening", onlyChecklist([dailyList({ streak: 5 })], at(BASE, 23)).find((a) => a.kind === "streak-risk")?.id === risk.id);
  check("not at noon", onlyChecklist([dailyList({ streak: 5 })], NOON).filter((a) => a.kind === "streak-risk").length === 0);
  const allDone = dailyList({ streak: 5, items: [createItem({ doneBy: { [ME.id]: EVENING.toISOString() } })] });
  check("not when everything is done", onlyChecklist([allDone], EVENING).filter((a) => a.kind !== "streak").length === 0);
  const reset = onlyChecklist([dailyList({ streak: 0 })], EVENING);
  check("no streak: a plain reset countdown instead", kinds(reset).join() === "reset" && reset[0].id === `reset-habits-${ymd(BASE)}`, ids(reset));
  check("countdown body", reset[0].bodyEn === "Resets in 4 h. 1 of 2 done.", reset[0].bodyEn);
  const late4 = createList({ id: "sq", nameEn: "Squad", reset: { mode: "daily", resetHour: 4 }, streak: 3 });
  late4.items = [createItem({})];
  late4.periodKey = periodKey(late4.reset, EVENING);
  check("a 04:00 reset is not late at 20:00", onlyChecklist([late4], EVENING).length === 0);
  const weekly = createList({ id: "wk", nameEn: "Weekly Goals", reset: { mode: "weekly", resetHour: 0, weekStart: 6 }, streak: 2 });
  weekly.items = [createItem({})];
  weekly.periodKey = periodKey(weekly.reset, NOON);
  const wk = onlyChecklist([weekly], NOON);
  check("weekly lists warn within a day of the reset", kinds(wk).join() === "streak-risk" && wk[0].bodyEn.includes("12 h"), wk.map((a) => a.bodyEn));
}

/* ── countdown text ── */
check("countdown minutes", formatCountdown(25 * 60000).en === "25 min" && formatCountdown(25 * 60000).fa === "۲۵ دقیقه");
check("countdown hours and minutes", formatCountdown((3 * 60 + 20) * 60000).en === "3 h 20 min", formatCountdown((3 * 60 + 20) * 60000));
check("countdown days", formatCountdown(26 * 3600000).en === "1 d 2 h");

/* ── nutrition ── */
{
  const today = dayKey(BASE);
  const food = (protein) => createEntry({ custom: { kcal: protein * 4, protein }, meal: "lunch" });
  const low = nutrition({ [today]: { entries: [food(40)], water: 600, weight: null, trainingDay: null } });
  const a = onlyNutrition(low, EVENING);
  check("low protein and water in the evening", kinds(a).sort().join() === "protein,water", ids(a));
  const protein = a.find((x) => x.kind === "protein");
  check("protein id is per day", protein.id === `protein-${today}`);
  check("protein body uses the target", protein.bodyEn === "40 of 122 g so far. 82 g to go today.", protein.bodyEn);
  const water = a.find((x) => x.kind === "water");
  check("water body in litres", water.bodyEn === "0.6 of 2.7 L so far today.", water.bodyEn);
  check("nothing at noon", onlyNutrition(low, NOON).length === 0, ids(onlyNutrition(low, NOON)));
  const enough = nutrition({ [today]: { entries: [food(100)], water: 2000, weight: null, trainingDay: null } });
  check("nothing when on track", onlyNutrition(enough, EVENING).length === 0, ids(onlyNutrition(enough, EVENING)));
  check("no nags for someone who does not use the diary", onlyNutrition(nutrition({}), EVENING).length === 0);
  const lastWeek = nutrition({ [dayKey(shift(BASE, -3))]: { entries: [food(90)], water: 2500, weight: null, trainingDay: null } });
  check("a recent diary user still gets today's nudges", kinds(onlyNutrition(lastWeek, EVENING)).sort().join() === "protein,water");
  const custom = nutrition({ [today]: { entries: [food(40)], water: 0, weight: null, trainingDay: null } }, { ...DEFAULT_PROFILE, customTargets: { kcal: 2000, protein: 60, carbs: 200, fat: 60, water: 2000 } });
  check("custom protein target respected", onlyNutrition(custom, EVENING).filter((x) => x.kind === "protein").length === 0);
}

/* ── weigh-in ── */
{
  const weighIn = (days, now = NOON) => appAlerts({ nutrition: nutrition(days), now }).filter((a) => a.kind === "weigh-in");
  const none = weighIn({});
  check("never weighed in: a reminder", ids(none).join() === "weigh-none", ids(none));
  const oldKey = dayKey(shift(BASE, -8));
  const old = weighIn({ [oldKey]: { entries: [], water: 0, weight: 76, trainingDay: null } });
  check("a week-old weigh-in: a reminder keyed to it", ids(old).join() === `weigh-${oldKey}`, ids(old));
  check("says how long ago", old[0].bodyEn.includes("8 days ago") && old[0].bodyFa.includes("۸ روز"), old[0].bodyEn);
  check("dated when it fell due", ymd(new Date(old[0].at)) === ymd(shift(BASE, -1)), old[0].at);
  check("a recent weigh-in: nothing", weighIn({ [dayKey(shift(BASE, -3))]: { entries: [], water: 0, weight: 75, trainingDay: null } }).length === 0);
}

/* ── the feed and read state ── */
{
  const all = appAlerts({
    training: training({ sessions: [session("s-new", "d-push", shift(EVENING, -2), [{ exerciseId: "bench_press", kind: "weight", value: 65, prev: 60 }])] }),
    checklist: { lists: [dailyList({ streak: 14, bestStreak: 14 })] },
    nutrition: nutrition({}),
    now: EVENING,
  });
  check("feed mixes all three sources", new Set(all.map((a) => a.source)).size === 3, all.map((a) => a.source));
  check("ids are unique", new Set(ids(all)).size === all.length, ids(all));
  check("newest first", all.every((a, i) => i === 0 || all[i - 1].at >= a.at), all.map((a) => a.at));
  check("nothing dated in the future", all.every((a) => new Date(a.at) <= EVENING));
  check("every alert is complete", all.every((a) => a.id && a.kind && a.icon && a.tone && a.titleEn && a.titleFa && a.bodyEn && a.bodyFa
    && /^\d{4}-\d\d-\d\dT/.test(a.at)), all.find((a) => !(a.titleFa && a.bodyFa)));
  check("persian text has no latin digits", all.every((a) => !/[0-9]/.test(a.titleFa + a.bodyFa)), all.map((a) => a.bodyFa));
  check("same inputs, same ids", ids(all).join() === ids(appAlerts({
    training: training({ sessions: [session("s-new", "d-push", shift(EVENING, -2), [{ exerciseId: "bench_press", kind: "weight", value: 65, prev: 60 }])] }),
    checklist: { lists: [dailyList({ streak: 14, bestStreak: 14 })] }, nutrition: nutrition({}), now: EVENING,
  })).join());

  check("unread counts every alert when nothing is read", unreadAppAlerts(all, new Set()) === all.length);
  check("read ids are subtracted", unreadAppAlerts(all, [all[0].id, "stale-id"]) === all.length - 1);
  const marked = withReadState(all, new Set([all[1].id]));
  check("withReadState flags read alerts", marked[1].read === true && marked[0].read === false);
  check("empty feed, zero unread", unreadAppAlerts([], []) === 0 && appAlerts().length === 0);
}

/* ── read storage ── */
{
  check("no storage: an empty set, no throw", loadReadIds() instanceof Set && loadReadIds().size === 0);
  saveReadIds(new Set(["x"])); // must not throw without window
  const store = {};
  globalThis.window = { localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } } };
  saveReadIds(new Set(["today-2026-09-25", "pr-s1"]));
  check("read ids go to fitclub.inbox.read", JSON.parse(store[READ_KEY]).join() === "today-2026-09-25,pr-s1" && READ_KEY === "fitclub.inbox.read");
  check("and come back", [...loadReadIds()].join() === "today-2026-09-25,pr-s1");
  check("unread defaults to the stored read ids", unreadAppAlerts([{ id: "pr-s1" }, { id: "x" }]) === 1);
  saveReadIds(Array.from({ length: 400 }, (_, i) => `id-${i}`));
  const kept = [...loadReadIds()];
  check("storage keeps the newest few hundred", kept.length === 300 && kept[kept.length - 1] === "id-399", kept.length);
  store[READ_KEY] = "{broken";
  check("corrupt storage reads as empty", loadReadIds().size === 0);
  delete globalThis.window;
}

console.log(`notifications: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
