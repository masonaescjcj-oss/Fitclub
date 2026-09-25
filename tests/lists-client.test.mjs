// The group-list client (src/lib/listsApi.js): the server's lists in the
// app's shape and back, with the signed-in account always ME.id locally.
process.env.REACT_APP_SUPABASE_URL = "https://example.supabase.co";
process.env.REACT_APP_SUPABASE_ANON_KEY = "sb_publishable_test";
globalThis.window = { localStorage: { getItem: () => null, setItem() {}, removeItem() {} } };

const { toLocalList, toWireItem, toWireList, createListsApi } = await import("../src/lib/listsApi.js");
const { ME, itemDone, progressOf } = await import("../src/lib/checklistModel.js");

let pass = 0, fail = 0;
const check = (name, cond, got) => { cond ? pass++ : fail++; if (!cond) console.log("✗", name, got !== undefined ? `(got ${JSON.stringify(got).slice(0, 300)})` : ""); };

const me = "aaaaaaaa-0000-0000-0000-000000000001", ben = "bbbbbbbb-0000-0000-0000-000000000002";
const server = {
  id: "11111111-2222-3333-4444-555555555555", name: "Squad", emoji: "⚡", color: "#e0567d", type: "group", groupRule: "everyone",
  reset: { mode: "daily", resetHour: 4 }, periodKey: "daily:2026-09-25", streak: 2, bestStreak: 5, history: [{ key: "daily:2026-09-24", done: 1, total: 1 }],
  ownerId: me,
  members: [{ id: me, name: "Sara", username: "sara_lifts", photo: "https://x/a.jpg" }, { id: ben, name: "Ben", username: "ben_runs", photo: null }],
  items: [
    { id: "i1", text: "Steps", note: "", emoji: "", priority: "high", due: null, assignees: [], doneBy: { [me]: "2026-09-25T08:00:00.000Z", [ben]: "2026-09-25T09:00:00.000Z" } },
    { id: "i2", text: "Stretch", note: "10 min", emoji: "🧘", priority: "none", due: "2026-09-30", assignees: [me], doneBy: {} },
  ],
};
const l = toLocalList(server, me);
check("a server list becomes a shared group list", l.remote === true && l.type === "group" && l.id === server.id && l.name === "Squad");
check("…with me as ME.id, owner of it", l.members[0].id === ME.id && l.members[0].name === "Sara" && l.members[0].photo === "https://x/a.jpg" && l.ownerId === ME.id);
check("…the others as themselves", l.members[1].id === ben && l.members[1].username === "ben_runs" && l.members[1].color);
check("…my ticks and assignments under ME.id", l.items[0].doneBy[ME.id] && l.items[0].doneBy[ben] && JSON.stringify(l.items[1].assignees) === JSON.stringify([ME.id]));
check("…so the model scores it as the server does", itemDone(l.items[0], l) && !itemDone(l.items[1], l) && progressOf(l).done === 1);
check("…keeping its schedule, history and streak", l.reset.mode === "daily" && l.reset.resetHour === 4 && l.reset.weekStart === 6 && l.history.length === 1 && l.streak === 2 && l.periodKey === "daily:2026-09-25");

const wire = toWireItem(l.items[1], me);
check("an item goes back with my real id", JSON.stringify(wire.assignees) === JSON.stringify([me]) && wire.text === "Stretch" && wire.due === "2026-09-30");
const starter = toWireItem({ id: "s1", textEn: "Drink water", textFa: "آب", doneBy: { [ME.id]: "t" } }, me);
check("a starter item sends its text and my tick", starter.text === "Drink water" && starter.doneBy[me] === "t" && !("me" in starter.doneBy));
const edit = toWireItem({ id: "i2", note: "15 min" }, me, { whole: false });
check("an edit sends only what changed", JSON.stringify(edit) === JSON.stringify({ id: "i2", note: "15 min" }), edit);
check("a local list's settings travel with it", JSON.stringify(Object.keys(toWireList({ nameEn: "Habits", emoji: "🔥", reset: { mode: "daily" }, history: [] })).sort())
  === JSON.stringify(["bestStreak", "color", "emoji", "groupRule", "history", "name", "periodKey", "reset", "streak"]) && toWireList({ nameEn: "Habits" }).name === "Habits");

// The client against a fake Supabase: what it sends.
const calls = [];
const fake = { rpc: async (fn, args) => { calls.push([fn, args]); if (fn === "fitclub_list_tick" || fn === "fitclub_list_create") return { data: server, error: null }; if (fn === "fitclub_list_delete") return { data: null, error: { message: "owner_only" } }; return { data: [], error: null }; } };
const api = createListsApi({ me, client: fake });
await api.tick(server.id, "i1", true);
check("a tick names the list, the item and done", JSON.stringify(calls.at(-1)) === JSON.stringify(["fitclub_list_tick", { p_list: server.id, p_item: "i1", p_done: true }]));
await api.create({ ...l, remote: false }, [ME.id, ben]);
check("turning a list into a group sends the others, never me as 'me'", JSON.stringify(calls.at(-1)[1].p_members) === JSON.stringify([ben]) && calls.at(-1)[1].p_items[0].doneBy[me]);
await api.removeMember(server.id, ME.id).catch(() => {});
check("removing ME.id means my own account", calls.at(-1)[1].p_user === me);
let err = null; try { await api.remove(server.id); } catch (e) { err = e; }
check("the server's refusals come back as codes", err?.code === "owner_only");

console.log(`lists client: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
