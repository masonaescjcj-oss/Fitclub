// Programs and logged sessions, persisted in localStorage.

import { createDay, createProgram, createProgramExercise, createSet } from "./programModel";
import { backendOn } from "../backend/supabase";

const KEY = "fitclub.training.v1";

const ex = (exerciseId, sets, reps, weight = null, restSec = 90) =>
  createProgramExercise({ exerciseId, sets, reps, weight, restSec });
const day = (title, titleFa, exercises) => createDay({ title, titleFa, exercises });
const rest = () => createDay({ title: "Rest", titleFa: "استراحت", type: "rest" });

const AUTHOR = { name: "FitClub", role: "coach" };

function builtinPrograms() {
  return [
    createProgram({
      id: "prog_athletic", name: "Athletic Explosive Power", nameFa: "توان انفجاری و چابکی ورزشی",
      emoji: "⚡", color: "#844783", weeks: 6, source: "builtin", author: AUTHOR,
      description: "Power, agility and strength across four sessions a week.",
      days: [
        day("Explosiveness", "تمرین انفجاری", [ex("ex1", 5, 5), ex("ex2", 3, 5, 100, 150), ex("ex3", 4, 30), ex("ex4", 4, 8, 80, 120), ex("ex5", 3, 12, 120), ex("ex6", 3, 10, 24)]),
        day("Agility", "چابکی", [ex("ladder", 4, 45, null, 60), ex("cone_hops", 3, 12, null, 60), ex("mb_slam", 4, 15, 8), ex("box_jump", 4, 8), ex("plank_taps", 3, 20, null, 45)]),
        rest(),
        day("Strength", "قدرت", [ex("bench_press", 4, 8, 60, 120), ex("incline_db", 3, 10, 22), ex("ohp", 4, 8, 40), ex("pullup", 4, 8), ex("bb_curl", 3, 12, 20, 60), ex("rope_pushdown", 3, 12, 25, 60)]),
        day("Conditioning", "استقامت", [ex("kb_swing", 4, 20, 16, 60), ex("burpee", 3, 12, null, 60), ex("rowing", 5, 500, null, 90), ex("hanging_raise", 3, 15, null, 60)]),
        rest(), rest(),
      ],
    }),
    createProgram({
      id: "prog_ppl", name: "Push Pull Legs Hypertrophy", nameFa: "پوش پول لگز حجم",
      emoji: "💪", color: "#e0567d", weeks: 8, source: "builtin", author: AUTHOR,
      description: "Six days, each muscle twice a week.",
      days: [
        day("Push A", "پوش A", [ex("bench_press", 4, 8, 60, 120), ex("ohp", 3, 8, 40), ex("incline_db", 3, 10, 22), ex("lateral_raise", 3, 15, 8, 60), ex("rope_pushdown", 3, 12, 25, 60)]),
        day("Pull A", "پول A", [ex("ex2", 3, 5, 100, 150), ex("pullup", 4, 8), ex("barbell_row", 4, 10, 50), ex("face_pull", 3, 15, 15, 60), ex("bb_curl", 3, 12, 20, 60)]),
        day("Legs A", "پا A", [ex("ex4", 4, 8, 80, 150), ex("rdl_bar", 3, 10, 60), ex("leg_ext", 3, 12, 40, 60), ex("leg_curl", 3, 12, 35, 60), ex("calf_raise", 4, 15, 60, 45)]),
        day("Push B", "پوش B", [ex("db_shoulder", 4, 10, 18), ex("db_fly", 3, 12, 12, 60), ex("dips", 3, 10), ex("lateral_raise", 3, 15, 8, 60), ex("skull_crusher", 3, 12, 20, 60)]),
        day("Pull B", "پول B", [ex("sumo_dl", 3, 5, 100, 150), ex("lat_pulldown", 4, 10, 50), ex("db_row", 3, 12, 22), ex("rear_delt", 3, 15, 8, 60), ex("hammer_curl", 3, 12, 12, 60)]),
        day("Legs B", "پا B", [ex("front_squat", 4, 6, 60, 150), ex("hip_thrust", 4, 10, 80), ex("bulgarian_split", 3, 10, 16), ex("lunge", 3, 12, 14), ex("plank", 3, 60, null, 45)]),
        rest(),
      ],
    }),
    createProgram({
      id: "prog_fullbody", name: "Full Body Functional Strength", nameFa: "فول بادی فانکشنال",
      emoji: "🔥", color: "#f59e0b", weeks: 4, source: "builtin", author: AUTHOR,
      description: "Three full-body sessions for all levels.",
      days: [
        day("Full Body A", "فول بادی A", [ex("ex4", 3, 8, 70, 120), ex("bench_press", 3, 8, 55, 120), ex("barbell_row", 3, 10, 45), ex("plank", 3, 45, null, 45)]),
        rest(),
        day("Full Body B", "فول بادی B", [ex("ex2", 3, 5, 90, 150), ex("ohp", 3, 8, 35), ex("pullup", 3, 8), ex("hanging_raise", 3, 12, null, 60)]),
        rest(),
        day("Full Body C", "فول بادی C", [ex("goblet_squat", 3, 12, 20), ex("pushup", 3, 15, null, 60), ex("db_row", 3, 12, 20), ex("farmer_carry", 3, 40, 24, 60)]),
        rest(), rest(),
      ],
    }),
    createProgram({
      id: "prog_calisthenics", name: "Bodyweight Master", nameFa: "کالیستنیکس",
      emoji: "🤸", color: "#10b981", weeks: 6, source: "builtin", author: AUTHOR,
      description: "No equipment beyond a bar.",
      days: [
        day("Upper", "بالاتنه", [ex("pullup", 4, 6, null, 120), ex("pushup", 4, 15, null, 60), ex("dips", 3, 8), ex("plank", 3, 45, null, 45)]),
        day("Lower", "پایین‌تنه", [ex("ex1", 4, 10, null, 60), ex("lunge", 3, 12), ex("box_jump", 4, 8), ex("calf_raise", 4, 20, null, 45)]),
        rest(),
        day("Core & Cardio", "مرکز و هوازی", [ex("plank_taps", 3, 20, null, 45), ex("hanging_raise", 3, 12), ex("burpee", 4, 10, null, 60), ex("jump_rope", 4, 60, null, 45)]),
        day("Full Body", "فول بادی", [ex("pullup", 3, 8), ex("pushup", 3, 20, null, 60), ex("ex1", 3, 12, null, 60), ex("burpee", 3, 12, null, 60)]),
        rest(), rest(),
      ],
    }),
  ];
}

const ago = (days, hour = 18) => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(hour, 30, 0, 0); return d.toISOString(); };
const s = (w, r) => createSet({ weight: w, reps: r, done: true });

/** A little history, so Progress isn't empty and the first PR has something to beat. */
function seedSessions(programs) {
  const athletic = programs[0];
  const strength = athletic.days[3];
  const explosive = athletic.days[0];
  const mk = (daysBack, dayDef, exercises, durationSec) => ({
    id: `seed-${daysBack}`, programId: athletic.id, programName: athletic.name,
    dayId: dayDef.id, dayTitle: dayDef.title, dayTitleFa: dayDef.titleFa,
    startedAt: ago(daysBack), finishedAt: ago(daysBack, 19), durationSec, prs: [],
    exercises, restSec: 90,
  });
  return [
    mk(9, strength, [
      { exerciseId: "bench_press", sets: [s(60, 8), s(60, 8), s(60, 7), s(60, 6)], restSec: 120, note: "" },
      { exerciseId: "incline_db", sets: [s(20, 10), s(20, 10), s(20, 9)], restSec: 90, note: "" },
      { exerciseId: "ohp", sets: [s(37.5, 8), s(37.5, 8), s(37.5, 7), s(37.5, 6)], restSec: 90, note: "" },
      { exerciseId: "pullup", sets: [s(0, 8), s(0, 7), s(0, 6), s(0, 6)], restSec: 90, note: "" },
    ], 2880),
    mk(6, explosive, [
      { exerciseId: "ex4", sets: [s(80, 8), s(80, 8), s(80, 8), s(80, 7)], restSec: 120, note: "" },
      { exerciseId: "ex2", sets: [s(100, 5), s(100, 5), s(105, 4)], restSec: 150, note: "" },
      { exerciseId: "ex6", sets: [s(24, 10), s(24, 10), s(24, 10)], restSec: 90, note: "" },
    ], 3120),
    mk(2, strength, [
      { exerciseId: "bench_press", sets: [s(62.5, 8), s(62.5, 8), s(62.5, 7), s(62.5, 6)], restSec: 120, note: "" },
      { exerciseId: "incline_db", sets: [s(22, 10), s(22, 10), s(22, 9)], restSec: 90, note: "" },
      { exerciseId: "ohp", sets: [s(40, 8), s(40, 7), s(40, 6), s(40, 6)], restSec: 90, note: "" },
      { exerciseId: "pullup", sets: [s(0, 8), s(0, 8), s(0, 7), s(0, 6)], restSec: 90, note: "" },
      { exerciseId: "bb_curl", sets: [s(20, 12), s(20, 12), s(20, 10)], restSec: 60, note: "" },
    ], 3000),
  ];
}

/**
 * A fresh install. A real account starts with the built-in programs and no
 * history of its own; the demo build shows a few past sessions so Progress
 * has something in it.
 */
/**
 * A built-in program's suggested weights are a stranger's: fine for the demo,
 * not for a real athlete's first session. For a real account they start
 * empty, and each exercise then starts from what was lifted last time. Only
 * weights still equal to the template's are cleared, so an athlete's own
 * edits stay.
 */
function withoutTemplateWeights(programs, demo = !backendOn) {
  if (demo) return programs;
  const templates = new Map(builtinPrograms().map((b) => [b.id, b]));
  return programs.map((p) => {
    const tpl = p.source === "builtin" ? templates.get(p.id) : null;
    if (!tpl) return p;
    return {
      ...p,
      days: p.days.map((d, di) => ({
        ...d,
        exercises: d.exercises.map((e, ei) => {
          const t = tpl.days[di]?.exercises?.[ei];
          return t && t.exerciseId === e.exerciseId && t.weight != null && e.weight === t.weight ? { ...e, weight: null } : e;
        }),
      })),
    };
  });
}

export function seed({ demo = !backendOn } = {}) {
  const programs = withoutTemplateWeights(builtinPrograms(), demo);
  return { programs, activeProgramId: programs[0].id, sessions: demo ? seedSessions(programs) : [], draft: null, coachMode: false };
}

/** Takes the demo's sample sessions out of a real account that picked them up before accounts started empty. */
export const withoutSamples = (state, demo = !backendOn) =>
  (demo ? state : { ...state, sessions: state.sessions.filter((x) => !String(x.id).startsWith("seed-")) });

function normalize(state) {
  const programs = (state.programs || []).map((p) => ({
    ...createProgram(),
    ...p,
    days: (p.days || []).map((d) => ({ ...createDay(), ...d, exercises: (d.exercises || []).map((e) => ({ ...createProgramExercise(), ...e })) })),
  }));
  // Built-ins are re-seeded if an older save predates one of them.
  const have = new Set(programs.map((p) => p.id));
  for (const b of builtinPrograms()) if (!have.has(b.id)) programs.push(b);
  return {
    programs: withoutTemplateWeights(programs),
    activeProgramId: programs.some((p) => p.id === state.activeProgramId) ? state.activeProgramId : programs[0]?.id ?? null,
    sessions: state.sessions || [],
    draft: state.draft || null,
    coachMode: !!state.coachMode,
  };
}

export function loadTraining() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return withoutSamples(normalize(JSON.parse(raw)));
  } catch {
    // Corrupt or unavailable storage — start from the seeded programs.
  }
  return seed();
}

export function saveTraining(state) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Over quota or blocked; this visit still works in memory.
  }
}
