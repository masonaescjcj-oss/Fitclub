import React from "react";
import { ArrowLeft, BarChart3, Trophy } from "lucide-react";
import { useTrainingStore } from "../../lib/training/trainingContext";
import { useTrainingT } from "../../lib/training/trainingI18n";
import { exerciseName } from "../../lib/training/exercises";

/** Totals and weekly volume, computed from logged sessions. */
export default function WorkoutReportPage({ onBack, isRtl }) {
  const t = useTrainingT(isRtl);
  const { stats, weekly, sessions } = useTrainingStore();
  const maxVol = Math.max(...weekly.map((w) => w.volume), 1);
  const [cur, prev] = [weekly[weekly.length - 1]?.volume || 0, weekly[weekly.length - 2]?.volume || 0];
  const delta = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;
  const prs = [...sessions].sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1)).flatMap((s) => s.prs || []).slice(0, 6);

  return (
    <div className="w-full min-h-[100dvh] bg-black text-white px-4 pt-6 pb-28 space-y-6 select-none">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack}
            className="w-9 h-9 rounded-xl bg-[#141416] border border-white/10 flex items-center justify-center text-gray-300 hover:text-white">
            <ArrowLeft className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
          </button>
          <h1 className="text-xl font-black text-white">{isRtl ? "گزارش پیشرفت" : "Workout Analytics"}</h1>
        </div>
        <BarChart3 className="w-6 h-6 text-[#844783]" />
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-4 rounded-2xl bg-[#141416] border border-white/10">
          <span className="text-[10px] text-amber-400 font-bold uppercase">{t.totalVolume}</span>
          <p className="text-lg font-black text-white mt-0.5 tabular-nums">{Math.round(stats.volume).toLocaleString()} {t.kg}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#141416] border border-white/10">
          <span className="text-[10px] text-[#844783] font-bold uppercase">{t.workouts}</span>
          <p className="text-lg font-black text-white mt-0.5 tabular-nums">{stats.count}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#141416] border border-white/10">
          <span className="text-[10px] text-emerald-400 font-bold uppercase">{t.totalBurn}</span>
          <p className="text-lg font-black text-emerald-400 mt-0.5 tabular-nums">{stats.calories.toLocaleString()} kcal</p>
        </div>
      </div>

      <div className="p-5 rounded-3xl bg-[#141416] border border-white/10 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-black text-white uppercase">{t.weeklyVolume}</h3>
          {delta !== null && (
            <span className={`text-xs font-bold ${delta >= 0 ? "text-emerald-400" : "text-rose-400"}`} dir="ltr">{delta >= 0 ? "+" : ""}{delta}%</span>
          )}
        </div>
        <div className="flex items-end justify-between h-36 pt-6 px-2" dir="ltr">
          {weekly.map((w, i) => (
            <div key={i} className="flex flex-col items-center gap-2 w-1/5">
              <div className="w-full bg-neutral-900 rounded-t-xl h-24 relative overflow-hidden flex items-end">
                <div className="w-full bg-gradient-to-t from-[#844783] to-[#a356a2] rounded-t-xl transition-all duration-500"
                  style={{ height: `${Math.max((w.volume / maxVol) * 100, w.volume ? 6 : 0)}%` }} />
              </div>
              <span className="text-[10px] font-bold text-gray-400">{w.from.toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}</span>
            </div>
          ))}
        </div>
      </div>

      {prs.length > 0 && (
        <div className="p-5 rounded-3xl bg-[#141416] border border-white/10 space-y-2">
          <h3 className="flex items-center gap-1.5 text-sm font-black text-amber-400 uppercase"><Trophy className="w-4 h-4" /> {t.personalRecords}</h3>
          {prs.map((pr, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="font-black text-white">{exerciseName(pr.exerciseId, isRtl)}</span>
              <span className="font-bold text-emerald-400" dir="ltr">{pr.kind === "first" ? t.prFirst : `${pr.prev} → ${pr.value} ${t.kg}`}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
