// Which cards the diary shows. Some athletes want the full dashboard;
// others just want to log food without a wall of numbers.

const KEY = "fitclub.dietview.v1";

export const DEFAULT_VIEW = {
  summary: "full",        // "full" | "compact" | "hidden"
  coach: true,
  water: true,
  workoutMeals: "auto",   // "auto" (training days only) | "always" | "never"
  savedMeals: true,
  shortcuts: true,
};

export function loadView() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_VIEW, ...JSON.parse(raw) };
  } catch {
    // Unreadable storage — everything on, as it ships.
  }
  return { ...DEFAULT_VIEW };
}

export function saveView(view) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(view));
  } catch {
    // Preference is lost on reload; the session still honours it.
  }
}

/**
 * Whether the pre/post-workout slots belong on this particular day.
 * "auto" keeps them out of the way until the day is marked as training.
 */
export function showWorkoutMeals(view, day) {
  if (view.workoutMeals === "always") return true;
  if (view.workoutMeals === "never") return false;
  return day?.trainingDay === true;
}
