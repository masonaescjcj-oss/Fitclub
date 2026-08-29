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

/** Deterministic-ish pick so a given message always draws the same reply. */
function pick(list, seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}

/** Who answers in this chat: a private peer, or a random group member. */
export function responderFor(chat, meId) {
  const others = (chat.members || []).filter((m) => m !== meId);
  if (!others.length) return null;
  if (chat.type === "private") return others[0];
  if (chat.type === "channel") return null; // channels are broadcast-only
  return others[Math.floor(Math.random() * others.length)];
}

/**
 * Schedules a reply. Returns a cancel function so a component can tear it
 * down on unmount without leaving a timer to fire into a dead tree.
 */
export function scheduleReply(chat, sourceText, lang, { onTyping, onReply }) {
  const responder = responderFor(chat, "me");
  if (!responder) return () => {};

  const thinkMs = 700 + Math.random() * 900;
  const typeMs = 1200 + Math.random() * 1600;

  const t1 = setTimeout(() => onTyping(responder, true), thinkMs);
  const t2 = setTimeout(() => {
    onTyping(responder, false);
    onReply(responder, pick(REPLIES[lang] || REPLIES.en, sourceText || responder));
  }, thinkMs + typeMs);

  return () => { clearTimeout(t1); clearTimeout(t2); };
}
