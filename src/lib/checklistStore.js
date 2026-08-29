// localStorage persistence for checklists.
// Group lists are shared state in spirit only — until there is a backend,
// every member's ticks live in this browser.

import { ME, applyResets, createItem, createList, periodKey } from "./checklistModel";

const KEY = "fitclub.checklists.v1";

/** Stand-in for a friends API. */
export const FRIEND_POOL = [
  { id: "sara", name: "Sara Jenkins", nameFa: "سارا جنکینز", avatar: "👩‍🦰", color: "#e0567d" },
  { id: "amir", name: "Amir Reza", nameFa: "امیررضا", avatar: "🧔", color: "#38bdf8" },
  { id: "lena", name: "Lena Cole", nameFa: "لنا کول", avatar: "👩‍💼", color: "#f59e0b" },
  { id: "mo", name: "Mohammad K.", nameFa: "محمد ک.", avatar: "🧑‍🦱", color: "#10b981" },
  { id: "yuki", name: "Yuki Tanaka", nameFa: "یوکی تاناکا", avatar: "👧", color: "#8b5cf6" },
  { id: "dan", name: "Dan Moore", nameFa: "دن مور", avatar: "👨‍🦳", color: "#f43f5e" },
];

function seed() {
  const habits = createList({
    nameEn: "Daily Habits",
    nameFa: "عادت‌های روزانه",
    emoji: "🔥",
    color: "#844783",
    type: "personal",
    reset: { mode: "daily", resetHour: 0 },
    streak: 14,
    bestStreak: 21,
  });
  habits.items = [
    createItem({ textEn: "Drink 8 glasses of water", textFa: "۸ لیوان آب بنوشید", emoji: "💧", priority: "medium", doneBy: { [ME.id]: new Date().toISOString() } }),
    createItem({ textEn: "Complete today's 45-min workout", textFa: "تمرین ۴۵ دقیقه‌ای امروز", emoji: "🏋️", priority: "high", doneBy: { [ME.id]: new Date().toISOString() } }),
    createItem({ textEn: "20 minutes meditation & relaxation", textFa: "۲۰ دقیقه مدیتیشن و آرامش", emoji: "🧘", priority: "low" }),
    createItem({ textEn: "Read 10 pages of a book", textFa: "مطالعه ۱۰ صفحه کتاب", emoji: "📖", priority: "none" }),
  ];

  const weekly = createList({
    nameEn: "Weekly Goals",
    nameFa: "اهداف هفتگی",
    emoji: "🎯",
    color: "#38bdf8",
    type: "personal",
    reset: { mode: "weekly", resetHour: 0, weekStart: 6 },
    streak: 3,
    bestStreak: 6,
  });
  weekly.items = [
    createItem({ textEn: "Four training sessions", textFa: "چهار جلسه تمرین", emoji: "💪", priority: "high" }),
    createItem({ textEn: "Meal prep for the week", textFa: "آماده‌سازی غذای هفته", emoji: "🥗", priority: "medium" }),
    createItem({ textEn: "Weigh in and log measurements", textFa: "وزن‌کشی و ثبت اندازه‌ها", emoji: "⚖️", priority: "low" }),
  ];

  const setup = createList({
    nameEn: "Gear & Setup",
    nameFa: "تجهیزات و آماده‌سازی",
    emoji: "🎒",
    color: "#64748b",
    type: "personal",
    reset: { mode: "none" },
  });
  setup.items = [
    createItem({ textEn: "Buy lifting straps", textFa: "خرید بند مچ وزنه‌برداری", emoji: "🧤", priority: "low" }),
    createItem({ textEn: "Book the InBody scan", textFa: "رزرو تست ترکیب بدنی", emoji: "📋", priority: "medium" }),
  ];

  const [sara, amir, lena] = FRIEND_POOL;
  const squad = createList({
    nameEn: "Squad Shred Challenge",
    nameFa: "چالش گروهی تناسب اندام",
    emoji: "⚡",
    color: "#e0567d",
    type: "group",
    groupRule: "everyone",
    members: [ME, sara, amir, lena],
    reset: { mode: "daily", resetHour: 4 },
    streak: 5,
    bestStreak: 9,
  });
  const now = new Date().toISOString();
  squad.items = [
    createItem({ textEn: "10,000 steps", textFa: "۱۰٬۰۰۰ قدم", emoji: "👟", priority: "high", doneBy: { [ME.id]: now, sara: now, amir: now } }),
    createItem({ textEn: "No sugar today", textFa: "امروز بدون قند", emoji: "🚫", priority: "medium", doneBy: { sara: now, lena: now } }),
    createItem({ textEn: "Post a progress photo", textFa: "ارسال عکس پیشرفت", emoji: "📸", priority: "low", assignees: ["sara", "amir"], doneBy: { sara: now } }),
    createItem({ textEn: "Book Saturday's group session", textFa: "رزرو جلسه گروهی شنبه", emoji: "📅", priority: "high", assignees: ["amir"] }),
  ];

  return { lists: [habits, weekly, squad, setup], activeId: habits.id };
}

/** Re-derives fields that older saved data may be missing. */
function normalize(state) {
  const lists = (state.lists || []).map((l) => {
    const reset = { mode: "none", resetHour: 0, weekStart: 6, monthDay: 1, every: 2, ...(l.reset || {}) };
    return {
      ...createList({ reset }),
      ...l,
      reset,
      members: l.members?.length ? l.members : [ME],
      items: (l.items || []).map((i) => ({ ...createItem(), ...i, doneBy: i.doneBy || {} })),
      periodKey: l.periodKey || periodKey(reset),
    };
  });
  const activeId = lists.some((l) => l.id === state.activeId) ? state.activeId : lists[0]?.id ?? null;
  return { lists, activeId };
}

export function loadState() {
  let raw = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    // Private mode or storage disabled — fall through to a fresh seed.
  }

  let state;
  if (raw) {
    try {
      state = normalize(JSON.parse(raw));
    } catch {
      state = seed(); // corrupt payload: start clean rather than crash the tab
    }
  } else {
    state = seed();
  }

  return { ...state, lists: applyResets(state.lists) };
}

export function saveState(state) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Over quota or storage disabled — the session still works, it just won't persist.
  }
}

export function resetStorage() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // nothing to do
  }
  return loadState();
}
