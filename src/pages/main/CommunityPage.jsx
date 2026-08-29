import React from "react";
import { MessageSquare, Heart, Share2, Trophy, Award } from "lucide-react";

export default function CommunityPage({ isRtl }) {
  return (
    <div className="w-full min-h-[100dvh] bg-black text-white px-4 pt-6 pb-28 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-black text-[#844783] uppercase tracking-wider">
            {isRtl ? "جامعه ورزشکاران" : "ATHLETES COMMUNITY"}
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">
            {isRtl ? "گفتگو و چالش‌ها" : "Community Feed"}
          </h1>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-[#844783]/20 border border-[#844783]/40 flex items-center justify-center text-[#844783]">
          <MessageSquare className="w-5 h-5" />
        </div>
      </div>

      {/* Leaderboard Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/20 via-neutral-900 to-[#844783]/20 border border-amber-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">{isRtl ? "رتبه‌بندی این هفته" : "Weekly Leaderboard"}</h3>
            <p className="text-xs text-neutral-400 font-medium">{isRtl ? "رتبه شما: نفر ۴ از ۵۰۰" : "Rank #4 of 500 Athletes"}</p>
          </div>
        </div>
        <div className="px-3 py-1 rounded-full bg-amber-400 text-black text-xs font-black">
          Top 1%
        </div>
      </div>

      {/* Community Posts */}
      <div className="space-y-4">
        {[
          {
            user: "Sarah Jenkins",
            avatar: "👩‍💼",
            time: "2h ago",
            contentEn: "Completed Day 14 of the Full Body Plus program! Felt amazing on bench press today 💪🔥",
            contentFa: "روز ۱۴ام برنامه فول بادی پلاس تموم شد! رکورد جدید پرس سینه 💪🔥",
            likes: 42,
            comments: 8,
          },
          {
            user: "Alex Rivera",
            avatar: "👨‍💼",
            time: "5h ago",
            contentEn: "Hit my daily protein target of 165g! Consistency is key for long term gains 🥗🥩",
            contentFa: "هدف پروتئین ۱۶۵ گرم امروز تکمیل شد! تداوم کلید اصلی موفقیته 🥗🥩",
            likes: 89,
            comments: 14,
          },
        ].map((post, idx) => (
          <div key={idx} className="p-5 rounded-3xl bg-[#141416] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{post.avatar}</span>
                <div>
                  <h4 className="text-sm font-black text-white">{post.user}</h4>
                  <span className="text-[10px] text-gray-500 font-mono">{post.time}</span>
                </div>
              </div>
              <Award className="w-5 h-5 text-amber-400" />
            </div>

            <p className="text-xs sm:text-sm text-neutral-300 font-medium leading-relaxed">
              {isRtl ? post.contentFa : post.contentEn}
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs font-bold text-gray-400">
              <button type="button" className="flex items-center gap-1.5 hover:text-red-400 transition-colors">
                <Heart className="w-4 h-4" />
                <span>{post.likes}</span>
              </button>
              <button type="button" className="flex items-center gap-1.5 hover:text-white transition-colors">
                <MessageSquare className="w-4 h-4" />
                <span>{post.comments}</span>
              </button>
              <button type="button" className="flex items-center gap-1.5 hover:text-white transition-colors">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
