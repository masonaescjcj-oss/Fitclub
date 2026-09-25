// Seeds and static config for the messenger's Telegram-shaped shell:
// gifts, settings rows, canned voice transcripts.

import { PEOPLE } from "./chatStore";

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
