// Seeds and static config for the messenger's Telegram-shaped shell:
// call history, gifts, settings rows, canned voice transcripts.

import { PEOPLE } from "./chatStore";

/** Telegram dark palette, used only inside the messenger. */
export const TG = {
  bg: "#0e1621",        // chat wallpaper base / page ground
  surface: "#17212b",   // headers, cards
  card: "#1c2733",      // elevated rows
  accent: "#4fa9e8",    // links, active states
  accentDeep: "#3390ec",// buttons, badges
  inBubble: "#182533",
};

const ago = (mins) => new Date(Date.now() - mins * 60000).toISOString();

/** Seed call log. Calls need a backend, so these are display-only. */
export const CALLS = [
  { id: "c1", userId: "sara", type: "outgoing", at: ago(90), seconds: 340 },
  { id: "c2", userId: "coach", type: "incoming", at: ago(300), seconds: 1240 },
  { id: "c3", userId: "amir", type: "missed", at: ago(1500), seconds: 0 },
  { id: "c4", userId: "lena", type: "outgoing", at: ago(2900), seconds: 65 },
  { id: "c5", userId: "coach", type: "missed", at: ago(4400), seconds: 0 },
];

/** Gifts, Telegram-style: an emoji, a name, a star price. */
export const GIFTS = [
  { id: "cake", emoji: "🎂", nameEn: "Delicious Cake", nameFa: "کیک خوشمزه", stars: 50, bg: "linear-gradient(135deg,#8b5cf6,#6d28d9)" },
  { id: "cap", emoji: "🧢", nameEn: "Homemade Cap", nameFa: "کلاه دست‌ساز", stars: 100, bg: "linear-gradient(135deg,#38bdf8,#1d4ed8)" },
  { id: "trophy", emoji: "🏆", nameEn: "Champion Cup", nameFa: "جام قهرمانی", stars: 200, bg: "linear-gradient(135deg,#f59e0b,#b45309)" },
  { id: "bear", emoji: "🧸", nameEn: "Gym Buddy", nameFa: "رفیق باشگاه", stars: 75, bg: "linear-gradient(135deg,#e0567d,#9d174d)" },
  { id: "rocket", emoji: "🚀", nameEn: "PR Rocket", nameFa: "موشک رکورد", stars: 150, bg: "linear-gradient(135deg,#10b981,#047857)" },
  { id: "ring", emoji: "💍", nameEn: "Precious Ring", nameFa: "حلقه گران‌بها", stars: 500, bg: "linear-gradient(135deg,#f43f5e,#881337)" },
];

/** What the premium voice-to-text produces. No model runs; these are canned. */
export const TRANSCRIPTS = {
  en: [
    "Hey, I finished the session — legs are done for the week.",
    "Can you send me tomorrow's plan when you get a chance?",
    "That last set was brutal but I got all the reps in.",
  ],
  fa: [
    "سلام، تمرین تموم شد — پاها برای این هفته کارشون تمومه.",
    "می‌تونی برنامه فردا رو هر وقت شد بفرستی؟",
    "ست آخر وحشتناک بود ولی همه تکرارها رو زدم.",
  ],
};

/** Rows of the settings screen. Each id maps to a detail sheet below. */
export const SETTINGS_ROWS = [
  { id: "account", icon: "👤", tint: "#3390ec", label: "account", sub: "accountSub" },
  { id: "chatSettings", icon: "💬", tint: "#f59e0b", label: "chatSettings", sub: "chatSettingsSub" },
  { id: "privacy", icon: "🔑", tint: "#22c55e", label: "privacy", sub: "privacySub" },
  { id: "notifications", icon: "🔔", tint: "#ef4444", label: "notifications", sub: "notificationsSub" },
  { id: "data", icon: "📊", tint: "#3b82f6", label: "dataStorage", sub: "dataStorageSub" },
  { id: "folders", icon: "📁", tint: "#0ea5e9", label: "chatFolders", sub: "chatFoldersSub" },
  { id: "devices", icon: "💻", tint: "#06b6d4", label: "devices", sub: "devicesSub" },
  { id: "power", icon: "🔋", tint: "#f97316", label: "powerSaving", sub: "powerSavingSub" },
];

/** Toggle prefs stored on me.prefs — UI state only until there is a backend. */
export const PREF_TOGGLES = {
  notifications: [
    { key: "sound", label: "prefSound", def: true },
    { key: "previews", label: "prefPreviews", def: true },
    { key: "badge", label: "prefBadge", def: true },
  ],
  data: [
    { key: "autoPhotos", label: "prefAutoPhotos", def: true },
    { key: "autoVideos", label: "prefAutoVideos", def: false },
    { key: "saveGallery", label: "prefSaveGallery", def: false },
  ],
  power: [
    { key: "powerSaving", label: "prefPowerSaving", def: false },
    { key: "lessAnimations", label: "prefLessAnimations", def: false },
  ],
};

export const findPerson = (id) => PEOPLE.find((p) => p.id === id) || null;
