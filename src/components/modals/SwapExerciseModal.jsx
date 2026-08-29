import React from "react";
import { X, RefreshCw, Check, Dumbbell } from "lucide-react";

export default function SwapExerciseModal({ currentExercise, onSwap, onClose, isRtl }) {
  if (!currentExercise) return null;

  const alternativeOptions = [
    {
      nameEn: "Kettlebell Goblet Squat",
      nameFa: "اسکات گابلت با کتل‌بل",
      sets: currentExercise.sets || 4,
      reps: currentExercise.reps || "8-10 Reps",
      target: currentExercise.area || "Legs",
      equipment: "Kettlebell / Dumbbell",
      difficulty: "Intermediate",
    },
    {
      nameEn: "Plyometric Box Jump",
      nameFa: "پرش روی جعبه (باکس جامپ)",
      sets: 4,
      reps: "6 Reps",
      target: currentExercise.area || "Explosive Legs",
      equipment: "Plyo Box",
      difficulty: "High Intensity",
    },
    {
      nameEn: "Bulgarian Split Squat",
      nameFa: "اسکات اسپلیت بلغاری",
      sets: 3,
      reps: "10 Reps/leg",
      target: "Quads & Glutes",
      equipment: "Dumbbells",
      difficulty: "Advanced",
    },
    {
      nameEn: "Leg Press Machine",
      nameFa: "پرس پا دستگاه",
      sets: 4,
      reps: "12 Reps",
      target: "Quads & Hips",
      equipment: "Gym Machine",
      difficulty: "Beginner Friendly",
    },
    {
      nameEn: "Romanian Deadlift",
      nameFa: "ددلیفت رومانیایی با هالتر",
      sets: 4,
      reps: "8 Reps",
      target: "Hamstrings & Glutes",
      equipment: "Barbell",
      difficulty: "Intermediate",
    }
  ];

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="w-full sm:max-w-lg bg-[#141416] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl max-h-[85dvh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">
                {isRtl ? "تعویض و جایگزینی حرکت" : "SWAP EXERCISE"}
              </span>
              <h3 className="text-sm font-black text-white">
                {isRtl ? `جایگزین برای ${currentExercise.nameFa || currentExercise.nameEn}` : `Alternatives for ${currentExercise.nameEn}`}
              </h3>
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

        {/* Alternatives List */}
        <div className="overflow-y-auto p-5 space-y-3 flex-grow">
          <p className="text-xs text-neutral-400 font-medium">
            {isRtl
              ? "یکی از حرکات جایگزین زیر را انتخاب کنید تا بلافاصله در برنامه تمرین امروز جایگزین شود:"
              : "Select an alternative exercise with matching biomechanics and muscle activation:"}
          </p>

          {alternativeOptions.map((alt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                onSwap(alt);
                onClose();
              }}
              className="w-full p-4 rounded-2xl bg-neutral-900/80 border border-white/10 hover:border-[#844783]/60 hover:bg-[#1c1622] flex items-center justify-between text-left rtl:text-right group transition-all duration-200 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center text-[#844783] group-hover:scale-105 transition-transform shrink-0">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors">
                    {isRtl ? alt.nameFa : alt.nameEn}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-bold text-neutral-400">⚡ {alt.sets} Sets × {alt.reps}</span>
                    <span className="text-[10px] font-black text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                      {alt.equipment}
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-[#844783]/20 border border-[#844783]/40 text-[#844783] flex items-center justify-center group-hover:bg-[#844783] group-hover:text-white transition-all shrink-0">
                <Check className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
