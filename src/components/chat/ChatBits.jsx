import React from "react";
import { BadgeCheck, Check, CheckCheck, Pin, VolumeX } from "lucide-react";
import { ME } from "../../lib/chat/chatModel";
import { findUser } from "../../lib/chat/chatStore";

/** Round avatar with an online dot and an optional emoji status. */
export function Avatar({ chat, user, size = 48, ring = "#000", showStatus = true }) {
  const source = user || chat;
  const label = source?.avatar || source?.emoji || "💬";
  const color = source?.color || "#844783";
  const online = user?.online ?? false;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="w-full h-full rounded-full flex items-center justify-center"
        style={{
          fontSize: size * 0.46,
          background: `linear-gradient(135deg, ${color}55, ${color}22)`,
          border: `1.5px solid ${color}77`,
        }}
      >
        <span className="leading-none">{label}</span>
      </div>

      {showStatus && online && (
        <span
          className="absolute bottom-0 rounded-full bg-emerald-500 ltr:right-0 rtl:left-0"
          style={{ width: size * 0.26, height: size * 0.26, boxShadow: `0 0 0 2px ${ring}` }}
        />
      )}
      {user?.emojiStatus && (
        <span
          className="absolute -top-0.5 ltr:-right-1 rtl:-left-1 leading-none"
          style={{ fontSize: size * 0.32 }}
        >
          {user.emojiStatus}
        </span>
      )}
    </div>
  );
}

/** Verified tick and the Premium star, as Telegram shows them beside a name. */
export function NameBadges({ verified, premium, size = 14 }) {
  return (
    <>
      {verified && <BadgeCheck className="shrink-0 text-sky-400" style={{ width: size, height: size }} />}
      {premium && <span className="shrink-0 leading-none" style={{ fontSize: size }}>⭐</span>}
    </>
  );
}

/** Delivery ticks: one for sent, two for read. Only ever on my own messages. */
export function Ticks({ message, className = "" }) {
  if (message.senderId !== ME) return null;
  const Icon = message.status === "read" ? CheckCheck : Check;
  return (
    <Icon
      className={`w-3.5 h-3.5 shrink-0 ${message.status === "read" ? "text-sky-400" : "text-white/50"} ${className}`}
    />
  );
}

export function ChatFlags({ chat }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      {chat.muted && <VolumeX className="w-3.5 h-3.5 text-neutral-600" />}
      {chat.pinned && <Pin className="w-3.5 h-3.5 text-neutral-600 fill-neutral-600" />}
    </div>
  );
}

export const senderName = (userId, isRtl) => {
  const u = findUser(userId);
  return isRtl ? u.nameFa || u.name : u.name;
};

/** Stable colour per member, so a name reads the same throughout a group. */
export const senderColor = (userId) => findUser(userId).color || "#844783";
