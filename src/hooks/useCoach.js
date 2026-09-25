import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNutritionStore } from "../lib/nutrition/nutritionContext";
import { useTrainingStore } from "../lib/training/trainingContext";
import { useChecklistStore } from "../lib/checklistContext";
import { loadSession } from "../lib/session";
import { buildCoachSnapshot, coachSystemBlocks, demoReply, suggestionChips } from "../lib/coach/context";
import { classifyError, coachMode, proxyAvailable, proxyForced, streamCoachReply } from "../lib/coach/claudeClient";
import { createMessage, loadCoach, saveCoach, toApiMessages } from "../lib/coach/coachStore";

/** Reveals an offline reply a few words at a time, so it reads like a stream. */
function typeOut(full, signal, onPartial) {
  return new Promise((resolve, reject) => {
    const words = full.split(/(\s+)/);
    let i = 0;
    let acc = "";
    const abort = () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
    const tick = () => {
      if (signal.aborted) return abort();
      acc += words[i] ?? "";
      i += 1;
      onPartial(acc);
      if (i >= words.length) return resolve(acc);
      return setTimeout(tick, 18 + Math.random() * 28);
    };
    setTimeout(tick, 400);
  });
}

/**
 * Owns the coach conversation. Every send rebuilds the athlete's snapshot from
 * the live stores, so the coach always answers about the day as it is now.
 */
export default function useCoach(isRtl) {
  const nutrition = useNutritionStore();
  const training = useTrainingStore();
  const { lists } = useChecklistStore();

  const [state, setState] = useState(loadCoach);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const first = useRef(true);

  // Streaming rewrites the last bubble many times a second; persist once it settles.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!streaming) saveCoach(state);
  }, [state, streaming]);

  const name = loadSession().name || "Isaac";

  const snapshot = useMemo(
    () => buildCoachSnapshot({ nutrition, training, lists, name, isRtl, include: state.include }),
    // The stores hand out fresh objects only when their data changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nutrition.diary, nutrition.profile, nutrition.estimate, nutrition.trend, training.sessions, training.activeProgram, lists, name, isRtl, state.include]
  );

  const chips = useMemo(() => suggestionChips(snapshot, isRtl), [snapshot, isRtl]);
  // "proxy" talks through FitClub's server, "key" with the athlete's own key,
  // "demo" builds replies offline. Either of the first two is a live coach.
  const mode = coachMode(state.apiKey);
  const live = mode !== "demo";

  const patchMessage = useCallback((id, fn) => {
    setState((s) => ({ ...s, messages: s.messages.map((m) => (m.id === id ? fn(m) : m)) }));
  }, []);

  const send = useCallback(async (text) => {
    const q = (text || "").trim();
    if (!q || abortRef.current) return;
    setError(null);

    const userMsg = createMessage({ role: "user", text: q });
    const reply = createMessage({ role: "assistant", text: "", source: live ? "live" : "demo" });
    const history = toApiMessages([...stateRef.current.messages, userMsg]);
    setState((s) => ({ ...s, messages: [...s.messages, userMsg, reply] }));
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const setText = (t) => patchMessage(reply.id, (m) => ({ ...m, text: t }));

    try {
      if (live) {
        const result = await streamCoachReply({
          apiKey: stateRef.current.apiKey,
          system: coachSystemBlocks(snapshot),
          messages: history,
          onText: (_delta, full) => setText(full),
          signal: ctrl.signal,
        });
        patchMessage(reply.id, (m) => ({
          ...m, text: result.text, refused: result.refused, truncated: result.truncated, model: result.model,
        }));
      } else {
        await typeOut(demoReply(q, snapshot, isRtl), ctrl.signal, setText);
      }
    } catch (err) {
      const kind = classifyError(err);
      if (kind !== "aborted") setError(kind);
      // A bubble that never got a word is noise; a half-answer is worth keeping.
      setState((s) => ({
        ...s,
        messages: s.messages.filter((m) => m.id !== reply.id || m.text.trim()),
      }));
    } finally {
      abortRef.current = null;
      setStreaming(false);
    }
  }, [live, snapshot, isRtl, patchMessage]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const api = useMemo(() => ({
    setApiKey: (apiKey) => setState((s) => ({ ...s, apiKey: (apiKey || "").trim() })),
    setInclude: (patch) => setState((s) => ({ ...s, include: { ...s.include, ...patch } })),
    clear: () => { abortRef.current?.abort(); setState((s) => ({ ...s, messages: [] })); setError(null); },
    dismissError: () => setError(null),
  }), []);

  return {
    messages: state.messages, apiKey: state.apiKey, include: state.include,
    snapshot, chips, live, mode, viaProxy: mode === "proxy", proxyAvailable, proxyForced, streaming, error, name,
    send, stop, ...api,
  };
}
