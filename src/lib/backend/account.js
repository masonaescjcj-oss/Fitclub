// Accounts on Supabase: sign-up with an emailed code, sign-in, Google,
// password reset, the profile row, and starting the device sync for the
// signed-in person. Every function is a no-op that reports "offline" when
// the backend isn't configured, so the demo build keeps working unchanged.

import { AVATAR_BUCKET, SCHEMA, backendOn, supabase } from "./supabase";
import { createSync, hookWrites } from "./sync";
import { clearSession, saveSession } from "../session";

const DEVICE_KEY = "fitclub.device";
const DRAFT_KEY = "fitclub.training.v1";

let sync = null;
let unhook = null;
let channel = null;
let reloadWhenVisible = false;

/** A stable id for this browser, so a device can ignore its own realtime echoes. */
function deviceId() {
  try {
    let id = window.localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = `d_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
      window.localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

/** Maps Supabase auth errors onto the few cases the pages explain. */
export function errorCode(error) {
  if (!error) return null;
  const code = error.code || "";
  const msg = String(error.message || "").toLowerCase();
  if (code === "user_already_exists" || msg.includes("already registered")) return "exists";
  if (code === "invalid_credentials" || msg.includes("invalid login")) return "invalid";
  if (code === "email_not_confirmed" || msg.includes("not confirmed")) return "unconfirmed";
  if (code === "weak_password" || msg.includes("password should")) return "weak";
  if (code === "otp_expired" || code === "otp_disabled" || msg.includes("token has expired") || msg.includes("invalid token")) return "code";
  if (code.startsWith("over_") || error.status === 429 || msg.includes("rate limit")) return "rate";
  if (error.name === "AuthRetryableFetchError" || msg.includes("failed to fetch") || msg.includes("network")) return "network";
  return "unknown";
}

const offline = { error: "offline" };
const result = (error) => (error ? { error: errorCode(error) } : { error: null });

// A workout in progress is never interrupted by a reload.
function workoutOpen() {
  try {
    return Boolean(JSON.parse(window.localStorage.getItem(DRAFT_KEY) || "{}").draft);
  } catch {
    return false;
  }
}

async function catchUp() {
  if (!sync) return;
  const changed = await sync.pull().catch(() => []);
  if (!changed.length) return;
  if (document.visibilityState === "visible" && !workoutOpen()) window.location.reload();
  else reloadWhenVisible = true;
}

function onVisibility() {
  if (document.visibilityState === "visible") {
    if (reloadWhenVisible && !workoutOpen()) window.location.reload();
    else catchUp();
  } else if (sync) {
    sync.flush().catch(() => {});
  }
}

/** Starts syncing this device for `user`. Returns the local keys the first pull changed. */
async function attach(user, { timeoutMs }) {
  if (sync?.userId !== user.id) {
    detach({ clear: false });
    sync = createSync({ client: supabase, storage: window.localStorage, userId: user.id, device: deviceId() });
    unhook = hookWrites(window.localStorage, (key) => sync.noteWrite(key));
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onVisibility);
    const me = deviceId();
    channel = supabase
      .channel(`user_state:${user.id}`)
      .on("postgres_changes", { event: "*", schema: SCHEMA, table: "user_state", filter: `user_id=eq.${user.id}` },
        (payload) => { if (payload.new?.device !== me) catchUp(); })
      .subscribe();
  }
  const timeout = new Promise((resolve) => setTimeout(() => resolve([]), timeoutMs));
  return Promise.race([sync.pull().catch(() => []), timeout]);
}

function detach({ clear }) {
  if (sync) sync.unlink({ clear });
  sync = null;
  if (unhook) unhook();
  unhook = null;
  if (channel) supabase.removeChannel(channel);
  channel = null;
  document.removeEventListener("visibilitychange", onVisibility);
  window.removeEventListener("pagehide", onVisibility);
}

const PROFILE_COLUMNS = "username, name, bio, avatar_url, lang, onboarded";

/** The person's FitClub profile, created on first sign-in (nothing on auth.users does it). */
async function loadProfile(user) {
  const { data } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", user.id).maybeSingle();
  if (data) return data;
  const { data: created } = await supabase.from("profiles")
    .upsert({ id: user.id, name: user.user_metadata?.full_name || "" }, { onConflict: "id", ignoreDuplicates: true })
    .select(PROFILE_COLUMNS).maybeSingle();
  return created || { username: null, name: "", bio: "", avatar_url: null, lang: "fa", onboarded: false };
}

function mirror(user, profile) {
  saveSession({
    signedIn: true,
    signedOut: false,
    userId: user.id,
    email: user.email || null,
    name: profile.name || user.user_metadata?.full_name || null,
    username: profile.username || null,
    onboarded: Boolean(profile.onboarded),
    avatarUrl: profile.avatar_url || user.user_metadata?.avatar_url || null,
  });
}

/**
 * App start and every sign-in: finds the Supabase session, starts the sync,
 * brings the profile into the local session. Resolves with
 * `{user, profile}` (both null when signed out).
 */
export async function boot({ timeoutMs = 4000 } = {}) {
  if (!backendOn) return { user: null, profile: null };
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user || null;
  if (!user) return { user: null, profile: null };
  const [profile] = await Promise.all([loadProfile(user).catch(() => null), attach(user, { timeoutMs })]);
  const safe = profile || { username: null, name: "", onboarded: false };
  mirror(user, safe);
  return { user, profile: safe };
}

/** Where a signed-in person should land, given their profile. */
export const landingFor = (profile) => (!profile?.username ? "profile-setup" : profile.onboarded ? "main-app" : "intro-hero");

export async function signUp(email, password) {
  if (!backendOn) return offline;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Marks the account as FitClub's in a project other apps share.
    options: { emailRedirectTo: window.location.origin, data: { app: "fitclub" } },
  });
  if (error) return result(error);
  // Supabase answers an existing, confirmed address with a user that has no identities.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return { error: "exists" };
  // With email confirmation off the account is ready at once: no code step.
  if (data.session) {
    const { profile } = await boot();
    return { error: null, needsCode: false, profile };
  }
  return { error: null, needsCode: true };
}

/** The 6-digit code from the confirmation email. */
export async function verifySignup(email, token) {
  if (!backendOn) return offline;
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });
  if (error) return result(error);
  const { profile } = await boot();
  return { error: null, profile };
}

export async function resendSignup(email) {
  if (!backendOn) return offline;
  return result((await supabase.auth.resend({ type: "signup", email })).error);
}

export async function signIn(email, password) {
  if (!backendOn) return offline;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return result(error);
  const { profile } = await boot();
  return { error: null, profile };
}

/** Google (or another configured provider): leaves the page, comes back signed in. */
export async function signInWithProvider(provider) {
  if (!backendOn) return offline;
  return result((await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } })).error);
}

/** Providers the build offers besides email, from REACT_APP_AUTH_PROVIDERS. */
export const providers = backendOn
  ? String(process.env.REACT_APP_AUTH_PROVIDERS || "").split(",").map((p) => p.trim()).filter(Boolean)
  : [];

export async function requestPasswordReset(email) {
  if (!backendOn) return offline;
  return result((await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })).error);
}

export async function updatePassword(password) {
  if (!backendOn) return offline;
  return result((await supabase.auth.updateUser({ password })).error);
}

/** Calls back once when the person opens a password-reset link. */
export function onPasswordRecovery(callback) {
  if (!backendOn) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") callback(); });
  return () => data.subscription.unsubscribe();
}

export async function usernameAvailable(username) {
  if (!backendOn) return true;
  const { data, error } = await supabase.rpc("username_available", { candidate: String(username || "").toLowerCase() });
  return error ? true : Boolean(data); // a failed check never blocks; the unique index still guards
}

/** Updates the signed-in person's profile row and mirrors it into the local session. */
export async function saveProfile(patch) {
  if (!backendOn) return offline;
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { error: "invalid" };
  const row = {};
  for (const k of ["username", "name", "bio", "avatar_url", "lang", "onboarded"]) if (patch[k] !== undefined) row[k] = patch[k];
  if (row.username) row.username = String(row.username).toLowerCase();
  const { data: saved, error } = await supabase.from("profiles").upsert({ id: user.id, ...row }, { onConflict: "id" }).select(PROFILE_COLUMNS).maybeSingle();
  if (error) return { error: error.code === "23505" ? "taken" : error.code === "23514" ? "invalid" : "unknown" };
  mirror(user, saved || row);
  return { error: null, profile: saved };
}

/** Uploads a profile photo to fitclub-avatars/<user id>/ and saves its public URL. */
export async function uploadAvatar(file) {
  if (!backendOn) return offline;
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { error: "invalid" };
  const ext = (file.name?.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) return { error: "unknown" };
  const url = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
  return saveProfile({ avatar_url: url });
}

/** Signs out everywhere on this device and forgets the account's data here. */
export async function signOut() {
  if (backendOn) {
    await sync?.flush().catch(() => {});
    detach({ clear: true });
    await supabase.auth.signOut().catch(() => {});
  }
  clearSession();
}
