import React from "react";
import { ArrowLeft, Calendar, Clock, Dumbbell, Trophy } from "lucide-react";
import { useTrainingStore } from "../../lib/training/trainingContext";
import { useTrainingT } from "../../lib/training/trainingI18n";
import { sessionSetsDone, sessionVolume } from "../../lib/training/programModel";

/** Every logged workout, newest first — read straight from the training store. */
export default function HistoryPage({ onBack, isRtl }) {
  const t = useTrainingT(isRtl);
  const { sessions } = useTrainingStore();
  const list = [...sessions].filter((s) => s.finishedAt).sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));

  const when = (iso) => {
    const d = new Date(iso);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((today - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diff === 0) return `${t.today}, ${time}`;
    if (diff === 1) return `${t.yesterday}, ${time}`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="w-full min-h-[100dvh] bg-black text-white px-4 pt-6 pb-28 space-y-6 select-none">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack}
            className="w-9 h-9 rounded-xl bg-[#141416] border border-white/10 flex items-center justify-center text-gray-300 hover:text-white">
            <ArrowLeft className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
          </button>
          <h1 className="text-xl font-black text-white">{isRtl ? "تاریخچه تمرین‌ها" : "Workout History"}</h1>
        </div>
        <Calendar className="w-6 h-6 text-[#844783]" />
      </div>

      {list.length === 0 && <p className="py-12 text-center text-xs font-bold text-neutral-600">{t.noSessions}</p>}

      <div className="space-y-3">
        {list.map((s) => (
          <div key={s.id} className="p-4 rounded-2xl bg-[#141416] border border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="p-3 rounded-xl bg-neutral-900 border border-white/10 shrink-0 text-[#844783]"><Dumbbell className="w-5 h-5" /></div>
              <div className="min-w-0">
                <h4 className="text-sm font-black text-white truncate">{(isRtl && s.dayTitleFa) || s.dayTitle} <span className="text-neutral-500">· {s.programName}</span></h4>
                <div className="flex items-center gap-2 text-xs text-neutral-400 font-medium mt-0.5" dir="ltr">
                  <Clock className="w-3 h-3 text-gray-500" />
                  <span>{when(s.startedAt)} • {Math.round(s.durationSec / 60)} {t.min} • {Math.round(sessionVolume(s)).toLocaleString()} {t.kg} • {sessionSetsDone(s)} {t.sets}</span>
                </div>
              </div>
            </div>
            {s.prs?.length > 0 ? (
              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black flex items-center gap-1 shrink-0"><Trophy className="w-3 h-3" /> {s.prs.length}</span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase shrink-0">✓</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
