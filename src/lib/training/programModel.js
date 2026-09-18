// Programs, logged sessions, personal records, and the share-by-link codec.
// Pure functions; nothing here touches React or storage.

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const PROGRAM_COLORS = ["#844783", "#e0567d", "#f59e0b", "#10b981", "#38bdf8", "#8b5cf6"];

/* ──────────────────────────── factories ──────────────────────────── */

export function createProgramExercise(patch = {}) {
  return { id: uid(), exerciseId: "", sets: 3, reps: 10, weight: null, restSec: 90, note: "", ...patch };
}

export function createDay(patch = {}) {
  return { id: uid(), title: "", titleFa: "", type: "workout", exercises: [], ...patch };
}

export function createProgram(patch = {}) {
  return {
    id: uid(),
    name: "",
    nameFa: "",
    emoji: "🏋️",
    color: PROGRAM_COLORS[0],
    description: "",
    weeks: 6,
    author: { name: "", role: "user" },
    source: "mine",          // builtin | mine | imported
    days: [],
    createdAt: new Date().toISOString(),
    ...patch,
  };
}

/** A logged set. `done` is what counts; the numbers are what was actually lifted. */
export const createSet = (patch = {}) => ({ weight: null, reps: null, done: false, ...patch });

/**
 * Starts a session from a program day. Each exercise begins with the
 * program's targets, or the athlete's last performance where one exists —
 * the single most useful thing a logger can do is remember last time.
 */
export function createSession({ program, day, lastPerf = {} }) {
  return {
    id: uid(),
    programId: program?.id || null,
    programName: program?.name || "",
    dayId: day?.id || null,
    dayTitle: day?.title || "",
    dayTitleFa: day?.titleFa || "",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    durationSec: 0,
    exercises: (day?.exercises || []).map((pe) => {
      const prev = lastPerf[pe.exerciseId];
      const count = Math.max(pe.sets || 1, 1);
      return {
        exerciseId: pe.exerciseId,
        sets: Array.from({ length: count }, (_, i) =>
          createSet({
            weight: prev?.[i]?.weight ?? prev?.[prev.length - 1]?.weight ?? pe.weight ?? null,
            reps: prev?.[i]?.reps ?? pe.reps ?? null,
          })
        ),
        restSec: pe.restSec ?? 90,
        note: pe.note || "",
      };
    }),
    prs: [],
  };
}

/* ──────────────────────────── maths ──────────────────────────── */

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Epley estimate of a one-rep max. A single rep is just the weight. */
export const e1rm = (weight, reps) => {
  const w = num(weight);
  const r = num(reps);
  if (w <= 0 || r <= 0) return 0;
  return r === 1 ? w : w * (1 + r / 30);
};

export const setVolume = (s) => (s.done ? num(s.weight) * num(s.reps) : 0);

export const sessionVolume = (session) =>
  (session.exercises || []).reduce((sum, ex) => sum + ex.sets.reduce((a, s) => a + setVolume(s), 0), 0);

export const sessionSetsDone = (session) =>
  (session.exercises || []).reduce((n, ex) => n + ex.sets.filter((s) => s.done).length, 0);

/** Same rough formula the live screen has always shown. */
export const estimateCalories = (durationSec, setsDone) =>
  Math.round((durationSec / 60) * 8.5) + setsDone * 4;

/** Best done set of an exercise inside one session, by estimated 1RM. */
export function bestSetIn(sessionExercise) {
  let best = null;
  for (const s of sessionExercise.sets) {
    if (!s.done || num(s.weight) <= 0) continue;
    const score = e1rm(s.weight, s.reps);
    if (!best || score > best.e1rm) best = { weight: num(s.weight), reps: num(s.reps), e1rm: score };
  }
  return best;
}

/** All-time bests for one exercise across finished sessions. */
export function exerciseBests(sessions, exerciseId) {
  let maxWeight = 0;
  let bestE1rm = 0;
  for (const session of sessions) {
    for (const ex of session.exercises || []) {
      if (ex.exerciseId !== exerciseId) continue;
      for (const s of ex.sets) {
        if (!s.done) continue;
        maxWeight = Math.max(maxWeight, num(s.weight));
        bestE1rm = Math.max(bestE1rm, e1rm(s.weight, s.reps));
      }
    }
  }
  return { maxWeight, bestE1rm };
}

/**
 * Personal records set in `session` relative to everything before it.
 * A heavier top set or a better estimated 1RM each count.
 */
export function detectPRs(session, priorSessions) {
  const prs = [];
  for (const ex of session.exercises || []) {
    const best = bestSetIn(ex);
    if (!best) continue;
    const prior = exerciseBests(priorSessions, ex.exerciseId);
    if (best.weight > prior.maxWeight && prior.maxWeight > 0) {
      prs.push({ exerciseId: ex.exerciseId, kind: "weight", value: best.weight, prev: prior.maxWeight });
    } else if (best.e1rm > prior.bestE1rm && prior.bestE1rm > 0) {
      prs.push({ exerciseId: ex.exerciseId, kind: "e1rm", value: Math.round(best.e1rm), prev: Math.round(prior.bestE1rm) });
    } else if (prior.maxWeight === 0 && prior.bestE1rm === 0) {
      prs.push({ exerciseId: ex.exerciseId, kind: "first", value: best.weight, prev: 0 });
    }
  }
  return prs;
}

const byDate = (a, b) => (a.startedAt < b.startedAt ? -1 : 1);

/** The sets from the most recent session that included this exercise. */
export function lastPerformance(sessions, exerciseId) {
  const ordered = [...sessions].filter((s) => s.finishedAt).sort(byDate).reverse();
  for (const session of ordered) {
    const ex = (session.exercises || []).find((e) => e.exerciseId === exerciseId);
    if (ex && ex.sets.some((s) => s.done)) return ex.sets.filter((s) => s.done);
  }
  return null;
}

/** Prefill map for every exercise in a day. */
export function lastPerformanceFor(sessions, day) {
  const out = {};
  for (const pe of day?.exercises || []) {
    const prev = lastPerformance(sessions, pe.exerciseId);
    if (prev) out[pe.exerciseId] = prev;
  }
  return out;
}

/** Top set per session for one exercise, oldest first — feeds the trend chart. */
export function exerciseTrend(sessions, exerciseId, limit = 12) {
  const points = [];
  for (const session of [...sessions].filter((s) => s.finishedAt).sort(byDate)) {
    const ex = (session.exercises || []).find((e) => e.exerciseId === exerciseId);
    const best = ex ? bestSetIn(ex) : null;
    if (best) points.push({ at: session.startedAt, weight: best.weight, reps: best.reps, e1rm: Math.round(best.e1rm) });
  }
  return points.slice(-limit);
}

/** Volume per week for the last `weeks` weeks, oldest first. Weeks start on `weekStart` (6 = Saturday). */
export function weeklyVolume(sessions, weeks = 4, now = new Date(), weekStart = 6) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() - weekStart + 7) % 7));
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const from = new Date(start);
    from.setDate(start.getDate() - (weeks - 1 - i) * 7);
    return { from, volume: 0, sessions: 0 };
  });
  for (const s of sessions) {
    if (!s.finishedAt) continue;
    const at = new Date(s.startedAt);
    for (let i = buckets.length - 1; i >= 0; i -= 1) {
      if (at >= buckets[i].from) {
        buckets[i].volume += sessionVolume(s);
        buckets[i].sessions += 1;
        break;
      }
    }
  }
  return buckets;
}

export function sessionStats(sessions) {
  const done = sessions.filter((s) => s.finishedAt);
  return {
    count: done.length,
    volume: done.reduce((a, s) => a + sessionVolume(s), 0),
    minutes: Math.round(done.reduce((a, s) => a + num(s.durationSec), 0) / 60),
    calories: done.reduce((a, s) => a + estimateCalories(num(s.durationSec), sessionSetsDone(s)), 0),
  };
}

/* ──────────────────────────── share codec ────────────────────────────
 * A program or meal plan travels inside the link itself: compact JSON,
 * deflated when the browser can, base64url, with a prefix naming the
 * scheme. No server needed; when one exists, the same payload can sit
 * behind a short id instead.
 */

const MAX_BYTES = 64 * 1024;

export function compactProgram(p) {
  return {
    t: "program", v: 1,
    n: p.name, nf: p.nameFa || "", e: p.emoji, c: p.color, d: p.description || "", w: p.weeks,
    a: { n: p.author?.name || "", r: p.author?.role || "user" },
    days: p.days.map((day) => ({
      t: day.title, tf: day.titleFa || "", r: day.type === "rest" ? 1 : 0,
      x: day.exercises.map((e) => [e.exerciseId, e.sets, e.reps, e.weight ?? null, e.restSec ?? 90, e.note || ""]),
    })),
  };
}

export function expandProgram(c) {
  return createProgram({
    name: c.n, nameFa: c.nf, emoji: c.e || "🏋️", color: c.c || PROGRAM_COLORS[0],
    description: c.d || "", weeks: c.w || 6,
    author: { name: c.a?.n || "", role: c.a?.r === "coach" ? "coach" : "user" },
    source: "imported",
    days: (c.days || []).map((d) =>
      createDay({
        title: d.t, titleFa: d.tf || "", type: d.r ? "rest" : "workout",
        exercises: (d.x || []).map(([exerciseId, sets, reps, weight, restSec, note]) =>
          createProgramExercise({ exerciseId, sets, reps, weight, restSec, note })),
      })),
  });
}

export function compactMealPlan({ name, author, targets, meals, notes }) {
  return {
    t: "meal", v: 1, n: name, d: notes || "",
    a: { n: author?.name || "", r: author?.role || "user" },
    tg: { k: targets.kcal, p: targets.protein, c: targets.carbs, f: targets.fat },
    m: (meals || []).map((m) => ({
      n: m.name,
      i: m.items.map((it) => (it.foodId ? [it.foodId, it.grams] : { c: it.custom, g: it.grams })),
    })),
  };
}

export function expandMealPlan(c) {
  return {
    name: c.n, notes: c.d || "",
    author: { name: c.a?.n || "", role: c.a?.r === "coach" ? "coach" : "user" },
    targets: { kcal: c.tg.k, protein: c.tg.p, carbs: c.tg.c, fat: c.tg.f },
    meals: (c.m || []).map((m) => ({
      name: m.n,
      items: m.i.map((it) => (Array.isArray(it) ? { foodId: it[0], grams: it[1], custom: null } : { foodId: null, grams: it.g, custom: it.c })),
    })),
  };
}

const toB64url = (bytes) => {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64url = (s) => {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
};

async function pipeThrough(bytes, stream) {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** JSON → (deflate) → base64url, prefixed with the scheme used. */
export async function encodeShare(payload) {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  if (typeof CompressionStream === "function") {
    try {
      const packed = await pipeThrough(bytes, new CompressionStream("deflate-raw"));
      return `z1.${toB64url(packed)}`;
    } catch {
      // fall through to the plain scheme
    }
  }
  return `j1.${toB64url(bytes)}`;
}

/** Accepts a bare code or a full link, validates the shape, or throws with a code. */
export async function decodeShare(input) {
  let code = String(input || "").trim();
  const m = code.match(/share=([A-Za-z0-9._-]+)/);
  if (m) code = m[1];
  const dot = code.indexOf(".");
  if (dot < 0) throw new Error("bad_format");
  const scheme = code.slice(0, dot);
  let bytes;
  try {
    bytes = fromB64url(code.slice(dot + 1));
  } catch {
    throw new Error("bad_format");
  }
  if (bytes.length > MAX_BYTES) throw new Error("too_large");
  if (scheme === "z1") {
    if (typeof DecompressionStream !== "function") throw new Error("unsupported");
    try {
      bytes = await pipeThrough(bytes, new DecompressionStream("deflate-raw"));
    } catch {
      throw new Error("bad_format");
    }
  } else if (scheme !== "j1") {
    throw new Error("bad_format");
  }
  if (bytes.length > MAX_BYTES) throw new Error("too_large");
  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error("bad_format");
  }
  if (!payload || payload.v !== 1) throw new Error("bad_version");
  if (payload.t === "program") {
    if (!Array.isArray(payload.days) || payload.days.length === 0 || payload.days.length > 14) throw new Error("bad_shape");
    if (payload.days.some((d) => !Array.isArray(d.x) || d.x.length > 25)) throw new Error("bad_shape");
    if (typeof payload.n !== "string" || !payload.n.trim()) throw new Error("bad_shape");
    return payload;
  }
  if (payload.t === "meal") {
    if (!payload.tg || typeof payload.tg.k !== "number") throw new Error("bad_shape");
    if (!Array.isArray(payload.m) || payload.m.length > 30) throw new Error("bad_shape");
    return payload;
  }
  throw new Error("bad_type");
}

export const shareLink = (code) =>
  typeof window === "undefined" ? `#share=${code}` : `${window.location.origin}${window.location.pathname}#share=${code}`;

/** A share code arriving through the URL, in the hash or the query string. */
export function readShareFromLocation() {
  if (typeof window === "undefined") return null;
  const m = `${window.location.hash} ${window.location.search}`.match(/share=([A-Za-z0-9._-]+)/);
  return m ? m[1] : null;
}

export function clearShareFromLocation() {
  if (typeof window === "undefined") return;
  try {
    window.history.replaceState(null, "", window.location.pathname);
  } catch {
    // Some hosts forbid touching history; the code is already consumed.
  }
}
