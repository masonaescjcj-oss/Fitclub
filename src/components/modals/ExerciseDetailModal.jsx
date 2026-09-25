import React from "react";
import { Dumbbell, Layers, Repeat, ShieldCheck, Target } from "lucide-react";
import { Card, CtaButton, IconWell, Label, Sheet, Tag, num } from "../ui/kit";

/** How to perform one exercise: targets, the muscles it works, the steps and a form tip. */
export default function ExerciseDetailModal({ exercise, onClose, isRtl, onStartWorkout }) {
  if (!exercise) return null;
  const n = (v) => num(v, isRtl);
  const name = isRtl ? exercise.nameFa || exercise.nameEn : exercise.nameEn;
  const steps = exercise.instructions || [
    isRtl ? "در وضعیت صحیح قرار بگیرید و عضلات شکم و ستون فقرات را کاملاً منقبض کنید." : "Set up your stance with core braced and spine in a neutral position.",
    isRtl ? "حرکت را با تمرکز و کنترل کامل در فاز منفی (پایین آمدن) شروع کنید." : "Initiate the movement with controlled tempo during the eccentric phase.",
    isRtl ? "در فاز مثبت با انقباض شدید عضله هدف، وزنه را به موقعیت شروع بازگردانید." : "Drive through the target muscle with maximum focus and power to return to starting position.",
    isRtl ? "در انتهای دامنه ۱ ثانیه مکث کنید و بدون قفل کردن مفاصل ادامه دهید." : "Pause for a peak contraction before repeating for target repetitions.",
  ];

  return (
    <Sheet open title={name} onClose={onClose} isRtl={isRtl}
      footer={(
        <CtaButton tone="ink" isRtl={isRtl} onClick={() => { onClose(); if (onStartWorkout) onStartWorkout(); }}>
          {isRtl ? "شروع این تمرین در حالت زنده" : "Start live exercise"}
        </CtaButton>
      )}>
      <Card tone="hero" className="flex items-center gap-4">
        <IconWell tone="accent" size={64}><Dumbbell className="w-7 h-7" strokeWidth={2} /></IconWell>
        <div className="min-w-0 flex flex-col gap-2.5">
          <Label className="!text-hero-muted">{isRtl ? "راهنمای اجرای حرکت" : "Exercise guide"}</Label>
          <div className="flex flex-wrap gap-1.5">
            <Tag tone="hero"><Layers className="w-3.5 h-3.5" strokeWidth={2} />{n(exercise.sets || 4)} {isRtl ? "ست" : "sets"}</Tag>
            <Tag tone="hero"><Repeat className="w-3.5 h-3.5" strokeWidth={2} />{n(exercise.reps || "8-10")} {isRtl ? "تکرار" : "reps"}</Tag>
            <Tag tone="hero"><Target className="w-3.5 h-3.5" strokeWidth={2} />{exercise.area || exercise.target || (isRtl ? "هدف" : "Target")}</Tag>
          </div>
        </div>
      </Card>

      <Card className="grid grid-cols-2 gap-3">
        <span className="flex flex-col gap-1.5 min-w-0">
          <Label>{isRtl ? "عضله اصلی" : "Primary target"}</Label>
          <span className="text-[15px] font-semibold text-ink">{exercise.primaryMuscle || exercise.area || (isRtl ? "عضله هدف" : "Target muscle")}</span>
        </span>
        <span className="flex flex-col gap-1.5 min-w-0 ps-3 border-s border-hair">
          <Label>{isRtl ? "عضله کمکی" : "Secondary target"}</Label>
          <span className="text-[15px] font-semibold text-ink">{exercise.secondaryMuscle || (isRtl ? "عضلات ثبات‌دهنده و مرکز بدن" : "Stabilizers & core")}</span>
        </span>
      </Card>

      <section className="flex flex-col gap-2.5">
        <Label as="h3" className="m-0">{isRtl ? "مراحل اجرای صحیح حرکت" : "Step-by-step execution"}</Label>
        <ol className="m-0 p-0 py-1 list-none rounded-3xl bg-card divide-y divide-hair">
          {steps.map((step, idx) => (
            <li key={idx} className="flex items-start gap-3 px-4 py-3">
              <span className="w-7 h-7 rounded-full bg-sunk text-ink text-[13px] font-bold flex items-center justify-center shrink-0">{n(idx + 1)}</span>
              <p className="m-0 pt-0.5 text-[15px] leading-[1.45] text-ink">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <Card className="flex items-start gap-3">
        <IconWell tone="sage" size={36}><ShieldCheck className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>
        <div className="min-w-0 flex flex-col gap-1">
          <span className="text-[15px] font-bold text-ink">{isRtl ? "نکته‌ی فرم" : "Form tip"}</span>
          <p className="m-0 text-sm leading-relaxed text-muted">
            {isRtl
              ? "روی کیفیت حرکت و اتصال عصبی-عضلانی (Mind-Muscle Connection) تمرکز کنید؛ وزنه سنگین‌تر بدون فرم صحیح تاثیری در رشد عضله ندارد."
              : "Focus on peak contraction and mind-muscle connection. Control the weight throughout the full range of motion."}
          </p>
        </div>
      </Card>
    </Sheet>
  );
}
