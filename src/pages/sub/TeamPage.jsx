import React from "react";
import { Users, ArrowLeft } from "lucide-react";

export default function TeamPage({ onBack, isRtl }) {
  const teams = [
    { nameEn: "FitClub Spartans", nameFa: "اسپارتان‌های فیت‌کلاب", members: "128 Athletes", rank: "#1 Club", icon: "🛡️" },
    { nameEn: "Iron Lifters", nameFa: "وزنه‌برداران آهنین", members: "95 Athletes", rank: "#2 Club", icon: "🏋️" },
    { nameEn: "Pro Runners Club", nameFa: "باشگاه دونده‌های حرفه‌ای", members: "74 Athletes", rank: "#3 Club", icon: "🏃" },
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
          <h1 className="text-xl font-black text-white">{isRtl ? "تیم‌ها و کلوب‌های ورزشی" : "Fitness Clubs & Teams"}</h1>
        </div>
        <Users className="w-6 h-6 text-[#844783]" />
      </div>

      {/* Join/Create Team Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#844783]/80 to-purple-900/60 border border-white/20 text-center space-y-3 shadow-xl">
        <h2 className="text-xl font-black text-white">{isRtl ? "به یک کلوب ورزشی بپیوندید!" : "Join a Fitness Club!"}</h2>
        <p className="text-xs text-neutral-200 font-medium">
          {isRtl ? "با دوستان خود تیم تشکیل دهید و در چالش‌های هفتگی رتبه اول را کسب کنید." : "Compete together with your friends in weekly team challenges."}
        </p>
        <button
          type="button"
          className="px-6 py-3 rounded-full bg-white text-black font-black text-xs hover:bg-neutral-200 transition-all shadow-md active:scale-95"
        >
          {isRtl ? "ایجاد یا ورود به کلوب" : "Join or Create Team"}
        </button>
      </div>

      {/* Teams List */}
      <div className="space-y-3">
        <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider px-1">
          {isRtl ? "کلوب‌های برتر این هفته" : "Top Ranked Clubs"}
        </h3>

        {teams.map((team, idx) => (
          <div key={idx} className="p-4 rounded-2xl bg-[#141416] border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <span className="text-3xl">{team.icon}</span>
              <div>
                <h4 className="text-sm font-black text-white">{isRtl ? team.nameFa : team.nameEn}</h4>
                <span className="text-xs text-neutral-400 font-medium">{team.members}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black">
                {team.rank}
              </span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
