import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createDay, createProgram, createProgramExercise, createSession, detectPRs, expandProgram,
  lastPerformanceFor, sessionStats, weeklyVolume,
} from "../lib/training/programModel";
import { loadTraining, saveTraining } from "../lib/training/trainingStore";
import { generateProgram, nextTargets } from "../lib/training/programGen";
import { findExercise } from "../lib/training/exercises";

/** Each planned exercise's sets in earlier finished sessions, newest first. */
function historyOf(sessions, exerciseId, limit = 3) {
  const out = [];
  const done = [...sessions].filter((x) => x.finishedAt).sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
  for (const sess of done) {
    const ex = sess.exercises.find((e) => e.exerciseId === exerciseId);
    if (ex) out.push(ex.sets);
    if (out.length >= limit) break;
  }
  return out;
}

/** Owns programs, the in-progress workout, and the logged history. */
export default function useTraining() {
  const [state, setState] = useState(loadTraining);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    saveTraining(state);
  }, [state]);

  const patchProgram = useCallback((id, fn) => {
    setState((s) => ({ ...s, programs: s.programs.map((p) => (p.id === id ? fn(p) : p)) }));
  }, []);

  const api = useMemo(() => ({
    setActiveProgram: (id) => setState((s) => ({ ...s, activeProgramId: id })),
    setCoachMode: (on) => setState((s) => ({ ...s, coachMode: !!on })),

    /** A program built for this person (programGen.js), made the active one. */
    generateAndUseProgram: (input) => {
      const program = generateProgram({ seed: Date.now() % 100000, ...input });
      // A new one replaces the last one made for them; programs they built or imported stay.
      setState((s) => ({ ...s, programs: [...s.programs.filter((p) => p.source !== "generated"), program], activeProgramId: program.id }));
      return program;
    },

    /** One exercise of the workout in progress swapped for another: its sets start again from the planned reps. */
    swapDraftExercise: (index, exerciseId) => setState((s) => {
      if (!s.draft) return s;
      const exercises = s.draft.exercises.map((e, i) => (i !== index ? e : {
        ...e, exerciseId, swappedFrom: e.swappedFrom || e.exerciseId, target: undefined,
        sets: e.sets.map((set) => ({ ...set, weight: null, done: false })),
      }));
      return { ...s, draft: { ...s.draft, exercises } };
    }),

    addProgram: (patch) => {
      const program = createProgram({ source: "mine", ...patch });
      setState((s) => ({ ...s, programs: [...s.programs, program] }));
      return program;
    },
    updateProgram: (id, patch) => patchProgram(id, (p) => ({ ...p, ...patch })),
    removeProgram: (id) =>
      setState((s) => {
        const programs = s.programs.filter((p) => p.id !== id);
        return { ...s, programs, activeProgramId: s.activeProgramId === id ? programs[0]?.id ?? null : s.activeProgramId };
      }),
    duplicateProgram: (id, name, author) => {
      let copy = null;
      setState((s) => {
        const src = s.programs.find((p) => p.id === id);
        if (!src) return s;
        const { id: _id, createdAt: _c, ...rest } = src;
        copy = createProgram({
          ...rest, name, nameFa: "", source: "mine", author,
          days: src.days.map(({ id: _d, exercises, ...day }) =>
            createDay({ ...day, exercises: exercises.map(({ id: _e, ...e }) => createProgramExercise(e)) })),
        });
        return { ...s, programs: [...s.programs, copy] };
      });
      return copy;
    },
    /** Adds a decoded share payload as an imported program. */
    importProgram: (compact) => {
      const program = expandProgram(compact);
      setState((s) => ({ ...s, programs: [...s.programs, program] }));
      return program;
    },

    /** Opens a workout for a program day, prefilled from the last time each exercise was done. */
    startSession: (programId, dayId) => {
      let draft = null;
      setState((s) => {
        const program = s.programs.find((p) => p.id === programId);
        const day = program?.days.find((d) => d.id === dayId);
        if (!program || !day) return s;
        const targets = Object.fromEntries(day.exercises.map((pe) => [
          pe.exerciseId, nextTargets(pe, historyOf(s.sessions, pe.exerciseId), findExercise(pe.exerciseId)),
        ]));
        draft = createSession({ program, day, lastPerf: lastPerformanceFor(s.sessions, day), targets });
        return { ...s, draft };
      });
      return draft;
    },
    updateDraft: (fn) => setState((s) => (s.draft ? { ...s, draft: fn(s.draft) } : s)),
    discardDraft: () => setState((s) => ({ ...s, draft: null })),
    /** Closes the workout: records PRs against everything before it, files it into history. */
    finishDraft: (durationSec) => {
      let finished = null;
      setState((s) => {
        if (!s.draft) return s;
        const prs = detectPRs(s.draft, s.sessions);
        finished = { ...s.draft, finishedAt: new Date().toISOString(), durationSec, prs };
        return { ...s, draft: null, sessions: [...s.sessions, finished] };
      });
      return finished;
    },
    removeSession: (id) => setState((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== id) })),
  }), [patchProgram]);

  const activeProgram = state.programs.find((p) => p.id === state.activeProgramId) || null;
  const stats = useMemo(() => sessionStats(state.sessions), [state.sessions]);
  const weekly = useMemo(() => weeklyVolume(state.sessions, 4), [state.sessions]);

  return { ...state, activeProgram, stats, weekly, ...api };
}
