// Daily activity for the leaderboards (supabase/migrations/0006): what each
// day of the athlete's own log holds, the same things the Wallet counts.
// The server works out the XP from these counts, so they are all it needs.

import { progressOf, ymd } from "./checklistModel";
import { isRecord } from "./notifications";
import { supabase } from "./backend/supabase";

const daily = (lists) => (lists || []).filter((l) => l.reset?.mode === "daily");

/** Local calendar day of an ISO time. */
const dayOf = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? null : ymd(d); };

/**
 * One row per day with something in it, over the last `days` days:
 * { day, workouts, records, checklist, food }.
 */
export function dailyActivity({ sessions = [], lists = [], diaryDays = {} } = {}, days = 60, now = new Date()) {
  const from = new Date(now); from.setHours(0, 0, 0, 0); from.setDate(from.getDate() - (days - 1));
  const first = ymd(from), last = ymd(now);
  const rows = new Map();
  const row = (day) => {
    if (!rows.has(day)) rows.set(day, { day, workouts: 0, records: 0, checklist: false, food: false });
    return rows.get(day);
  };
  const inRange = (day) => day && day >= first && day <= last;

  for (const s of sessions || []) {
    if (!s.finishedAt) continue;
    const day = dayOf(s.finishedAt);
    if (!inRange(day)) continue;
    row(day).workouts += 1;
    row(day).records += (s.prs || []).filter(isRecord).length;
  }

  // A perfect day: every daily list finished (the same rule as the Wallet).
  const byKey = new Map();
  for (const l of daily(lists)) {
    const add = (key, done, total) => {
      const day = String(key || "").split(":")[1];
      if (!inRange(day)) return;
      const cur = byKey.get(day) || { done: 0, total: 0 };
      byKey.set(day, { done: cur.done + (done || 0), total: cur.total + (total || 0) });
    };
    for (const h of l.history || []) add(h.key, h.done, h.total);
    const now = progressOf(l);
    add(l.periodKey, now.done, now.total);
  }
  for (const [day, { done, total }] of byKey) if (total > 0 && done >= total) row(day).checklist = true;

  for (const [day, d] of Object.entries(diaryDays || {})) {
    if (inRange(day) && (d?.entries || []).length > 0) row(day).food = true;
  }

  return [...rows.values()].filter((r) => r.workouts || r.records || r.checklist || r.food).sort((a, b) => (a.day < b.day ? -1 : 1));
}

/**
 * The first day of this week: Saturday in Persian (Iran's week), Monday
 * otherwise. A leaderboard's week runs from it for seven days.
 */
export function weekStart(isRtl, now = new Date()) {
  const start = isRtl ? 6 : 1;
  const d = new Date(now); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() - start + 7) % 7));
  return ymd(d);
}

let lastSent = "";

/** Sends the last 60 days and the current streaks, unless nothing changed since the last send. */
export async function publishActivity(stores, streak, best) {
  if (!supabase) return false;
  const days = dailyActivity(stores);
  const body = JSON.stringify([days, streak, best]);
  if (body === lastSent) return false;
  const { error } = await supabase.rpc("fitclub_publish_activity", { p_days: days, p_streak: streak || 0, p_best: best || 0 });
  if (error) throw error;
  lastSent = body;
  return true;
}

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(`fitclub_${fn}`, args);
  if (error) { const e = new Error(error.message); e.code = /^[a-z_]+$/.test(error.message) ? error.message : "error"; throw e; }
  return data;
}

/** The leaderboards, teams and challenges on the server. */
export const boards = {
  leaderboard: (scope, since) => rpc("leaderboard", { p_scope: scope, p_since: since }),
  teams: (since) => rpc("team_board", { p_since: since }),
  setOnBoard: (on) => rpc("set_on_board", { p_on: !!on }),
  createChallenge: ({ chatId, metric, target, days, title, starts }) =>
    rpc("challenge_create", { p_chat: chatId, p_metric: metric, p_target: target || null, p_days: days, p_title: title || "", p_starts: starts }),
  challenge: (id) => rpc("challenge_board", { p_challenge: id }),
};
