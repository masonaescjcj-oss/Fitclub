// Keeps the personal stores the same on every device of one account.
//
// The app's stores already persist themselves to localStorage; this module
// mirrors those keys to Supabase's fitclub_user_state table (one JSON document per
// key, see supabase/migrations/0001) without the stores knowing:
//
// - a write to a synced key marks it dirty and schedules a push;
// - a pull applies any remote document newer than the local copy;
// - last write wins per key, by timestamp.
//
// Linking a device to an account for the first time is different: the
// account's documents win over whatever this browser holds (a fresh install
// seeds sample data), and only keys the account doesn't have yet are
// uploaded. Signing out clears the synced keys, so the next person on this
// device never sees them.

/** localStorage key → user_state key. */
export const SYNCED_KEYS = {
  "fitclub.training.v1": "training.v1",
  "fitclub.diary.v1": "diary.v1",
  "fitclub.profile.v1": "profile.v1",
  "fitclub.mealplan.v1": "mealplan.v1",
  "fitclub.checklists.v1": "checklists.v1",
  "fitclub.coach.v1": "coach.v1",
  "fitclub.inbox.read": "inbox.read",
};

const META_KEY = "fitclub.sync.meta";
const TABLE = "fitclub_user_state"; // supabase/migrations/0001

// The coach's own API key is a device secret: it never leaves the browser.
const TRANSFORMS = {
  // Shared group lists have a home of their own (migration 0004): the
  // personal copy carries only this person's own lists.
  "checklists.v1": {
    out: (data) => (data && Array.isArray(data.lists) ? { ...data, lists: data.lists.filter((l) => !l.remote) } : data),
    in: (data, local) => (data && Array.isArray(data.lists)
      ? { ...data, lists: [...data.lists.filter((l) => !l.remote), ...(local?.lists || []).filter((l) => l.remote)] }
      : data),
  },
  "coach.v1": {
    out: (data) => (data && typeof data === "object" ? { ...data, apiKey: "" } : data),
    in: (data, local) => (data && typeof data === "object" ? { ...data, apiKey: local?.apiKey || "" } : data),
  },
};

// Postgres answers "…:00.123456+00:00", JavaScript writes "…:00.123Z":
// compare instants, never strings.
const ms = (iso) => Date.parse(iso || "") || 0;

const parse = (raw) => {
  if (raw == null) return undefined;
  try { return JSON.parse(raw); } catch { return undefined; }
};

/**
 * Makes a sync engine for one signed-in user.
 * `client` is a Supabase client (or anything with the same `from()` shape);
 * `storage` is window.localStorage in the app and a fake in the tests.
 */
export function createSync({ client, storage, userId, device = "", now = () => new Date().toISOString(), debounceMs = 1500 }) {
  const remoteToLocal = Object.fromEntries(Object.entries(SYNCED_KEYS).map(([local, remote]) => [remote, local]));
  let applying = false;
  let timer = null;
  let pushing = null;

  const readMeta = () => {
    const meta = parse(storage.getItem(META_KEY));
    return meta && typeof meta === "object" && meta.keys ? meta : { userId: null, keys: {} };
  };
  const writeMeta = (meta) => {
    applying = true;
    try { storage.setItem(META_KEY, JSON.stringify(meta)); } finally { applying = false; }
  };

  const localDoc = (remoteKey) => parse(storage.getItem(remoteToLocal[remoteKey]));

  const applyRemote = (row) => {
    const localKey = remoteToLocal[row.key];
    if (!localKey) return false;
    const t = TRANSFORMS[row.key];
    const value = t ? t.in(row.data, localDoc(row.key)) : row.data;
    applying = true;
    try { storage.setItem(localKey, JSON.stringify(value)); } finally { applying = false; }
    return true;
  };

  async function fetchAll() {
    const { data, error } = await client.from(TABLE).select("key, data, updated_at").eq("user_id", userId);
    if (error) throw error;
    return data || [];
  }

  async function pushKeys(remoteKeys) {
    if (!remoteKeys.length) return [];
    const meta = readMeta();
    const rows = [];
    for (const key of remoteKeys) {
      const doc = localDoc(key);
      if (doc === undefined) continue;
      const t = TRANSFORMS[key];
      rows.push({ user_id: userId, key, data: t ? t.out(doc) : doc, updated_at: meta.keys[key]?.updatedAt || now(), device });
    }
    if (!rows.length) return [];
    const { error } = await client.from(TABLE).upsert(rows, { onConflict: "user_id,key" });
    if (error) throw error;
    const after = readMeta();
    for (const row of rows) {
      // A write that landed while this push was in flight stays dirty.
      if (ms(after.keys[row.key]?.updatedAt) <= ms(row.updated_at)) after.keys[row.key] = { updatedAt: row.updated_at, dirty: false };
    }
    writeMeta(after);
    return rows.map((r) => r.key);
  }

  const engine = {
    userId,

    /** Called by the write hook when the app saves one of the synced keys. */
    noteWrite(localKey) {
      if (applying) return;
      const key = SYNCED_KEYS[localKey];
      if (!key) return;
      const meta = readMeta();
      if (meta.userId !== userId) return; // not linked yet: link() decides what to keep
      meta.keys[key] = { updatedAt: now(), dirty: true };
      writeMeta(meta);
      clearTimeout(timer);
      timer = setTimeout(() => { engine.flush().catch(() => {}); }, debounceMs);
    },

    /** Uploads every dirty key now. */
    async flush() {
      clearTimeout(timer);
      if (pushing) await pushing.catch(() => {});
      const meta = readMeta();
      const dirty = Object.entries(meta.keys).filter(([, v]) => v.dirty).map(([k]) => k);
      pushing = pushKeys(dirty);
      try { return await pushing; } finally { pushing = null; }
    },

    /**
     * First contact between this device and the account. The account's
     * documents replace the local ones; local keys the account lacks are
     * uploaded, unless another account was linked here before, whose data is
     * cleared instead. Returns the local keys that changed.
     */
    async link() {
      const previous = readMeta().userId;
      // Data another account left on this device is theirs: drop it, never upload it.
      if (previous && previous !== userId) engine.unlink();
      const remote = await fetchAll();
      const changed = [];
      const meta = { userId, keys: {} };
      for (const row of remote) {
        if (applyRemote(row)) changed.push(remoteToLocal[row.key]);
        meta.keys[row.key] = { updatedAt: row.updated_at, dirty: false };
      }
      const have = new Set(remote.map((r) => r.key));
      for (const [localKey, key] of Object.entries(SYNCED_KEYS)) {
        if (!have.has(key) && storage.getItem(localKey) != null) meta.keys[key] = { updatedAt: now(), dirty: true };
      }
      writeMeta(meta);
      await engine.flush();
      return changed;
    },

    /**
     * Regular catch-up (app start, returning to the tab): newer remote
     * documents replace local ones unless the local copy changed later.
     * Returns the local keys that changed.
     */
    async pull() {
      const meta = readMeta();
      if (meta.userId !== userId) return engine.link();
      const remote = await fetchAll();
      const changed = [];
      for (const row of remote) {
        const mine = meta.keys[row.key];
        if (mine?.dirty && ms(mine.updatedAt) >= ms(row.updated_at)) continue; // ours is newer: flush() sends it
        if (!mine || ms(row.updated_at) > ms(mine.updatedAt)) {
          if (applyRemote(row)) changed.push(remoteToLocal[row.key]);
          meta.keys[row.key] = { updatedAt: row.updated_at, dirty: false };
        }
      }
      writeMeta(meta);
      await engine.flush();
      return changed;
    },

    /** Signing out: forget the account on this device and, by default, its data. */
    unlink({ clear = true } = {}) {
      clearTimeout(timer);
      applying = true;
      try {
        if (clear) Object.keys(SYNCED_KEYS).forEach((k) => storage.removeItem(k));
        storage.removeItem(META_KEY);
      } finally { applying = false; }
    },
  };
  return engine;
}

/**
 * Calls `onWrite(key)` after every setItem on `storage`, the app's own writes
 * included. Returns a function that removes the hook.
 */
export function hookWrites(storage, onWrite) {
  const target = typeof Storage !== "undefined" && storage instanceof Storage ? Storage.prototype : storage;
  const original = target.setItem;
  const hooked = function setItem(key, value) {
    const result = original.call(this, key, value);
    if (this === storage) {
      try { onWrite(String(key)); } catch { /* a sync problem must never break a save */ }
    }
    return result;
  };
  target.setItem = hooked;
  return () => { if (target.setItem === hooked) target.setItem = original; };
}
