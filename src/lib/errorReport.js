// Sends a short report when the app hits an error it didn't expect
// (supabase/migrations/0005). Nothing is sent in the demo build (no backend).
//
// What goes: the error's message and where in the code, the page's path,
// the browser and the app build. Before anything leaves the device, email
// addresses, long tokens and anything after ? or # in a link are blanked,
// so a sign-in link or a person's address never lands in a report. A
// session sends at most MAX_PER_SESSION reports, each distinct error once.

import { supabase } from "./backend/supabase";

const MAX_PER_SESSION = 10;
const sent = new Set();
let count = 0;
let installed = false;

/** The build, from the main bundle's name (main.<hash>.js), so a report says which release it came from. */
function buildId() {
  try {
    const src = [...document.scripts].map((s) => s.src).find((s) => /\/static\/js\/main\.[0-9a-f]+\.js/.test(s));
    return src ? src.match(/main\.([0-9a-f]+)\.js/)[1] : "dev";
  } catch {
    return "";
  }
}

/** Blanks what must never leave the device: emails, tokens, link queries and hashes. */
export function scrub(text) {
  return String(text || "")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/(https?:\/\/[^\s?#)'"]+)[?#][^\s)'"]*/g, "$1")
    .replace(/\b(eyJ[\w-]{10,}\.[\w-]+\.[\w-]+)\b/g, "[token]")
    .replace(/\b(sb_[a-z]+_[\w-]{10,}|sk-[\w-]{10,}|ydc-sk-[\w-]{10,}|sbp_[\w]{10,}|vcp_[\w]{10,})\b/g, "[key]")
    .replace(/\b[0-9a-f]{32,}\b/gi, "[hex]");
}

/** A report from an error (or anything thrown), cut to what the server keeps. */
export function toReport(kind, error, extra = "") {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : typeof error === "string" ? error : (() => {
    try { return JSON.stringify(error); } catch { return String(error); }
  })();
  const stack = [error instanceof Error ? error.stack || "" : "", extra].filter(Boolean).join("\n--\n");
  return {
    kind,
    message: scrub(message).slice(0, 500),
    stack: scrub(stack).slice(0, 4000),
    page: typeof window !== "undefined" ? window.location.pathname.slice(0, 200) : "",
    build: buildId(),
    agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : "",
  };
}

// Noise that isn't FitClub's to fix: browser extensions, a dropped
// connection, the user leaving mid-request, ResizeObserver's harmless warning.
const IGNORED = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i,
  /Failed to fetch|NetworkError|Load failed|network error/i,
  /AbortError|The user aborted/i,
];
const FROM_EXTENSION = /(chrome|moz|safari(-web)?)-extension:/i;

/** Sends one report, unless it's noise, already sent this session, or over the session's cap. */
export function reportError(kind, error, extra = "") {
  if (!supabase) return false;
  const report = toReport(kind, error, extra);
  if (!report.message || IGNORED.some((re) => re.test(report.message)) || FROM_EXTENSION.test(report.stack)) return false;
  const key = `${report.kind}|${report.message}|${report.stack.split("\n")[1] || ""}`;
  if (sent.has(key) || count >= MAX_PER_SESSION) return false;
  sent.add(key);
  count += 1;
  supabase.rpc("fitclub_report_error", { p_report: report }).then(() => {}, () => {});
  return true;
}

/** Listens for errors nothing else caught. Called once at start-up. */
export function installErrorReports() {
  if (installed || !supabase || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (e) => {
    // A failed <img> or <script> fires here too, with no error object: not a crash.
    if (!e.error && !e.message) return;
    reportError("error", e.error || e.message, e.filename ? `${e.filename}:${e.lineno}:${e.colno}` : "");
  });
  window.addEventListener("unhandledrejection", (e) => reportError("rejection", e.reason));
}
