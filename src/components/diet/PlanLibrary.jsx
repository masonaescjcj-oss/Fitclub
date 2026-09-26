import React, { useMemo, useState } from "react";
import { Chip, Label, Segmented, Button, cx, num } from "../ui/kit";
import { Sheet } from "./SmallSheets";
import { fmtNum } from "./DietBits";
import { money } from "./MealPlan";
import { mealPresets } from "../../lib/plans/library";
import { DEFAULT_SETTINGS, dayTotals, generateWeek } from "../../lib/nutrition/planEngine";
import { DIET_TYPES, GOALS, targetsFor } from "../../lib/nutrition/profile";

// Ready meal plans in Fuel (lib/plans/library.js): filter by goal, diet and
// budget; each plan shows what it means for this person (their calories,
// protein and a day's cost, from a sample day the planner builds), and one
// tap makes it the plan.

const COPY = {
  en: {
    title: "Ready meal plans", goal: "Goal", diet: "Diet", budget: "Budget",
    goals: { "Weight Loss": "Fat loss", "Muscle Gain": "Muscle", "Keep Fit": "Keep fit", "Max Strength": "Strength" },
    diets: { standard: "Balanced", high_protein: "High protein", vegetarian: "Vegetarian", keto: "Keto" },
    budgets: { economy: "Economy", medium: "Medium", free: "No limit" },
    forYou: (k, p, cost) => `For you: ${k} kcal, ${p} g protein, about ${cost} a day`,
    changesGoal: (a) => `Your goal becomes ${a}.`, current: "Your plan", use: "Use this plan",
    count: (n) => `${n} plans`,
  },
  fa: {
    title: "برنامه‌های غذایی آماده", goal: "هدف", diet: "رژیم", budget: "بودجه",
    goals: { "Weight Loss": "چربی‌سوزی", "Muscle Gain": "عضله", "Keep Fit": "تناسب", "Max Strength": "قدرت" },
    diets: { standard: "متعادل", high_protein: "پرپروتئین", vegetarian: "گیاهی", keto: "کتو" },
    budgets: { economy: "اقتصادی", medium: "میانه", free: "آزاد" },
    forYou: (k, p, cost) => `برای تو: روزی ${k} کالری، ${p} گرم پروتئین، حدود ${cost}`,
    changesGoal: (a) => `هدفت به «${a}» تغییر می‌کند.`, current: "برنامه‌ی فعلی", use: "همین برنامه را شروع کن",
    count: (n) => `${n} برنامه`,
  },
};

/** What a ready plan would be for this person: one sample day from the planner. */
function sampleDay(preset, profile, settings) {
  const p = { ...profile, goal: preset.goal, dietType: preset.dietType, customTargets: null };
  const target = targetsFor(p);
  const [day] = generateWeek({
    start: "2026-01-01", days: 1, tries: 2, seed: 11,
    targetFor: () => target,
    settings: { ...DEFAULT_SETTINGS, ...settings, budget: preset.budget, meals: preset.meals, weeklyCap: null },
    dietType: preset.dietType, goal: preset.goal,
  });
  return { target, totals: dayTotals(day) };
}

export default function MealLibrarySheet({ isRtl, profile, plan, onUse, onClose }) {
  const c = COPY[isRtl ? "fa" : "en"];
  const n = (v) => num(v, isRtl);
  const [goal, setGoal] = useState(profile.goal || "Keep Fit");
  const [diet, setDiet] = useState(DIET_TYPES.includes(profile.dietType) ? profile.dietType : "standard");
  const [budget, setBudget] = useState(plan.settings?.budget || "medium");
  const list = useMemo(() => mealPresets({ goal, dietType: diet, budget }), [goal, diet, budget]);
  // A day for each shown plan: a few milliseconds each, only for what's on screen.
  const samples = useMemo(() => Object.fromEntries(list.map((p) => {
    try { return [p.id, sampleDay(p, profile, plan.settings)]; } catch { return [p.id, null]; }
  })), [list, profile, plan.settings]);

  const currentId = `meal:${profile.goal}:${profile.dietType}:${plan.settings?.budget}:${plan.settings?.meals}`;

  return (
    <Sheet title={c.title} isRtl={isRtl} t={c} onClose={onClose}>
      <div className="flex flex-col gap-2">
        <Label>{c.goal}</Label>
        <div className="flex flex-wrap gap-1.5">
          {GOALS.map((g) => <Chip key={g} active={goal === g} onClick={() => setGoal(g)}>{c.goals[g]}</Chip>)}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label>{c.diet}</Label>
        <div className="flex flex-wrap gap-1.5">
          {DIET_TYPES.map((d) => <Chip key={d} active={diet === d} onClick={() => setDiet(d)}>{c.diets[d]}</Chip>)}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label>{c.budget}</Label>
        <Segmented label={c.budget} value={budget} onChange={setBudget}
          options={["economy", "medium", "free"].map((b) => ({ id: b, label: c.budgets[b] }))} />
      </div>

      <span className="text-[13px] text-muted">{c.count(n(list.length))}</span>
      <ul className="m-0 p-0 list-none flex flex-col gap-2.5">
        {list.map((p) => {
          const s = samples[p.id];
          const mine = p.id === currentId;
          return (
            <li key={p.id} className={cx("rounded-3xl p-4 flex flex-col gap-2", mine ? "bg-inv text-on-inv" : "bg-card text-ink")}>
              <span className="text-[16px] font-bold leading-snug">{isRtl ? p.nameFa : p.name}</span>
              <span className={cx("text-[13px] leading-relaxed", mine ? "text-on-inv/75" : "text-muted")}>{isRtl ? p.descriptionFa : p.description}</span>
              {s && (
                <span className={cx("text-[13px] font-medium", mine ? "text-on-inv" : "text-ink")}>
                  {c.forYou(fmtNum(s.target.kcal, isRtl), n(Math.round(s.target.protein)), money(s.totals.cost, isRtl))}
                </span>
              )}
              {p.goal !== profile.goal && <span className="text-[12px] text-muted">{c.changesGoal(c.goals[p.goal])}</span>}
              {mine ? (
                <span className="text-[13px] font-semibold">{c.current}</span>
              ) : (
                <Button tone="ink" size="sm" className="self-start" onClick={() => onUse(p)}>{c.use}</Button>
              )}
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
