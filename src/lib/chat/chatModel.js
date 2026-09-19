// Data model for the messenger. Pure functions only.

export const uid = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** The signed-in athlete. */
export const ME = "me";

export const CHAT_TYPES = ["private", "group", "channel", "bot"];

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
    phone: "",
    username: "",
    birthday: null,
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
    folders: [],        // custom folder ids this chat is filed under
    challenge: null,    // a crew's shared weekly goal
    draft: "",
    pinnedMessageId: null,
    verified: false,
    premium: false,
    subscribers: 0,
    description: "",    // groups and channels: the "about" text
    username: "",       // public link slug, e.g. fitclub.app/<username>
    isPublic: false,    // public = anyone can find it by link; private = invite link only
    inviteLink: "",     // fitclub.app/+<token>, for private groups and channels
    createdBy: null,
    createdAt: null,
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
    textFa: "",         // bots speak both languages; people don't need this
    buttons: null,      // inline keyboard rows: [[{ id, label }]]
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
    translation: null,  // premium translate: the other-language text, when known
    showTranslation: false,
    media: null,
    poll: null,
    voice: null,
    challenge: null,    // progress snapshot for a challenge card
    views: 0,
    ...patch,
  };
}

/* ──────────────────────────── groups & channels ──────────────────────────── */

/** Where public links live. There is no server yet; the host is the app's own. */
export const LINK_HOST = "fitclub.app";

/** Public usernames follow Telegram's rules: a–z, 0–9, underscores, five or more. */
export const USERNAME_MIN = 5;
export const USERNAME_MAX = 32;
const USERNAME_RE = /^[a-z0-9_]+$/;

/** Slugs the app keeps for itself. */
const RESERVED = ["admin", "fitclub", "support", "help", "settings", "me", "saved"];

/**
 * Checks a public link slug against the rules and the other chats.
 * Returns null when it is fine, otherwise an error code the UI translates:
 * "short" | "long" | "chars" | "start" | "taken".
 */
export function validateUsername(raw, chats = [], selfId = null) {
  const slug = String(raw || "").trim().toLowerCase();
  if (slug.length < USERNAME_MIN) return "short";
  if (slug.length > USERNAME_MAX) return "long";
  if (!USERNAME_RE.test(slug)) return "chars";
  if (/^[0-9_]/.test(slug)) return "start";
  if (RESERVED.includes(slug)) return "taken";
  const clash = chats.some((c) => c.id !== selfId && (c.username || "").toLowerCase() === slug);
  return clash ? "taken" : null;
}

/** A fresh private invite link, the way Telegram's `t.me/+…` ones look. */
export function makeInviteLink() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let token = "";
  for (let i = 0; i < 16; i += 1) token += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `${LINK_HOST}/+${token}`;
}

/** The link people join through: the public one when there is a username. */
export const chatLink = (chat) =>
  chat.isPublic && chat.username ? `${LINK_HOST}/${chat.username}` : chat.inviteLink || "";

export const isAdminOf = (chat, userId = ME) => (chat.admins || []).includes(userId);

/** A group the athlete just made: everyone picked is in, the creator is admin. */
export function buildGroupChat({ title, memberIds = [], emoji = "👥", color = "#2fa6ff", description = "", now = new Date().toISOString() }) {
  const others = [...new Set(memberIds.filter((id) => id && id !== ME))];
  return createChat({
    type: "group", title, titleFa: title, emoji, color, description,
    members: [ME, ...others], admins: [ME], folders: ["people"],
    inviteLink: makeInviteLink(), createdBy: ME, createdAt: now, lastReadAt: now,
  });
}

/** A channel the athlete just made; subscribers count the people added. */
export function buildChannelChat({ title, description = "", isPublic = false, username = "", memberIds = [], emoji = "📣", color = "#f59e0b", now = new Date().toISOString() }) {
  const others = [...new Set(memberIds.filter((id) => id && id !== ME))];
  return createChat({
    type: "channel", title, titleFa: title, emoji, color, description,
    isPublic: !!isPublic, username: isPublic ? String(username).trim().toLowerCase() : "",
    members: [ME, ...others], admins: [ME], subscribers: 1 + others.length,
    inviteLink: makeInviteLink(), createdBy: ME, createdAt: now, lastReadAt: now,
  });
}

/** The "Channel created" pill Telegram drops into a brand-new chat. */
export const createdSystemMessage = (chat) =>
  createMessage({
    chatId: chat.id, senderId: ME, kind: "system", status: "read", at: chat.createdAt || new Date().toISOString(),
    text: chat.type === "channel" ? "Channel created" : "Group created",
    textFa: chat.type === "channel" ? "کانال ساخته شد" : "گروه ساخته شد",
  });

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
    case "challenge": return (isRtl && message.textFa) || message.text;
    case "system": return (isRtl && message.textFa) || message.text;
    default: return (isRtl && message.textFa) || message.text;
  }
}

/** The existing one-to-one chat with this person, if any. */
export const findPrivateChatWith = (chats, userId) =>
  chats.find(
    (c) => c.type === "private" && c.id !== "saved" && (c.members || []).includes(userId)
  ) || null;

/** Unread across every non-archived chat, for the drawer badge. */
export const totalUnread = (chats, messages, now = Date.now()) =>
  chats
    .filter((c) => !c.archived && !c.muted)
    .reduce((n, c) => n + unreadCount(messages, c, now), 0);
