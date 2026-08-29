import React from "react";
import { ArrowLeft, BarChart3 } from "lucide-react";

export default function WorkoutReportPage({ onBack, isRtl }) {
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
          <h1 className="text-xl font-black text-white">{isRtl ? "گزارش جامع پیشرفت" : "Workout Analytics"}</h1>
        </div>
        <BarChart3 className="w-6 h-6 text-[#844783]" />
      </div>

      {/* Overview Stats 3-Grid */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-4 rounded-2xl bg-[#141416] border border-white/10">
          <span className="text-[10px] text-amber-400 font-bold uppercase">{isRtl ? "حجم وزنه" : "Total Volume"}</span>
          <p className="text-lg font-black text-white mt-0.5">14,250 kg</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#141416] border border-white/10">
          <span className="text-[10px] text-[#844783] font-bold uppercase">{isRtl ? "تعداد تمرین" : "Workouts"}</span>
          <p className="text-lg font-black text-white mt-0.5">18 Sessions</p>
        </div>
        <div className="p-4 rounded-2xl bg-[#141416] border border-white/10">
          <span className="text-[10px] text-emerald-400 font-bold uppercase">{isRtl ? "کالری کل" : "Total Burn"}</span>
          <p className="text-lg font-black text-emerald-400 mt-0.5">6,840 kcal</p>
        </div>
      </div>

      {/* Weekly Volume Graph */}
      <div className="p-5 rounded-3xl bg-[#141416] border border-white/10 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-black text-white uppercase">{isRtl ? "نمودار حجم وزنه هفتگی" : "Weekly Lift Volume"}</h3>
          <span className="text-xs text-emerald-400 font-bold">+12% vs last month</span>
        </div>

        <div className="flex items-end justify-between h-36 pt-6 px-2">
          {[
            { day: "Wk 1", val: 50 },
            { day: "Wk 2", val: 65 },
            { day: "Wk 3", val: 80 },
            { day: "Wk 4", val: 95 },
          ].map((bar, i) => (
            <div key={i} className="flex flex-col items-center gap-2 w-1/5">
              <div className="w-full bg-neutral-900 rounded-t-xl h-24 relative overflow-hidden flex items-end">
                <div
                  className="w-full bg-gradient-to-t from-[#844783] to-[#a356a2] rounded-t-xl transition-all duration-500"
                  style={{ height: `${bar.val}%` }}
                />
              </div>
              <span className="text-xs font-bold text-gray-400">{bar.day}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
