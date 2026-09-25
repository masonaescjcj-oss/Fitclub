// The wire to Claude, in one of two ways:
//  - proxy: through FitClub's own /api/coach function, which holds the
//    Anthropic key and checks the athlete's Supabase sign-in (api/coach.js);
//  - key: straight from this browser with the athlete's own key, which stays
//    here. Handy in development and for anyone who'd rather pay Anthropic
//    directly.
// coachMode() picks one; streamCoachReply() takes the same arguments for both.

import Anthropic from "@anthropic-ai/sdk";
import { backendOn, getAccessToken } from "../backend/supabase";

export const COACH_MODEL = "claude-opus-5";
const MAX_TOKENS = 4096;
// Opts the request into server-side fallbacks, so a capacity blip on the
// primary model gets answered by the next one in Anthropic's default chain.
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

export const PROXY_URL = "/api/coach";
// The server's caps (api/coach.js LIMITS); the client trims to fit them first.
export const PROXY_LIMITS = { maxMessages: 20, maxChars: 48000 };

/** Every error kind the page has a message for; the proxy answers with these too. */
export const ERROR_KINDS = ["aborted", "auth", "rate", "network", "request", "server", "unknown"];

// REACT_APP_COACH_PROXY=1 sends every message through the server, own key or not.
export const proxyForced = process.env.REACT_APP_COACH_PROXY === "1";
/** Whether this build can talk to the coach without a key of the athlete's own. */
export const proxyAvailable = backendOn || proxyForced;

export const looksLikeKey = (key) => /^sk-ant-[A-Za-z0-9_-]{20,}$/.test((key || "").trim());

/** "proxy" | "key" | "demo" for an athlete with this saved key. */
export function coachMode(apiKey) {
  if (proxyForced) return "proxy";
  if (looksLikeKey(apiKey)) return "key";
  return backendOn ? "proxy" : "demo";
}

/** A failure the proxy reported, carrying one of ERROR_KINDS. */
export class CoachProxyError extends Error {
  constructor(kind, status) {
    super(`coach proxy: ${kind}`);
    this.name = "CoachProxyError";
    this.kind = ERROR_KINDS.includes(kind) ? kind : "unknown";
    this.status = status;
  }
}

/**
 * Streams one reply. `onText` gets each delta; the promise resolves with the
 * full text once the message is complete, or rejects with an error that
 * classifyError() understands.
 */
export async function streamCoachReply({ apiKey, system, messages, onText, signal }) {
  if (coachMode(apiKey) === "proxy") return streamViaProxy({ system, messages, onText, signal });

  const client = new Anthropic({ apiKey: apiKey.trim(), dangerouslyAllowBrowser: true, maxRetries: 1 });

  const stream = client.beta.messages.stream(
    {
      model: COACH_MODEL,
      max_tokens: MAX_TOKENS,
      thinking: { type: "adaptive" },
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      system,
      messages,
    },
    { signal }
  );

  let text = "";
  stream.on("text", (delta) => {
    text += delta;
    onText?.(delta, text);
  });

  const final = await stream.finalMessage();
  return summarize(text, final);
}

const summarize = (text, final) => ({
  text,
  refused: final.stop_reason === "refusal",
  truncated: final.stop_reason === "max_tokens",
  model: final.model,
  usage: final.usage,
});

/* ──────────────────────────── proxy ──────────────────────────── */

const charsOf = (content) =>
  typeof content === "string" ? content.length : (content || []).reduce((n, b) => n + (b.text || "").length, 0);

/**
 * Drops the oldest turns until the conversation fits the server's caps, so a
 * long chat keeps working instead of being refused. The newest question is
 * always sent; one that alone is too long gets the server's "request" error.
 */
export function fitToLimits(system, messages, limits = PROXY_LIMITS) {
  let out = messages.slice(-limits.maxMessages);
  const fixed = charsOf(Array.isArray(system) ? system : system ? [{ text: system }] : []);
  let total = fixed + out.reduce((n, m) => n + charsOf(m.content), 0);
  while (out.length > 1 && total > limits.maxChars) {
    total -= charsOf(out[0].content);
    out = out.slice(1);
  }
  while (out.length > 1 && out[0].role !== "user") out = out.slice(1);
  return out;
}

/**
 * An incremental Server-Sent Events parser: feed it decoded text, get back
 * the complete events so far as `{ event, data }` with `data` still a string.
 */
export function createSseParser() {
  let buffer = "";
  return function push(chunk) {
    buffer += chunk;
    const events = [];
    let cut = buffer.indexOf("\n\n");
    while (cut !== -1) {
      const block = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      let event = "message";
      const data = [];
      for (const raw of block.split("\n")) {
        const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
        if (!line || line.startsWith(":")) continue;
        const colon = line.indexOf(":");
        const field = colon === -1 ? line : line.slice(0, colon);
        const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
        if (field === "event") event = value;
        else if (field === "data") data.push(value);
      }
      if (data.length) events.push({ event, data: data.join("\n") });
      cut = buffer.indexOf("\n\n");
    }
    return events;
  };
}

/** The error kind in a non-2xx proxy response, from its JSON body or its status. */
async function kindOfResponse(res) {
  try {
    const body = await res.json();
    if (body && ERROR_KINDS.includes(body.error)) return body.error;
  } catch {
    // Not JSON: a platform error page, or no function at that path.
  }
  if (res.status === 401 || res.status === 403) return "auth";
  if (res.status === 429) return "rate";
  if (res.status >= 400 && res.status < 500 && res.status !== 404) return "request";
  return "server";
}

const parseJson = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

/**
 * One reply through /api/coach. Same result shape as the direct call. The
 * token defaults to the signed-in Supabase session; `fetchImpl` is for tests.
 */
export async function streamViaProxy({ system, messages, onText, signal, token, fetchImpl }) {
  const bearer = token !== undefined ? token : await getAccessToken();
  if (!bearer) throw new CoachProxyError("auth", 401);

  let res;
  try {
    res = await (fetchImpl || fetch)(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream", Authorization: `Bearer ${bearer}` },
      body: JSON.stringify({ system, messages: fitToLimits(system, messages) }),
      signal,
    });
  } catch (err) {
    if (err && err.name === "AbortError") throw err;
    throw new CoachProxyError("network");
  }
  if (!res.ok) throw new CoachProxyError(await kindOfResponse(res), res.status);
  if (!res.body) throw new CoachProxyError("network");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const parse = createSseParser();
  let text = "";
  let final = null;
  try {
    for (;;) {
      let chunk;
      try {
        chunk = await reader.read();
      } catch (err) {
        if (err && err.name === "AbortError") throw err;
        throw new CoachProxyError("network");
      }
      const events = parse(chunk.done ? decoder.decode() : decoder.decode(chunk.value, { stream: true }));
      for (const { event, data } of events) {
        const payload = parseJson(data) || {};
        if (event === "text" && typeof payload.text === "string") {
          text += payload.text;
          onText?.(payload.text, text);
        } else if (event === "done") {
          final = payload;
        } else if (event === "error") {
          throw new CoachProxyError(payload.error);
        }
      }
      if (chunk.done || final) break;
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  // The connection closed before the reply finished.
  if (!final) throw new CoachProxyError("network");
  return summarize(text, final);
}

/* ──────────────────────────── errors ──────────────────────────── */

/** Maps SDK and proxy errors onto the message keys the page knows how to show. */
export function classifyError(err) {
  if (!err) return "unknown";
  if (err.name === "AbortError" || err instanceof Anthropic.APIUserAbortError) return "aborted";
  if (err.name === "CoachProxyError") return ERROR_KINDS.includes(err.kind) ? err.kind : "unknown";
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) return "auth";
  if (err instanceof Anthropic.RateLimitError) return "rate";
  if (err instanceof Anthropic.APIConnectionError) return "network";
  if (err instanceof Anthropic.BadRequestError) return "request";
  if (err instanceof Anthropic.APIError) return err.status >= 500 ? "server" : "request";
  return "unknown";
}
