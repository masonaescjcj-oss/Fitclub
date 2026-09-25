// XP from real activity, and the referral code. Pure: the Wallet passes the
// stores in and shows the lines back, so the balance always matches the log.
//
// Every rule reads data that only grows (finished sessions, logged days,
// checklist history, best streaks), so the balance never drops when a
// streak breaks. The one limit: a checklist keeps its last 30 periods of
// history, so perfect days older than that stop counting.

import { progressOf } from "./checklistModel";
import { isRecord } from "./notifications";

export const XP = {
  workout: 20,      // each finished workout
  record: 50,       // each personal record (a heavier top set or a better e1RM)
  checklistDay: 10, // each day every daily checklist item was done
  foodDay: 5,       // each day with food in the diary
};

/** One-off bonuses for the longest daily checklist streak ever reached. */
export const STREAK_BONUSES = [
  { days: 7, xp: 50 },
  { days: 14, xp: 100 },
  { days: 30, xp: 200 },
];

const daily = (lists) => (lists || []).filter((l) => l.reset?.mode === "daily");

/**
 * Calendar days on which every daily list was finished: the "perfect days"
 * of the streak screen, over the whole saved history. The day in progress
 * counts as soon as it is complete.
 */
export function perfectChecklistDays(lists) {
  const byKey = new Map();
  const add = (key, done, total) => {
    if (!key) return;
    const cur = byKey.get(key) || { done: 0, total: 0 };
    byKey.set(key, { done: cur.done + (done || 0), total: cur.total + (total || 0) });
  };
  for (const list of daily(lists)) {
    for (const h of list.history || []) add(h.key, h.done, h.total);
    const now = progressOf(list);
    add(list.periodKey, now.done, now.total);
  }
  let count = 0;
  for (const { done, total } of byKey.values()) if (total > 0 && done >= total) count += 1;
  return count;
}

/** The longest daily checklist run ever, the current one included. */
export const bestDailyStreak = (lists) =>
  daily(lists).reduce((m, l) => Math.max(m, l.bestStreak || 0, l.streak || 0), 0);

/**
 * The balance and where it came from.
 * Returns { total, lines: [{ id, count, per, xp }], streak: { best, reached } }.
 */
export function computeRewards({ sessions = [], lists = [], diaryDays = {} } = {}) {
  const finished = (sessions || []).filter((s) => s.finishedAt);
  const records = finished.reduce((n, s) => n + (s.prs || []).filter(isRecord).length, 0);
  const checklistDays = perfectChecklistDays(lists);
  const foodDays = Object.values(diaryDays || {}).filter((d) => (d?.entries || []).length > 0).length;
  const best = bestDailyStreak(lists);
  const reached = STREAK_BONUSES.filter((b) => best >= b.days);

  const lines = [
    { id: "workouts", count: finished.length, per: XP.workout, xp: finished.length * XP.workout },
    { id: "records", count: records, per: XP.record, xp: records * XP.record },
    { id: "checklist", count: checklistDays, per: XP.checklistDay, xp: checklistDays * XP.checklistDay },
    { id: "food", count: foodDays, per: XP.foodDay, xp: foodDays * XP.foodDay },
    { id: "streak", count: reached.length, per: null, xp: reached.reduce((a, b) => a + b.xp, 0) },
  ];
  return {
    total: lines.reduce((a, l) => a + l.xp, 0),
    lines,
    streak: { best, reached: reached.map((b) => b.days) },
  };
}

/**
 * The athlete's referral code, from their username: `FIT-<USERNAME>`.
 * Null when there is no username to build it from.
 */
export function referralCode(session) {
  const handle = String(session?.username || "").trim().replace(/^@/, "").toUpperCase().replace(/[^A-Z0-9_]/g, "");
  return handle ? `FIT-${handle}` : null;
}
