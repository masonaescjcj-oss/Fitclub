import React from "react";
import { ArrowLeft, Calendar, Dumbbell, CheckSquare, Clock } from "lucide-react";

export default function HistoryPage({ onBack, isRtl }) {
  const historyLogs = [
    { date: "Yesterday, 07:30 PM", titleEn: "Full Body Plus - Day 1", titleFa: "فول بادی پلاس - روز ۱", duration: "45 mins", status: "Completed", type: "workout" },
    { date: "Jul 25, 2026", titleEn: "Daily Habit Checklist (4/4)", titleFa: "چک‌لیست روزانه (۴/۴)", duration: "All Completed", status: "Completed", type: "checklist" },
    { date: "Jul 24, 2026", titleEn: "Full Body Plus - Day 2", titleFa: "فول بادی پلاس - روز ۲", duration: "50 mins", status: "Completed", type: "workout" },
    { date: "Jul 23, 2026", titleEn: "Rest & Active Recovery", titleFa: "استراحت و بازیابی فعال", duration: "20 mins", status: "Completed", type: "workout" },
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
          <h1 className="text-xl font-black text-white">{isRtl ? "تاریخچه کامل فعالیت‌ها" : "Activity History Log"}</h1>
        </div>
        <Calendar className="w-6 h-6 text-[#844783]" />
      </div>

      {/* Logs List */}
      <div className="space-y-3">
        {historyLogs.map((log, idx) => (
          <div key={idx} className="p-4 rounded-2xl bg-[#141416] border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-neutral-900 border border-white/10 shrink-0 text-[#844783]">
                {log.type === "workout" ? <Dumbbell className="w-5 h-5" /> : <CheckSquare className="w-5 h-5 text-emerald-400" />}
              </div>
              <div>
                <h4 className="text-sm font-black text-white">{isRtl ? log.titleFa : log.titleEn}</h4>
                <div className="flex items-center gap-2 text-xs text-neutral-400 font-medium mt-0.5">
                  <Clock className="w-3 h-3 text-gray-500" />
                  <span>{log.date} • {log.duration}</span>
                </div>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase">
              {log.status}
            </span>
          </div>
        ))}
      </div>

    </div>
  );
}
