import React from "react";
import { Dumbbell, RefreshCw } from "lucide-react";
import { IconWell, List, Row, Sheet, num } from "../ui/kit";

/** Alternatives with a similar movement pattern; picking one swaps it in. */
export default function SwapExerciseModal({ currentExercise, onSwap, onClose, isRtl }) {
  if (!currentExercise) return null;
  const n = (v) => num(v, isRtl);
  const sep = isRtl ? "، " : " · ";

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
    },
  ];

  const current = isRtl ? currentExercise.nameFa || currentExercise.nameEn : currentExercise.nameEn;

  return (
    <Sheet open title={isRtl ? "تعویض حرکت" : "Swap exercise"} onClose={onClose} isRtl={isRtl}>
      <div className="flex flex-col gap-1">
        <span className="text-[17px] font-bold text-ink">{isRtl ? `جایگزین برای ${current}` : `Alternatives for ${current}`}</span>
        <p className="m-0 text-sm leading-relaxed text-muted">
          {isRtl
            ? "یکی از حرکات جایگزین زیر را انتخاب کنید تا بلافاصله در برنامه تمرین امروز جایگزین شود."
            : "Select an alternative exercise with matching biomechanics and muscle activation."}
        </p>
      </div>
      <List>
        {alternativeOptions.map((alt, idx) => (
          <Row key={idx} isRtl={isRtl}
            onClick={() => { onSwap(alt); onClose(); }}
            icon={<IconWell tone="sunk" size={44} square><Dumbbell className="w-5 h-5" strokeWidth={2} /></IconWell>}
            title={isRtl ? alt.nameFa : alt.nameEn}
            subtitle={`${n(alt.sets)} ${isRtl ? "ست" : "sets"} × ${n(alt.reps)}${sep}${alt.equipment}`}
            right={<IconWell tone="inv" size={32}><RefreshCw className="w-4 h-4" strokeWidth={2} /></IconWell>} />
        ))}
      </List>
    </Sheet>
  );
}
