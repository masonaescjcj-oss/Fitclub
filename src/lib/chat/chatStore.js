// Chat persistence and the seeded world the athlete opens into.

import { ME, createChat, createMessage, createUser } from "./chatModel";

const KEY = "fitclub.chat.v1";

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

export const findUser = (id) =>
  id === ME
    ? createUser({ id: ME, name: "You", nameFa: "شما", avatar: "🏋️", color: "#844783", premium: true, online: true })
    : PEOPLE.find((p) => p.id === id) || createUser({ id, name: id, avatar: "👤" });

function seed() {
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
  });
  chats.push(channel);
  push("news", { senderId: "coach", at: ago(1440), status: "read", views: 11204,
    text: "New Ramadan training schedules are live. Check the Plan tab for the adjusted split.",
    reactions: { "👍": ["sara", "amir", "lena"], "🔥": ["mo"] } });
  push("news", { senderId: "coach", at: ago(200), status: "read", views: 8317,
    text: "Gym closes at 20:00 this Friday for maintenance." });

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

  return { chats, messages, folder: "all", me: { ...DEFAULT_ME }, customUsers: [], seenStories: [] };
}

function normalize(state) {
  // Saves from before folders existed get the seeded tags back by chat id.
  const seeded = Object.fromEntries(seed().chats.map((c) => [c.id, c.folders]));
  return {
    chats: (state.chats || []).map((c) => ({ ...createChat(), ...c, folders: c.folders || seeded[c.id] || [] })),
    messages: (state.messages || []).map((m) => ({ ...createMessage(), ...m })),
    folder: state.folder || "all",
    me: { ...DEFAULT_ME, ...(state.me || {}) },
    customUsers: state.customUsers || [],
    seenStories: state.seenStories || [],
  };
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
