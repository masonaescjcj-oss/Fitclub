import { useSyncExternalStore } from "react";
import { exercisesVersion, subscribeExercises } from "./exercises";

/**
 * Re-renders the calling screen when the exercise list changes (the
 * liftmanual catalog finished loading). Returns the list's version number,
 * handy as a memo dependency.
 */
export function useExerciseCatalog() {
  return useSyncExternalStore(subscribeExercises, exercisesVersion, exercisesVersion);
}
