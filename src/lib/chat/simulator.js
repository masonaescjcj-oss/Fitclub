/**
 * Stands in for the other side of a conversation.
 *
 * There is no server, so nobody is really typing. This picks a plausible
 * reply, waits a believable amount of time, and shows a typing indicator
 * first — enough for the interface to be exercised properly.
 */

const REPLIES = {
  en: [
    "Nice one 💪", "How did that feel?", "Same here, felt strong today.",
    "Send me the numbers when you get a sec.", "I'm in for Saturday.",
    "That's a PB, isn't it?", "Careful with the lower back on those.",
    "Good session. Rest up.", "Let's do a form check next time.",
    "Adding that to my block.", "🔥", "Agreed.",
  ],
  fa: [
    "عالی بود 💪", "چه حسی داشت؟", "منم همینطور، امروز قوی بودم.",
    "هر وقت تونستی اعداد رو بفرست.", "شنبه هستم.",
    "این رکورد جدیده، نه؟", "حواست به کمرت باشه.",
    "تمرین خوبی بود. استراحت کن.", "دفعه بعد فرم رو چک کنیم.",
    "به برنامه‌ام اضافه‌اش می‌کنم.", "🔥", "موافقم.",
  ],
};

/** Replies that address the athlete by handle — a third of group replies use one. */
const MENTION_REPLIES = {
  en: ["@{me} you in for Saturday?", "@{me} nice, what did you hit?", "@{me} send me that program when you can", "@{me} form check tomorrow?"],
  fa: ["@{me} شنبه هستی؟", "@{me} عالی، چند زدی؟", "@{me} هر وقت شد اون برنامه رو بفرست", "@{me} فردا فرم رو چک کنیم؟"],
};

/** The community's admin says hello to a newcomer, by handle. */
export const GREETINGS = {
  en: ["Welcome @{me} 👋 Post your first session whenever you're ready.", "Hey @{me}, glad you joined! Rules are pinned, say hi 🙌"],
  fa: ["خوش اومدی @{me} 👋 هر وقت آماده بودی اولین تمرینت رو بفرست.", "سلام @{me}، خوشحالیم اومدی! قوانین پین شده، یه سلام بده 🙌"],
};

/** Deterministic-ish pick so a given message always draws the same reply. */
function pickIndex(list, seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % list.length;
}

/** Who answers in this chat: a private peer, or a random group member. */
export function responderFor(chat, meId) {
  const others = (chat.members || []).filter((m) => m !== meId);
  if (!others.length) return null;
  if (chat.type === "private") return others[0];
  if (chat.type === "channel" || chat.type === "bot") return null; // broadcast-only, or scripted
  return others[Math.floor(Math.random() * others.length)];
}

/**
 * Schedules a reply. Returns a cancel function so a component can tear it
 * down on unmount without leaving a timer to fire into a dead tree.
 */
export function scheduleReply(chat, sourceText, lang, { onTyping, onReply }, { meUsername = "" } = {}) {
  const responder = responderFor(chat, "me");
  if (!responder) return () => {};
  // In a group, sometimes the reply is addressed to the athlete by handle.
  const mentionMe = chat.type === "group" && meUsername && pickIndex([0, 1, 2], `${sourceText}|${responder}`) === 0;

  const thinkMs = 700 + Math.random() * 900;
  const typeMs = 1200 + Math.random() * 1600;

  const t1 = setTimeout(() => onTyping(responder, true), thinkMs);
  const t2 = setTimeout(() => {
    onTyping(responder, false);
    // The reply lists are parallel, so the counterpart index IS the translation.
    const pool = mentionMe ? MENTION_REPLIES : REPLIES;
    const i = pickIndex(pool.en, sourceText || responder);
    const fill = (str) => str.replace("{me}", meUsername);
    const text = fill((pool[lang] || pool.en)[i]);
    const translation = fill((lang === "fa" ? pool.en : pool.fa)[i]);
    onReply(responder, text, translation === text ? null : translation);
  }, thinkMs + typeMs);

  return () => { clearTimeout(t1); clearTimeout(t2); };
}

/**
 * A channel post's afterlife: subscribers open it and a few react. Views climb
 * in a handful of ticks scaled to the audience, then a reaction or two lands.
 * Returns a cancel function, like scheduleReply.
 */
export function scheduleChannelLife(chat, messageId, { onViews, onReaction }) {
  const audience = Math.max((chat.subscribers || chat.members.length) - 1, 0);
  if (audience === 0) return () => {};
  const ticks = Math.min(4 + Math.floor(Math.random() * 3), audience);
  // Reach most of the audience early, then trail off: the counts are fixed up front.
  const counts = [];
  let seen = 1;
  for (let i = 0; i < ticks; i += 1) {
    seen = Math.min(audience + 1, seen + Math.max(1, Math.round(audience * (0.12 + Math.random() * 0.28))));
    counts.push(seen);
  }
  const timers = counts.map((views, i) => setTimeout(() => onViews(messageId, views), 1500 + i * (1800 + Math.random() * 2200)));
  const others = (chat.members || []).filter((m) => m !== "me");
  const reactors = others.sort(() => Math.random() - 0.5).slice(0, Math.min(others.length, 1 + Math.floor(Math.random() * 2)));
  const EMOJI = ["👍", "🔥", "❤️", "👏", "💪"];
  reactors.forEach((userId, i) => {
    timers.push(setTimeout(() => onReaction(messageId, EMOJI[Math.floor(Math.random() * EMOJI.length)], userId), 4000 + i * 3000 + Math.random() * 2500));
  });
  return () => timers.forEach(clearTimeout);
}

/** A moment after joining, the admin greets the newcomer by handle. Returns a cancel function. */
export function scheduleGreeting(chat, lang, meUsername, onMessage) {
  const admin = (chat.admins || []).find((id) => id !== "me") || (chat.members || []).find((id) => id !== "me");
  if (!admin || !meUsername) return () => {};
  const i = pickIndex(GREETINGS.en, chat.id);
  const fill = (str) => str.replace("{me}", meUsername);
  const text = fill((GREETINGS[lang] || GREETINGS.en)[i]);
  const translation = fill((lang === "fa" ? GREETINGS.en : GREETINGS.fa)[i]);
  const id = setTimeout(() => onMessage(admin, text, translation), 3500 + Math.random() * 2500);
  return () => clearTimeout(id);
}
