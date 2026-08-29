import React from "react";
import { Bell, Flame, Wallet, Sparkles, User as UserIcon } from "lucide-react";

export default function MainAppHeader({
  userName = "Isaac",
  userAvatar,
  streak = 14,
  coins = 450,
  onProfileClick,
  onNotificationClick,
  onWalletClick,
  onStreakClick,
  isRtl,
}) {
  return (
    <header className="w-full bg-black/90 backdrop-blur-xl border-b border-white/10 px-4 py-3 sticky top-0 z-40 flex items-center justify-between">
      {/* User Info Left/Right */}
      <button
        type="button"
        onClick={onProfileClick}
        className="flex items-center gap-3 text-left rtl:text-right group focus:outline-none"
      >
        <div className="relative">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#844783] to-[#a356a2] p-0.5 shadow-md group-hover:scale-105 transition-all">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName}
                className="w-full h-full rounded-[14px] object-cover bg-black"
              />
            ) : (
              <div className="w-full h-full rounded-[14px] bg-[#141416] flex items-center justify-center text-white">
                <UserIcon className="w-5 h-5 text-[#844783]" />
              </div>
            )}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-black" />
        </div>

        <div>
          <h2 className="text-sm font-black text-white group-hover:text-[#844783] transition-colors leading-tight">
            {userName || (isRtl ? "ورزشکار فیت‌کلاب" : "FitClub Athlete")}
          </h2>
          <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            {isRtl ? "عضو پریمیوم v2.0" : "PRO Athlete v2.0"}
          </span>
        </div>
      </button>

      {/* Badges & Quick Action Right/Left */}
      <div className="flex items-center gap-2" dir="ltr">
        
        {/* Streak Counter Badge */}
        <button
          type="button"
          onClick={onStreakClick}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 text-amber-400 text-xs font-black hover:scale-105 transition-all"
        >
          <Flame className="w-4 h-4 fill-amber-400 text-amber-400 animate-bounce" style={{ animationDuration: "2s" }} />
          <span>{streak}</span>
        </button>

        {/* Wallet Coins Badge */}
        <button
          type="button"
          onClick={onWalletClick}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-black hover:scale-105 transition-all"
        >
          <Wallet className="w-4 h-4 text-purple-400" />
          <span>{coins}</span>
        </button>

        {/* Notifications Bell */}
        <button
          type="button"
          onClick={onNotificationClick}
          className="w-9 h-9 rounded-xl bg-[#141416] border border-white/10 flex items-center justify-center text-gray-300 hover:text-white hover:border-[#844783]/50 transition-all relative"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#844783] animate-ping" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#844783]" />
        </button>

      </div>
    </header>
  );
}
