// Screens load their code when first opened (React.lazy). On a weak mobile
// connection that request can fail, and after a new release the files the
// open page asks for are gone. Both used to end on the error screen; now a
// failed load is tried again, and if it still fails one reload fetches the
// current release.

import { lazy } from "react";

const RELOAD_KEY = "fitclub.chunk-reload";
const RELOAD_GAP_MS = 30000;

/** Whether an error is a screen's code failing to arrive, not a bug in it. */
export function isChunkError(error) {
  const text = `${error?.name || ""} ${error?.message || ""}`;
  return /ChunkLoadError|Loading (CSS )?chunk \S+ failed|dynamically imported module|Importing a module script failed/i.test(text);
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Runs `load` up to `tries` times, waiting longer each time; any other error is thrown at once. */
export async function importWithRetry(load, { tries = 3, delay = 700, wait = pause } = {}) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await load();
    } catch (error) {
      if (!isChunkError(error) || attempt >= tries) throw error;
      await wait(delay * 2 ** (attempt - 1));
    }
  }
}

/**
 * One reload per half minute at most, and never offline, where it can't
 * help: the error screen says to check the connection instead.
 */
export function reloadOnce({ storage = window.sessionStorage, online = navigator.onLine !== false, now = Date.now(), reload = () => window.location.reload() } = {}) {
  if (!online) return false;
  try {
    if (now - Number(storage.getItem(RELOAD_KEY) || 0) < RELOAD_GAP_MS) return false;
    storage.setItem(RELOAD_KEY, String(now));
  } catch {
    return false;
  }
  reload();
  return true;
}

/** React.lazy for a screen, with the retries and the reload above. */
export function lazyScreen(load) {
  return lazy(async () => {
    try {
      return await importWithRetry(load);
    } catch (error) {
      // The page is reloading: keep showing the fallback until it does.
      if (isChunkError(error) && reloadOnce()) return new Promise(() => {});
      throw error;
    }
  });
}
