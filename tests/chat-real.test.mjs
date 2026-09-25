// The messenger store for a real account (Supabase on): no stand-in world,
// the account's own identity, and nothing left over from another account.
process.env.REACT_APP_SUPABASE_URL = "https://example.supabase.co";
process.env.REACT_APP_SUPABASE_ANON_KEY = "sb_publishable_test";
const mem = new Map();
globalThis.window = { localStorage: { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) } };
globalThis.localStorage = globalThis.window.localStorage;
mem.set("fitclub.session.v1", JSON.stringify({ signedIn: true, userId: "user-1", name: "Sara", username: "sara_lifts" }));

const store = await import("../src/lib/chat/chatStore.js");
const { ME } = await import("../src/lib/chat/chatModel.js");

let pass = 0, fail = 0;
const check = (name, cond, got) => { cond ? pass++ : fail++; if (!cond) console.log("✗", name, got !== undefined ? `(got ${JSON.stringify(got).slice(0, 300)})` : ""); };

check("accounts on: the demo world is off", store.DEMO_WORLD === false);
check("…no stand-in people, stories or communities to show", store.PEOPLE_SHOWN.length === 0 && store.STORIES_SHOWN.length === 0);

const fresh = store.loadChat();
check("a new account's messenger holds Saved Messages alone", fresh.chats.length === 1 && fresh.chats[0].id === "saved" && fresh.messages.length === 0, fresh.chats.map((c) => c.id));
check("…with the account's name and username", fresh.me.name === "Sara" && fresh.me.username === "sara_lifts", fresh.me);
check("…and nothing made up about them", fresh.me.phone === "" && fresh.me.birthday === "" && fresh.me.stars === 0 && fresh.me.bio === "", fresh.me);
check("…no contacts of its own", fresh.customUsers.length === 0);
check("…and it knows whose it is", fresh.owner === "user-1");

// A device that picked up the demo world before accounts started empty.
const remoteChat = { id: "9b0e0c2e-0000-4000-8000-000000000001", type: "group", title: "Leg Day", members: [ME, "u2"], admins: [ME], remote: true };
mem.set("fitclub.chat.v1", JSON.stringify({
  owner: "user-1",
  chats: [{ id: "saved", type: "private", members: [ME] }, { id: "sara", type: "private", members: [ME, "sara"] }, { id: "buddy_bot", type: "bot" }, remoteChat],
  messages: [
    { id: "m1", chatId: "sara", text: "Are you doing the Saturday session?" },
    { id: "m2", chatId: remoteChat.id, text: "7am?", remote: true },
    { id: "m3", chatId: "saved", text: "Squat PB: 140kg × 3. Beat it next block." },
    { id: "m4", chatId: "saved", text: "my own note" },
  ],
  customUsers: [{ id: "c1", name: "Made up" }],
  me: { name: "Sara", username: "fitclub_athlete", phone: "+98 912 000 0000" },
}));
const kept = store.loadChat();
check("the demo's chats and bot are dropped, the real ones stay", JSON.stringify(kept.chats.map((c) => c.id).sort()) === JSON.stringify(["9b0e0c2e-0000-4000-8000-000000000001", "saved"]), kept.chats.map((c) => c.id));
check("…with their messages, and the demo's sample note goes", JSON.stringify(kept.messages.map((m) => m.id).sort()) === JSON.stringify(["m2", "m4"]), kept.messages.map((m) => m.id));
check("…made-up contacts go", kept.customUsers.length === 0);
check("…and the identity is the account's again", kept.me.username === "sara_lifts" && kept.me.phone === "", kept.me);

mem.set("fitclub.chat.v1", JSON.stringify({ owner: "user-2", chats: [remoteChat, { id: "saved", type: "private", members: [ME] }], messages: [{ id: "x", chatId: "saved", text: "someone else's note" }] }));
const other = store.loadChat();
check("another account's leftovers never show", other.chats.length === 1 && other.chats[0].id === "saved" && other.messages.length === 0, other);

console.log(`chat (real account): ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
