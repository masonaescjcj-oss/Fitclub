import { useEffect, useSyncExternalStore } from "react";
import { exercisesVersion, findExercise, subscribeExercises } from "./exercises";
import { loadExerciseDetails } from "./catalog";

/**
 * Re-renders the calling screen when the exercise list changes (the
 * liftmanual catalog finished loading). Returns the list's version number,
 * handy as a memo dependency.
 */
export function useExerciseCatalog() {
  return useSyncExternalStore(subscribeExercises, exercisesVersion, exercisesVersion);
}

/**
 * The exercise with its long text: asks for it when the catalog keeps it
 * apart, and re-renders when it arrives. Until then the exercise shows
 * what it has (name, muscles, equipment, animation).
 */
export function useExerciseDetails(id) {
  useExerciseCatalog();
  useEffect(() => { if (id) loadExerciseDetails(id); }, [id]);
  return id ? findExercise(id) : null;
}
