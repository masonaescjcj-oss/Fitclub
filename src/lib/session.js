// Keeps the athlete signed in between visits, so onboarding is a one-time cost.

import { backendOn } from "./backend/supabase";

const KEY = "fitclub.session.v1";

const EMPTY = { signedIn: false, onboarded: false, email: null, name: null, username: null, userId: null, avatarUrl: null };

/**
 * In demo mode (no Supabase configured) a first-time visitor starts already
 * signed in, so opening the app lands on the app itself. With real accounts
 * signing up is the way in, and this local copy only mirrors the Supabase
 * session (src/lib/backend/account.js). Signing out writes an explicitly
 * signed-out session instead of wiping the key, so the demo default can't
 * quietly log the athlete back in.
 */
export const START_SIGNED_IN = !backendOn;

const DEMO = {
  ...EMPTY,
  signedIn: true,
  onboarded: true,
  name: "Isaac",
  email: "athlete@fitclub.app",
  username: "fitclub_athlete",
};

export function loadSession() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    // Unreadable or disabled storage — fall through to the default below.
  }
  return START_SIGNED_IN ? { ...DEMO } : { ...EMPTY };
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

/** Signs out. Records the choice so the auto-sign-in default doesn't undo it. */
export function clearSession() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...EMPTY, signedOut: true }));
  } catch {
    // Nothing to store; this visit is signed out in memory anyway.
  }
}

/** Wipes the session entirely, so the next load starts fresh. */
export function resetSession() {
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
