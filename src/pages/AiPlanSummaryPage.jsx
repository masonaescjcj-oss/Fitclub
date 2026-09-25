import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { loadProfile, proteinPerKg, targetsFor } from "../lib/nutrition/profile";
import { loadTraining } from "../lib/training/trainingStore";
import { loadState as loadChecklists } from "../lib/checklistStore";
import { loadSession } from "../lib/session";
import { Card, CtaButton, IconWell, Label, Ring, Tag, cx, num } from "../components/ui/kit";
import { SparkIcon } from "../components/ui/icons";
import Header, { FlowFooter, FlowScreen, FlowTitle } from "../components/Header";

// The plan the answers produce: the program the athlete starts on, the day's
// fuel targets, the checklist, and a word from the coach. Every number is read
// from the stores the app itself will use, so Today never contradicts it.

const GOAL_LABEL = {
  "Weight Loss": ["Weight loss", "کاهش وزن"],
  "Muscle Gain": ["Muscle gain", "افزایش عضله"],
  "Keep Fit": ["Keep fit", "تثبیت وزن"],
  "Max Strength": ["Max strength", "حداکثر قدرت"],
};

/** The program Train will open on, and the shape of its week. */
function activeProgram() {
  const training = loadTraining();
  const program = training.programs.find((p) => p.id === training.activeProgramId) || training.programs[0] || null;
  if (!program) return null;
  const workouts = program.days.filter((d) => d.type !== "rest" && d.exercises.length);
  // Today estimates eight minutes per exercise; the plan uses the same rule.
  const minutes = workouts.length
    ? Math.round(workouts.reduce((a, d) => a + d.exercises.length * 8, 0) / workouts.length) : 0;
  return { program, workouts, minutes };
}

/** How many items the athlete's daily list asks for, the same list Today shows. */
function dailyHabits() {
  const { lists = [] } = loadChecklists();
  const list = lists.find((l) => l.type === "personal" && l.reset?.mode === "daily") || lists[0];
  return list ? list.items.length : 0;
}

export default function AiPlanSummaryPage({ onNavigate }) {
  // The wizard just wrote these answers; show what they actually produce
  // rather than a fixed number the diet tab would then contradict.
  const profile = useMemo(() => loadProfile(), []);
  const planTargets = useMemo(() => targetsFor(profile), [profile]);
  const planKcal = planTargets.kcal.toLocaleString("en-US");
  const planProtein = planTargets.protein;
  const plan = useMemo(() => activeProgram(), []);
  const habits = useMemo(() => dailyHabits(), []);

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const language = localStorage.getItem("language") || "en";
  const isRtl = language === "fa";
  const n = (v) => num(v, isRtl);

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsReady(true);
          return 100;
        }
        return prev + 25;
      });
    }, 280);

    return () => clearInterval(interval);
  }, []);

  if (!isReady) {
    return (
      <FlowScreen isRtl={isRtl}>
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-5 pb-16">
          <Ring value={loadingProgress / 100} size={148} stroke={10}>
            <span className="font-display font-extrabold text-[36px] leading-none tracking-[-0.04em]">
              {n(loadingProgress)}<span className="text-xl text-muted">{isRtl ? "٪" : "%"}</span>
            </span>
          </Ring>
          <Tag tone="coach" className="font-semibold"><SparkIcon size={14} />{isRtl ? "مربی" : "Coach"}</Tag>
          <h1 className="m-0 font-display font-extrabold text-[30px] leading-[1.05] tracking-[-0.035em] rtl:leading-[1.35] rtl:tracking-normal">
            {isRtl ? "در حال آماده‌سازی برنامه کامل شما..." : "Processing your complete plan..."}
          </h1>
          <p className="m-0 max-w-[300px] text-[15px] leading-[1.45] text-muted">
            {isRtl
              ? "محاسبه دقیق متابولیسم بدنی، تفکیک ماکروها و پیش‌بینی روند موفقیت شما..."
              : "Calculating your metabolic rate, macro split, and predicted progress curve..."}
          </p>
        </div>
      </FlowScreen>
    );
  }

  const name = (loadSession().name || "").trim().split(/\s+/)[0];
  const goal = GOAL_LABEL[profile.goal]?.[isRtl ? 1 : 0] || profile.goal;
  const program = plan?.program;
  const days = plan?.workouts.length || 0;
  const minutes = plan?.minutes || 0;
  const sep = isRtl ? "، " : " · ";

  // Macros by the energy they carry, so the bar reads as the day's calories.
  const macros = [
    { id: "protein", label: isRtl ? "پروتئین" : "Protein", grams: planTargets.protein, kcal: planTargets.protein * 4, dot: "bg-ink" },
    { id: "carbs", label: isRtl ? "کربوهیدرات" : "Carbs", grams: planTargets.carbs, kcal: planTargets.carbs * 4, dot: "bg-grape" },
    { id: "fat", label: isRtl ? "چربی" : "Fat", grams: planTargets.fat, kcal: planTargets.fat * 9, dot: "bg-ochre" },
  ];
  const macroKcal = macros.reduce((a, m) => a + m.kcal, 0) || 1;
  const share = (m) => Math.round((m.kcal / macroKcal) * 100);
  const pct = (v) => (isRtl ? `${n(v)}٪` : `${v}%`);

  // Four weeks at this intake, at 7,700 kcal per kilo of bodyweight.
  const weekly = planTargets.maintenance ? ((planTargets.kcal - planTargets.maintenance) * 7) / 7700 : 0;
  const start = profile.weight;
  const end = Math.round((start + weekly * 4) * 10) / 10;
  const delta = Math.round((end - start) * 10) / 10;
  const kg = isRtl ? "کیلو" : "kg";
  const OutlookIcon = delta < 0 ? TrendingDown : delta > 0 ? TrendingUp : Minus;

  const stats = [
    { id: "kcal", label: isRtl ? "کالری" : "Calories", value: n(planKcal), sub: isRtl ? "کالری در روز" : "kcal a day" },
    {
      id: "protein", label: isRtl ? "پروتئین" : "Protein", value: `${n(planProtein)} ${isRtl ? "گرم" : "g"}`,
      sub: isRtl ? `حدود ${n(proteinPerKg(planProtein, profile.weight).toFixed(1))} گرم به ازای هر کیلو`
        : `about ${proteinPerKg(planProtein, profile.weight).toFixed(1)} g per kg`,
    },
    { id: "train", label: isRtl ? "تمرین" : "Training", value: `${n(days)} × ${n(minutes)}`, sub: isRtl ? "جلسه × دقیقه در هفته" : "sessions × minutes a week" },
    { id: "habits", label: isRtl ? "چک‌لیست" : "Checklist", value: n(habits), sub: isRtl ? "عادت در روز" : "habits a day" },
  ];

  return (
    <FlowScreen isRtl={isRtl}>
      <Header onBack={() => onNavigate("onboarding-wizard")} isRtl={isRtl} />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
        className="flex flex-col gap-2.5">
        <FlowTitle size={36} className="!mt-4 mb-2"
          title={name
            ? (isRtl ? `برنامه کامل شما آماده است، ${name}.` : `Your plan is ready, ${name}.`)
            : (isRtl ? "برنامه کامل شما آماده است!" : "Your complete plan is ready!")} />

        {program && (
          <Card tone="hero" className="flex flex-col gap-4" aria-label={isRtl ? "برنامه" : "Program"}>
            <div className="flex justify-between items-center gap-2">
              <Label className="!text-hero-muted">
                {isRtl ? `برنامه${sep}بلوک ${n(program.weeks || 1)} هفته‌ای` : `Program · ${program.weeks || 1}-week block`}
              </Label>
              <Tag tone="accent" className="font-bold">{goal}</Tag>
            </div>
            <div className="flex flex-col gap-1.5">
              <h2 className="m-0 font-display font-extrabold text-[32px] leading-none tracking-[-0.035em] rtl:leading-[1.3] rtl:tracking-normal">
                {isRtl && program.nameFa ? program.nameFa : program.name}
              </h2>
              <p className="m-0 text-sm text-hero-fg/70">
                {isRtl ? `${n(days)} روز در هفته، هر جلسه حدود ${n(minutes)} دقیقه` : `${days} days a week · about ${minutes} min each`}
              </p>
            </div>
            <ol aria-label={isRtl ? "هفته‌ی برنامه" : "The week"} className="m-0 p-0 list-none flex justify-between">
              {program.days.map((d, i) => {
                const rest = d.type === "rest" || !d.exercises.length;
                const title = isRtl && d.titleFa ? d.titleFa : d.title;
                return (
                  <li key={d.id} title={title} aria-label={`${isRtl ? "روز" : "Day"} ${n(i + 1)}: ${title}`}
                    className={cx("w-[38px] h-[38px] rounded-full flex items-center justify-center text-[13px]",
                      rest ? "ring-[1.5px] ring-inset ring-hero-2 text-hero-muted font-semibold" : "bg-accent text-on-accent font-bold")}>
                    {n(i + 1)}
                  </li>
                );
              })}
            </ol>
            <p className="m-0 -mt-1 text-[13px] leading-snug text-hero-muted">
              {plan.workouts.map((d) => (isRtl && d.titleFa ? d.titleFa : d.title)).join(sep)}
            </p>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((s) => (
            <Card key={s.id} className="flex flex-col gap-1.5">
              <Label>{s.label}</Label>
              <span className="font-display font-extrabold text-[28px] leading-none tracking-[-0.03em]">{s.value}</span>
              <span className="text-[13px] leading-snug text-muted">{s.sub}</span>
            </Card>
          ))}
        </div>

        <Card tone="coach" className="flex gap-3 items-start" aria-label={isRtl ? "مربی" : "Coach"}>
          <IconWell tone="inv" size={34} className="!text-coach !ring-0"><SparkIcon size={17} /></IconWell>
          <p className="m-0 text-sm leading-[1.45]">
            <span className="font-bold">{isRtl ? "مربی: " : "Coach: "}</span>
            {isRtl
              ? "وزنه‌ها و وعده‌ها را هر هفته بر اساس چیزی که واقعاً ثبت می‌کنی تنظیم می‌کنم."
              : "I'll adjust weights and portions every week from what you actually log."}
          </p>
        </Card>

        <Card className="flex flex-col gap-3.5" aria-label={isRtl ? "تفکیک ماکروها" : "Macro split"}>
          <div className="flex items-center justify-between gap-3">
            <Label>{isRtl ? "تفکیک ماکروها" : "Macro split"}</Label>
            <span className="text-[13px] text-muted">{n(planKcal)} {isRtl ? "کالری" : "kcal"}</span>
          </div>
          <div aria-hidden="true" className="flex h-3 gap-[2px]">
            {macros.map((m) => (
              <span key={m.id} className={cx("h-full rounded-full", m.dot)} style={{ flex: `${m.kcal} 1 0` }} />
            ))}
          </div>
          <ul className="m-0 p-0 list-none grid grid-cols-3 gap-2">
            {macros.map((m) => (
              <li key={m.id} className="flex flex-col gap-0.5">
                <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
                  <span className={cx("w-2 h-2 rounded-full shrink-0", m.dot)} />{m.label}
                </span>
                <span className="text-[17px] font-bold">{n(m.grams)} {isRtl ? "گرم" : "g"}</span>
                <span className="text-xs text-muted">{pct(share(m))}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="flex items-center gap-3.5" aria-label={isRtl ? "چشم‌انداز چهار هفته" : "Four-week outlook"}>
          <IconWell tone="sunk" size={44}><OutlookIcon className="w-5 h-5" strokeWidth={2} /></IconWell>
          <span className="flex-1 min-w-0 flex flex-col gap-1">
            <Label>{isRtl ? "چشم‌انداز ۴ هفته" : "4-week outlook"}</Label>
            <span className="text-[15px] font-semibold leading-snug">
              {delta === 0
                ? (isRtl ? `ثابت در ${n(start)} ${kg}` : `Holding at ${start} ${kg}`)
                : (isRtl ? `از ${n(start)} به حدود ${n(end.toFixed(1))} ${kg}` : `From ${start} to about ${end.toFixed(1)} ${kg}`)}
            </span>
          </span>
          {delta !== 0 && (
            <span className="shrink-0 font-display font-extrabold text-[26px] leading-none tracking-[-0.03em]" dir="ltr">
              {delta > 0 ? "+" : "−"}{n(Math.abs(delta).toFixed(1))}
            </span>
          )}
        </Card>
      </motion.div>

      <FlowFooter>
        <CtaButton isRtl={isRtl} onClick={() => onNavigate("main-app")}>
          {isRtl ? "ورود به برنامه" : "Enter the app"}
        </CtaButton>
      </FlowFooter>
    </FlowScreen>
  );
}
