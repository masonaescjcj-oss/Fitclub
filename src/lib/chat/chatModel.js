// Data model for the messenger. Pure functions only.

export const uid = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** The signed-in athlete. */
export const ME = "me";

export const CHAT_TYPES = ["private", "group", "channel"];

/** Message kinds the renderer knows how to draw. */
export const KINDS = ["text", "photo", "voice", "sticker", "poll", "file", "system"];

/* ──────────────────────────── factories ──────────────────────────── */

export function createUser(patch = {}) {
  return {
    id: uid(),
    name: "",
    nameFa: "",
    avatar: "🙂",
    color: "#844783",
    bio: "",
    premium: false,
    verified: false,
    emojiStatus: null,
    online: false,
    lastSeen: null,
    ...patch,
  };
}

export function createChat(patch = {}) {
  return {
    id: uid(),
    type: "private",
    title: "",
    titleFa: "",
    emoji: "💬",
    color: "#844783",
    members: [ME],
    admins: [],
    pinned: false,
    muted: false,
    archived: false,
    folder: "all",
    draft: "",
    pinnedMessageId: null,
    verified: false,
    premium: false,
    subscribers: 0,
    ...patch,
  };
}

export function createMessage(patch = {}) {
  return {
    id: uid(),
    chatId: null,
    senderId: ME,
    kind: "text",
    text: "",
    replyTo: null,
    forwardFrom: null,
    editedAt: null,
    deleted: false,
    reactions: {},      // emoji -> [userId]
    at: new Date().toISOString(),
    status: "sent",     // sending | sent | read
    silent: false,
    scheduledFor: null,
    effect: null,       // premium message effect
    media: null,
    poll: null,
    voice: null,
    views: 0,
    ...patch,
  };
}

/* ──────────────────────────── selectors ──────────────────────────── */

export const isMine = (message) => message.senderId === ME;

/** Messages actually visible in a chat: no scheduled ones until they are due. */
export function visibleMessages(messages, chatId, now = Date.now()) {
  return messages
    .filter((m) => m.chatId === chatId)
    .filter((m) => !m.scheduledFor || new Date(m.scheduledFor).getTime() <= now)
    .sort((a, b) => (a.at < b.at ? -1 : 1));
}

export const scheduledMessages = (messages, chatId, now = Date.now()) =>
  messages.filter(
    (m) => m.chatId === chatId && m.scheduledFor && new Date(m.scheduledFor).getTime() > now
  );

export const lastMessage = (messages, chatId, now = Date.now()) => {
  const list = visibleMessages(messages, chatId, now);
  return list[list.length - 1] || null;
};

/** Unread count: incoming messages newer than the chat's read marker. */
export function unreadCount(messages, chat, now = Date.now()) {
  const marker = chat.lastReadAt ? new Date(chat.lastReadAt).getTime() : 0;
  return visibleMessages(messages, chat.id, now).filter(
    (m) => m.senderId !== ME && new Date(m.at).getTime() > marker
  ).length;
}

/** Chats in the order Telegram shows them: pinned first, then most recent. */
export function sortChats(chats, messages, now = Date.now()) {
  const stamp = (c) => {
    const last = lastMessage(messages, c.id, now);
    return last ? new Date(last.at).getTime() : 0;
  };
  return [...chats].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return stamp(b) - stamp(a);
  });
}

/* ──────────────────────────── reactions ──────────────────────────── */

/** Free reactions everyone gets. */
export const BASE_REACTIONS = ["👍", "❤️", "🔥", "👏", "😁", "😮", "😢", "🙏"];

/** Extra reactions Telegram gates behind Premium. */
export const PREMIUM_REACTIONS = ["🤝", "🫡", "🏆", "💪", "🥇", "🤯", "🕊", "🍾", "⚡", "🦾"];

export const allReactions = (premium) =>
  premium ? [...BASE_REACTIONS, ...PREMIUM_REACTIONS] : BASE_REACTIONS;

export function toggleReaction(message, emoji, userId = ME) {
  const reactions = { ...message.reactions };
  const who = reactions[emoji] || [];
  if (who.includes(userId)) {
    const next = who.filter((u) => u !== userId);
    if (next.length) reactions[emoji] = next;
    else delete reactions[emoji];
  } else {
    reactions[emoji] = [...who, userId];
  }
  return { ...message, reactions };
}

export const reactionList = (message) =>
  Object.entries(message.reactions || {})
    .map(([emoji, users]) => ({ emoji, count: users.length, mine: users.includes(ME) }))
    .sort((a, b) => b.count - a.count);

/* ──────────────────────────── polls ──────────────────────────── */

export function votePoll(message, optionIndex, userId = ME) {
  if (!message.poll) return message;
  const { multiple } = message.poll;
  const options = message.poll.options.map((opt, i) => {
    const voters = opt.votes.filter((v) => v !== userId);
    if (i === optionIndex) {
      return opt.votes.includes(userId) && multiple
        ? { ...opt, votes: voters }
        : { ...opt, votes: [...voters, userId] };
    }
    return multiple ? opt : { ...opt, votes: voters };
  });
  return { ...message, poll: { ...message.poll, options } };
}

export const pollTotals = (poll) => {
  const voters = new Set();
  for (const o of poll.options) o.votes.forEach((v) => voters.add(v));
  return { voters: voters.size, votes: poll.options.reduce((n, o) => n + o.votes.length, 0) };
};

export const hasVoted = (poll, userId = ME) =>
  poll.options.some((o) => o.votes.includes(userId));

/* ──────────────────────────── formatting ──────────────────────────── */

export const timeOf = (iso) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const dayStampOf = (iso) => new Date(iso).toDateString();

/** Groups messages by calendar day so the view can insert date separators. */
export function groupByDay(messages) {
  const out = [];
  let current = null;
  for (const m of messages) {
    const stamp = dayStampOf(m.at);
    if (stamp !== current) {
      current = stamp;
      out.push({ separator: true, id: `sep-${stamp}`, at: m.at });
    }
    out.push(m);
  }
  return out;
}

/** Consecutive messages from one sender collapse into a visual group. */
export function isGroupedWith(prev, message) {
  if (!prev || prev.separator) return false;
  if (prev.senderId !== message.senderId) return false;
  return new Date(message.at) - new Date(prev.at) < 5 * 60 * 1000;
}

export function relativeTime(iso, t) {
  const mins = Math.max(Math.round((Date.now() - new Date(iso).getTime()) / 60000), 0);
  if (mins < 1) return t.justNow;
  if (mins < 60) return `${mins}${t.minShort}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}${t.hourShort}`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}${t.dayShort}`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** A one-line preview of a message for the chat list. */
export function previewOf(message, isRtl, t) {
  if (!message) return "";
  if (message.deleted) return t.deletedMessage;
  switch (message.kind) {
    case "photo": return `🖼 ${t.photo}`;
    case "voice": return `🎤 ${t.voiceMessage}`;
    case "sticker": return `${message.media?.emoji || "🪄"} ${t.sticker}`;
    case "poll": return `📊 ${message.poll?.question || t.poll}`;
    case "file": return `📎 ${message.media?.name || t.file}`;
    case "system": return message.text;
    default: return message.text;
  }
}
