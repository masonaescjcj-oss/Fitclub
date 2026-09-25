// Chat persistence and the seeded world the athlete opens into.

import { ME, createChat, createMessage, createUser, uniqueUsername } from "./chatModel";
import { BOT_CHAT_ID, BOT_ID, BUDDIES, DEFAULT_PREFS, botWelcome } from "../buddy/buddyModel";
import { loadSession } from "../session";
import { backendOn } from "../backend/supabase";

const KEY = "fitclub.chat.v1";

/**
 * Without accounts the messenger is a lived-in demo: stand-in people,
 * stories, public communities and simulated replies. With accounts it holds
 * only real people and real chats, plus Saved Messages on this device.
 */
export const DEMO_WORLD = !backendOn;

const ago = (mins) => new Date(Date.now() - mins * 60000).toISOString();

export const PEOPLE = [
  createUser({ id: "sara", name: "Sara Jenkins", nameFa: "سارا جنکینز", avatar: "👩‍🦰", color: "#e0567d",
    premium: true, emojiStatus: "🏆", bio: "Marathon in 12 weeks. Coffee first.", online: true,
    phone: "+1 415 555 0132", username: "sara_runs", birthday: "1996-03-14" }),
  createUser({ id: "amir", name: "Amir Reza", nameFa: "امیررضا", avatar: "🧔", color: "#38bdf8",
    bio: "Powerlifting. 180kg deadlift club.", online: false, lastSeen: ago(23),
    phone: "+98 912 555 0199", username: "amir_lifts", birthday: "1993-08-02" }),
  createUser({ id: "lena", name: "Lena Cole", nameFa: "لنا کول", avatar: "👩‍💼", color: "#f59e0b",
    premium: true, emojiStatus: "⚡", bio: "CrossFit coach", online: true,
    phone: "+44 7700 900123", username: "lena_wod", birthday: "1991-11-26" }),
  createUser({ id: "mo", name: "Mohammad K.", nameFa: "محمد ک.", avatar: "🧑‍🦱", color: "#10b981",
    bio: "Just here for the protein recipes", online: false, lastSeen: ago(180),
    phone: "+98 935 555 0140", username: "mo_k", birthday: "1998-05-19" }),
  createUser({ id: "yuki", name: "Yuki Tanaka", nameFa: "یوکی تاناکا", avatar: "👧", color: "#8b5cf6",
    bio: "Yoga + mobility", online: false, lastSeen: ago(1440),
    phone: "+81 90 5555 0177", username: "yuki_flow", birthday: "1995-01-08" }),
  createUser({ id: "coach", name: "Coach Dana", nameFa: "مربی دانا", avatar: "🦾", color: "#844783",
    verified: true, premium: true, emojiStatus: "💪", bio: "Head coach at FitClub", online: true,
    phone: "+98 912 000 1000", username: "coach_dana", birthday: "1988-06-21" }),
];

/** The athlete's own messenger profile — editable from the Profile screen. */
export const DEFAULT_ME = {
  name: "",
  avatar: "🏋️",
  emojiStatus: "⭐",
  bio: "Be healthy. Be stronger.",
  username: "fitclub_athlete",
  phone: "+98 912 000 0000",
  birthday: "2000-01-29",
  stars: 2650,
  prefs: {},
};

/**
 * Stories, Telegram-style: one per friend, a day old at most. Display-only
 * until there is a backend to post to; which ones were watched is remembered.
 */
export const STORIES = [
  { id: "st-sara", userId: "sara", at: ago(45), emoji: "🏃‍♀️", captionEn: "12k done before sunrise ☀️", captionFa: "۱۲ کیلومتر قبل از طلوع ☀️", bg: "linear-gradient(160deg,#ff6b6b,#e0567d 55%,#7a2a5a)" },
  { id: "st-coach", userId: "coach", at: ago(130), emoji: "📋", captionEn: "Block 3 plans go out tonight. Rest up.", captionFa: "برنامه‌های بلوک ۳ امشب می‌رسد. خوب استراحت کنید.", bg: "linear-gradient(160deg,#844783,#4a2449 60%,#1b0f1b)" },
  { id: "st-lena", userId: "lena", at: ago(240), emoji: "🔥", captionEn: "New WOD: 21-15-9. Who's in?", captionFa: "تمرین جدید: ۲۱-۱۵-۹. کی هست؟", bg: "linear-gradient(160deg,#f59e0b,#d97706 55%,#7c2d12)" },
  { id: "st-amir", userId: "amir", at: ago(600), emoji: "🏋️", captionEn: "185 kg. Finally.", captionFa: "۱۸۵ کیلو. بالاخره.", bg: "linear-gradient(160deg,#38bdf8,#1d4ed8 60%,#0f172a)" },
  { id: "st-yuki", userId: "yuki", at: ago(900), emoji: "🧘", captionEn: "Sunday mobility flow, 20 minutes.", captionFa: "حرکات کششی یکشنبه، ۲۰ دقیقه.", bg: "linear-gradient(160deg,#a78bfa,#6d28d9 60%,#2e1065)" },
];

export const BOT_USER = createUser({
  id: BOT_ID, name: "Teammate Bot", nameFa: "ربات هم‌تیمی", avatar: "🤝", color: "#3390ec", verified: true, online: true,
  bio: "Pairs you with people working on the same goals.", username: "fitclub_teammate_bot",
});

/**
 * Public communities anyone can find by @username or link and join. They live
 * outside the athlete's chat list until joined; leaving puts them back here.
 */
export const DIRECTORY = [
  createChat({
    id: "dir_recipes", type: "channel", title: "FitClub Recipes", titleFa: "دستور غذاهای فیت‌کلاب", emoji: "🥗", color: "#10b981",
    members: ["lena", "mo"], admins: ["lena"], subscribers: 3842, isPublic: true, username: "fitclub_recipes",
    description: "High-protein meals, macros included.", inviteLink: "fitclub.app/+RecipesClub2026", createdBy: "lena", createdAt: ago(60 * 24 * 200), verified: true,
  }),
  createChat({
    id: "dir_runclub", type: "group", title: "Sunrise Run Club", titleFa: "کلاب دوی صبحگاهی", emoji: "🏃", color: "#f59e0b",
    members: ["sara", "yuki", "mo"], admins: ["sara"], isPublic: true, username: "sunrise_run_club",
    description: "5k before 7am. Every day. Post your splits.", inviteLink: "fitclub.app/+SunriseRun5k", createdBy: "sara", createdAt: ago(60 * 24 * 120),
  }),
  createChat({
    id: "dir_power", type: "channel", title: "Powerlifting Daily", titleFa: "پاورلیفتینگ روزانه", emoji: "🏋️", color: "#844783",
    members: ["amir", "coach"], admins: ["amir"], subscribers: 9120, isPublic: true, username: "powerlifting_daily",
    description: "One cue a day. Squat, bench, deadlift.", inviteLink: "fitclub.app/+PowerDaily2026", createdBy: "amir", createdAt: ago(60 * 24 * 300),
  }),
  createChat({
    id: "dir_yoga", type: "group", title: "Morning Mobility", titleFa: "تحرک صبحگاهی", emoji: "🧘", color: "#8b5cf6",
    members: ["yuki", "lena"], admins: ["yuki"], isPublic: true, username: "morning_mobility",
    description: "20 minutes of mobility, together, at 6:30.", inviteLink: "fitclub.app/+MobilityAM", createdBy: "yuki", createdAt: ago(60 * 24 * 45),
  }),
];

/** The first posts a newcomer sees after joining a public community. */
export function directoryMessages(chatId) {
  const at = (mins) => ago(mins);
  const m = (senderId, text, patch = {}) => createMessage({ chatId, senderId, status: "read", text, ...patch });
  switch (chatId) {
    case "dir_recipes": return [
      m("lena", "Overnight oats, 42g protein: oats, skyr, whey, chia. Macros in the pinned post.", { at: at(2000), views: 3120, reactions: { "🔥": ["mo", "sara"] } }),
      m("lena", "Tonight: sheet-pan chicken thighs with sweet potato. 610 kcal, 48P/52C/22F.", { at: at(180), views: 2210 }),
    ];
    case "dir_runclub": return [
      m("sara", "5.2k in 26:40 this morning. Legs felt heavy but done ✅", { at: at(400) }),
      m("yuki", "Easy 4k + mobility. See everyone at 6:30 tomorrow?", { at: at(120), reactions: { "👍": ["sara", "mo"] } }),
    ];
    case "dir_power": return [
      m("amir", "Cue of the day: on the deadlift, push the floor away — don't pull the bar up.", { at: at(1500), views: 8010, reactions: { "💪": ["coach", "sara"] } }),
      m("amir", "Bench: elbows under the bar at the bottom. If they flare, the weight is too heavy.", { at: at(90), views: 4120 }),
    ];
    case "dir_yoga": return [
      m("yuki", "Tomorrow's flow: hips and thoracic. Bring a strap if you have one.", { at: at(600) }),
    ];
    default: return [];
  }
}

/** Teammates whose identity both sides agreed to show. Kept in step by the chat hook. */
export const REVEALED = new Set();

/** The stand-ins, where the demo shows them; empty for a real account. */
export const PEOPLE_SHOWN = DEMO_WORLD ? PEOPLE : [];
export const STORIES_SHOWN = DEMO_WORLD ? STORIES : [];

/** People the athlete added by hand. findUser() is a plain function, so the hook keeps this in step with state. */
export const CUSTOM = new Map();
export function registerCustomUsers(list = []) {
  CUSTOM.clear();
  for (const u of list) CUSTOM.set(u.id, u);
}

/** Every username already spoken for: contacts, added people, the bot, me, and every chat that has one. */
export function takenUsernames(state) {
  return [
    ...PEOPLE.map((p) => p.username),
    ...(state?.customUsers || []).map((u) => u.username),
    BOT_USER.username,
    state?.me?.username,
    ...(state?.chats || []).map((c) => c.username),
    ...DIRECTORY.map((c) => c.username),
  ].filter(Boolean);
}

export const findUser = (id) => {
  if (id === ME) return createUser({ id: ME, name: "You", nameFa: "شما", avatar: "🏋️", color: "#844783", premium: true, online: true });
  if (id === BOT_ID) return BOT_USER;
  const person = PEOPLE.find((p) => p.id === id);
  if (person) return person;
  const custom = CUSTOM.get(id);
  if (custom) return createUser(custom);
  const buddy = BUDDIES.find((x) => x.id === id);
  if (buddy) {
    const shown = REVEALED.has(id);
    return createUser({
      id, name: shown ? buddy.name : buddy.alias, nameFa: shown ? buddy.nameFa : buddy.aliasFa,
      avatar: shown ? buddy.avatar : "🎭", color: buddy.color, bio: shown ? buddy.bio : "", online: buddy.online, lastSeen: buddy.lastSeen,
    });
  }
  return createUser({ id, name: id, avatar: "👤" });
};

/** The matchmaking bot's chat, seeded with its welcome so the list has a preview. */
function botChat() {
  return createChat({
    id: BOT_CHAT_ID, type: "bot", title: "Teammate Bot", titleFa: "ربات هم‌تیمی", emoji: "🤝", color: "#3390ec",
    members: [ME, BOT_ID], verified: true, folders: ["gym", "people"], lastReadAt: ago(0),
  });
}

/** A real account's own messenger identity: nothing made up, the account's name and username. */
const REAL_ME = { ...DEFAULT_ME, avatar: "", emojiStatus: "", bio: "", username: "", phone: "", birthday: "", stars: 0 };

function realMe(me) {
  const session = loadSession();
  // Values still at the demo's samples (its phone, birthday, stars) were never the athlete's.
  const own = Object.fromEntries(Object.entries(me).filter(([k, v]) => !(k in DEFAULT_ME) || k === "prefs" || v !== DEFAULT_ME[k]));
  return { ...REAL_ME, ...own, name: session.name || me.name || "", username: session.username || "" };
}

/** A real account starts with Saved Messages alone; everything else comes from its chats on the server. */
function realSeed() {
  return {
    chats: [createChat({
      id: "saved", type: "private", title: "Saved Messages", titleFa: "پیام‌های ذخیره‌شده",
      emoji: "🔖", color: "#38bdf8", members: [ME], pinned: true, lastReadAt: ago(0),
    })],
    messages: [], folder: "all", me: realMe({}), customUsers: [], seenStories: [],
    buddy: { prefs: { ...DEFAULT_PREFS }, liked: [], passed: [], matches: [] },
    blocked: [],
    // Whose this is: another account signing in on the same device starts clean.
    owner: loadSession().userId || null,
  };
}

const seed = () => (DEMO_WORLD ? demoSeed() : realSeed());

function demoSeed() {
  const chats = [];
  const messages = [];
  const push = (chatId, patch) => messages.push(createMessage({ chatId, ...patch }));

  /* Saved messages — Telegram's own first chat. */
  const saved = createChat({
    id: "saved", type: "private", title: "Saved Messages", titleFa: "پیام‌های ذخیره‌شده",
    emoji: "🔖", color: "#38bdf8", members: [ME], pinned: true, lastReadAt: ago(0),
  });
  chats.push(saved);
  push("saved", { senderId: ME, text: "Squat PB: 140kg × 3. Beat it next block.", at: ago(2880), status: "read" });

  /* Coach — a verified premium contact with a pinned message. */
  const coach = createChat({
    id: "coach", type: "private", title: "Coach Dana", titleFa: "مربی دانا",
    emoji: "🦾", color: "#844783", members: [ME, "coach"], verified: true, premium: true,
    folders: ["gym", "work"], pinned: true, lastReadAt: ago(40), pinnedMessageId: "m-coach-plan",
  });
  chats.push(coach);
  push("coach", { id: "m-coach-plan", senderId: "coach", at: ago(2000), status: "read",
    text: "Block 3 starts Monday. Volume drops 20%, intensity goes up. Deload the week after." });
  push("coach", { senderId: ME, at: ago(1900), status: "read", text: "Got it. Should I keep the accessory work?" });
  push("coach", { senderId: "coach", at: ago(1880), status: "read",
    text: "Keep it, but cut the last set on each. Recovery matters more than volume right now." });
  push("coach", { senderId: "coach", at: ago(35), status: "sent",
    text: "How did the bench session feel today?" , reactions: {} });

  /* A group with several members, reactions and a reply. */
  const squad = createChat({
    id: "squad", type: "group", title: "Squad Shred", titleFa: "گروه چالش",
    emoji: "⚡", color: "#e0567d", members: [ME, "sara", "amir", "lena", "mo"],
    admins: [ME, "sara"], folders: ["gym", "people"], lastReadAt: ago(12),
    description: "14-day shred. Post your sessions, no excuses.", inviteLink: "fitclub.app/+SquadShred14", createdBy: "sara", createdAt: ago(60 * 24 * 20),
  });
  chats.push(squad);
  push("squad", { id: "m-squad-1", senderId: "sara", at: ago(300), status: "read",
    text: "Day 14 done. Bench felt light today 💪", reactions: { "🔥": ["amir", "lena", ME], "👏": ["mo"] } });
  push("squad", { senderId: "amir", at: ago(280), status: "read", replyTo: "m-squad-1",
    text: "What are you benching now?" });
  push("squad", { senderId: "sara", at: ago(275), status: "read", text: "82.5 for 5. Slow but it's moving." });
  push("squad", { senderId: "lena", at: ago(120), status: "read", kind: "sticker",
    media: { emoji: "🏋️" } });
  push("squad", { senderId: "mo", at: ago(60), status: "read", kind: "poll",
    poll: { question: "Saturday session — what time?", multiple: false, quiz: false, options: [
      { text: "08:00", votes: ["sara"] },
      { text: "10:00", votes: ["amir", "lena"] },
      { text: "17:00", votes: [] },
    ] } });
  push("squad", { senderId: "amir", at: ago(8), status: "sent",
    text: "Anyone up for a form check on deadlifts?" });

  /* A channel: broadcast only, with view counts. */
  const channel = createChat({
    id: "news", type: "channel", title: "FitClub Announcements", titleFa: "اطلاعیه‌های فیت‌کلاب",
    emoji: "📣", color: "#f59e0b", members: [ME, "coach"], admins: ["coach"],
    verified: true, subscribers: 12480, muted: true, folders: ["gym", "work"], lastReadAt: ago(0),
    description: "Schedules, closures and news from the FitClub team.", isPublic: true, username: "fitclub_news",
    inviteLink: "fitclub.app/+FitClubNews2026", createdBy: "coach", createdAt: ago(60 * 24 * 90),
  });
  chats.push(channel);
  push("news", { senderId: "coach", at: ago(1440), status: "read", views: 11204,
    text: "New Ramadan training schedules are live. Check the Plan tab for the adjusted split.",
    reactions: { "👍": ["sara", "amir", "lena"], "🔥": ["mo"] } });
  push("news", { senderId: "coach", at: ago(200), status: "read", views: 8317,
    text: "Gym closes at 20:00 this Friday for maintenance." });

  /* The matchmaking bot. */
  chats.push(botChat());
  push(BOT_CHAT_ID, { ...botWelcome(), at: ago(5) });

  /* One-to-one chats. */
  const sara = createChat({
    id: "sara", type: "private", title: "Sara Jenkins", titleFa: "سارا جنکینز",
    emoji: "👩‍🦰", color: "#e0567d", members: [ME, "sara"], premium: true, folders: ["family", "people"], lastReadAt: ago(0),
  });
  chats.push(sara);
  push("sara", { senderId: "sara", at: ago(500), status: "read", text: "Are you doing the Saturday session?" });
  push("sara", { senderId: ME, at: ago(495), status: "read", text: "Planning to. 10:00 works better for me." });
  push("sara", { senderId: "sara", at: ago(490), status: "read", text: "Same. See you there 🙌",
    reactions: { "👍": [ME] } });
  push("sara", { senderId: "sara", at: ago(30), status: "sent",
    text: "فردا ساعت ده باشگاه هستی؟ می‌خوام پرس سینه رو تست کنم",
    translation: "Are you at the gym at ten tomorrow? I want to test my bench press" });

  const amir = createChat({
    id: "amir", type: "private", title: "Amir Reza", titleFa: "امیررضا",
    emoji: "🧔", color: "#38bdf8", members: [ME, "amir"], folders: ["gym", "people"], lastReadAt: ago(600),
  });
  chats.push(amir);
  push("amir", { senderId: "amir", at: ago(400), status: "read", text: "Sent you the deadlift program" });
  push("amir", { senderId: "amir", at: ago(395), status: "sent", kind: "file",
    media: { name: "deadlift-block-3.pdf", size: "248 KB" } });

  const yuki = createChat({
    id: "yuki", type: "private", title: "Yuki Tanaka", titleFa: "یوکی تاناکا",
    emoji: "👧", color: "#8b5cf6", members: [ME, "yuki"], archived: true, folders: ["people"], lastReadAt: ago(0),
  });
  chats.push(yuki);
  push("yuki", { senderId: "yuki", at: ago(4300), status: "read", text: "Thanks for the mobility routine!" });

  return {
    chats, messages, folder: "all", me: meFromSession(DEFAULT_ME), customUsers: [], seenStories: [],
    buddy: { prefs: { ...DEFAULT_PREFS }, liked: [], passed: [], matches: [] },
    blocked: [],
  };
}

/**
 * The messenger identity of the signed-in athlete: their own name and the
 * username they picked at signup, unless they changed it here since.
 */
function meFromSession(me) {
  const session = loadSession();
  const next = { ...me };
  if (session.name) next.name = session.name;
  if (session.username && (!me.username || me.username === DEFAULT_ME.username)) next.username = session.username;
  return next;
}

function normalize(state) {
  if (!DEMO_WORLD) return normalizeReal(state);
  // Saves from before folders existed get the seeded tags back by chat id.
  const seeded = Object.fromEntries(seed().chats.map((c) => [c.id, c.folders]));
  const chats = (state.chats || []).map((c) => ({ ...createChat(), ...c, folders: c.folders || seeded[c.id] || [] }));
  const messages = (state.messages || []).map((m) => ({ ...createMessage(), ...m }));
  // Saves from before the bot existed get it added, welcome included.
  if (!chats.some((c) => c.id === BOT_CHAT_ID)) {
    chats.push(botChat());
    messages.push(createMessage({ chatId: BOT_CHAT_ID, ...botWelcome() }));
  }
  return {
    chats,
    messages,
    folder: state.folder || "all",
    me: meFromSession({ ...DEFAULT_ME, ...(state.me || {}) }),
    customUsers: withUsernames(state.customUsers || []),
    seenStories: state.seenStories || [],
    buddy: {
      prefs: { ...DEFAULT_PREFS, ...(state.buddy?.prefs || {}) },
      liked: state.buddy?.liked || [], passed: state.buddy?.passed || [], matches: state.buddy?.matches || [],
    },
    blocked: state.blocked || [],
  };
}

/**
 * A real account keeps only its server chats and Saved Messages. The demo's
 * stand-in chats, contacts and teammate bot, picked up before accounts
 * started empty, are dropped along with their messages.
 */
function normalizeReal(state) {
  const base = realSeed();
  if (state.owner && state.owner !== base.owner) return base;
  const keep = (state.chats || []).filter((c) => c.remote || c.id === "saved").map((c) => ({ ...createChat(), ...c, folders: c.folders || [] }));
  const chats = keep.some((c) => c.id === "saved") ? keep : [...base.chats, ...keep];
  const ids = new Set(chats.map((c) => c.id));
  return {
    ...base,
    chats,
    messages: (state.messages || []).filter((m) => ids.has(m.chatId) && !(m.chatId === "saved" && String(m.text).startsWith("Squat PB: 140kg")))
      .map((m) => ({ ...createMessage(), ...m })),
    folder: state.folder || "all",
    me: realMe(state.me || {}),
    seenStories: state.seenStories || [],
    blocked: state.blocked || [],
  };
}

/** Contacts added before usernames existed get one, so they can be found by @handle. */
function withUsernames(list) {
  const taken = PEOPLE.map((p) => p.username);
  return list.map((u) => {
    if (u.username) { taken.push(u.username); return u; }
    const username = uniqueUsername(u.name, taken);
    taken.push(username);
    return { ...u, username };
  });
}

export function loadChat() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {
    // Corrupt or unavailable storage — start from the seeded world.
  }
  return seed();
}

export function saveChat(state) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Over quota; the session still works in memory.
  }
}

export const resetChat = () => {
  try { window.localStorage.removeItem(KEY); } catch { /* nothing to do */ }
  return seed();
};
