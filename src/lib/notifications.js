// App alerts for the inbox and the Today bell, derived from the real stores:
// training, checklists and the food diary. Nothing here is stored except
// which alerts were read, so every id is built from the data it describes
// and stays the same while that data does (`today-2026-09-25`,
// `pr-<sessionId>`, …). A read mark then sticks, and a new event gets a new id.
//
// Pure functions apart from the two read-state helpers at the bottom, which
// only touch localStorage and fail quietly without it.

import { dateOfPeriodKey, localized, periodEnd, periodStart, progressOf, ymd } from "./checklistModel";
import { exerciseName } from "./training/exercises";
import { dayKey, emptyDay, totalsFor } from "./nutrition/diaryStore";
import { targetsFor } from "./nutrition/profile";

const HOUR = 3600000;
const DAY = 24 * HOUR;

/** Streak lengths that earn an alert. */
export const STREAK_MILESTONES = [7, 14, 30, 60, 100];

/** When the day's reminders switch on, as local hours. */
export const TIMES = {
  morning: 6,   // today's session
  water: 17,    // water well under target
  protein: 18,  // protein far under target
};

/** How close to a reset an unfinished list starts to warn. */
const LATE_WINDOW = { daily: 6 * HOUR, other: 24 * HOUR };

/** A workout open this long is "left open", not "in progress". */
const DRAFT_STALE = HOUR;

const PR_DAYS = 7;
const WEIGH_IN_DAYS = 7;
const PROTEIN_SHARE = 0.6; // "far below" = under 60 % of target
const WATER_SHARE = 0.5;

/* ────────────────────────────── helpers ────────────────────────────── */

const fa = (v) => String(v).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);

const atHour = (now, hour) => {
  const d = new Date(now);
  d.setHours(hour, 0, 0, 0);
  return d;
};

const startOfDay = (now) => atHour(now, 0);

/** "3 h 20 min" / "۳ ساعت و ۲۰ دقیقه", rounded up to the minute. */
export function formatCountdown(ms) {
  const mins = Math.max(Math.ceil(ms / 60000), 1);
  if (mins < 60) return { en: `${mins} min`, fa: `${fa(mins)} دقیقه` };
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  if (hours < 24) {
    return rest
      ? { en: `${hours} h ${rest} min`, fa: `${fa(hours)} ساعت و ${fa(rest)} دقیقه` }
      : { en: `${hours} h`, fa: `${fa(hours)} ساعت` };
  }
  const days = Math.floor(hours / 24);
  const h = hours % 24;
  return h
    ? { en: `${days} d ${h} h`, fa: `${fa(days)} روز و ${fa(h)} ساعت` }
    : { en: `${days} d`, fa: `${fa(days)} روز` };
}

// `adj` is the Persian adjective form: "استریک ۱۴ روزه", "استریک ۳ هفته‌ای".
const UNITS = {
  daily: { en: ["day", "days"], fa: "روز", adj: "روزه" },
  weekly: { en: ["week", "weeks"], fa: "هفته", adj: "هفته‌ای" },
  monthly: { en: ["month", "months"], fa: "ماه", adj: "ماهه" },
  interval: { en: ["round", "rounds"], fa: "دوره", adj: "دوره‌ای" },
};
const unitOf = (mode) => UNITS[mode] || UNITS.daily;
const enUnit = (mode, n) => unitOf(mode).en[n === 1 ? 0 : 1];

const listName = (list) => ({ en: localized(list, false) || "Checklist", fa: localized(list, true) || "چک‌لیست" });

function makeAlert(fields) {
  const { id, kind, source, icon, tone, at, titleEn, titleFa, bodyEn, bodyFa } = fields;
  return { id, kind, source, icon, tone, at: new Date(at).toISOString(), titleEn, titleFa, bodyEn, bodyFa };
}

/* ────────────────────────────── training ────────────────────────────── */

/**
 * The workout day due next in the active program: the one after the last
 * finished session, wrapping round the split. Same rule as the Today card.
 */
export function plannedDay(training) {
  const program = training?.activeProgram
    || (training?.programs || []).find((p) => p.id === training?.activeProgramId)
    || null;
  if (!program) return null;
  const workouts = (program.days || []).filter((d) => d.type !== "rest" && (d.exercises || []).length);
  if (!workouts.length) return null;
  const finished = (training.sessions || [])
    .filter((s) => s.finishedAt && s.programId === program.id)
    .sort((a, b) => a.finishedAt.localeCompare(b.finishedAt));
  const last = finished[finished.length - 1];
  const lastIndex = last ? workouts.findIndex((d) => d.id === last.dayId) : -1;
  return { program, day: workouts[(lastIndex + 1) % workouts.length] };
}

/** Records that beat an earlier best. A first-ever log of a lift is not one. */
export const isRecord = (pr) => !!pr && (pr.kind === "weight" || pr.kind === "e1rm");

function trainingAlerts(training, now) {
  const out = [];
  if (!training) return out;
  const sessions = training.sessions || [];
  const today = ymd(now);

  const draft = training.draft;
  if (draft && now - new Date(draft.startedAt) >= DRAFT_STALE) {
    const sets = (draft.exercises || []).flatMap((e) => e.sets || []);
    const done = sets.filter((s) => s.done).length;
    const title = { en: draft.dayTitle || "Your workout", fa: draft.dayTitleFa || draft.dayTitle || "تمرینت" };
    out.push(makeAlert({
      id: `draft-${draft.id}`, kind: "draft", source: "training", icon: "play", tone: "inv", at: draft.startedAt,
      titleEn: "Workout left open", titleFa: "تمرین نیمه‌کاره مانده",
      bodyEn: `${title.en}: ${done} of ${sets.length} sets done. Finish it or discard it in Train.`,
      bodyFa: `${title.fa}: ${fa(done)} از ${fa(sets.length)} ست انجام شده. در بخش تمرین تمامش کن یا کنارش بگذار.`,
    }));
  }

  const trainedToday = sessions.some((s) => s.finishedAt && ymd(new Date(s.finishedAt)) === today);
  const plan = !draft && !trainedToday ? plannedDay(training) : null;
  if (plan) {
    const { day } = plan;
    const count = day.exercises.length;
    const minutes = count * 8; // the Today card's estimate
    const morning = atHour(now, TIMES.morning);
    out.push(makeAlert({
      id: `today-${today}`, kind: "session", source: "training", icon: "dumbbell", tone: "sunk",
      at: now < morning ? startOfDay(now) : morning,
      titleEn: "Today's workout is waiting", titleFa: "تمرین امروز منتظر توست",
      bodyEn: `${day.title}: ${count} exercises, about ${minutes} min.`,
      bodyFa: `${day.titleFa || day.title}: ${fa(count)} حرکت، حدود ${fa(minutes)} دقیقه.`,
    }));
  }

  for (const s of sessions) {
    if (!s.finishedAt || now - new Date(s.finishedAt) > PR_DAYS * DAY) continue;
    const records = (s.prs || []).filter(isRecord);
    if (!records.length) continue;
    const line = (isRtl) => records.slice(0, 3).map((pr) => {
      const name = exerciseName(pr.exerciseId, isRtl);
      const value = isRtl ? `${fa(pr.value)} کیلو` : `${pr.value} kg`;
      const e1 = pr.kind === "e1rm" ? (isRtl ? " (تخمین 1RM)" : " e1RM") : "";
      return `${name}${e1} ${value}`;
    }).join(isRtl ? "، " : ", ");
    const more = records.length - 3;
    out.push(makeAlert({
      id: `pr-${s.id}`, kind: "pr", source: "training", icon: "trophy", tone: "accent", at: s.finishedAt,
      titleEn: records.length === 1 ? "New personal record" : `${records.length} new personal records`,
      titleFa: records.length === 1 ? "رکورد شخصی جدید" : `${fa(records.length)} رکورد شخصی جدید`,
      bodyEn: `${line(false)}${more > 0 ? ` and ${more} more` : ""}.`,
      bodyFa: `${line(true)}${more > 0 ? ` و ${fa(more)} مورد دیگر` : ""}.`,
    }));
  }
  return out;
}

/* ────────────────────────────── checklists ────────────────────────────── */

/** The start of the period `back` periods before the one a list is in. */
function periodsBack(list, back) {
  const rule = list.reset;
  const base = dateOfPeriodKey(list.periodKey);
  if (!base) return null;
  base.setHours(rule.resetHour ?? 0, 0, 0, 0);
  let cursor = periodStart(rule, base);
  for (let i = 0; i < back && cursor; i += 1) cursor = periodStart(rule, new Date(cursor.getTime() - 1));
  return cursor;
}

function checklistAlerts(checklist, now) {
  const out = [];
  for (const list of checklist?.lists || []) {
    if (list.archived || !list.reset || list.reset.mode === "none") continue;
    const mode = list.reset.mode;
    const name = listName(list);
    const streak = list.streak || 0;

    // The highest milestone this run has passed. The id carries the day it
    // was reached, so a later run to the same length is news again.
    const milestone = [...STREAK_MILESTONES].reverse().find((m) => streak >= m);
    if (milestone) {
      const reached = periodsBack(list, streak - milestone);
      if (reached) {
        const best = Math.max(list.bestStreak || 0, streak);
        const gap = best - streak;
        const u = unitOf(mode);
        out.push(makeAlert({
          id: `streak-${milestone}-${list.id}-${ymd(reached)}`, kind: "streak", source: "checklist", icon: "flame", tone: "accent",
          at: reached,
          titleEn: `${milestone}-${enUnit(mode, 1)} streak`, titleFa: `استریک ${fa(milestone)} ${u.adj}`,
          bodyEn: `${name.en}: every item done, ${milestone} ${enUnit(mode, milestone)} running.`
            + `${streak > milestone ? ` Now at ${streak}.` : ""}${gap > 0 ? ` ${gap} more to match your best.` : ""}`,
          bodyFa: `${name.fa}: همه‌ی موارد، ${fa(milestone)} ${u.fa} پشت سر هم انجام شد.`
            + `${streak > milestone ? ` الان ${fa(streak)} ${u.fa}.` : ""}${gap > 0 ? ` ${fa(gap)} ${u.fa} دیگر تا رسیدن به بهترین رکوردت.` : ""}`,
        }));
      }
    }

    // Unfinished close to the reset: a streak at risk if there is one, or
    // just the countdown if there isn't.
    const { done, total } = progressOf(list);
    const end = periodEnd(list.reset, now);
    if (!end || total === 0 || done >= total) continue;
    const win = mode === "daily" ? LATE_WINDOW.daily : LATE_WINDOW.other;
    const left = end - now;
    if (left <= 0 || left > win) continue;
    const countdown = formatCountdown(left);
    const period = ymd(periodStart(list.reset, now));
    if (streak > 0) {
      out.push(makeAlert({
        id: `risk-${list.id}-${period}`, kind: "streak-risk", source: "checklist", icon: "hourglass", tone: "inv",
        at: end - win,
        titleEn: "Streak at risk", titleFa: "استریک در خطر است",
        bodyEn: `${name.en}: ${done} of ${total} done and it resets in ${countdown.en}. Finish to keep your ${streak}-${enUnit(mode, 1)} streak.`,
        bodyFa: `${name.fa}: ${fa(done)} از ${fa(total)} انجام شده و ${countdown.fa} دیگر از نو شروع می‌شود. تمامش کن تا استریک ${fa(streak)} ${unitOf(mode).adj} بماند.`,
      }));
    } else {
      out.push(makeAlert({
        id: `reset-${list.id}-${period}`, kind: "reset", source: "checklist", icon: "timer", tone: "sunk",
        at: end - win,
        titleEn: `${name.en} resets soon`, titleFa: `${name.fa} به‌زودی از نو شروع می‌شود`,
        bodyEn: `Resets in ${countdown.en}. ${done} of ${total} done.`,
        bodyFa: `${countdown.fa} دیگر از نو شروع می‌شود. ${fa(done)} از ${fa(total)} انجام شده.`,
      }));
    }
  }
  return out;
}

/* ────────────────────────────── nutrition ────────────────────────────── */

/** True when any of the last `days` days, today included, passes `test`. */
function usedRecently(days, now, test, span = 7) {
  for (let i = 0; i < span; i += 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const day = days[dayKey(d)];
    if (day && test(day)) return true;
  }
  return false;
}

const fixed1 = (v) => (Math.round(v * 10) / 10).toString();

function nutritionAlerts(nutrition, now) {
  const out = [];
  if (!nutrition?.profile) return out;
  const days = nutrition.diary?.days || {};
  const key = dayKey(now);
  const today = days[key] || emptyDay();
  const targets = targetsFor(nutrition.profile, {
    trainingDay: today.trainingDay ?? null,
    estimatedTdee: nutrition.profile.useAdaptive ? nutrition.estimate?.tdee ?? null : null,
  });
  const totals = totalsFor(today);

  // Protein, only for someone who logs food at all.
  const logsFood = usedRecently(days, now, (d) => (d.entries || []).length > 0);
  const proteinAt = atHour(now, TIMES.protein);
  if (logsFood && now >= proteinAt && targets.protein > 0 && totals.protein < targets.protein * PROTEIN_SHARE) {
    const eaten = Math.round(totals.protein);
    const left = Math.round(targets.protein - totals.protein);
    out.push(makeAlert({
      id: `protein-${key}`, kind: "protein", source: "nutrition", icon: "drumstick", tone: "sand", at: proteinAt,
      titleEn: "Protein is behind", titleFa: "پروتئین عقب مانده",
      bodyEn: `${eaten} of ${targets.protein} g so far. ${left} g to go today.`,
      bodyFa: `تا الان ${fa(eaten)} از ${fa(targets.protein)} گرم. ${fa(left)} گرم تا هدف امروز مانده.`,
    }));
  }

  // Water, only for someone who tracks it.
  const tracksWater = usedRecently(days, now, (d) => (d.water || 0) > 0);
  const waterAt = atHour(now, TIMES.water);
  if (tracksWater && now >= waterAt && targets.water > 0 && (today.water || 0) < targets.water * WATER_SHARE) {
    const had = fixed1((today.water || 0) / 1000);
    const goal = fixed1(targets.water / 1000);
    out.push(makeAlert({
      id: `water-${key}`, kind: "water", source: "nutrition", icon: "droplets", tone: "mist", at: waterAt,
      titleEn: "Drink some water", titleFa: "کمی آب بنوش",
      bodyEn: `${had} of ${goal} L so far today.`,
      bodyFa: `امروز تا الان ${fa(had)} از ${fa(goal)} لیتر.`,
    }));
  }

  // Weigh-in: none logged yet, or the last one is a week old.
  const weighed = Object.keys(days).filter((k) => typeof days[k].weight === "number" && k <= key).sort();
  const last = weighed[weighed.length - 1] || null;
  const lastAt = last ? new Date(`${last}T00:00:00`) : null;
  const since = lastAt ? Math.round((startOfDay(now) - lastAt) / DAY) : null;
  if (!last || since >= WEIGH_IN_DAYS) {
    let at;
    if (lastAt) {
      at = new Date(lastAt);
      at.setDate(at.getDate() + WEIGH_IN_DAYS);
      at.setHours(TIMES.morning, 0, 0, 0);
    } else {
      at = atHour(now, TIMES.morning);
    }
    if (at > now) at = startOfDay(now);
    out.push(makeAlert({
      id: `weigh-${last || "none"}`, kind: "weigh-in", source: "nutrition", icon: "scale", tone: "sage", at,
      titleEn: "Time to weigh in", titleFa: "وقت وزن‌کشی است",
      bodyEn: last
        ? `Your last weigh-in was ${since} days ago. One a week keeps your targets true to your weight.`
        : "No weigh-in logged yet. Log one in Fuel so your targets follow your real weight.",
      bodyFa: last
        ? `آخرین وزن‌کشی ${fa(since)} روز پیش بود. هفته‌ای یک بار کافی است تا هدف‌هایت با وزن واقعی‌ات جلو بروند.`
        : "هنوز وزنی ثبت نکرده‌ای. در بخش تغذیه ثبتش کن تا هدف‌هایت از وزن واقعی‌ات پیروی کنند.",
    }));
  }
  return out;
}

/* ────────────────────────────── the feed ────────────────────────────── */

/**
 * Every app alert that applies right now, newest first.
 * `training`, `checklist` and `nutrition` are the stores (or the same
 * shapes): { activeProgram | programs+activeProgramId, sessions, draft },
 * { lists }, { diary: { days }, profile, estimate }.
 */
export function appAlerts({ training, checklist, nutrition, now = new Date() } = {}) {
  const at = new Date(now);
  return [
    ...trainingAlerts(training, at),
    ...checklistAlerts(checklist, at),
    ...nutritionAlerts(nutrition, at),
  ].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

const asSet = (ids) => (ids instanceof Set ? ids : new Set(ids || []));

/** Marks each alert read or not, from the stored read ids. */
export const withReadState = (alerts, readIds = loadReadIds()) => {
  const read = asSet(readIds);
  return alerts.map((a) => ({ ...a, read: read.has(a.id) }));
};

/** How many alerts are unread: the inbox's App count and the bell's share. */
export const unreadAppAlerts = (alerts, readIds = loadReadIds()) => {
  const read = asSet(readIds);
  return (alerts || []).filter((a) => !read.has(a.id)).length;
};

/* ─────────────────────────── read state (storage) ─────────────────────────── */

export const READ_KEY = "fitclub.inbox.read";
const READ_LIMIT = 300; // ids are per day or per event, so keep the newest few hundred

export function loadReadIds() {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(READ_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

export function saveReadIds(ids) {
  try {
    window.localStorage.setItem(READ_KEY, JSON.stringify([...asSet(ids)].slice(-READ_LIMIT)));
  } catch {
    // Still read for this visit.
  }
}
