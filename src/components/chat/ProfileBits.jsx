import React from "react";
import { ChevronLeft } from "lucide-react";
import { TG } from "../../lib/chat/extras";
import { Avatar } from "./ChatBits";

/**
 * Pieces of the iOS profile screen: a full-bleed hero with the name laid over
 * the picture, a row of round actions, and grouped cards underneath.
 */

export function Hero({ color, emoji, name, subtitle, badges, isRtl, t, onBack, editLabel, onEdit }) {
  return (
    <div className="relative h-[360px] overflow-hidden on-accent"
      style={{ background: `linear-gradient(180deg, ${color}cc 0%, ${color} 60%, ${color}99 100%)` }}>
      <span className="absolute inset-0 flex items-center justify-center text-[150px] leading-none select-none drop-shadow-2xl">
        {emoji}
      </span>
      <span className="absolute inset-x-0 bottom-0 h-40" style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,.45))" }} />

      <button type="button" onClick={onBack} aria-label={t.close}
        className="absolute top-3 start-3 w-10 h-10 rounded-full flex items-center justify-center text-white backdrop-blur-xl"
        style={{ background: "rgba(0,0,0,.28)" }}>
        <ChevronLeft className={`w-6 h-6 ${isRtl ? "rotate-180" : ""}`} />
      </button>
      {onEdit && (
        <button type="button" onClick={onEdit}
          className="absolute top-3 end-3 h-10 px-4 rounded-full text-[15px] font-medium text-white backdrop-blur-xl"
          style={{ background: "rgba(0,0,0,.28)" }}>
          {editLabel}
        </button>
      )}

      <div className="absolute inset-x-4 bottom-3">
        <span className="flex items-center gap-1.5">
          <span className="text-[28px] font-bold text-white leading-tight truncate">{name}</span>
          {badges}
        </span>
        <span className="block text-[14px] text-white/80">{subtitle}</span>
      </div>
    </div>
  );
}

/** call · video · mute · search · more */
export function ActionRow({ actions }) {
  return (
    <div className="flex justify-center gap-2.5 px-3 pt-3">
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <button key={a.id} type="button" onClick={a.onClick} aria-label={a.label}
            className="flex flex-col items-center gap-1.5 w-[62px] active:scale-95 transition-transform">
            <span className="w-[56px] h-[56px] rounded-full flex items-center justify-center backdrop-blur-xl"
              style={{ background: TG.action, color: TG.actionFg }}>
              <Icon className="w-6 h-6" />
            </span>
            <span className="text-[12px] font-medium text-white">{a.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SectionHeader({ label, trailing }) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-1.5">
      <span className="text-[13px] font-medium text-neutral-500">{label}</span>
      {trailing && <span className="text-[13px] font-medium text-neutral-500">{trailing}</span>}
    </div>
  );
}

export function Card({ children, className = "" }) {
  return (
    <div className={`mx-4 rounded-2xl overflow-hidden divide-y divide-white/[0.04] ${className}`} style={{ background: TG.card }}>
      {children}
    </div>
  );
}

/** label above, value below — the value in link blue when it is one. */
export function InfoRow({ label, value, dir, link = false }) {
  if (!value) return null;
  return (
    <div className="px-4 py-2.5">
      <span className="block text-[13px] text-neutral-500">{label}</span>
      <span className={`block text-[16px] font-medium break-words ${link ? "" : "text-white"}`}
        style={link ? { color: TG.accent } : undefined} dir={dir}>{value}</span>
    </div>
  );
}

/** A chat teased inside a profile — the channel someone runs, a shared group. */
export function ChatPreviewCard({ chat, user, title, preview, time, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3 text-start active:bg-black/[0.04] transition-colors">
      <Avatar chat={chat} user={user} size={48} showStatus={false} />
      <span className="flex-1 min-w-0">
        <span className="flex items-baseline gap-2">
          <span className="flex-1 text-[16px] font-semibold text-white truncate">{title}</span>
          {time && <span className="text-[13px] text-neutral-500 shrink-0" dir="ltr">{time}</span>}
        </span>
        <span className="block text-[14px] text-neutral-500 truncate">{preview}</span>
      </span>
    </button>
  );
}
