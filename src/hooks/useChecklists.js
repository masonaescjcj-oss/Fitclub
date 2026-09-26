import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ME, applyReset, createItem, createList, periodKey, periodStart } from "../lib/checklistModel";
import { loadState, saveState } from "../lib/checklistStore";
import { backendOn } from "../lib/backend/supabase";
import { loadSession } from "../lib/session";
import { createListsApi } from "../lib/listsApi";

// While the live stream is down (a blocked network, a sleeping tab), shared
// lists are fetched this often instead.
const POLL_MS = 8000;
const SAFETY_MS = 30000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** A list's settings with an edit applied; a changed schedule re-anchors the period. */
function withPatch(l, patch) {
  const reset = patch.reset ? { ...l.reset, ...patch.reset } : l.reset;
  const next = { ...l, ...patch, reset };
  return next.reset.mode !== l.reset.mode ||
    next.reset.resetHour !== l.reset.resetHour ||
    next.reset.weekStart !== l.reset.weekStart ||
    next.reset.monthDay !== l.reset.monthDay ||
    next.reset.every !== l.reset.every
    ? { ...next, periodKey: periodKey(next.reset) }
    : next;
}

/**
 * Whether this device should ask the server to roll a shared list over, and
 * from which period to which. A clock behind the list's never asks.
 */
function rollDue(list, now = new Date()) {
  if (!list.remote || !list.reset || list.reset.mode === "none") return null;
  const to = periodKey(list.reset, now);
  if (to === list.periodKey) return null;
  if (to.split(":")[0] === (list.periodKey || "").split(":")[0] && to < list.periodKey) return null;
  const start = periodStart(list.reset, now);
  return { from: list.periodKey, to, prev: periodKey(list.reset, new Date(start.getTime() - 1)) };
}

/** A group list with real people in it that isn't on the server yet. */
const needsPublish = (l) => !l.remote && l.type === "group" && (l.members || []).some((m) => m.id !== ME.id && UUID.test(m.id));

/**
 * Owns every checklist mutation and keeps localStorage in sync.
 * Also watches the clock so a list rolls over while the page is open.
 *
 * With accounts on, a group list lives on the server (supabase/migrations/0004):
 * every change here is applied at once and sent, in order, per list; what
 * the server answers replaces the local copy, and other members' changes
 * arrive live (or by polling when the live stream is blocked).
 */
export default function useChecklists() {
  const [state, setState] = useState(loadState);
  const latest = useRef(state);
  latest.current = state;
  const first = useRef(true);
  const apiRef = useRef(null);
  const queues = useRef(new Map());   // list id -> the last call in its queue
  const pending = useRef(new Map());  // list id -> calls not answered yet
  const rolled = useRef(new Set());   // rollovers already asked for
  const publishing = useRef(new Set());
  const [live, setLive] = useState(false);
  const [contactsList, setContacts] = useState([]);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    saveState(state);
  }, [state]);

  const patchList = useCallback((listId, fn) => {
    setState((s) => ({ ...s, lists: s.lists.map((l) => (l.id === listId ? fn(l) : l)) }));
  }, []);

  const patchItem = useCallback((listId, itemId, fn) => {
    patchList(listId, (l) => ({ ...l, items: l.items.map((i) => (i.id === itemId ? fn(i) : i)) }));
  }, [patchList]);

  const dropLocal = useCallback((listId) => {
    setState((s) => {
      const lists = s.lists.filter((l) => l.id !== listId);
      return { lists, activeId: s.activeId === listId ? lists[0]?.id ?? null : s.activeId };
    });
  }, []);

  /** Lays the server's copy of a list over the local one, unless changes to it are still on their way. */
  const applyServer = useCallback((list) => {
    if (!list || pending.current.get(list.id)) return;
    setState((s) => {
      const i = s.lists.findIndex((l) => l.id === list.id);
      const lists = s.lists.slice();
      if (i >= 0) lists[i] = { ...list, archived: s.lists[i].archived };
      else lists.push(list);
      return { ...s, lists };
    });
  }, []);

  const refetch = useCallback((listId) => {
    const api = apiRef.current;
    if (!api) return;
    api.bundle(listId).then(applyServer).catch((e) => { if (e.code === "list_not_found" && !pending.current.get(listId)) dropLocal(listId); });
  }, [applyServer, dropLocal]);

  /**
   * Sends one change to a shared list after the ones before it. The last
   * answer to arrive is the list as it now stands; a failure reloads it.
   */
  const send = useCallback((listId, fn) => {
    const api = apiRef.current;
    if (!api) return Promise.resolve(null);
    const p = pending.current;
    p.set(listId, (p.get(listId) || 0) + 1);
    const settle = () => { const n = (p.get(listId) || 1) - 1; if (n) p.set(listId, n); else p.delete(listId); };
    const run = (queues.current.get(listId) || Promise.resolve()).then(() => fn(api));
    const tail = run.then(
      (result) => { settle(); if (result?.id === listId) applyServer(result); return result; },
      () => { settle(); if (!p.get(listId)) refetch(listId); return null; },
    );
    queues.current.set(listId, tail);
    return tail;
  }, [applyServer, refetch]);

  /** Asks the server to roll a shared list over (once), showing the new period at once. */
  const maybeRoll = useCallback((list) => {
    const due = rollDue(list);
    if (!due) return;
    const key = `${list.id}:${due.from}>${due.to}`;
    if (rolled.current.has(key)) return;
    rolled.current.add(key);
    patchList(list.id, (l) => applyReset(l));
    send(list.id, (api) => api.roll(list.id, due.from, due.to, due.prev));
  }, [patchList, send]);

  /** Makes a group list with real people in it a shared one. */
  const publish = useCallback((list) => {
    const api = apiRef.current;
    if (!api || publishing.current.has(list.id)) return;
    publishing.current.add(list.id);
    api.create(list, list.members.map((m) => m.id))
      .then((server) => {
        setState((s) => ({
          lists: s.lists.map((l) => (l.id === list.id ? { ...server, archived: l.archived } : l)),
          activeId: s.activeId === list.id ? server.id : s.activeId,
        }));
      })
      .catch(() => {}) // stays a local group list; the next sync tries again
      .finally(() => publishing.current.delete(list.id));
  }, []);

  /** Every shared list from the server, laid over the local ones. */
  const syncAll = useCallback(async () => {
    const api = apiRef.current;
    if (!api) return;
    let server;
    try { server = await api.sync(); } catch { return; }
    const byId = new Map(server.map((l) => [l.id, l]));
    setState((s) => {
      const lists = [];
      for (const l of s.lists) {
        if (!l.remote || pending.current.get(l.id)) lists.push(l);
        else if (byId.has(l.id)) lists.push({ ...byId.get(l.id), archived: l.archived });
        // else: left, removed or deleted elsewhere
        byId.delete(l.id);
      }
      for (const l of byId.values()) if (!pending.current.get(l.id)) lists.push(l);
      const activeId = lists.some((l) => l.id === s.activeId) ? s.activeId : lists[0]?.id ?? null;
      return { lists, activeId };
    });
    server.forEach(maybeRoll);
    latest.current.lists.filter(needsPublish).forEach(publish);
  }, [maybeRoll, publish]);

  // Shared lists: signed in with accounts on.
  useEffect(() => {
    const session = loadSession();
    if (!backendOn || !session.signedIn || !session.userId) return undefined;
    const api = createListsApi({ me: session.userId });
    apiRef.current = api;
    let open = false;
    const soon = new Map();
    const onChange = (listId) => {
      const key = listId || "*";
      clearTimeout(soon.get(key));
      soon.set(key, setTimeout(() => { soon.delete(key); if (listId) refetch(listId); else syncAll(); }, 250));
    };
    let lastSync = 0;
    const sync = () => { lastSync = Date.now(); syncAll(); };
    const stop = api.subscribe(onChange, (status) => {
      open = status === "open";
      setLive(open);
      if (open) sync();
    });
    sync();
    api.contacts().then(setContacts).catch(() => {});
    // Without the live stream, every few seconds; with it, now and then, in case it dropped an event.
    const poll = setInterval(() => {
      if (!document.hidden && (!open || Date.now() - lastSync >= SAFETY_MS)) sync();
    }, POLL_MS);
    const onVisible = () => { if (!document.hidden) sync(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      stop();
      clearInterval(poll);
      soon.forEach((t) => clearTimeout(t));
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      apiRef.current = null;
    };
  }, [refetch, syncAll]);

  // A list whose period ends at midnight should clear itself without a refresh.
  // A shared one is rolled over by the server, once, for everyone.
  useEffect(() => {
    const tick = () => {
      setState((s) => {
        const lists = s.lists.map((l) => (l.remote ? l : applyReset(l)));
        const changed = lists.some((l, i) => l.periodKey !== s.lists[i].periodKey);
        return changed ? { ...s, lists } : s;
      });
      latest.current.lists.filter((l) => l.remote).forEach(maybeRoll);
    };
    const id = setInterval(tick, 60000);
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [maybeRoll]);

  const listById = (id) => latest.current.lists.find((l) => l.id === id);

  const api = useMemo(() => ({
    setActiveList: (id) => setState((s) => ({ ...s, activeId: id })),

    addList: (patch) => {
      const list = createList(patch);
      setState((s) => ({ lists: [...s.lists, list], activeId: list.id }));
      if (apiRef.current && needsPublish(list)) publish(list);
      return list;
    },

    updateList: (id, patch) => {
      const old = listById(id);
      if (!old) return;
      const next = withPatch(old, patch);
      patchList(id, () => next);
      if (old.remote) {
        const settings = {};
        for (const k of ["name", "emoji", "color", "groupRule", "reset"]) if (k in patch) settings[k] = next[k];
        if (next.periodKey !== old.periodKey) settings.periodKey = next.periodKey;
        if (Object.keys(settings).length) send(id, (a) => a.update(id, settings));
        if (patch.members) {
          const had = new Set(old.members.map((m) => m.id));
          const keep = new Set(patch.members.map((m) => m.id));
          const added = patch.members.filter((m) => !had.has(m.id)).map((m) => m.id);
          if (added.length) send(id, (a) => a.addMembers(id, added));
          for (const m of old.members) if (m.id !== ME.id && !keep.has(m.id)) send(id, (a) => a.removeMember(id, m.id));
        }
      } else if (apiRef.current && needsPublish(next)) {
        publish(next);
      }
    },

    /** Deletes a list; a shared one I don't own, I leave instead. */
    removeList: (id) => {
      const l = listById(id);
      dropLocal(id);
      if (l?.remote) send(id, (a) => (l.ownerId === ME.id ? a.remove(id) : a.leave(id)));
    },

    /** Clears every tick immediately, keeping the schedule intact. */
    resetListNow: (id) => {
      const l = listById(id);
      patchList(id, (x) => ({
        ...x,
        items: x.items.map((i) => ({ ...i, doneBy: {} })),
        lastResetAt: new Date().toISOString(),
        periodKey: periodKey(x.reset),
      }));
      if (l?.remote) send(id, (a) => a.clear(id, periodKey(l.reset)));
    },

    addItem: (listId, patch) => {
      const item = createItem(patch);
      patchList(listId, (l) => ({ ...l, items: [...l.items, item] }));
      if (listById(listId)?.remote) send(listId, (a) => a.putItem(listId, item));
    },

    updateItem: (listId, itemId, patch) => {
      patchItem(listId, itemId, (i) => ({ ...i, ...patch }));
      if (listById(listId)?.remote) send(listId, (a) => a.putItem(listId, { ...patch, id: itemId }, { whole: false }));
    },

    removeItem: (listId, itemId) => {
      patchList(listId, (l) => ({ ...l, items: l.items.filter((i) => i.id !== itemId) }));
      if (listById(listId)?.remote) send(listId, (a) => a.removeItem(listId, itemId));
    },

    reorderItems: (listId, items) => {
      patchList(listId, (l) => ({ ...l, items }));
      if (listById(listId)?.remote) send(listId, (a) => a.reorder(listId, items.map((i) => i.id)));
    },

    /** Ticks or unticks one member — defaults to the signed-in athlete. In a shared list, only yourself. */
    toggleItem: (listId, itemId, memberId = ME.id) => {
      const l = listById(listId);
      if (l?.remote && memberId !== ME.id) return;
      const wasDone = !!l?.items.find((i) => i.id === itemId)?.doneBy?.[memberId];
      patchItem(listId, itemId, (i) => {
        const doneBy = { ...i.doneBy };
        if (doneBy[memberId]) delete doneBy[memberId];
        else doneBy[memberId] = new Date().toISOString();
        return { ...i, doneBy };
      });
      if (l?.remote) send(listId, (a) => a.tick(listId, itemId, !wasDone));
    },

    addMembers: (listId, people) => {
      const l = listById(listId);
      patchList(listId, (x) => {
        const have = new Set(x.members.map((m) => m.id));
        return { ...x, members: [...x.members, ...people.filter((p) => !have.has(p.id))] };
      });
      if (l?.remote) send(listId, (a) => a.addMembers(listId, people.map((p) => p.id)));
      else if (l && apiRef.current && needsPublish({ ...l, members: [...l.members, ...people] })) publish({ ...l, members: [...l.members, ...people] });
    },

    removeMember: (listId, memberId) => {
      if (memberId === ME.id) return; // you can't leave your own list
      patchList(listId, (l) => ({
        ...l,
        members: l.members.filter((m) => m.id !== memberId),
        items: l.items.map((i) => {
          const doneBy = { ...i.doneBy };
          delete doneBy[memberId];
          return { ...i, doneBy, assignees: (i.assignees || []).filter((a) => a !== memberId) };
        }),
      }));
      if (listById(listId)?.remote) send(listId, (a) => a.removeMember(listId, memberId));
    },

    /** Applies a pending reset to one list on demand (used when reopening the tab). */
    refreshList: (id) => {
      const l = listById(id);
      if (l?.remote) maybeRoll(l);
      else patchList(id, (x) => applyReset(x));
    },

    /** People to add to a group list, and a search by name or @username (accounts on). */
    searchPeople: (q) => (apiRef.current ? apiRef.current.searchPeople(q) : Promise.resolve([])),
  }), [patchList, patchItem, dropLocal, send, publish, maybeRoll]);

  const activeList = state.lists.find((l) => l.id === state.activeId) || state.lists[0] || null;
  const shared = backendOn && !!loadSession().userId;

  return { lists: state.lists, activeList, shared, live, contacts: contactsList, ...api };
}
