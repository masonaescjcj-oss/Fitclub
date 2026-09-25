// The app's single Supabase client.
//
// The backend is optional: with REACT_APP_SUPABASE_URL and
// REACT_APP_SUPABASE_ANON_KEY set at build time (Vercel → Project Settings →
// Environment Variables, or a local .env), accounts, sync and storage run on
// Supabase. Without them the app stays in demo mode and keeps everything in
// this browser, exactly as before.
//
// The anon key is meant to ship in the browser; row-level security in
// supabase/migrations decides what it can reach. Never put the service_role
// key here.

import { createClient } from "@supabase/supabase-js";

const URL = process.env.REACT_APP_SUPABASE_URL || "";
const ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || "";

export const backendOn = Boolean(URL && ANON_KEY);

// FitClub shares its Supabase project with other apps, so everything it
// owns carries its name (supabase/migrations/0001): these tables, the RPC
// and the photo bucket. Auth is the project's own.
export const TABLES = { profiles: "fitclub_profiles", state: "fitclub_user_state" };
export const RPC_USERNAME_AVAILABLE = "fitclub_username_available";
export const AVATAR_BUCKET = "fitclub-avatars";

export const supabase = backendOn
  ? createClient(URL, ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce", storageKey: "fitclub.auth" },
    })
  : null;

/** The signed-in user's access token, for calls to our own /api functions. */
export async function getAccessToken() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

/** The signed-in Supabase user, or null. */
export async function currentUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user || null;
}
