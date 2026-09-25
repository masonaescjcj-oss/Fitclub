// Daily activity for the leaderboards (src/lib/activity.js): what each day of
// the log holds, counted the way the Wallet counts it.
const { dailyActivity, weekStart } = await import("../src/lib/activity.js");
const { computeRewards } = await import("../src/lib/rewards.js");
const { createList, createItem, ymd } = await import("../src/lib/checklistModel.js");

let pass = 0, fail = 0;
const check = (name, cond, got) => { cond ? pass++ : fail++; if (!cond) console.log("✗", name, got !== undefined ? `(got ${JSON.stringify(got).slice(0, 400)})` : ""); };

const now = new Date(2026, 8, 26, 21, 0); // Sat 26 Sep 2026, 9pm
const at = (daysBack, h = 18) => { const d = new Date(now); d.setDate(d.getDate() - daysBack); d.setHours(h, 0, 0, 0); return d.toISOString(); };
const day = (daysBack) => { const d = new Date(now); d.setDate(d.getDate() - daysBack); return ymd(d); };

const sessions = [
  { finishedAt: at(0), prs: [{ kind: "weight" }, { kind: "reps" }] },
  { finishedAt: at(0, 7), prs: [] },
  { finishedAt: at(2), prs: [{ kind: "e1rm" }] },
  { finishedAt: null, prs: [{ kind: "weight" }] },
  { finishedAt: at(90), prs: [] },
];
const habits = createList({ type: "personal", reset: { mode: "daily", resetHour: 0 } });
habits.items = [createItem({ text: "a", doneBy: { me: at(0) } }), createItem({ text: "b", doneBy: { me: at(0) } })];
habits.periodKey = `daily:${day(0)}`;
habits.history = [{ key: `daily:${day(1)}`, done: 2, total: 2 }, { key: `daily:${day(2)}`, done: 1, total: 2 }];
const weekly = createList({ type: "personal", reset: { mode: "weekly" } });
weekly.items = [createItem({ text: "w" })];
const diaryDays = { [day(0)]: { entries: [{ id: 1 }] }, [day(1)]: { entries: [] }, [day(3)]: { entries: [{ id: 2 }] } };

const rows = dailyActivity({ sessions, lists: [habits, weekly], diaryDays }, 60, now);
const byDay = Object.fromEntries(rows.map((r) => [r.day, r]));
check("today: two workouts, one record, a perfect checklist, food logged", JSON.stringify(byDay[day(0)]) === JSON.stringify({ day: day(0), workouts: 2, records: 1, checklist: true, food: true }), byDay[day(0)]);
check("yesterday: a perfect checklist day from history, an empty diary doesn't count", byDay[day(1)]?.checklist === true && byDay[day(1)].food === false && byDay[day(1)].workouts === 0);
check("two days ago: a workout with a record, the checklist not finished", byDay[day(2)]?.workouts === 1 && byDay[day(2)].records === 1 && byDay[day(2)].checklist === false);
check("unfinished sessions and days outside the window are left out", !rows.some((r) => r.day === day(90)) && rows.reduce((n, r) => n + r.workouts, 0) === 3);
check("days with nothing aren't sent", rows.length === 4 && rows.every((r) => r.workouts || r.records || r.checklist || r.food), rows.map((r) => r.day));
check("in order, oldest first", rows.map((r) => r.day).join() === [day(3), day(2), day(1), day(0)].join());

// The server scores these rows as the Wallet scores the whole log.
const xp = rows.reduce((n, r) => n + 20 * r.workouts + 50 * r.records + 10 * r.checklist + 5 * r.food, 0);
const wallet = computeRewards({ sessions: sessions.filter((s) => s.finishedAt !== at(90)), lists: [habits, weekly], diaryDays });
check("the same XP as the Wallet for the same days", xp === wallet.total - wallet.lines.find((l) => l.id === "streak").xp, [xp, wallet.total]);

check("a Persian week starts on Saturday", weekStart(true, now) === "2026-09-26" && weekStart(true, new Date(2026, 8, 25)) === "2026-09-19");
check("an English week starts on Monday", weekStart(false, now) === "2026-09-21" && weekStart(false, new Date(2026, 8, 21)) === "2026-09-21");

console.log(`activity: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
