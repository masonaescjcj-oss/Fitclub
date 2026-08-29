import React from "react";
import { Bell, ArrowLeft, Flame, Trophy, Sparkles } from "lucide-react";

export default function NotificationsPage({ onBack, isRtl }) {
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

      {/* Notifications List */}
      <div className="space-y-3">
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
