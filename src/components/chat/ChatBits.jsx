import React from "react";
import {
  BadgeCheck, Bookmark, Bot, Check, CheckCheck, Dumbbell, Flame, Hand, Heart, Medal, Megaphone, Moon, Pin, Snowflake,
  Star, Trophy, Users, VenetianMask, VolumeX, Zap,
} from "lucide-react";
import { Avatar as KitAvatar, cx } from "../ui/kit";
import { ME } from "../../lib/chat/chatModel";
import { findUser } from "../../lib/chat/chatStore";
import { loadSession } from "../../lib/session";

/*
 * Small pieces every messenger screen shares, in the app's own language:
 * initials on the five avatar tones, an accent online dot, and lucide icons
 * where Telegram draws emoji decorations.
 */

const TONES = ["bg-sand", "bg-coach", "bg-sage", "bg-mist", "bg-jet"];

/** The tone the kit Avatar would pick for this name, so a person keeps theirs everywhere. */
export function toneOf(name) {
  const hash = [...String(name || "")].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return TONES[hash % TONES.length];
}

/** Ink tones carry an accent glyph and a hairline at night; the light tones carry ink. */
const onTone = (tone) => (tone === "bg-jet" ? "text-accent dark:ring-1 dark:ring-inset dark:ring-line" : "text-on-accent");

/** Emoji statuses are stored as emoji; the chrome draws them as icons. */
const STATUS_ICONS = {
  "⭐": Star, "🏆": Trophy, "🔥": Flame, "💪": Dumbbell, "⚡": Zap,
  "🥇": Medal, "🧊": Snowflake, "🌙": Moon, "❤️": Heart, "🫡": Hand,
};

/** An emoji status as a small lucide icon. */
export function StatusIcon({ status, className = "w-3.5 h-3.5" }) {
  const Icon = STATUS_ICONS[status] || Star;
  return <Icon className={className} strokeWidth={2.2} aria-hidden="true" />;
}

const persian = () => {
  try { return localStorage.getItem("language") === "fa"; } catch { return false; }
};

/** What a chat or person is drawn as: an icon for the special chats, initials for everyone else. */
function faceOf(chat, user) {
  if (chat?.id === "saved" && !user) return { icon: Bookmark, tone: "bg-jet", fill: true };
  if (user?.avatar === "🎭") return { icon: VenetianMask, tone: toneOf(user.id || user.name) };
  if (!user && chat?.photo) return null; // a group's or channel's own photo
  if (!user && chat) {
    if (chat.type === "bot") return { icon: Bot, tone: "bg-accent" };
    if (chat.type === "channel") return { icon: Megaphone, tone: toneOf(chat.title), square: true };
    if (chat.type === "group") return { icon: chat.crew ? Dumbbell : Users, tone: toneOf(chat.title) };
  }
  return null;
}

/**
 * Round avatar: initials on a tone (via the kit Avatar), or an icon on a
 * tone for Saved Messages, bots, channels and groups. An accent dot marks
 * someone online and a small icon shows their emoji status.
 *
 * `ring` is the colour of the ring around the online dot; it takes a
 * Tailwind ring class (e.g. "ring-canvas") and defaults to the card colour.
 */
export function Avatar({ chat, user, size = 48, ring, showStatus = true, className = "" }) {
  const fa = persian();
  const source = user || chat;
  const face = faceOf(chat, user);
  const online = user?.online ?? false;
  const self = user?.id === ME;
  const name = self
    ? (loadSession().name || user.name)
    : user ? (fa ? user.nameFa || user.name : user.name)
      : (fa ? chat?.titleFa || chat?.title : chat?.title);
  // The tone follows the stable (English) name, so it doesn't change with the language.
  const toneKey = self ? "me" : user ? user.name : chat?.title;
  const ringClass = typeof ring === "string" && ring.startsWith("ring-") ? ring : "ring-card";
  const dot = Math.max(8, Math.round(size * 0.24));
  const badge = Math.max(16, Math.round(size * 0.36));

  let body;
  if (face) {
    const Icon = face.icon;
    const tone = face.tone;
    body = (
      <span style={{ width: size, height: size }}
        className={cx("flex items-center justify-center", face.square ? "rounded-[32%]" : "rounded-full", tone,
          tone === "bg-accent" ? "text-on-accent" : onTone(tone))}>
        <Icon style={{ width: size * 0.44, height: size * 0.44 }} strokeWidth={2} fill={face.fill ? "currentColor" : "none"} aria-hidden="true" />
      </span>
    );
  } else {
    body = <KitAvatar name={name || source?.name || ""} size={size} tone={self ? "bg-sand" : toneOf(toneKey)}
      src={self ? loadSession().avatarUrl : user ? user.photo : chat?.photo} />;
  }

  return (
    <span className={cx("relative shrink-0 inline-flex", className)} style={{ width: size, height: size }}>
      {body}
      {showStatus && online && (
        <span aria-hidden="true" className={cx("absolute bottom-0 end-0 rounded-full bg-accent ring-2", ringClass)}
          style={{ width: dot, height: dot }} />
      )}
      {user?.emojiStatus && size >= 36 && (
        <span aria-hidden="true" style={{ width: badge, height: badge }}
          className="absolute -top-1 -end-1 rounded-full bg-card text-ink shadow-lift flex items-center justify-center">
          <StatusIcon status={user.emojiStatus} className="w-[62%] h-[62%]" />
        </span>
      )}
    </span>
  );
}

/** Verified tick and the Premium star beside a name: ink marks, the star filled with accent. */
export function NameBadges({ verified, premium, size = 14 }) {
  return (
    <>
      {verified && <BadgeCheck className="shrink-0 text-ink" style={{ width: size + 1, height: size + 1 }} strokeWidth={2.2} aria-label="Verified" role="img" />}
      {premium && <Star className="shrink-0 text-ink fill-accent" style={{ width: size, height: size }} strokeWidth={2} aria-label="Premium" role="img" />}
    </>
  );
}

/**
 * Delivery ticks: one for sent, two for read. Only ever on my own messages.
 * They take the colour around them (read full, sent dimmed) unless `color` is given.
 */
export function Ticks({ message, className = "", color = null }) {
  if (message.senderId !== ME) return null;
  const Icon = message.status === "read" ? CheckCheck : Check;
  return (
    <Icon
      className={cx("w-3.5 h-3.5 shrink-0", !color && message.status !== "read" && "opacity-60", className)}
      style={color ? { color } : undefined}
      strokeWidth={2.2}
    />
  );
}

export function ChatFlags({ chat }) {
  return (
    <div className="flex items-center gap-1 shrink-0 text-muted">
      {chat.muted && <VolumeX className="w-3.5 h-3.5" />}
      {chat.pinned && <Pin className="w-3.5 h-3.5 rotate-45" fill="currentColor" />}
    </div>
  );
}

export const senderName = (userId, isRtl) => {
  const u = findUser(userId);
  return isRtl ? u.nameFa || u.name : u.name;
};

/**
 * Stable colour per member, so a name reads the same throughout a group:
 * the two data tones, ink, and two muted inline tones that hold up on a
 * white card and on the night card alike.
 */
const SENDER_TONES = ["rgb(var(--ui-grape))", "rgb(var(--ui-ochre))", "#3E8A74", "#B5506E", "rgb(var(--ui-fg))"];
export const senderColor = (userId) => {
  const hash = [...String(userId || "")].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return SENDER_TONES[hash % SENDER_TONES.length];
};
