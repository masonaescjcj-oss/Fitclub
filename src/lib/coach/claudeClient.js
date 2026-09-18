// The wire to Claude. The athlete brings their own key, which stays in this
// browser; the app has no server to hold it for them yet.

import Anthropic from "@anthropic-ai/sdk";

export const COACH_MODEL = "claude-opus-5";
const MAX_TOKENS = 4096;
// Opts the request into server-side fallbacks, so a capacity blip on the
// primary model gets answered by the next one in Anthropic's default chain.
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

export const looksLikeKey = (key) => /^sk-ant-[A-Za-z0-9_-]{20,}$/.test((key || "").trim());

/**
 * Streams one reply. `onText` gets each delta; the promise resolves with the
 * full text once the message is complete, or rejects with a typed SDK error.
 */
export async function streamCoachReply({ apiKey, system, messages, onText, signal }) {
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
  const refused = final.stop_reason === "refusal";
  const truncated = final.stop_reason === "max_tokens";
  return {
    text,
    refused,
    truncated,
    model: final.model,
    usage: final.usage,
  };
}

/** Maps SDK errors onto the message keys the page knows how to show. */
export function classifyError(err) {
  if (!err) return "unknown";
  if (err.name === "AbortError" || err instanceof Anthropic.APIUserAbortError) return "aborted";
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) return "auth";
  if (err instanceof Anthropic.RateLimitError) return "rate";
  if (err instanceof Anthropic.APIConnectionError) return "network";
  if (err instanceof Anthropic.BadRequestError) return "request";
  if (err instanceof Anthropic.APIError) return err.status >= 500 ? "server" : "request";
  return "unknown";
}
