import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ME, applyReset, applyResets, createItem, createList, periodKey } from "../lib/checklistModel";
import { loadState, saveState } from "../lib/checklistStore";

/**
 * Owns every checklist mutation and keeps localStorage in sync.
 * Also watches the clock so a list rolls over while the page is open.
 */
export default function useChecklists() {
  const [state, setState] = useState(loadState);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    saveState(state);
  }, [state]);

  // A list whose period ends at midnight should clear itself without a refresh.
  useEffect(() => {
    const tick = () =>
      setState((s) => {
        const lists = applyResets(s.lists);
        const changed = lists.some((l, i) => l.periodKey !== s.lists[i].periodKey);
        return changed ? { ...s, lists } : s;
      });
    const id = setInterval(tick, 60000);
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, []);

  const patchList = useCallback((listId, fn) => {
    setState((s) => ({ ...s, lists: s.lists.map((l) => (l.id === listId ? fn(l) : l)) }));
  }, []);

  const patchItem = useCallback((listId, itemId, fn) => {
    patchList(listId, (l) => ({ ...l, items: l.items.map((i) => (i.id === itemId ? fn(i) : i)) }));
  }, [patchList]);

  const api = useMemo(() => ({
    setActiveList: (id) => setState((s) => ({ ...s, activeId: id })),

    addList: (patch) => {
      const list = createList(patch);
      setState((s) => ({ lists: [...s.lists, list], activeId: list.id }));
      return list;
    },

    updateList: (id, patch) =>
      patchList(id, (l) => {
        const reset = patch.reset ? { ...l.reset, ...patch.reset } : l.reset;
        const next = { ...l, ...patch, reset };
        // A changed schedule re-anchors the period so it doesn't reset instantly.
        return next.reset.mode !== l.reset.mode ||
          next.reset.resetHour !== l.reset.resetHour ||
          next.reset.weekStart !== l.reset.weekStart ||
          next.reset.monthDay !== l.reset.monthDay ||
          next.reset.every !== l.reset.every
          ? { ...next, periodKey: periodKey(next.reset) }
          : next;
      }),

    removeList: (id) =>
      setState((s) => {
        const lists = s.lists.filter((l) => l.id !== id);
        return { lists, activeId: s.activeId === id ? lists[0]?.id ?? null : s.activeId };
      }),

    /** Clears every tick immediately, keeping the schedule intact. */
    resetListNow: (id) =>
      patchList(id, (l) => ({
        ...l,
        items: l.items.map((i) => ({ ...i, doneBy: {} })),
        lastResetAt: new Date().toISOString(),
        periodKey: periodKey(l.reset),
      })),

    addItem: (listId, patch) =>
      patchList(listId, (l) => ({ ...l, items: [...l.items, createItem(patch)] })),

    updateItem: (listId, itemId, patch) =>
      patchItem(listId, itemId, (i) => ({ ...i, ...patch })),

    removeItem: (listId, itemId) =>
      patchList(listId, (l) => ({ ...l, items: l.items.filter((i) => i.id !== itemId) })),

    reorderItems: (listId, items) => patchList(listId, (l) => ({ ...l, items })),

    /** Ticks or unticks one member — defaults to the signed-in athlete. */
    toggleItem: (listId, itemId, memberId = ME.id) =>
      patchItem(listId, itemId, (i) => {
        const doneBy = { ...i.doneBy };
        if (doneBy[memberId]) delete doneBy[memberId];
        else doneBy[memberId] = new Date().toISOString();
        return { ...i, doneBy };
      }),

    addMembers: (listId, people) =>
      patchList(listId, (l) => {
        const have = new Set(l.members.map((m) => m.id));
        return { ...l, members: [...l.members, ...people.filter((p) => !have.has(p.id))] };
      }),

    removeMember: (listId, memberId) =>
      patchList(listId, (l) => {
        if (memberId === ME.id) return l; // you can't leave your own list
        return {
          ...l,
          members: l.members.filter((m) => m.id !== memberId),
          items: l.items.map((i) => {
            const doneBy = { ...i.doneBy };
            delete doneBy[memberId];
            return { ...i, doneBy, assignees: (i.assignees || []).filter((a) => a !== memberId) };
          }),
        };
      }),

    /** Applies a pending reset to one list on demand (used when reopening the tab). */
    refreshList: (id) => patchList(id, (l) => applyReset(l)),
  }), [patchList, patchItem]);

  const activeList = state.lists.find((l) => l.id === state.activeId) || state.lists[0] || null;

  return { lists: state.lists, activeList, ...api };
}
