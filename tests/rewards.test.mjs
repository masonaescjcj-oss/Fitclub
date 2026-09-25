// XP from real activity, and the referral code.
// node --import ./tests/register.mjs tests/rewards.test.mjs
import {
  STREAK_BONUSES, XP, bestDailyStreak, computeRewards, perfectChecklistDays, referralCode,
} from "../src/lib/rewards.js";
import { ME, createItem, createList, periodKey } from "../src/lib/checklistModel.js";

let passed = 0;
let failed = 0;
function check(name, cond, got) {
  if (cond) passed += 1;
  else {
    failed += 1;
    console.log(`✗ ${name}${got !== undefined ? ` (got ${JSON.stringify(got)})` : ""}`);
  }
}

const line = (r, id) => r.lines.find((l) => l.id === id);
const done = () => ({ [ME.id]: new Date().toISOString() });

/* ── rules ── */
check("rule values", XP.workout === 20 && XP.record === 50 && XP.checklistDay === 10 && XP.foodDay === 5, XP);
check("streak bonuses at 7/14/30", STREAK_BONUSES.map((b) => b.days).join() === "7,14,30", STREAK_BONUSES);

/* ── nothing logged ── */
{
  const r = computeRewards();
  check("empty activity is zero XP", r.total === 0 && r.lines.every((l) => l.xp === 0 && l.count === 0), r);
  check("lines in a fixed order", r.lines.map((l) => l.id).join() === "workouts,records,checklist,food,streak");
}

/* ── workouts and records ── */
{
  const sessions = [
    { id: "a", finishedAt: "2026-09-20T18:00:00Z", prs: [{ kind: "weight" }, { kind: "e1rm" }, { kind: "first" }] },
    { id: "b", finishedAt: "2026-09-22T18:00:00Z", prs: [] },
    { id: "c", finishedAt: "2026-09-24T18:00:00Z" },
    { id: "draft", finishedAt: null, prs: [{ kind: "weight" }] },
  ];
  const r = computeRewards({ sessions });
  check("+20 per finished workout, drafts excluded", line(r, "workouts").count === 3 && line(r, "workouts").xp === 60, line(r, "workouts"));
  check("+50 per record, a first log is not one", line(r, "records").count === 2 && line(r, "records").xp === 100, line(r, "records"));
  check("total adds up", r.total === 160, r.total);
}

/* ── checklist days ── */
{
  const list = (id, streak, bestStreak, history, items) => {
    const l = createList({ id, reset: { mode: "daily", resetHour: 0 }, streak, bestStreak });
    l.items = items;
    l.history = history;
    return l;
  };
  const habits = list("habits", 2, 9, [
    { key: "daily:2026-09-20", done: 3, total: 3 },
    { key: "daily:2026-09-21", done: 2, total: 3 },
    { key: "daily:2026-09-22", done: 3, total: 3 },
    { key: "daily:2026-09-23", done: 3, total: 3 },
  ], [createItem({ doneBy: done() }), createItem({})]);
  check("perfect days from one list's history", perfectChecklistDays([habits]) === 3, perfectChecklistDays([habits]));

  const squad = list("squad", 0, 3, [
    { key: "daily:2026-09-22", done: 1, total: 2 },
    { key: "daily:2026-09-23", done: 2, total: 2 },
  ], [createItem({})]);
  check("a day counts only when every daily list was finished", perfectChecklistDays([habits, squad]) === 2, perfectChecklistDays([habits, squad]));

  const weekly = createList({ id: "wk", reset: { mode: "weekly", resetHour: 0, weekStart: 6 }, streak: 40, bestStreak: 40 });
  weekly.history = [{ key: "weekly:2026-09-19", done: 0, total: 3 }];
  check("weekly lists do not count as days", perfectChecklistDays([habits, weekly]) === 3 && bestDailyStreak([habits, weekly]) === 9);

  const empty = list("empty", 0, 0, [{ key: "daily:2026-09-20", done: 0, total: 0 }], []);
  check("a day with nothing on the list is not perfect", perfectChecklistDays([empty]) === 0);

  const today = list("today", 0, 0, [], [createItem({ doneBy: done() })]);
  today.periodKey = periodKey(today.reset);
  check("today counts as soon as it is complete", perfectChecklistDays([today]) === 1);
  today.items.push(createItem({}));
  check("and not while something is open", perfectChecklistDays([today]) === 0);

  const r = computeRewards({ lists: [habits] });
  check("+10 per perfect day", line(r, "checklist").count === 3 && line(r, "checklist").xp === 30, line(r, "checklist"));
}

/* ── streak bonuses ── */
{
  const withBest = (best, streak = 0) => {
    const l = createList({ reset: { mode: "daily", resetHour: 0 }, streak, bestStreak: best });
    return computeRewards({ lists: [l] });
  };
  check("under 7: no bonus", line(withBest(6), "streak").xp === 0);
  check("7: +50", line(withBest(7), "streak").xp === 50 && line(withBest(7), "streak").count === 1);
  check("14: +50 +100", line(withBest(14), "streak").xp === 150, line(withBest(14), "streak"));
  check("30: all three", line(withBest(45), "streak").xp === 350 && line(withBest(45), "streak").count === 3);
  check("the live run counts before it is banked", withBest(0, 8).streak.best === 8 && line(withBest(0, 8), "streak").xp === 50);
  check("a broken streak keeps its bonus", line(withBest(21, 0), "streak").xp === 150 && withBest(21, 0).streak.reached.join() === "7,14");
}

/* ── food days ── */
{
  const diaryDays = {
    "2026-09-20": { entries: [{ id: 1 }], water: 0, weight: null },
    "2026-09-21": { entries: [], water: 2000, weight: 75 },
    "2026-09-22": { entries: [{ id: 2 }, { id: 3 }], water: 0, weight: null },
  };
  const r = computeRewards({ diaryDays });
  check("+5 per day with food; water or weight alone do not count", line(r, "food").count === 2 && line(r, "food").xp === 10, line(r, "food"));
}

/* ── everything together ── */
{
  const l = createList({ reset: { mode: "daily", resetHour: 0 }, streak: 14, bestStreak: 21 });
  l.history = [{ key: "daily:2026-09-23", done: 2, total: 2 }];
  const r = computeRewards({
    sessions: [{ finishedAt: "2026-09-20T18:00:00Z", prs: [{ kind: "weight" }] }],
    lists: [l],
    diaryDays: { "2026-09-24": { entries: [{ id: 1 }] } },
  });
  check("total is the sum of the lines", r.total === r.lines.reduce((a, x) => a + x.xp, 0) && r.total === 20 + 50 + 10 + 5 + 150, r.total);
}

/* ── referral code ── */
check("code from the username", referralCode({ username: "fitclub_athlete" }) === "FIT-FITCLUB_ATHLETE", referralCode({ username: "fitclub_athlete" }));
check("an @ and odd characters are dropped", referralCode({ username: " @Sara.J-99 " }) === "FIT-SARAJ99", referralCode({ username: " @Sara.J-99 " }));
check("no username, no code", referralCode({ username: null }) === null && referralCode(null) === null && referralCode({ username: "@" }) === null);

console.log(`rewards: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
