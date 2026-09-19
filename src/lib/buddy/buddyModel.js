// Teammate matching: who the athlete is (from their own data), who is out
// there, how well they fit, and what the bot says. Pure functions only.

import { overallStreak } from "../checklistModel";
import { sessionVolume } from "../training/programModel";

export const BOT_ID = "buddy_bot";
export const BOT_CHAT_ID = "buddy_bot";

export const LOOKING_FOR = ["gymBuddy", "accountability", "habits", "running", "nutrition"];
export const TIMES = ["morning", "evening", "any"];
export const GENDERS = ["any", "male", "female"];
export const LEVELS = ["beginner", "intermediate", "advanced"];

export const DEFAULT_PREFS = { lookingFor: ["gymBuddy", "accountability"], time: "any", showGender: "any" };

/** Habit families detected from checklist wording, in either language. */
export const HABITS = {
  water: /water|hydrat|آب/i,
  reading: /read|book|pages|مطالعه|کتاب|صفحه/i,
  meditation: /medit|mindful|breath|calm|مدیتیشن|آرامش|تنفس/i,
  sleep: /sleep|bed|wake|خواب|بیدار/i,
  steps: /walk|steps|run|قدم|پیاده|دویدن/i,
  journaling: /journal|write|plan|نوشتن|ژورنال|برنامه‌ریزی/i,
  nutrition: /protein|meal|sugar|diet|calorie|غذا|پروتئین|شکر|وعده|کالری/i,
  training: /workout|train|gym|lift|تمرین|باشگاه|ورزش/i,
};

export function detectHabits(texts) {
  const found = new Set();
  for (const text of texts) {
    for (const [key, re] of Object.entries(HABITS)) if (re.test(text || "")) found.add(key);
  }
  return [...found];
}

const DAYS = { "2_3": 3, "3_4": 4, "4_5": 5, "5_6": 6 };

/** Training level from what was actually lifted, with the profile as a fallback. */
export function levelFrom(sessions, difficulty) {
  const done = (sessions || []).filter((s) => s.finishedAt);
  if (done.length >= 2) {
    const avg = done.reduce((a, s) => a + sessionVolume(s), 0) / done.length;
    return avg < 2000 ? "beginner" : avg < 4500 ? "intermediate" : "advanced";
  }
  return difficulty === "light" ? "beginner" : difficulty === "intense" || difficulty === "extreme" ? "advanced" : "intermediate";
}

/** Morning or evening person, from when sessions were actually started. */
export function timeFrom(sessions) {
  const hours = (sessions || []).filter((s) => s.finishedAt).map((s) => new Date(s.startedAt).getHours());
  const morning = hours.filter((h) => h < 12).length;
  const evening = hours.filter((h) => h >= 16).length;
  if (!hours.length || morning === evening) return "any";
  return morning > evening ? "morning" : "evening";
}

/** The athlete's own match card, read off the diary, the log and the checklists. */
export function deriveMyProfile({ profile, sessions, lists, prefs = DEFAULT_PREFS }) {
  return {
    goal: profile.goal,
    gender: profile.gender,
    days: DAYS[profile.frequency] ?? 4,
    time: prefs.time && prefs.time !== "any" ? prefs.time : timeFrom(sessions),
    level: levelFrom(sessions, profile.difficulty),
    habits: detectHabits((lists || []).flatMap((l) => (l.items || []).map((i) => i.text || i.textEn || ""))),
    streak: overallStreak(lists || []),
    lookingFor: prefs.lookingFor || [],
    showGender: prefs.showGender || "any",
  };
}

/* ──────────────────────────── the pool ────────────────────────────
 * Stand-ins for real members until there is a server. Names stay hidden
 * behind the alias until both sides reveal.
 */
const b = (id, num, name, nameFa, avatar, color, gender, age, goal, level, days, time, habits, lookingFor, city, cityFa, bio, bioFa, program, streak) => ({
  id, alias: `Athlete ${num}`, aliasFa: `ورزشکار ${num}`, name, nameFa, avatar, color, gender, age, goal, level, days, time,
  habits, lookingFor, city, cityFa, bio, bioFa, program, streak, online: Math.random() > 0.5, lastSeen: new Date(Date.now() - 3600000 * (1 + (num % 9))).toISOString(),
});

export const BUDDIES = [
  b("bd_niki", 412, "Niki Rad", "نیکی راد", "🧕", "#e0567d", "female", 27, "Weight Loss", "intermediate", 4, "morning", ["water", "steps", "nutrition"], ["accountability", "habits"], "Tehran", "تهران", "Cutting for a summer trip. I show up at 7am, rain or shine.", "برای سفر تابستون کات می‌کنم. هفت صبح باشگاهم، آفتاب یا باران.", "Push Pull Legs", 9),
  b("bd_arash", 207, "Arash Moradi", "آرش مرادی", "🧑‍🦱", "#38bdf8", "male", 31, "Max Strength", "advanced", 5, "evening", ["sleep", "nutrition", "training"], ["gymBuddy"], "Shiraz", "شیراز", "Chasing a 200 kg squat. Spotter wanted, banter included.", "دنبال اسکات ۲۰۰ کیلو. یه اسپاتر می‌خوام، شوخی هم داریم.", "5/3/1", 22),
  b("bd_maya", 118, "Maya Chen", "مایا چن", "👩", "#8b5cf6", "female", 24, "Keep Fit", "beginner", 3, "evening", ["reading", "meditation", "water"], ["habits", "accountability"], "Tehran", "تهران", "New to lifting, serious about habits. Daily check-ins welcome.", "تازه شروع کرده‌ام، اما روی عادت‌ها جدی‌ام. چک‌این روزانه دوست دارم.", "Full Body", 14),
  b("bd_reza", 655, "Reza Karimi", "رضا کریمی", "🧔‍♂️", "#10b981", "male", 29, "Muscle Gain", "intermediate", 4, "morning", ["nutrition", "sleep"], ["gymBuddy", "nutrition"], "Isfahan", "اصفهان", "Lean bulk, 3,000 kcal a day and counting every gram.", "حجم تمیز، ۳۰۰۰ کالری در روز و هر گرم رو می‌شمارم.", "Upper / Lower", 6),
  b("bd_lina", 339, "Lina Farahani", "لینا فراهانی", "👩‍🦱", "#f59e0b", "female", 33, "Weight Loss", "intermediate", 3, "morning", ["steps", "journaling", "water"], ["running", "accountability"], "Karaj", "کرج", "Runner first, lifter second. 10k every Sunday.", "اول دونده‌ام، بعد وزنه‌بردار. هر یکشنبه ۱۰ کیلومتر.", "Couch to 10k", 17),
  b("bd_sam", 501, "Sam Okafor", "سام اوکافور", "👨🏿", "#f43f5e", "male", 26, "Muscle Gain", "advanced", 6, "evening", ["training", "nutrition"], ["gymBuddy"], "Tehran", "تهران", "Six days a week, bodybuilding split. Looking for a partner who never skips.", "شش روز هفته، برنامه‌ی بدنسازی. دنبال شریکی که هیچ‌وقت نپیچونه.", "Bro Split", 31),
  b("bd_hana", 288, "Hana Yamamoto", "هانا یاماموتو", "👩‍🎤", "#06b6d4", "female", 22, "Keep Fit", "beginner", 2, "any", ["meditation", "sleep", "reading"], ["habits"], "Mashhad", "مشهد", "Yoga, sleep and books. Building the basics before the barbell.", "یوگا، خواب و کتاب. قبل از هالتر، پایه‌ها رو می‌سازم.", "Mobility", 4),
  b("bd_omid", 776, "Omid Sharifi", "امید شریفی", "🧑", "#844783", "male", 35, "Keep Fit", "intermediate", 4, "morning", ["water", "steps", "journaling", "reading"], ["accountability", "habits"], "Tehran", "تهران", "Dad of two. Habit streaks are my thing — 90 days and counting.", "پدر دو بچه. استریک عادت‌ها کارِ منه — ۹۰ روز و ادامه دارد.", "Athletic Explosive Power", 90),
  b("bd_sara2", 143, "Sara Najafi", "سارا نجفی", "👱‍♀️", "#a855f7", "female", 28, "Max Strength", "advanced", 5, "evening", ["training", "sleep"], ["gymBuddy"], "Tabriz", "تبریز", "Powerlifting meet in November. Need someone to trade video form checks.", "مسابقه‌ی پاورلیفتینگ آبان. یکی می‌خوام برای چک فرم ویدیویی.", "Powerlifting Block", 12),
  b("bd_kian", 920, "Kian Ahmadi", "کیان احمدی", "🧑‍🦰", "#0ea5e9", "male", 23, "Weight Loss", "beginner", 3, "evening", ["water", "nutrition", "steps"], ["accountability", "nutrition"], "Tehran", "تهران", "Down 8 kg, 12 to go. Honest about slip-ups, want the same back.", "۸ کیلو کم کردم، ۱۲ تا مونده. درباره‌ی خطاها صادقم، همین رو می‌خوام.", "Full Body", 3),
  b("bd_dani", 364, "Dani Costa", "دنی کوستا", "🧑‍🦲", "#22c55e", "male", 30, "Keep Fit", "intermediate", 4, "any", ["running", "meditation", "steps"].filter((h) => h !== "running"), ["running", "habits"], "Isfahan", "اصفهان", "Trail runs and calm mornings. Consistency over intensity.", "دویدن در طبیعت و صبح‌های آرام. تداوم مهم‌تر از شدت.", "Calisthenics", 26),
  b("bd_yas", 582, "Yasmin Amiri", "یاسمین امیری", "🧕🏽", "#fb7185", "female", 25, "Muscle Gain", "intermediate", 4, "morning", ["nutrition", "water", "training"], ["gymBuddy", "nutrition"], "Tehran", "تهران", "Glutes and grit. Meal-prep Sundays, PRs Mondays.", "باسن و اراده. یکشنبه‌ها آماده‌سازی غذا، دوشنبه‌ها رکورد.", "Push Pull Legs", 19),
  b("bd_pouya", 47, "Pouya Rahimi", "پویا رحیمی", "👨‍🦳", "#64748b", "male", 41, "Weight Loss", "beginner", 3, "morning", ["steps", "sleep", "journaling"], ["accountability", "habits"], "Qom", "قم", "Doctor said move more. Walking 10k steps and learning the basics.", "دکتر گفت بیشتر تحرک کن. ۱۰ هزار قدم و یادگیری پایه‌ها.", "Beginner Strength", 8),
  b("bd_mina", 731, "Mina Saeedi", "مینا سعیدی", "👩‍🦳", "#d946ef", "female", 38, "Keep Fit", "advanced", 5, "evening", ["training", "meditation", "reading"], ["gymBuddy", "habits"], "Tehran", "تهران", "CrossFit coach off duty. Happy to lift with anyone who shows up.", "مربی کراس‌فیت در ساعت غیرکاری. با هر کسی که بیاد وزنه می‌زنم.", "CrossFit", 45),
];

export const findBuddy = (id) => BUDDIES.find((x) => x.id === id) || null;

/* ──────────────────────────── scoring ──────────────────────────── */

const RELATED_GOALS = { "Muscle Gain": ["Max Strength"], "Max Strength": ["Muscle Gain"], "Weight Loss": ["Keep Fit"], "Keep Fit": ["Weight Loss"] };
const levelIndex = (l) => LEVELS.indexOf(l);

/**
 * 0–100 fit between the athlete and a candidate, with the reasons that
 * earned it so the card can say *why*. Goal and schedule weigh the most:
 * people who train for the same thing at the same hour actually meet.
 */
export function compatibility(me, c) {
  let score = 0;
  const reasons = [];

  if (c.goal === me.goal) { score += 30; reasons.push("sameGoal"); }
  else if ((RELATED_GOALS[me.goal] || []).includes(c.goal)) { score += 15; reasons.push("relatedGoal"); }

  const dayGap = Math.abs((c.days || 0) - (me.days || 0));
  if (dayGap <= 1) { score += 15; reasons.push("sameSchedule"); }
  else if (dayGap <= 2) score += 8;

  if (me.time !== "any" && c.time === me.time) { score += 15; reasons.push(me.time === "morning" ? "bothMorning" : "bothEvening"); }
  else if (me.time === "any" || c.time === "any") score += 8;

  const lvl = Math.abs(levelIndex(c.level) - levelIndex(me.level));
  if (lvl === 0) { score += 15; reasons.push("sameLevel"); }
  else if (lvl === 1) score += 8;

  const shared = (c.habits || []).filter((h) => (me.habits || []).includes(h));
  if (shared.length) {
    score += Math.min(20, Math.round((20 * shared.length) / Math.max((me.habits || []).length, 1)));
    reasons.push(...shared.map((h) => `habit:${h}`));
  }

  const wants = (c.lookingFor || []).filter((w) => (me.lookingFor || []).includes(w));
  if (wants.length) { score += Math.min(10, wants.length * 5); reasons.push(...wants.map((w) => `want:${w}`)); }

  return { score: Math.min(100, Math.round(score)), reasons };
}

/** Candidates the athlete has not decided on yet, best fit first. */
export function rankCandidates(me, { liked = [], passed = [], matched = [] } = {}) {
  const seen = new Set([...liked, ...passed, ...matched]);
  return BUDDIES
    .filter((c) => !seen.has(c.id))
    .filter((c) => me.showGender === "any" || c.gender === me.showGender)
    .map((c) => ({ candidate: c, ...compatibility(me, c) }))
    .sort((a, b) => b.score - a.score);
}

const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

/**
 * Whether the other side likes back, and how soon. A strong fit answers at
 * once; a middling one thinks about it; a weak one never gets back to you.
 * Deterministic per candidate so the demo behaves the same every time.
 */
export function likesBack(candidateId, score) {
  if (score >= 70) return { match: true, delayMs: 0 };
  if (score >= 45) return hash(candidateId) % 10 < 6 ? { match: true, delayMs: 15000 + (hash(candidateId) % 30000) } : { match: false };
  return { match: false };
}

export const aliasOf = (c, isRtl) => (isRtl ? c.aliasFa : c.alias);
export const realNameOf = (c, isRtl) => (isRtl ? c.nameFa || c.name : c.name);

/* ──────────────────────────── the bot ──────────────────────────── */

const msg = (text, textFa, buttons = null) => ({ senderId: BOT_ID, text, textFa, buttons, status: "read" });
const row = (...ids) => ids.map((id) => ({ id, label: `btn_${id.split(":")[0]}` }));

export const MENU = [row("find"), row("anon"), row("matches", "profile"), row("prefs")];

export function botWelcome() {
  return msg(
    "Hi! I'm the Teammate bot 🤝\nI pair you with people who are working on the same thing you are — same goal, similar schedule, similar habits — so you can push each other.\n\nEverything starts anonymous: you both see an alias until you choose to reveal.\n\nWhat would you like to do?",
    "سلام! من ربات هم‌تیمی‌ام 🤝\nتو رو با آدم‌هایی جفت می‌کنم که روی همون چیزی کار می‌کنن که تو کار می‌کنی — هدف مشابه، برنامه‌ی مشابه، عادت‌های مشابه — تا همدیگه رو جلو ببرید.\n\nهمه‌چیز ناشناس شروع می‌شه: هر دو فقط یک اسم مستعار می‌بینید تا وقتی خودتون بخواید هویت‌تون رو نشون بدید.\n\nچی‌کار کنیم؟",
    MENU
  );
}

export const botMenu = () => msg("What next?", "بعدش چی؟", MENU);

const LEVEL_FA = { beginner: "مبتدی", intermediate: "متوسط", advanced: "پیشرفته" };
const TIME_FA = { morning: "صبح‌ها", evening: "عصرها", any: "هر وقت" };
const GOAL_FA = { "Weight Loss": "کاهش وزن", "Muscle Gain": "عضله‌سازی", "Keep Fit": "تناسب اندام", "Max Strength": "قدرت" };
export const HABIT_LABEL = {
  water: ["Water", "آب"], reading: ["Reading", "مطالعه"], meditation: ["Meditation", "مدیتیشن"], sleep: ["Sleep", "خواب"],
  steps: ["Steps / walking", "قدم‌زدن"], journaling: ["Journaling", "برنامه‌ریزی"], nutrition: ["Nutrition", "تغذیه"], training: ["Training", "تمرین"],
};
export const WANT_LABEL = {
  gymBuddy: ["Gym buddy", "همراه باشگاه"], accountability: ["Accountability partner", "شریک پاسخگویی"],
  habits: ["Habit buddy", "همراه عادت‌ها"], running: ["Running partner", "همراه دویدن"], nutrition: ["Meal-prep partner", "همراه تغذیه"],
};

export function botProfile(me) {
  const habits = me.habits.length ? me.habits.map((h) => HABIT_LABEL[h][0]).join(", ") : "none detected yet";
  const habitsFa = me.habits.length ? me.habits.map((h) => HABIT_LABEL[h][1]).join("، ") : "هنوز چیزی پیدا نشد";
  return msg(
    `Here is the card others see (no name, no photo):\n\n🎯 Goal: ${me.goal}\n🏋️ Level: ${me.level} · ${me.days} days/week · ${me.time}\n✅ Habits: ${habits}\n🔥 Streak: ${me.streak} days\n🤝 Looking for: ${me.lookingFor.map((w) => WANT_LABEL[w][0]).join(", ") || "—"}\n\nIt is built from your diary, your training log and your checklists, so it stays honest.`,
    `این کارتی‌ست که دیگران می‌بینن (بدون اسم و عکس):\n\n🎯 هدف: ${GOAL_FA[me.goal] || me.goal}\n🏋️ سطح: ${LEVEL_FA[me.level]} · ${me.days} روز در هفته · ${TIME_FA[me.time]}\n✅ عادت‌ها: ${habitsFa}\n🔥 استریک: ${me.streak} روز\n🤝 دنبالِ: ${me.lookingFor.map((w) => WANT_LABEL[w][1]).join("، ") || "—"}\n\nاز دفتر غذا، لاگ تمرین و چک‌لیست‌هات ساخته شده، پس صادقانه است.`,
    [row("find"), row("prefs", "menu")]
  );
}

export function botMatched(c, score, chatId, isRtl) {
  return msg(
    `🎉 It's a match! ${c.alias} (${score}% compatible) wants to team up too.\nYou are both anonymous for now — say hi, and reveal when it feels right.`,
    `🎉 مچ شد! ${c.aliasFa} (${score}٪ سازگاری) هم می‌خواد هم‌تیمی شه.\nفعلاً هر دو ناشناسید — سلام کن، هر وقت حس کردی درسته هویتت رو نشون بده.`,
    [[{ id: `open:${chatId}`, label: "btn_open" }], row("find", "menu")]
  );
}

export function botAnon(c, score, chatId) {
  return msg(
    `Connected you with ${c.alias} — ${score}% compatible, ${c.goal.toLowerCase()} like you.\nAnonymous both ways until you both reveal. Be kind; you can end the chat any time.`,
    `تو رو به ${c.aliasFa} وصل کردم — ${score}٪ سازگاری، هدفش مثل خودت.\nدوطرفه ناشناس، تا وقتی هر دو بخواید. مهربون باش؛ هر وقت خواستی می‌تونی چت رو تموم کنی.`,
    [[{ id: `open:${chatId}`, label: "btn_open" }], row("anon", "menu")]
  );
}

export function botMatches(matches, isRtl) {
  if (!matches.length) {
    return msg("No teammates yet. Want to look through people who fit you?", "هنوز هم‌تیمی نداری. می‌خوای آدم‌هایی که بهت می‌خورن رو ببینی؟", [row("find", "anon"), row("menu")]);
  }
  const lines = matches.map((m) => `• ${m.revealed ? (isRtl ? m.nameFa : m.name) : (isRtl ? m.aliasFa : m.alias)} — ${m.score}%`).join("\n");
  return msg(`Your teammates:\n${lines}`, `هم‌تیمی‌هات:\n${lines}`,
    [...matches.slice(0, 4).map((m) => [{ id: `open:${m.chatId}`, label: "btn_openNamed", name: isRtl ? (m.revealed ? m.nameFa : m.aliasFa) : (m.revealed ? m.name : m.alias) }]), row("find", "menu")]);
}

export const botNoOne = () => msg(
  "You've seen everyone who fits your preferences for now. Widen them, or check back later — the pool grows as people join.",
  "همه‌ی کسانی که با تنظیماتت می‌خوردن رو دیدی. تنظیمات رو بازتر کن یا بعداً سر بزن — با اضافه شدن آدم‌ها استخر بزرگ می‌شه.",
  [row("prefs", "menu")]
);

export const botPrefsSaved = () => msg("Preferences saved. Your card and your matches update from here on.", "تنظیمات ذخیره شد. کارتت و مچ‌هات از الان به‌روز می‌شن.", [row("find", "menu")]);

export const botFallback = () => msg("I work with the buttons below — pick one:", "من با دکمه‌های زیر کار می‌کنم — یکی رو انتخاب کن:", MENU);

export const botRevealed = (c, isRtl) => ({
  senderId: BOT_ID, kind: "system",
  text: `🎭 → 🙂 You both revealed. Say hello to ${c.name}!`,
  textFa: `🎭 → 🙂 هر دو هویت‌تون رو نشون دادید. به ${c.nameFa} سلام کن!`,
});
