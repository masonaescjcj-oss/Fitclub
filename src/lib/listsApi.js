// Group checklists on Supabase (supabase/migrations/0004): the list, its
// members, items and everyone's ticks live on the server; this client turns
// them into the app's list shape and back.
//
// On the server people are account ids; in the app the signed-in athlete is
// always ME.id, as the rest of the checklist code expects. Everything that
// crosses here is swapped both ways.

import { supabase } from "./backend/supabase";
import { ME, createItem, createList } from "./checklistModel";

const TONES = ["#844783", "#e0567d", "#f59e0b", "#10b981", "#38bdf8", "#8b5cf6", "#f43f5e", "#64748b"];
/** A steady colour per person, for their initial when they have no photo. */
export const toneOf = (id) => TONES[[...String(id)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % TONES.length];

export class ListsError extends Error {
  constructor(code, message) { super(message || code); this.code = code; }
}

/** A server person as a list member. */
export function toMember(p, me) {
  if (p.id === me) return { ...ME, name: p.name || ME.name, username: p.username || "", photo: p.photo || null };
  return { id: p.id, name: p.name || p.username || "FitClub", username: p.username || "", photo: p.photo || null, avatar: "", color: toneOf(p.id) };
}

/** The server's list as the app keeps it. */
export function toLocalList(v, me) {
  const swap = (id) => (id === me ? ME.id : id);
  const reset = { mode: "daily", resetHour: 0, weekStart: 6, monthDay: 1, every: 2, ...(v.reset || {}) };
  return {
    ...createList({ reset }),
    id: v.id, name: v.name || "", emoji: v.emoji || "✅", color: v.color || TONES[0],
    type: "group", groupRule: v.groupRule === "anyone" ? "anyone" : "everyone",
    reset, periodKey: v.periodKey || "static", lastResetAt: v.lastResetAt || undefined,
    streak: v.streak || 0, bestStreak: v.bestStreak || 0, history: Array.isArray(v.history) ? v.history : [],
    members: (v.members || []).map((p) => toMember(p, me)),
    items: (v.items || []).map((i) => ({
      ...createItem(),
      id: i.id, text: i.text || "", note: i.note || "", emoji: i.emoji || undefined, priority: i.priority || "none", due: i.due || null,
      assignees: (i.assignees || []).map(swap),
      doneBy: Object.fromEntries(Object.entries(i.doneBy || {}).map(([k, at]) => [swap(k), at])),
      createdAt: i.createdAt,
    })),
    ownerId: v.ownerId ? swap(v.ownerId) : null,
    createdAt: v.createdAt, updatedAt: v.updatedAt,
    remote: true,
  };
}

const itemText = (i) => i.text || i.textEn || i.textFa || "";

/** An item (or the fields of an edit) as the server takes it. */
export function toWireItem(item, me, { whole = true } = {}) {
  const unswap = (id) => (id === ME.id ? me : id);
  const out = { id: item.id };
  if (whole || "text" in item || "textEn" in item || "textFa" in item) out.text = itemText(item);
  for (const k of ["note", "emoji", "priority", "due"]) if (whole || k in item) out[k] = item[k] ?? (k === "due" ? null : "");
  if (whole || "assignees" in item) out.assignees = (item.assignees || []).map(unswap);
  if (whole && item.doneBy) out.doneBy = Object.fromEntries(Object.entries(item.doneBy).map(([k, at]) => [unswap(k), at]));
  return out;
}

/** A local list's settings and history, for turning it into a shared one. */
export function toWireList(list) {
  return {
    name: list.name || list.nameEn || list.nameFa || "", emoji: list.emoji, color: list.color, groupRule: list.groupRule,
    reset: list.reset, periodKey: list.periodKey, streak: list.streak || 0, bestStreak: list.bestStreak || 0, history: list.history || [],
  };
}

function toListsError(error) {
  const message = String(error?.message || "");
  if (/^[a-z_]+$/.test(message)) return new ListsError(message);
  if (/fetch|network|Failed to/i.test(message)) return new ListsError("network", message);
  return new ListsError("error", message);
}

/** A client for the signed-in account `me` (its user id). Tests pass a fake `client`. */
export function createListsApi({ me, client = supabase }) {
  async function rpc(fn, args = {}) {
    const { data, error } = await client.rpc(`fitclub_${fn}`, args);
    if (error) throw toListsError(error);
    return data;
  }
  const local = (v) => toLocalList(v, me);
  const unswap = (id) => (id === ME.id ? me : id);

  return {
    me,
    sync: async () => (await rpc("lists_sync")).map(local),
    bundle: async (id) => local(await rpc("list_bundle", { p_list: id })),
    create: async (list, memberIds) => local(await rpc("list_create", {
      p_list: toWireList(list),
      p_items: (list.items || []).map((i) => toWireItem(i, me)),
      p_members: (memberIds || []).filter((id) => id !== ME.id).map(String),
    })),
    update: async (id, patch) => local(await rpc("list_update", { p_list: id, p_patch: patch })),
    addMembers: async (id, ids) => local(await rpc("list_add_members", { p_list: id, p_people: (ids || []).map(unswap).map(String) })),
    removeMember: async (id, memberId) => local(await rpc("list_remove_member", { p_list: id, p_user: unswap(memberId) })),
    leave: (id) => rpc("list_remove_member", { p_list: id, p_user: me }),
    remove: (id) => rpc("list_delete", { p_list: id }),
    putItem: async (id, item, opts) => local(await rpc("list_put_item", { p_list: id, p_item: toWireItem(item, me, opts) })),
    removeItem: async (id, itemId) => local(await rpc("list_remove_item", { p_list: id, p_item: itemId })),
    reorder: async (id, itemIds) => local(await rpc("list_reorder", { p_list: id, p_ids: itemIds })),
    tick: async (id, itemId, done) => local(await rpc("list_tick", { p_list: id, p_item: itemId, p_done: !!done })),
    clear: async (id, period) => local(await rpc("list_clear", { p_list: id, p_period: period || "" })),
    roll: async (id, from, to, prev) => local(await rpc("list_roll", { p_list: id, p_from: from, p_to: to, p_prev: prev })),
    contacts: async () => (await rpc("list_contacts")).map((p) => toMember(p, me)),
    searchPeople: async (q) => (await rpc("search_people", { p_query: q })).map((p) => toMember(p, me)),

    /**
     * Live changes: `onChange(listId)` when a list of mine changed, and
     * `onChange(null)` when I was added to one (reload them all). `onStatus`
     * gets "open" and "closed". Returns a function that stops listening.
     */
    subscribe(onChange, onStatus) {
      const channel = client.channel(`fitclub-lists-${me}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "fitclub_lists" }, (p) => onChange(p.new?.id || null))
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "fitclub_list_members", filter: `user_id=eq.${me}` }, () => onChange(null))
        .subscribe((status) => {
          if (status === "SUBSCRIBED") onStatus?.("open");
          else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") onStatus?.("closed");
        });
      return () => { client.removeChannel(channel); };
    },
  };
}
