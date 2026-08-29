import React from "react";
import { Flame, ArrowLeft, Trophy, Calendar, ListChecks } from "lucide-react";
import { useChecklistStore } from "../../lib/checklistContext";
import { historyByDate, localized, overallBest, overallStreak, topStreakList } from "../../lib/checklistModel";
import { useChecklistT } from "../../lib/checklistI18n";

export default function StreakDetailPage({ onBack, onGoToRank, onGoToHistory, isRtl }) {
  const t = useChecklistT(isRtl);
  const { lists } = useChecklistStore();

  const currentStreak = overallStreak(lists);
  const longestStreak = overallBest(lists);
  const leader = topStreakList(lists);

  // Only daily lists land on a day grid; weekly and monthly ones sit this out.
  const days = historyByDate(lists, 30);
  const tracked = days.filter((d) => d.tracked);
  const perfectDays = tracked.filter((d) => d.done === d.total).length;

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

        {currentStreak > 0 && leader ? (
          <p className="text-xs text-neutral-300 font-medium">
            {t.streakFrom}: <span className="text-white font-black">{leader.emoji} {localized(leader, isRtl)}</span>
          </p>
        ) : (
          <p className="text-xs text-neutral-400 font-medium">{t.noStreakYet}</p>
        )}

        <div className="flex justify-center gap-6 pt-3 border-t border-white/10 text-xs font-bold">
          <div>
            <span className="text-gray-400 block">{isRtl ? "طولانی‌ترین زنجیره" : "Best Streak"}</span>
            <span className="text-white font-black text-sm">{longestStreak} {isRtl ? "روز" : "Days"}</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <span className="text-gray-400 block">{isRtl ? "روزهای کامل" : "Perfect Days"}</span>
            <span className="text-amber-400 font-black text-sm">{perfectDays} / {tracked.length}</span>
          </div>
        </div>
      </div>

      {/* 30-day activity grid, built from the checklist history */}
      <div className="p-5 rounded-3xl bg-[#141416] border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white uppercase">{isRtl ? "تقویم فعالیت ۳۰ روز" : "Last 30 Days"}</h3>
          <span className="text-[10px] text-neutral-500 font-black">{t.fromChecklists}</span>
        </div>

        {tracked.length === 0 ? (
          <p className="py-6 text-center text-xs font-bold text-neutral-600">{t.noStreakYet}</p>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-2 text-center pt-2" dir="ltr">
              {days.map((d) => {
                const full = d.tracked && d.done === d.total;
                const partial = d.tracked && d.done > 0 && !full;
                return (
                  <div
                    key={d.key}
                    title={`${d.date.toLocaleDateString()} · ${d.done}/${d.total}`}
                    className={`h-9 rounded-xl border flex items-center justify-center text-[10px] font-black transition-all ${
                      full
                        ? "bg-gradient-to-tr from-amber-500 to-orange-500 border-amber-400 text-black shadow-md"
                        : partial
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                        : "bg-neutral-900 border-white/5 text-gray-600"
                    }`}
                  >
                    {d.date.getDate()}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-4 pt-1 text-[9px] font-black text-neutral-500" dir="ltr">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-gradient-to-tr from-amber-500 to-orange-500" />
                {isRtl ? "کامل" : "All done"}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40" />
                {isRtl ? "ناقص" : "Partial"}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-neutral-900 border border-white/10" />
                {isRtl ? "بدون فعالیت" : "No activity"}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Per-list streaks */}
      {lists.some((l) => l.reset?.mode !== "none") && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-1.5 text-[10px] font-black text-neutral-500 uppercase tracking-wider px-1">
            <ListChecks className="w-3 h-3" /> {t.myLists}
          </h3>
          {lists.filter((l) => l.reset?.mode !== "none").map((l) => (
            <div key={l.id} className="p-3 rounded-2xl bg-[#141416] border border-white/10 flex items-center gap-3">
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                style={{ background: `${l.color}22`, border: `1px solid ${l.color}55` }}
              >
                {l.emoji}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-xs font-black text-white truncate">{localized(l, isRtl)}</span>
                <span className="block text-[10px] font-bold text-neutral-500">{t.best} {l.bestStreak}</span>
              </span>
              <span className="flex items-center gap-1 text-xs font-black text-amber-400 shrink-0">
                <Flame className="w-3.5 h-3.5 fill-amber-400" />
                {l.streak}
              </span>
            </div>
          ))}
        </div>
      )}

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
