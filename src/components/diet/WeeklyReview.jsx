import React from "react";
import { CalendarCheck } from "lucide-react";
import { Button, Card, IconWell, Label, cx, num } from "../ui/kit";

// The weekly check-in card in Fuel (lib/nutrition/weeklyReview.js decides):
// the week in three numbers, what changes and why, and one tap to keep it.

const COPY = {
  en: {
    eyebrow: "Weekly check-in",
    perWeek: "kg / week", followed: "meals as planned", workouts: "workouts",
    lower: (k) => `${k} kcal less a day`, raise: (k) => `${k} kcal more a day`,
    on_track: "On track: keep going", need_weights: "Weigh in to get a check-in",
    follow_plan: "Follow the plan a little closer first", at_floor: "Move more, don't eat less",
    whyPace: (got, goal, down) => `Lately about ${got} kg a week ${down ? "down" : "up"}; the aim is ${goal}.`,
    whyKeep: (got) => `Your weight has moved about ${got} kg a week; the aim is to hold it.`,
    tooFast: "Faster than planned: a little more food keeps your muscle.",
    measured: "From the food you logged and your weigh-ins.",
    needWeights: (n) => `Only ${n} weigh-in${n === "1" ? "" : "s"} in the last two weeks; three are needed.`,
    followPlan: (p) => `${p}% of the planned meals were eaten as planned. Until the plan has been tried, the numbers stay.`,
    atFloor: "Your day is at the lowest FitClub goes. Instead of eating less, walk 2,000 more steps a day or add a cardio session.",
    newTarget: (a, b) => `New target ${a} kcal (was ${b}). The rest of this week's plan is re-portioned.`,
    apply: "Apply", later: "Not now", ok: "Got it",
  },
  fa: {
    eyebrow: "بازبینی هفتگی",
    perWeek: "کیلو / هفته", followed: "وعده طبق برنامه", workouts: "تمرین",
    lower: (k) => `روزی ${k} کالری کمتر`, raise: (k) => `روزی ${k} کالری بیشتر`,
    on_track: "روی مسیری؛ همین را ادامه بده", need_weights: "برای بازبینی، وزن کن",
    follow_plan: "اول برنامه را کامل‌تر دنبال کن", at_floor: "کمتر نخور؛ بیشتر تحرک داشته باش",
    whyPace: (got, goal, down) => `اخیراً حدود ${got} کیلو در هفته ${down ? "کم" : "اضافه"} کردی؛ هدفت ${goal} بود.`,
    whyKeep: (got) => `وزنت حدود ${got} کیلو در هفته تغییر کرده؛ هدف ثابت ماندن است.`,
    tooFast: "سریع‌تر از برنامه است: کمی غذای بیشتر عضله‌ات را حفظ می‌کند.",
    measured: "بر اساس غذاهایی که ثبت کردی و وزن‌کشی‌هایت.",
    needWeights: (n) => `در دو هفته‌ی اخیر فقط ${n} بار وزن ثبت شده؛ دست‌کم ۳ بار لازم است.`,
    followPlan: (p) => `${p}٪ وعده‌ها طبق برنامه خورده شد. تا وقتی برنامه امتحان نشده، عددها را عوض نمی‌کنیم.`,
    atFloor: "کالری روزانه‌ات به کمترین حد سالم رسیده. به‌جای کمتر خوردن، روزی ۲٬۰۰۰ قدم بیشتر راه برو یا یک جلسه کاردیو اضافه کن.",
    newTarget: (a, b) => `هدف جدید ${a} کیلوکالری (قبلاً ${b}). بقیه‌ی برنامه‌ی این هفته با آن تنظیم می‌شود.`,
    apply: "اعمال", later: "فعلاً نه", ok: "باشه",
  },
};

const kg = (v, isRtl) => {
  const text = String(Math.round(Math.abs(v) * 100) / 100);
  return isRtl ? num(text, true).replace(".", "٫") : text;
};
const grouped = (v, isRtl) => num(Math.round(v).toLocaleString("en-US"), isRtl);

export default function WeeklyReviewCard({ review, goal, isRtl, onApply, onDismiss }) {
  const c = COPY[isRtl ? "fa" : "en"];
  const r = review;
  const moves = r.decision === "lower" || r.decision === "raise";
  const lose = goal === "Weight Loss";
  const title = moves ? c[r.decision](grouped(Math.abs(r.delta), isRtl)) : c[r.decision];

  let why = null;
  if (r.decision === "need_weights") why = c.needWeights(num(r.weighIns, isRtl));
  else if (r.decision === "follow_plan") why = c.followPlan(num(Math.round((r.followed || 0) * 100), isRtl));
  else if (r.decision === "at_floor") why = c.atFloor;
  else if (r.weeklyKg !== null) {
    why = goal === "Keep Fit" || !r.goalKg
      ? c.whyKeep(kg(r.weeklyKg, isRtl))
      : c.whyPace(kg(r.weeklyKg, isRtl), kg(r.goalKg, isRtl), r.weeklyKg <= 0);
    if (r.decision === "raise" && lose) why += ` ${c.tooFast}`;
    if (r.basis === "measured") why += ` ${c.measured}`;
  }

  const stats = [
    [r.weeklyKg === null ? "–" : `${r.weeklyKg > 0 ? "+" : r.weeklyKg < 0 ? "−" : ""}${kg(r.weeklyKg, isRtl)}`, c.perWeek],
    [r.followed === null ? "–" : `${num(Math.round(r.followed * 100), isRtl)}${isRtl ? "٪" : "%"}`, c.followed],
    [r.workouts.planned ? `${num(r.workouts.done, isRtl)}/${num(r.workouts.planned, isRtl)}` : num(r.workouts.done, isRtl), c.workouts],
  ];

  return (
    <Card className="flex flex-col gap-3.5" aria-label={c.eyebrow}>
      <div className="flex items-start gap-3">
        <IconWell tone="accent" size={40}><CalendarCheck className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <Label>{c.eyebrow}</Label>
          <h2 className="m-0 text-[18px] font-bold leading-snug text-ink">{title}</h2>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {stats.map(([value, label]) => (
          <div key={label} className="rounded-2xl bg-sunk px-3 py-2.5 flex flex-col gap-0.5 min-w-0">
            <span dir="ltr" className={cx("text-[17px] font-bold text-ink tabular-nums", isRtl && "text-end")}>{value}</span>
            <span className="text-[11px] leading-tight text-muted">{label}</span>
          </div>
        ))}
      </div>
      {why && <p className="m-0 text-[13px] leading-relaxed text-muted">{why}</p>}
      {moves && <p className="m-0 text-[13px] leading-relaxed text-ink font-medium">{c.newTarget(grouped(r.kcal + r.delta, isRtl), grouped(r.kcal, isRtl))}</p>}
      <div className="flex items-center gap-2">
        {moves ? (
          <>
            <Button tone="ink" size="sm" onClick={() => onApply(r)}>{c.apply}</Button>
            <Button tone="soft" size="sm" onClick={() => onDismiss(r)}>{c.later}</Button>
          </>
        ) : (
          <Button tone="ink" size="sm" onClick={() => onDismiss(r)}>{c.ok}</Button>
        )}
      </div>
    </Card>
  );
}
