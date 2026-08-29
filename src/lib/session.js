// Keeps the athlete signed in between visits, so onboarding is a one-time cost.

const KEY = "fitclub.session.v1";

const EMPTY = { signedIn: false, onboarded: false, email: null, name: null, username: null };

export function loadSession() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    // Unreadable or disabled storage — treat it as signed out.
  }
  return { ...EMPTY };
}

/** Merges a patch into the stored session and returns the result. */
export function saveSession(patch) {
  const next = { ...loadSession(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Session still works in memory for this visit.
  }
  return next;
}

export function clearSession() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

/**
 * Where a returning visitor should land.
 * Signed in and set up goes straight to the app; a half-finished signup
 * resumes at the profile step rather than starting over.
 */
export function initialPage(session = loadSession()) {
  if (!session.signedIn) return "welcome";
  return session.onboarded ? "main-app" : "profile-setup";
}
