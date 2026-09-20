import React from "react";
import { Bell, ArrowLeft, AtSign, Flame, MessageCircle, Trophy, Sparkles } from "lucide-react";
import { useChatStore } from "../../lib/chat/chatContext";
import { findUser } from "../../lib/chat/chatStore";
import { relativeTime } from "../../lib/chat/chatModel";

const REL = {
  en: { justNow: "now", minShort: "m", hourShort: "h", dayShort: "d" },
  fa: { justNow: "اکنون", minShort: " د", hourShort: " س", dayShort: " ر" },
};

/** Mentions of the athlete and membership events, straight from the messenger's own data. */
function MessengerAlerts({ isRtl, onOpenChat }) {
  const store = useChatStore();
  const items = store.notifications;
  const t = REL[isRtl ? "fa" : "en"];
  const titleOf = (chat) => (isRtl ? chat.titleFa || chat.title : chat.title);
  const nameOf = (id) => { const u = findUser(id); return isRtl ? u.nameFa || u.name : u.name; };
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-black tracking-wider uppercase text-neutral-400">{isRtl ? "پیام‌ها" : "Messages"}</h2>
        {store.unreadMentionTotal > 0 && (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#844783]/30 text-purple-200">{store.unreadMentionTotal} {isRtl ? "منشن خوانده‌نشده" : "unread mentions"}</span>
        )}
      </div>
      {items.length === 0 && (
        <p className="p-4 rounded-2xl bg-[#141416]/50 border border-white/5 text-xs text-neutral-400">
          {isRtl ? "وقتی کسی شما را در گروهی نام ببرد یا به کامیونیتی بپیوندید، اینجا می‌بینید." : "When someone mentions you in a group or you join a community, it shows up here."}
        </p>
      )}
      {items.map((n) => {
        const chat = store.chats.find((c) => c.id === n.chatId);
        if (!chat) return null;
        const mention = n.kind === "mention";
        return (
          <button key={n.id} type="button" onClick={() => onOpenChat?.(n.chatId, n.messageId)}
            className={`w-full text-start p-4 rounded-2xl border transition-all ${n.unread ? "bg-[#141416] border-[#844783]/40 shadow-md" : "bg-[#141416]/50 border-white/5 opacity-80"}`}>
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-xl bg-neutral-900 border border-white/10 shrink-0">
                {mention ? <AtSign className="w-5 h-5 text-sky-400" /> : <MessageCircle className="w-5 h-5 text-emerald-400" />}
              </div>
              <div className="flex-grow min-w-0">
                <div className="flex justify-between items-center gap-2">
                  <h4 className="text-sm font-black text-white truncate">
                    {mention ? `${nameOf(n.senderId)} · ${titleOf(chat)}` : titleOf(chat)}
                  </h4>
                  <span className="text-[10px] text-gray-500 font-mono shrink-0" dir="ltr">{relativeTime(n.at, t)}</span>
                </div>
                <p className="text-xs text-neutral-300 font-medium leading-relaxed mt-1 truncate" dir="auto">
                  {mention ? n.text : (isRtl && n.textFa) || n.text}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </section>
  );
}

export default function NotificationsPage({ onBack, isRtl, onOpenChat }) {
  const notifications = [
    { titleEn: "Workout Reminder! 🏋️", titleFa: "یادآوری تمرین امروز! 🏋️", bodyEn: "Your Day 1 Full Body Plus workout is waiting. Stay consistent!", bodyFa: "تمرین امروز شما آماده است. زنجیره موفقیت خود را حفظ کنید!", time: "10 mins ago", read: false, icon: <Flame className="w-5 h-5 text-amber-400" /> },
    { titleEn: "Streak Milestone Reached! 🔥", titleFa: "رکورد استریک جدید! 🔥", bodyEn: "You achieved a 14-day workout streak. +100 bonus XP awarded!", bodyFa: "شما ۱۴ روز تمرین متوالی را ثبت کردید. ۱۰۰ امتیاز اضافه دریافت شد!", time: "2 hours ago", read: false, icon: <Trophy className="w-5 h-5 text-purple-400" /> },
    { titleEn: "AI Plan Updated v2.0 🧠", titleFa: "برنامه هوشمند به‌روزرسانی شد 🧠", bodyEn: "Your custom macros have been recalibrated based on your new weight.", bodyFa: "ماکروهای رژیم شما بر اساس وزن جدید بازسنجی شدند.", time: "Yesterday", read: true, icon: <Sparkles className="w-5 h-5 text-cyan-400" /> },
  ];

  return (
    <div className="w-full min-h-[100dvh] bg-black text-white px-4 pt-6 pb-28 space-y-6 select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-[#141416] border border-white/10 flex items-center justify-center text-gray-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          </button>
          <h1 className="text-xl font-black text-white">{isRtl ? "اعلان‌ها و پیام‌ها" : "Notifications Center"}</h1>
        </div>
        <Bell className="w-6 h-6 text-[#844783]" />
      </div>

      <MessengerAlerts isRtl={isRtl} onOpenChat={onOpenChat} />

      {/* Notifications List */}
      <h2 className="text-xs font-black tracking-wider uppercase text-neutral-400 !mt-8">{isRtl ? "اپ" : "App"}</h2>
      <div className="space-y-3 !mt-3">
        {notifications.map((n, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-2xl border transition-all ${
              !n.read
                ? "bg-[#141416] border-[#844783]/40 shadow-md"
                : "bg-[#141416]/50 border-white/5 opacity-80"
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-xl bg-neutral-900 border border-white/10 shrink-0">
                {n.icon}
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-black text-white">{isRtl ? n.titleFa : n.titleEn}</h4>
                  <span className="text-[10px] text-gray-500 font-mono">{n.time}</span>
                </div>
                <p className="text-xs text-neutral-300 font-medium leading-relaxed mt-1">
                  {isRtl ? n.bodyFa : n.bodyEn}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
