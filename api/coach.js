// POST /api/coach: the coach's wire to the model when the athlete has no key
// of their own. The provider keys live only here: ANTHROPIC_API_KEY for
// Claude, or, when that isn't set, YDC_API_KEY for You.com's express agent.
//
// Request:  POST, `Authorization: Bearer <Supabase access token>`,
//           JSON body `{ system, messages }` and nothing else.
// Response: `text/event-stream` with
//             event: text   data: {"text": "<delta>"}          (repeated)
//             event: done   data: {"stop_reason", "model", "usage"}
//           or, if the reply fails after it started,
//             event: error  data: {"error": "<kind>"}
//           Anything that fails before the first byte of the reply is a plain
//           JSON `{ "error": "<kind>" }` with a matching HTTP status.
// `<kind>` is one of classifyError's keys in src/lib/coach/claudeClient.js, so
// the page shows the same messages it shows for a direct call.
//
// Message contents are never logged: only error kinds, statuses and request ids.
//
// The rate limit is per user and in memory, so it is best effort: every warm
// instance keeps its own count and a cold start forgets it. A shared store
// (Upstash, a Supabase table) is the upgrade once that matters.

const { Anthropic } = require("@anthropic-ai/sdk");
const { createClient } = require("@supabase/supabase-js");

// Keep in step with src/lib/coach/claudeClient.js (tests/coach-proxy.test.mjs checks).
const COACH_MODEL = "claude-opus-5";
// Also the cost cap per reply, now that the server pays for it.
const MAX_TOKENS = 4096;
// Server-side fallbacks: a refusal or capacity blip on the primary model is
// answered by the next one in Anthropic's default chain.
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

// You.com's agent API: the second provider, used when there is no Anthropic key.
const YOU_URL = "https://api.you.com/v1/agents/runs";
const YOU_AGENT = "express";
const YOU_MODEL = "you.com/express";

const ERROR_KINDS = ["aborted", "auth", "rate", "network", "request", "server", "unknown"];

const LIMITS = {
  maxMessages: 20,
  // Characters of system prompt plus every message. The coach's own prompt is
  // about 3.5k; the rest is room for a long conversation.
  maxChars: 48000,
  maxSystemBlocks: 4,
  // Raw body, checked before parsing.
  maxBodyBytes: 256 * 1024,
};

// Replies per user per window, per instance.
const RATE = { max: 20, windowMs: 10 * 60 * 1000 };

const STATUS = { auth: 401, rate: 429, request: 400, network: 502, server: 502, unknown: 500 };

/* ───────────────────────────── helpers ───────────────────────────── */

class HttpError extends Error {
  constructor(status, kind) {
    super(kind);
    this.status = status;
    this.kind = kind;
  }
}

function sendJson(res, status, body, headers = {}) {
  if (res.headersSent) return;
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

/** One Server-Sent Event. JSON never contains a raw newline, so one data line suffices. */
function sseFrame(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function bearerToken(req) {
  const header = (req.headers && (req.headers.authorization || req.headers.Authorization)) || "";
  const match = /^Bearer\s+(\S+)$/i.exec(String(header).trim());
  return match ? match[1] : null;
}

/** Reads a Node request stream, refusing more than `max` bytes. */
function readRaw(req, max) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > max) {
        reject(new HttpError(413, "request"));
        req.destroy?.();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/**
 * The parsed JSON body. On Vercel `req.body` is already parsed (and its getter
 * throws on malformed JSON); a bare Node server hands over the raw stream.
 */
async function readBody(req, max) {
  const declared = Number(req.headers && req.headers["content-length"]);
  if (declared > max) throw new HttpError(413, "request");

  let body;
  try {
    body = req.body;
  } catch {
    throw new HttpError(400, "request");
  }
  if (body === undefined && typeof req.on === "function" && !req.readableEnded) {
    body = await readRaw(req, max);
  }
  if (Buffer.isBuffer(body)) body = body.toString("utf8");
  if (typeof body === "string") {
    if (Buffer.byteLength(body) > max) throw new HttpError(413, "request");
    try {
      body = JSON.parse(body);
    } catch {
      throw new HttpError(400, "request");
    }
  } else if (body && typeof body === "object" && Buffer.byteLength(JSON.stringify(body)) > max) {
    throw new HttpError(413, "request");
  }
  return body;
}

const isText = (v) => typeof v === "string" && v.trim().length > 0;

/** Text-only content: a string, or an array of text blocks. Returns [clean, chars] or null. */
function cleanContent(content) {
  if (isText(content)) return [content, content.length];
  if (!Array.isArray(content) || !content.length) return null;
  const blocks = [];
  let chars = 0;
  for (const b of content) {
    if (!b || b.type !== "text" || !isText(b.text)) return null;
    blocks.push({ type: "text", text: b.text });
    chars += b.text.length;
  }
  return [blocks, chars];
}

/**
 * Checks `{ system, messages }` against the caps and rebuilds it from known
 * fields only, so nothing else the caller sends reaches the API.
 * Returns `{ system, messages }` or throws an HttpError.
 */
function validateInput(body, limits = LIMITS) {
  const bad = () => new HttpError(400, "request");
  if (!body || typeof body !== "object" || Array.isArray(body)) throw bad();
  if (Object.keys(body).some((k) => k !== "system" && k !== "messages")) throw bad();

  let chars = 0;
  let system;
  if (body.system !== undefined && body.system !== null) {
    if (isText(body.system)) {
      system = body.system;
      chars += system.length;
    } else if (Array.isArray(body.system) && body.system.length <= limits.maxSystemBlocks) {
      system = body.system.map((b) => {
        if (!b || b.type !== "text" || typeof b.text !== "string") throw bad();
        chars += b.text.length;
        const block = { type: "text", text: b.text };
        if (b.cache_control && b.cache_control.type === "ephemeral") block.cache_control = { type: "ephemeral" };
        return block;
      });
    } else {
      throw bad();
    }
  }

  const { messages } = body;
  if (!Array.isArray(messages) || !messages.length) throw bad();
  if (messages.length > limits.maxMessages) throw new HttpError(413, "request");
  const clean = messages.map((m) => {
    if (!m || (m.role !== "user" && m.role !== "assistant")) throw bad();
    const content = cleanContent(m.content);
    if (!content) throw bad();
    chars += content[1];
    return { role: m.role, content: content[0] };
  });
  // The API wants the athlete first, and current models take no assistant prefill.
  if (clean[0].role !== "user" || clean[clean.length - 1].role !== "user") throw bad();
  if (chars > limits.maxChars) throw new HttpError(413, "request");

  return { system, messages: clean };
}

/* ───────────────────────────── You.com ───────────────────────────── */

/** A You.com failure, already sorted into one of ERROR_KINDS. */
class UpstreamError extends Error {
  constructor(kind, status) {
    super(`upstream: ${kind}`);
    this.name = "UpstreamError";
    this.kind = kind;
    this.status = status;
  }
}

const plainText = (content) => (typeof content === "string" ? content : content.map((b) => b.text).join("\n\n"));

/**
 * The conversation in the shape You.com's agent API takes: roles "user" and
 * "agent", plain text, and no system field, so the coach's rules and the
 * athlete's data ride at the top of the first message.
 */
function toYouInput({ system, messages }) {
  const rules = system === undefined ? "" : plainText(system);
  return messages.map((m, i) => {
    const text = plainText(m.content);
    const content = i === 0 && rules
      ? `[Coach instructions and athlete data. Apply them to the whole conversation.]\n${rules}\n\n[Athlete's message]\n${text}`
      : text;
    return { role: m.role === "assistant" ? "agent" : "user", content };
  });
}

/** The error kind for a You.com HTTP status. The key is the operator's, so a key problem is a server problem. */
function youKind(status) {
  if (status === 429) return "rate";
  if (status === 400 || status === 413 || status === 422) return "request";
  return "server";
}

/**
 * Streams one reply from You.com's express agent, yielding the answer text
 * delta by delta. Throws an UpstreamError, or the abort error once `signal`
 * fires.
 */
async function* youReply(input, { apiKey, fetchImpl, signal }) {
  let res;
  try {
    res = await (fetchImpl || fetch)(YOU_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ agent: YOU_AGENT, stream: true, input: toYouInput(input) }),
      signal,
    });
  } catch (err) {
    if (signal && signal.aborted) throw err;
    throw new UpstreamError("network");
  }
  if (!res.ok) throw new UpstreamError(youKind(res.status), res.status);
  if (!res.body) throw new UpstreamError("network");

  const decoder = new TextDecoder();
  let pending = "";
  let buf = "";
  let said = false;
  try {
    for await (const chunk of res.body) {
      pending += typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
      // Frames end in CRLF; a CR split from its LF must not read as two line ends.
      const cut = pending.endsWith("\r") ? pending.length - 1 : pending.length;
      buf += pending.slice(0, cut).replace(/\r\n?/g, "\n");
      pending = pending.slice(cut);
      let end;
      while ((end = buf.indexOf("\n\n")) >= 0) {
        const frame = buf.slice(0, end);
        buf = buf.slice(end + 2);
        const data = frame.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart()).join("\n");
        if (!data) continue;
        let event;
        try {
          event = JSON.parse(data);
        } catch {
          continue;
        }
        const type = String(event.type || "");
        const out = event.response;
        if (type === "response.output_text.delta") {
          if (out && out.type === "message.answer" && typeof out.delta === "string" && out.delta) {
            said = true;
            yield out.delta;
          }
        } else if (type === "response.done") {
          if (!said) throw new UpstreamError("server");
          return;
        } else if (type.includes("error") || type.includes("failed")) {
          throw new UpstreamError("server");
        }
      }
    }
  } catch (err) {
    if (err instanceof UpstreamError || (signal && signal.aborted)) throw err;
    throw new UpstreamError("network");
  }
  // The connection closed before the run finished.
  throw new UpstreamError("network");
}

/**
 * Maps an SDK error onto classifyError's keys. The key and the account are
 * the operator's, so an upstream auth failure is a server problem here, not
 * something the athlete can fix in settings.
 */
function classifyUpstream(err) {
  if (!err) return "unknown";
  if (err.name === "AbortError" || err instanceof Anthropic.APIUserAbortError) return "aborted";
  if (err instanceof UpstreamError) return err.kind;
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) return "server";
  if (err instanceof Anthropic.RateLimitError) return "rate";
  if (err instanceof Anthropic.APIConnectionError) return "network";
  if (err instanceof Anthropic.BadRequestError) return "request";
  if (err instanceof Anthropic.APIError) return err.status >= 500 ? "server" : "request";
  return "unknown";
}

/** A sliding-window counter per user. In memory: per instance, lost on cold start. */
function createRateLimiter({ max, windowMs }, now = Date.now) {
  const hits = new Map();
  return function take(userId) {
    const t = now();
    const recent = (hits.get(userId) || []).filter((at) => t - at < windowMs);
    if (recent.length >= max) {
      hits.set(userId, recent);
      return { ok: false, retryAfter: Math.max(1, Math.ceil((recent[0] + windowMs - t) / 1000)) };
    }
    recent.push(t);
    hits.set(userId, recent);
    // Forget idle users so a long-lived instance doesn't grow without bound.
    if (hits.size > 5000) {
      for (const [id, times] of hits) if (!times.length || t - times[times.length - 1] >= windowMs) hits.delete(id);
    }
    return { ok: true };
  };
}

/* ───────────────────────────── handler ───────────────────────────── */

/**
 * Builds the handler around its dependencies, so tests can pass fakes.
 *  - anthropic: an Anthropic client (anything with `beta.messages.stream`), or
 *    a function returning one; null means ANTHROPIC_API_KEY is missing.
 *  - youdotcom: `{ apiKey, fetchImpl? }` for You.com's agent API, or a
 *    function returning it; used only when there is no Anthropic client.
 *  - verifyUser: async (token) => ({ id }) for a valid token, null for an
 *    invalid one; throws when the auth service can't be reached. Null means
 *    the Supabase variables are missing.
 */
function createCoachHandler({ anthropic, youdotcom, verifyUser, limits = LIMITS, rate = RATE, now = Date.now, log = console } = {}) {
  const getClient = typeof anthropic === "function" ? anthropic : () => anthropic;
  const getYou = typeof youdotcom === "function" ? youdotcom : () => youdotcom;
  const take = createRateLimiter(rate, now);

  return async function coach(req, res) {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "request" }, { Allow: "POST" });
      return;
    }

    const client = getClient();
    const you = client ? null : getYou();
    const provider = client || (you && you.apiKey);
    if (!provider || !verifyUser) {
      log.error("[coach] not configured:", !provider ? "ANTHROPIC_API_KEY (or YDC_API_KEY)" : "SUPABASE_URL / SUPABASE_ANON_KEY");
      sendJson(res, 500, { error: "server" });
      return;
    }

    const token = bearerToken(req);
    if (!token) {
      sendJson(res, 401, { error: "auth" }, { "WWW-Authenticate": "Bearer" });
      return;
    }
    let user;
    try {
      user = await verifyUser(token);
    } catch (err) {
      log.error("[coach] auth check failed:", err && (err.name || "error"), err && err.status);
      sendJson(res, 502, { error: "network" });
      return;
    }
    if (!user || !user.id) {
      sendJson(res, 401, { error: "auth" }, { "WWW-Authenticate": "Bearer" });
      return;
    }

    let input;
    try {
      input = validateInput(await readBody(req, limits.maxBodyBytes), limits);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 400;
      sendJson(res, status, { error: "request" });
      return;
    }

    const slot = take(user.id);
    if (!slot.ok) {
      sendJson(res, 429, { error: "rate" }, { "Retry-After": String(slot.retryAfter) });
      return;
    }

    // The athlete tapping Stop closes the connection; stop paying for the reply.
    const ctrl = new AbortController();
    const onClose = () => { if (!res.writableFinished) ctrl.abort(); };
    res.on?.("close", onClose);

    // The SSE response starts with the first upstream event, so an error that
    // comes before any output still gets a real HTTP status.
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      });
      res.flushHeaders?.();
    };

    try {
      if (!client) {
        for await (const text of youReply(input, { apiKey: you.apiKey, fetchImpl: you.fetchImpl, signal: ctrl.signal })) {
          start();
          res.write(sseFrame("text", { text }));
        }
        start();
        res.write(sseFrame("done", { stop_reason: "end_turn", model: YOU_MODEL, usage: null }));
        res.end();
        return;
      }

      const stream = client.beta.messages.stream(
        {
          model: COACH_MODEL,
          max_tokens: MAX_TOKENS,
          thinking: { type: "adaptive" },
          betas: [FALLBACK_BETA],
          fallbacks: "default",
          ...(input.system !== undefined ? { system: input.system } : {}),
          messages: input.messages,
        },
        { signal: ctrl.signal }
      );

      for await (const event of stream) {
        start();
        if (event.type === "content_block_delta" && event.delta && event.delta.type === "text_delta" && event.delta.text) {
          res.write(sseFrame("text", { text: event.delta.text }));
        }
      }
      const final = await stream.finalMessage();
      start();
      res.write(sseFrame("done", { stop_reason: final.stop_reason, model: final.model, usage: final.usage }));
      res.end();
    } catch (err) {
      const kind = classifyUpstream(err);
      if (kind === "aborted" || ctrl.signal.aborted) {
        if (!res.writableEnded) res.end();
        return;
      }
      log.error("[coach] upstream error:", client ? "anthropic" : "you.com", kind, err && err.status, (err && err.requestID) || "");
      if (started) {
        res.write(sseFrame("error", { error: kind }));
        res.end();
      } else {
        sendJson(res, STATUS[kind] || 500, { error: kind });
      }
    } finally {
      res.off?.("close", onClose);
    }
  };
}

/* ───────────────────────────── wiring ───────────────────────────── */

/** Verifies a Supabase access token with the project's anon key. */
function supabaseVerifier(url, anonKey) {
  if (!url || !anonKey) return null;
  let sb;
  try {
    sb = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  } catch {
    return null;
  }
  return async (token) => {
    const { data, error } = await sb.auth.getUser(token);
    if (error) {
      // A 4xx means the token is bad or expired; anything else means Supabase
      // itself is out of reach, which is not the caller's fault.
      if (error.name !== "AuthRetryableFetchError" && error.status >= 400 && error.status < 500) return null;
      throw error;
    }
    return data && data.user ? { id: data.user.id } : null;
  };
}

let anthropicClient;
let handler;

function defaultHandler() {
  if (!handler) {
    handler = createCoachHandler({
      anthropic: () => {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) return null;
        if (!anthropicClient) anthropicClient = new Anthropic({ apiKey, maxRetries: 1 });
        return anthropicClient;
      },
      youdotcom: () => (process.env.YDC_API_KEY ? { apiKey: process.env.YDC_API_KEY } : null),
      // The REACT_APP_ pair is the same public project URL and anon key, so it
      // serves as a fallback when the server-side names aren't set.
      verifyUser: supabaseVerifier(
        process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY
      ),
    });
  }
  return handler;
}

module.exports = async (req, res) => defaultHandler()(req, res);
module.exports.createCoachHandler = createCoachHandler;
module.exports.validateInput = validateInput;
module.exports.classifyUpstream = classifyUpstream;
module.exports.toYouInput = toYouInput;
module.exports.youReply = youReply;
module.exports.UpstreamError = UpstreamError;
module.exports.YOU_MODEL = YOU_MODEL;
module.exports.sseFrame = sseFrame;
module.exports.COACH_MODEL = COACH_MODEL;
module.exports.MAX_TOKENS = MAX_TOKENS;
module.exports.FALLBACK_BETA = FALLBACK_BETA;
module.exports.ERROR_KINDS = ERROR_KINDS;
module.exports.LIMITS = LIMITS;
module.exports.RATE = RATE;
