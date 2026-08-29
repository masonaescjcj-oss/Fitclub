import React from "react";
import { Flame, ArrowLeft, Trophy, Calendar } from "lucide-react";

export default function StreakDetailPage({ onBack, onGoToRank, onGoToHistory, isRtl }) {
  const currentStreak = 14;
  const longestStreak = 28;

  // Mock Calendar Grid Days
  const daysInMonth = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    active: i < 14,
  }));

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
          <h1 className="text-xl font-black text-white">{isRtl ? "جزئیات استریک روزانه" : "Streak & Habits"}</h1>
        </div>
        <Flame className="w-6 h-6 text-amber-400 fill-amber-400" />
      </div>

      {/* Hero Streak Flame Card */}
      <div className="p-7 rounded-3xl bg-gradient-to-br from-orange-500/30 via-amber-500/20 to-neutral-900 border border-orange-500/40 text-center relative overflow-hidden space-y-2">
        <div className="w-20 h-20 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto mb-2 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
          <Flame className="w-10 h-10 fill-amber-400 animate-bounce" style={{ animationDuration: "2s" }} />
        </div>

        <h2 className="text-4xl font-black text-white tracking-tighter" dir="ltr">
          {currentStreak} <span className="text-lg font-black text-amber-400">{isRtl ? "روز متوالی" : "DAYS"}</span>
        </h2>
        <p className="text-xs text-neutral-300 font-medium">
          {isRtl ? "شما ۱۴ روز بدون وقفه اهداف خود را تکمیل کردید! 🎉" : "You've stayed consistent for 14 straight days! 🎉"}
        </p>

        <div className="flex justify-center gap-6 pt-3 border-t border-white/10 text-xs font-bold">
          <div>
            <span className="text-gray-400 block">{isRtl ? "طولانی‌ترین زنجیره" : "Best Streak"}</span>
            <span className="text-white font-black text-sm">{longestStreak} {isRtl ? "روز" : "Days"}</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <span className="text-gray-400 block">{isRtl ? "مجموع امتیازها" : "Total Points"}</span>
            <span className="text-amber-400 font-black text-sm">1,450 XP</span>
          </div>
        </div>
      </div>

      {/* Month Calendar Grid */}
      <div className="p-5 rounded-3xl bg-[#141416] border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white uppercase">{isRtl ? "تقویم فعالیت ماه جاری" : "Monthly Streak Calendar"}</h3>
          <span className="text-xs text-amber-400 font-bold">14 / 30 Days</span>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center pt-2">
          {daysInMonth.map((d) => (
            <div
              key={d.day}
              className={`h-9 rounded-xl border flex items-center justify-center text-xs font-black transition-all ${
                d.active
                  ? "bg-gradient-to-tr from-amber-500 to-orange-500 border-amber-400 text-black shadow-md"
                  : "bg-neutral-900 border-white/5 text-gray-600"
              }`}
            >
              {d.day}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Navigation Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onGoToRank}
          className="p-4 rounded-2xl bg-[#141416] border border-white/10 flex items-center justify-between hover:border-amber-400/50 transition-all text-left rtl:text-right"
        >
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-black text-white">{isRtl ? "رتبه‌بندی من" : "My Rank"}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={onGoToHistory}
          className="p-4 rounded-2xl bg-[#141416] border border-white/10 flex items-center justify-between hover:border-[#844783]/50 transition-all text-left rtl:text-right"
        >
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-[#844783]" />
            <span className="text-xs font-black text-white">{isRtl ? "تاریخچه کامل" : "History"}</span>
          </div>
        </button>
      </div>

    </div>
  );
}
