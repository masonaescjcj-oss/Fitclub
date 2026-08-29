import React, { useState } from "react";
import { Trophy, ArrowLeft, Crown } from "lucide-react";

export default function MyRankPage({ onBack, isRtl }) {
  const [tab, setTab] = useState("global");

  const leaderboard = [
    { rank: 1, name: "David Kim", points: "3,850 XP", streak: "42 Days", avatar: "🥇", isUser: false },
    { rank: 2, name: "Sarah Jenkins", points: "3,420 XP", streak: "35 Days", avatar: "🥈", isUser: false },
    { rank: 3, name: "Reza Ahmadi", points: "3,100 XP", streak: "29 Days", avatar: "🥉", isUser: false },
    { rank: 4, name: "Isaac (You)", points: "2,850 XP", streak: "14 Days", avatar: "👨‍💼", isUser: true },
    { rank: 5, name: "Emma Watson", points: "2,600 XP", streak: "21 Days", avatar: "👩‍💼", isUser: false },
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
          <h1 className="text-xl font-black text-white">{isRtl ? "جدول رتبه‌بندی ورزشکاران" : "Athletes Leaderboard"}</h1>
        </div>
        <Trophy className="w-6 h-6 text-amber-400" />
      </div>

      {/* Tabs */}
      <div className="flex bg-[#141416] p-1.5 rounded-full border border-white/10 w-full max-w-[260px] mx-auto">
        <button
          type="button"
          onClick={() => setTab("global")}
          className={`flex-1 py-2 rounded-full text-xs font-black transition-all ${
            tab === "global"
              ? "bg-[#844783] text-white shadow-md"
              : "text-gray-400 hover:text-white"
          }`}
        >
          {isRtl ? "جهانی" : "Global"}
        </button>
        <button
          type="button"
          onClick={() => setTab("friends")}
          className={`flex-1 py-2 rounded-full text-xs font-black transition-all ${
            tab === "friends"
              ? "bg-[#844783] text-white shadow-md"
              : "text-gray-400 hover:text-white"
          }`}
        >
          {isRtl ? "دوستان" : "Friends"}
        </button>
      </div>

      {/* Top 3 Podium Display */}
      <div className="flex justify-center items-end gap-3 pt-4 pb-2">
        {/* 2nd Place */}
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-neutral-800 border-2 border-slate-300 flex items-center justify-center text-2xl shadow-lg">
            🥈
          </div>
          <span className="text-xs font-black text-white mt-1">Sarah</span>
          <span className="text-[10px] text-amber-400 font-bold">3,420 XP</span>
          <div className="w-20 h-20 bg-slate-800/60 rounded-t-2xl border-t border-slate-400/30 flex items-center justify-center font-black text-slate-300 mt-2">
            2
          </div>
        </div>

        {/* 1st Place */}
        <div className="flex flex-col items-center">
          <Crown className="w-6 h-6 text-amber-300 fill-amber-300 mb-1 animate-pulse" />
          <div className="w-16 h-16 rounded-full bg-neutral-800 border-2 border-amber-400 flex items-center justify-center text-3xl shadow-xl">
            🥇
          </div>
          <span className="text-xs font-black text-white mt-1">David</span>
          <span className="text-[10px] text-amber-400 font-bold">3,850 XP</span>
          <div className="w-22 h-28 bg-gradient-to-t from-amber-500/40 to-amber-500/10 rounded-t-2xl border-t border-amber-400/40 flex items-center justify-center font-black text-amber-300 mt-2 text-xl">
            1
          </div>
        </div>

        {/* 3rd Place */}
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-neutral-800 border-2 border-amber-700 flex items-center justify-center text-2xl shadow-lg">
            🥉
          </div>
          <span className="text-xs font-black text-white mt-1">Reza</span>
          <span className="text-[10px] text-amber-400 font-bold">3,100 XP</span>
          <div className="w-20 h-16 bg-amber-900/40 rounded-t-2xl border-t border-amber-700/30 flex items-center justify-center font-black text-amber-600 mt-2">
            3
          </div>
        </div>
      </div>

      {/* Full Leaderboard List */}
      <div className="space-y-2.5">
        {leaderboard.map((item) => (
          <div
            key={item.rank}
            className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
              item.isUser
                ? "bg-gradient-to-r from-[#844783]/90 to-[#9b4f9a] border-white text-white shadow-lg scale-[1.01]"
                : "bg-[#141416] border-white/10 text-gray-200"
            }`}
          >
            <div className="flex items-center gap-3.5">
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                item.rank === 1 ? "bg-amber-400 text-black" : item.rank === 2 ? "bg-slate-300 text-black" : item.rank === 3 ? "bg-amber-700 text-white" : "bg-neutral-800 text-gray-400"
              }`}>
                {item.rank}
              </span>
              <span className="text-xl">{item.avatar}</span>
              <div>
                <h4 className="text-sm font-black">{item.name}</h4>
                <span className="text-[10px] opacity-80">{item.streak}</span>
              </div>
            </div>

            <span className="text-xs font-mono font-black text-amber-300">{item.points}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
