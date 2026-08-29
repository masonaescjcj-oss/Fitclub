// Data model + recurrence engine for the checklist feature.
// Pure functions only: no React, no storage. Everything here is testable in isolation.

const DAY_MS = 86400000;

export const uid = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** The signed-in athlete. Group lists always contain this member. */
export const ME = { id: "me", name: "Isaac", avatar: "🏋️", color: "#844783" };

export const RESET_MODES = ["none", "daily", "weekly", "monthly", "interval"];

export const PRIORITIES = ["none", "low", "medium", "high"];

export const LIST_COLORS = [
  "#844783", "#e0567d", "#f59e0b", "#10b981",
  "#38bdf8", "#8b5cf6", "#f43f5e", "#64748b",
];

/** Picks the right language for seeded content, or the user's own text verbatim. */
export function localized(obj, isRtl, base = "name") {
  if (!obj) return "";
  if (obj[base]) return obj[base];
  const fa = obj[`${base}Fa`];
  const en = obj[`${base}En`];
  return isRtl ? fa || en || "" : en || fa || "";
}

/* ────────────────────────── recurrence engine ────────────────────────── */

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

/**
 * The moment the current *day* started. With resetHour = 4, anything before
 * 04:00 still belongs to yesterday — so a late-night check-in counts for the
 * day the athlete thinks it is.
 */
function dayAnchor(date, resetHour) {
  const a = new Date(date);
  a.setHours(resetHour, 0, 0, 0);
  if (date.getTime() < a.getTime()) a.setDate(a.getDate() - 1);
  return a;
}

/** Start of the reset period containing `date`, or null when the list never resets. */
export function periodStart(rule, date = new Date()) {
  if (!rule || rule.mode === "none") return null;
  const hour = rule.resetHour ?? 0;
  const a = dayAnchor(date, hour);

  switch (rule.mode) {
    case "daily":
      return a;

    case "weekly": {
      const weekStart = rule.weekStart ?? 6; // 0 = Sunday … 6 = Saturday
      const back = (a.getDay() - weekStart + 7) % 7;
      const s = new Date(a);
      s.setDate(a.getDate() - back);
      return s;
    }

    case "monthly": {
      const day = Math.min(Math.max(rule.monthDay ?? 1, 1), 28);
      let y = a.getFullYear();
      let m = a.getMonth();
      if (a.getDate() < day) {
        m -= 1;
        if (m < 0) { m = 11; y -= 1; }
      }
      const s = new Date(y, m, day);
      s.setHours(hour, 0, 0, 0);
      return s;
    }

    case "interval": {
      const n = Math.max(rule.every ?? 2, 1);
      const anchor = dayAnchor(new Date(rule.anchor ?? a.getTime()), hour);
      // Local midnights are 23h or 25h apart across a DST switch, so round.
      const days = Math.round((a.getTime() - anchor.getTime()) / DAY_MS);
      const s = new Date(anchor);
      s.setDate(anchor.getDate() + Math.floor(days / n) * n);
      return s;
    }

    default:
      return null;
  }
}

/** Stable id for the period containing `date`. Lists reset when this changes. */
export function periodKey(rule, date = new Date()) {
  const s = periodStart(rule, date);
  return s ? `${rule.mode}:${ymd(s)}` : "static";
}

/** When the current period rolls over, or null for lists that never reset. */
export function periodEnd(rule, date = new Date()) {
  const s = periodStart(rule, date);
  if (!s) return null;
  const e = new Date(s);
  switch (rule.mode) {
    case "daily": e.setDate(e.getDate() + 1); break;
    case "weekly": e.setDate(e.getDate() + 7); break;
    case "monthly": e.setMonth(e.getMonth() + 1); break;
    case "interval": e.setDate(e.getDate() + Math.max(rule.every ?? 2, 1)); break;
    default: return null;
  }
  return e;
}

/* ──────────────────────────── completion ──────────────────────────── */

/** Members expected to tick an item. An empty assignee list means everyone. */
export function assigneesOf(item, list) {
  const ids = (list.members || []).map((m) => m.id);
  if (list.type !== "group") return [ME.id];
  const picked = (item.assignees || []).filter((id) => ids.includes(id));
  return picked.length ? picked : ids;
}

export function itemDone(item, list) {
  const doneBy = item.doneBy || {};
  if (list.type !== "group") return !!doneBy[ME.id];

  const assignees = assigneesOf(item, list);
  if (!assignees.length) return false;
  const ticked = assignees.filter((id) => doneBy[id]);
  return list.groupRule === "everyone"
    ? ticked.length === assignees.length
    : ticked.length > 0;
}

export function progressOf(list) {
  const items = list.items || [];
  const done = items.filter((i) => itemDone(i, list)).length;
  return { done, total: items.length, ratio: items.length ? done / items.length : 0 };
}

/* ──────────────────────────── factories ──────────────────────────── */

export function createItem(patch = {}) {
  return {
    id: uid(),
    text: "",
    note: "",
    priority: "none",
    due: null,
    assignees: [],
    doneBy: {},
    createdAt: new Date().toISOString(),
    ...patch,
  };
}

export function createList(patch = {}) {
  const reset = { mode: "daily", resetHour: 0, weekStart: 6, monthDay: 1, every: 2, anchor: Date.now(), ...(patch.reset || {}) };
  return {
    id: uid(),
    name: "",
    emoji: "✅",
    color: LIST_COLORS[0],
    type: "personal",
    groupRule: "everyone",
    members: [ME],
    items: [],
    streak: 0,
    bestStreak: 0,
    history: [],
    archived: false,
    createdAt: new Date().toISOString(),
    ...patch,
    reset,
    periodKey: periodKey(reset),
  };
}

/* ──────────────────────────── reset pass ──────────────────────────── */

/**
 * Rolls a list forward if its period elapsed: clears every tick, files the
 * finished period into history, and moves the streak.
 * A skipped period breaks the streak even if the last one was perfect.
 */
export function applyReset(list, now = new Date()) {
  const rule = list.reset;
  if (!rule || rule.mode === "none") return list;

  const key = periodKey(rule, now);
  if (key === list.periodKey) return list;

  const { done, total } = progressOf(list);
  const wasPerfect = total > 0 && done === total;

  const curStart = periodStart(rule, now);
  const prevKey = periodKey(rule, new Date(curStart.getTime() - 1));
  const contiguous = list.periodKey === prevKey;

  return {
    ...list,
    items: (list.items || []).map((i) => ({ ...i, doneBy: {} })),
    periodKey: key,
    lastResetAt: now.toISOString(),
    streak: wasPerfect ? (contiguous ? (list.streak || 0) + 1 : 1) : 0,
    bestStreak: Math.max(list.bestStreak || 0, wasPerfect ? (contiguous ? (list.streak || 0) + 1 : 1) : 0),
    history: [...(list.history || []), { key: list.periodKey, done, total }].slice(-30),
  };
}

export const applyResets = (lists, now = new Date()) =>
  lists.map((l) => applyReset(l, now));
