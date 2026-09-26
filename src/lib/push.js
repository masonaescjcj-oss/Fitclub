// Push notifications on this device (supabase/migrations/0008, api/push-*.js):
// turning them on subscribes the service worker with FitClub's public VAPID
// key and saves the subscription with what it should bring (new messages, an
// evening reminder). Choices are kept on the device too, to show them.

import { backendOn, getAccessToken, supabase } from "./backend/supabase";

const KEY = "fitclub.push.v1";
const VAPID = process.env.REACT_APP_VAPID_PUBLIC_KEY || "";

export const DEFAULT_PREFS = { on: false, messages: true, reminders: true };

export function loadPushPrefs() {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { ...DEFAULT_PREFS }; }
}
function savePushPrefs(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage off: the server still has them */ }
}

/** "unsupported" | "ios-install" | "blocked" | "ready": what this browser can do. */
export function pushState() {
  if (!backendOn || !VAPID) return "unsupported";
  const ua = navigator.userAgent || "";
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && "ontouchend" in document);
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
  // iOS shows web push only for an app added to the Home Screen (16.4 and later).
  if (ios && !standalone) return "ios-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  return "ready";
}

function keyBytes(base64) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (ch) => ch.charCodeAt(0));
}

async function saveSubscription(sub, prefs, lang) {
  const { error } = await supabase.rpc("fitclub_push_save", {
    p_sub: sub.toJSON(),
    p_prefs: { lang, tzOffset: -new Date().getTimezoneOffset(), messages: prefs.messages, reminders: prefs.reminders },
  });
  if (error) throw new Error(error.message);
}

/**
 * Turns notifications on (asking the browser's permission) or updates what
 * they bring. Resolves the saved prefs; rejects with "blocked" when the
 * person says no.
 */
export async function enablePush(prefs, lang = "fa") {
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") throw Object.assign(new Error("blocked"), { code: "blocked" });
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID) }));
  const next = { ...DEFAULT_PREFS, ...prefs, on: true };
  await saveSubscription(sub, next, lang);
  savePushPrefs(next);
  return next;
}

/** Turns notifications off on this device and forgets it on the server. */
export async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await supabase.rpc("fitclub_push_remove", { p_endpoint: sub.endpoint });
      await sub.unsubscribe();
    }
  } finally {
    savePushPrefs({ ...loadPushPrefs(), on: false });
  }
}

/** After the server accepts a message: ask for the chat's other members to be told. Never blocks sending. */
export async function notifyMessage(messageId) {
  if (!backendOn || !messageId) return;
  try {
    const token = await getAccessToken();
    if (!token) return;
    await fetch("/api/push-message", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messageId }),
      keepalive: true,
    });
  } catch {
    // No push this time; the message itself is already delivered.
  }
}
