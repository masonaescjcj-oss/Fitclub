// Conversation + settings for the coach tab, kept in localStorage like the
// rest of the app. The API key is the athlete's own and never leaves this
// browser except in requests to Anthropic.

import { DEFAULT_INCLUDE } from "./context";

const KEY = "fitclub.coach.v1";
const MAX_MESSAGES = 60;

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const EMPTY = { apiKey: "", include: { ...DEFAULT_INCLUDE }, messages: [] };

export function createMessage({ role, text = "", source = "live" }) {
  return { id: uid(), role, text, source, at: new Date().toISOString() };
}

export function loadCoach() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
        include: { ...DEFAULT_INCLUDE, ...(parsed.include || {}) },
        messages: Array.isArray(parsed.messages) ? parsed.messages.slice(-MAX_MESSAGES) : [],
      };
    }
  } catch {
    // Corrupt or unavailable — a fresh conversation costs nothing.
  }
  return { ...EMPTY, include: { ...DEFAULT_INCLUDE }, messages: [] };
}

export function saveCoach(state) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...state, messages: state.messages.slice(-MAX_MESSAGES) }));
  } catch {
    // Quota or private mode; the session still works in memory.
  }
}

/** The transcript as the API wants it: alternating roles, empty turns dropped. */
export function toApiMessages(messages, limit = 20) {
  const out = [];
  for (const m of messages.slice(-limit)) {
    let text = (m.text || "").trim();
    if (!text) continue;
    // The coach should know which of its proposals were taken.
    if (m.actionState === "applied") text += "\n\n[The athlete applied the changes above.]";
    else if (m.actionState === "dismissed") text += "\n\n[The athlete chose not to apply the changes above.]";
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += `\n\n${text}`;
    else out.push({ role: m.role, content: text });
  }
  // The API requires the conversation to open with the athlete.
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}
