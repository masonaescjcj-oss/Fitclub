import React from "react";
import { X, Play, Target, ShieldCheck, Dumbbell, Zap, ChevronRight } from "lucide-react";

export default function ExerciseDetailModal({ exercise, onClose, isRtl, onStartWorkout }) {
  if (!exercise) return null;

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      {/* Modal Container */}
      <div className="w-full sm:max-w-lg bg-[#141416] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#844783]/20 border border-[#844783]/40 flex items-center justify-center text-[#844783]">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-black text-[#844783] uppercase tracking-wider block">
                {isRtl ? "راهنمای اجرای حرکت" : "EXERCISE GUIDE"}
              </span>
              <h3 className="text-sm font-black text-white">{isRtl ? exercise.nameFa || exercise.nameEn : exercise.nameEn}</h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-5 space-y-5 flex-grow">
          
          {/* Visual Showcase Card */}
          <div className="relative rounded-2xl bg-neutral-950 border border-white/10 p-6 flex flex-col items-center justify-center min-h-[160px] overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#844783]/20 via-transparent to-transparent opacity-60" />
            
            {/* Visual Icon / Figure */}
            <div className="relative z-10 w-24 h-24 rounded-2xl bg-[#1c1822] border border-[#844783]/40 flex items-center justify-center text-[#844783] shadow-[0_0_30px_rgba(132,71,131,0.3)] mb-2">
              <Dumbbell className="w-12 h-12 text-[#844783] animate-pulse" />
            </div>

            <div className="relative z-10 text-center">
              <span className="text-base font-black text-white tracking-tight">{isRtl ? exercise.nameFa || exercise.nameEn : exercise.nameEn}</span>
              <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 rounded-full">
                  ⚡ {exercise.sets || 4} Sets
                </span>
                <span className="text-[11px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/25 px-2.5 py-0.5 rounded-full">
                  🔁 {exercise.reps || "8-10"} Reps
                </span>
                <span className="text-[11px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/25 px-2.5 py-0.5 rounded-full">
                  🎯 {exercise.area || exercise.target || "Target"}
                </span>
              </div>
            </div>
          </div>

          {/* Targeted Muscles Breakdown */}
          <div className="p-4 rounded-2xl bg-neutral-900/80 border border-white/10 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
              <Target className="w-4 h-4 text-[#844783]" />
              <span>{isRtl ? "عضلات درگیر در تمرین" : "Target Muscle Activation"}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[10px] font-bold text-neutral-400 block mb-0.5">{isRtl ? "عضله اصلی (Primary)" : "Primary Target"}</span>
                <span className="font-black text-white text-xs">{exercise.primaryMuscle || exercise.area || "Target Muscle"}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[10px] font-bold text-neutral-400 block mb-0.5">{isRtl ? "عضله کمکی (Secondary)" : "Secondary Target"}</span>
                <span className="font-black text-neutral-300 text-xs">{exercise.secondaryMuscle || "Stabilizers & Core"}</span>
              </div>
            </div>
          </div>

          {/* Execution Steps */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>{isRtl ? "مراحل اجرای صحیح حرکت" : "Step-by-Step Execution"}</span>
            </h4>

            <div className="space-y-2">
              {(exercise.instructions || [
                isRtl ? "در وضعیت صحیح قرار بگیرید و عضلات شکم و ستون فقرات را کاملاً منقبض کنید." : "Set up your stance with core braced and spine in a neutral position.",
                isRtl ? "حرکت را با تمرکز و کنترل کامل در فاز منفی (پایین آمدن) شروع کنید." : "Initiate the movement with controlled tempo during the eccentric phase.",
                isRtl ? "در فاز مثبت با انقباض شدید عضله هدف، وزنه را به موقعیت شروع بازگردانید." : "Drive through the target muscle with maximum focus and power to return to starting position.",
                isRtl ? "در انتهای دامنه ۱ ثانیه مکث کنید و بدون قفل کردن مفاصل ادامه دهید." : "Pause for a peak contraction before repeating for target repetitions.",
              ]).map((step, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-neutral-900/60 border border-white/5 flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#844783]/20 border border-[#844783]/40 text-[#844783] text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed font-medium">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pro Form Tip Alert */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-black text-emerald-400 block mb-0.5">
                {isRtl ? "نکته مربی حرفه‌ای 💡" : "Coach Pro Tip 💡"}
              </span>
              <p className="text-[11px] text-neutral-300 leading-relaxed font-medium">
                {isRtl
                  ? "روی کیفیت حرکت و اتصال عصبی-عضلانی (Mind-Muscle Connection) تمرکز کنید؛ وزنه سنگین‌تر بدون فرم صحیح تاثیری در رشد عضله ندارد."
                  : "Focus on peak contraction and mind-muscle connection. Control the weight throughout the full range of motion."}
              </p>
            </div>
          </div>

        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-white/10 shrink-0 bg-neutral-950/80">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onStartWorkout) onStartWorkout();
            }}
            className="w-full h-13 rounded-2xl bg-gradient-to-r from-[#844783] to-[#965595] hover:brightness-110 text-white font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(132,71,131,0.4)] active:scale-[0.98] transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isRtl ? "شروع این تمرین در حالت زنده" : "Start Live Exercise"}</span>
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>

      </div>
    </div>
  );
}
