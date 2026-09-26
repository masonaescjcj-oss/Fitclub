import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BedDouble, BookOpen, ChevronDown, ChevronLeft, ChevronRight, Coffee, Dumbbell, Eye, Info, Moon, Plus,
  Scale, Share2, SlidersHorizontal, Star, Sun, Trash2, Utensils, UtensilsCrossed, Zap,
} from "lucide-react";
import {
  Bar, Button, Card, Field, IconButton, IconWell, Label, List, PageHead, Row, Screen, cx, num,
} from "../../components/ui/kit";
import { SparkIcon } from "../../components/ui/icons";
import { MEALS, dayKey, entryMacros, mealEntries, sumMacros } from "../../lib/nutrition/diaryStore";
import { showWorkoutMeals } from "../../lib/nutrition/viewPrefs";
import { findFood } from "../../lib/nutrition/foods";
import { proteinPerKg } from "../../lib/nutrition/profile";
import { fill, useNutritionT } from "../../lib/nutrition/nutritionI18n";
import { useNutritionStore } from "../../lib/nutrition/nutritionContext";
import { CalorieRing, MACRO_COLORS, MacroBar, MacroDot, Stat, TrendSpark, fmtNum, round } from "../../components/diet/DietBits";
import FoodSearchSheet, { macroLine } from "../../components/diet/FoodSearchSheet";
import { QuickAddSheet, Sheet, TargetsSheet, ViewSheet, WeightSheet } from "../../components/diet/SmallSheets";
import { PlanSettingsSheet, PlanTodayCard, ShoppingSheet, SwapSheet, WeekSheet } from "../../components/diet/MealPlan";
import WeeklyReviewCard from "../../components/diet/WeeklyReview";
import MealLibrarySheet from "../../components/diet/PlanLibrary";
import { reviewDue, weeklyReview } from "../../lib/nutrition/weeklyReview";
import { planDay, weekOver } from "../../lib/nutrition/mealPlanStore";
import { ShareSheet } from "../../components/training/TrainingSheets";
import { compactMealPlan } from "../../lib/training/programModel";
import { useTrainingStore } from "../../lib/training/trainingContext";
import { useTrainingT } from "../../lib/training/trainingI18n";
import { loadSession } from "../../lib/session";
import { backendOn } from "../../lib/backend/supabase";

// Fuel: what's left to eat today, the meals that got it there, and the
// habits around them (water, weight, the coach's read on your burn).
// Every section below the hero can be switched off in "Customize view".

const GLASS_ML = 250;

const MEAL_ICONS = {
  breakfast: Sun,
  preworkout: Zap,
  lunch: UtensilsCrossed,
  postworkout: Dumbbell,
  dinner: Moon,
  snack: Coffee,
};

const fmtDate = (d, isRtl, opts) =>
  new Intl.DateTimeFormat(isRtl ? "fa-IR-u-ca-persian" : "en-GB", opts).format(d);

/** The meal the header's add button logs into, from the time of day. */
function defaultMeal(meals, hour = new Date().getHours()) {
  const id = hour < 11 ? "breakfast" : hour < 15 ? "lunch" : hour < 17 ? "snack" : hour < 22 ? "dinner" : "snack";
  return meals.find((m) => m.id === id) || meals[0];
}

const entryName = (entry, isRtl) => {
  const food = entry.foodId ? findFood(entry.foodId) : null;
  return entry.custom?.name || (food ? (isRtl ? food.nameFa : food.nameEn) : "—");
};

/** Litres with at most two decimals: 1.25, 2.75, 0. */
const litres = (ml, isRtl) => num(+(Math.max(ml, 0) / 1000).toFixed(2), isRtl);

export default function DietPage({ isRtl, onGoToRecipe, onGoToGuide }) {
  const t = useNutritionT(isRtl);
  const store = useNutritionStore();
  const { day, totals, targets, profile, estimate, trend, cursor, view } = store;
  const training = useTrainingStore();
  const tt = useTrainingT(isRtl);
  const n = (v) => num(v, isRtl);
  const sep = isRtl ? "، " : " · ";

  const [addingTo, setAddingTo] = useState(null); // meal object
  const [quickAddTo, setQuickAddTo] = useState(null);
  const [sheet, setSheet] = useState(null); // "menu" | "weight" | "targets" | "view" | "share"
  const [savingMeal, setSavingMeal] = useState(null);
  const [openMeals, setOpenMeals] = useState(() => new Set());
  const [planSheet, setPlanSheet] = useState(null); // "settings" | "week" | "shop" | "library"
  const [swapping, setSwapping] = useState(null);   // { date, mealIndex, itemIndex }

  const cursorDate = useMemo(() => new Date(`${cursor}T00:00:00`), [cursor]);
  const isToday = cursor === dayKey();

  const label = useMemo(() => {
    if (cursor === dayKey()) return t.today;
    if (cursor === dayKey(new Date(Date.now() - 86400000))) return t.yesterday;
    if (cursor === dayKey(new Date(Date.now() + 86400000))) return t.tomorrow;
    return fmtDate(cursorDate, isRtl, { weekday: "long" });
  }, [cursor, cursorDate, isRtl, t]);

  const eyebrow = isRtl
    ? fmtDate(cursorDate, true, { weekday: "long", day: "numeric", month: "long" })
    : `${fmtDate(cursorDate, false, { weekday: "short" })} · ${cursorDate.getDate()} ${cursorDate.toLocaleDateString("en-US", { month: "short" })}`;

  const toggleMeal = (id) =>
    setOpenMeals((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  // Workout slots stay out of the way unless the day (or the setting) calls for them.
  const withWorkout = showWorkoutMeals(view, day);
  const visibleMeals = useMemo(
    () => MEALS.filter((m) => !m.workout || withWorkout || mealEntries(day, m.id).length > 0),
    [withWorkout, day]
  );

  const gPerKg = proteinPerKg(totals.protein, profile.weight);
  const waterGlasses = Math.round((day.water || 0) / GLASS_ML);
  const waterTarget = Math.max(Math.round(targets.water / GLASS_ML), 1);
  const kcalLeft = targets.kcal - totals.kcal;
  const over = targets.kcal > 0 && kcalLeft < 0;

  const Prev = isRtl ? ChevronRight : ChevronLeft;
  const Next = isRtl ? ChevronLeft : ChevronRight;

  // The meal plan: the planned day for the date on screen.
  const plan = store.mealPlan;
  const planned = planDay(plan, cursor);
  const today = dayKey();
  // A week that has run out rolls on by itself, with the same settings.
  useEffect(() => {
    if (plan.week && weekOver(plan, today)) store.buildMealPlan();
  }, [plan, today, store]);
  const baseline = store.planTargets();
  const stale = !!planned && (Math.abs(planned.target.kcal - baseline.kcal) > baseline.kcal * 0.03
    || Math.abs(planned.target.protein - baseline.protein) > baseline.protein * 0.05);
  const swapItem = swapping && planDay(plan, swapping.date)?.meals[swapping.mealIndex];

  // The weekly check-in, once a week after starting.
  const review = useMemo(() => {
    if (!reviewDue({ reviews: profile.reviews || [], days: store.diary.days, plan, today })) return null;
    const active = training.activeProgram;
    return weeklyReview({
      profile, days: store.diary.days, plan: plan.week ? plan : null, sessions: training.sessions, today,
      plannedWorkouts: active ? active.days.filter((d) => d.type !== "rest" && d.exercises.length).length : 0,
    });
  }, [profile, store.diary.days, plan, today, training.activeProgram, training.sessions]);

  return (
    <Screen isRtl={isRtl} tabbed>
      <PageHead eyebrow={eyebrow} title={t.fuel}
        right={(
          <>
            <IconButton label={t.options} onClick={() => setSheet("menu")}>
              <SlidersHorizontal className="w-5 h-5" strokeWidth={2} />
            </IconButton>
            <button type="button" aria-label={t.logFood} title={t.logFood} onClick={() => setAddingTo(defaultMeal(visibleMeals))}
              className="w-11 h-11 shrink-0 rounded-full bg-jet text-accent flex items-center justify-center border-0 cursor-pointer transition-transform active:scale-95 dark:ring-1 dark:ring-inset dark:ring-line">
              <Plus className="w-[22px] h-[22px]" strokeWidth={2.2} />
            </button>
          </>
        )} />

      {/* ── Day navigation ─────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 h-12 rounded-full bg-card flex items-center justify-between px-0.5">
          <IconButton label={t.prevDay} tone="ghost" onClick={() => store.shiftDay(-1)}>
            <Prev className="w-5 h-5" strokeWidth={2} />
          </IconButton>
          <span aria-live="polite" className="min-w-0 truncate text-[15px] font-semibold text-ink">{label}</span>
          <IconButton label={t.nextDay} tone="ghost" onClick={() => store.shiftDay(1)}>
            <Next className="w-5 h-5" strokeWidth={2} />
          </IconButton>
        </div>
        {!isToday && (
          <Button tone="ink" aria-label={t.goToToday} onClick={() => store.goToDay(dayKey())}>{t.today}</Button>
        )}
      </div>

      {/* ── Calories + macros ──────────────────────────────────── */}
      {view.summary === "full" && (
        <section aria-label={t.calories} className="rounded-4xl bg-card text-ink p-5 flex flex-col gap-[18px]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className={cx("font-display font-extrabold text-[64px] leading-[0.85] tracking-[-0.05em]", over && "text-alert")}>
                {fmtNum(Math.abs(kcalLeft), isRtl)}
              </span>
              <span className="text-sm text-muted">
                {fill(over ? t.kcalOverOf : t.kcalLeftOf, { target: fmtNum(targets.kcal, isRtl) })}
              </span>
            </div>
            <CalorieRing eaten={totals.kcal} target={targets.kcal} t={t} isRtl={isRtl} />
          </div>
          <div className="flex flex-col gap-3">
            <MacroBar label={t.protein} eaten={totals.protein} target={targets.protein} color={MACRO_COLORS.protein} unit={t.grams} isRtl={isRtl} />
            <MacroBar label={t.carbs} eaten={totals.carbs} target={targets.carbs} color={MACRO_COLORS.carbs} unit={t.grams} isRtl={isRtl} />
            <MacroBar label={t.fat} eaten={totals.fat} target={targets.fat} color={MACRO_COLORS.fat} unit={t.grams} isRtl={isRtl} />
          </div>
          <div className="flex items-center justify-between gap-3 pt-3.5 border-t border-hair">
            <span className="min-w-0 truncate text-[13px] text-muted">
              {t.fiber} <span className="font-semibold text-ink">{fmtNum(totals.fiber, isRtl)}</span> / {fmtNum(targets.fiber, isRtl)} {t.grams}
              {sep}{t.protein} <span className="font-semibold text-ink">{n(gPerKg.toFixed(1))}</span> {t.perKg}
            </span>
            <button type="button" onClick={() => setSheet("targets")}
              className="h-11 -my-3 px-1 shrink-0 text-sm font-semibold text-ink underline underline-offset-[3px] bg-transparent border-0 cursor-pointer">
              {t.adjust}
            </button>
          </div>
        </section>
      )}

      {/* Compact keeps the number that makes a diary worth keeping. */}
      {view.summary === "compact" && (
        <section aria-label={t.calories} className="rounded-3xl bg-card text-ink p-4 flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="flex items-baseline gap-2 min-w-0">
              <span className={cx("font-display font-extrabold text-[28px] leading-none tracking-[-0.03em]", over && "text-alert")}>
                {fmtNum(Math.abs(kcalLeft), isRtl)}
              </span>
              <span className="text-[13px] text-muted truncate">{fill(over ? t.kcalOverOf : t.kcalLeftOf, { target: fmtNum(targets.kcal, isRtl) })}</span>
            </span>
            <button type="button" onClick={() => setSheet("targets")}
              className="h-11 -my-3 px-1 shrink-0 text-sm font-semibold text-ink underline underline-offset-[3px] bg-transparent border-0 cursor-pointer">
              {t.adjust}
            </button>
          </div>
          <Bar value={targets.kcal ? totals.kcal / targets.kcal : 0} height={8} color={over ? "bg-alert" : "bg-ink"} />
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-[13px]">
            {[["protein", t.protein], ["carbs", t.carbs], ["fat", t.fat]].map(([k, lbl]) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <MacroDot macro={k} />
                <span className="font-semibold">{lbl}</span>
                <span className="text-muted">{fmtNum(totals[k], isRtl)}/{fmtNum(targets[k], isRtl)}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ── Training vs rest day ───────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div role="group" aria-label={t.dayType} className="grid grid-cols-2 gap-2">
          {[
            { value: true, label: t.trainingDay, icon: Dumbbell },
            { value: false, label: t.restDay, icon: BedDouble },
          ].map((opt) => {
            const Icon = opt.icon;
            const on = day.trainingDay === opt.value;
            return (
              <button key={String(opt.value)} type="button" aria-pressed={on}
                onClick={() => store.setTrainingDay(on ? null : opt.value)}
                className={cx("h-11 rounded-full inline-flex items-center justify-center gap-2 text-sm font-semibold border-0 cursor-pointer transition-colors",
                  on ? "bg-inv text-on-inv" : "bg-card text-ink")}>
                <Icon className="w-4 h-4" strokeWidth={2} /> {opt.label}
              </button>
            );
          })}
        </div>
        <p className="m-0 text-center text-[13px] text-muted">{t.dayTypeHint}</p>
      </div>

      {/* ── Weekly check-in ─────────────────────────────────────── */}
      {review && isToday && !profile.customTargets && (
        <WeeklyReviewCard review={review} goal={profile.goal} isRtl={isRtl}
          onApply={(r) => store.applyReview(r)} onDismiss={(r) => store.dismissReview(r)} />
      )}

      {/* ── Meal plan ──────────────────────────────────────────── */}
      {(planned || (!plan.week && isToday)) && (
        <PlanTodayCard isRtl={isRtl} plan={plan} day={planned} stale={stale}
          onOpenSettings={() => setPlanSheet("settings")}
          onOpenWeek={() => setPlanSheet("week")}
          onOpenShop={() => setPlanSheet("shop")}
          onOpenLibrary={() => setPlanSheet("library")}
          onUpdate={() => store.buildMealPlan()}
          onMark={(date, mealIndex, status) => store.markPlannedMeal(date, mealIndex, status)}
          onSwap={(date, mealIndex, itemIndex) => setSwapping({ date, mealIndex, itemIndex })} />
      )}

      {/* ── Meals ──────────────────────────────────────────────── */}
      <h2 className="m-0 mt-2 font-display font-bold text-[22px] tracking-[-0.02em] text-ink">{t.meals}</h2>
      <ul aria-label={t.meals} className="m-0 p-0 py-1 list-none rounded-3xl bg-card divide-y divide-hair">
        {visibleMeals.map((meal) => (
          <MealRow key={meal.id} meal={meal} entries={mealEntries(day, meal.id)} open={openMeals.has(meal.id)}
            isRtl={isRtl} t={t} sep={sep}
            onToggle={() => toggleMeal(meal.id)}
            onAdd={() => setAddingTo(meal)}
            onSave={(entries) => setSavingMeal({ meal, entries })}
            onRemove={(id) => store.removeEntry(id)} />
        ))}
      </ul>

      {/* ── Coach card: adaptive TDEE ──────────────────────────── */}
      {view.coach && (
        <section aria-label={t.coach} className="rounded-3xl bg-coach text-on-accent p-4 flex flex-col gap-3.5">
          <div className="flex items-start gap-3">
            <IconWell tone="inv" size={36} className="!text-coach !ring-0"><SparkIcon size={18} /></IconWell>
            <p className="m-0 flex-1 min-w-0 text-sm leading-[1.4]">
              <span className="font-bold">{t.coach}: </span>
              {estimate ? fill(t.tdeeFrom, { days: n(estimate.daysOfData) }) : fill(t.tdeeNeedMore, { days: n(7) })}
            </p>
          </div>

          {estimate ? (
            <div className="grid grid-cols-3 gap-3">
              <Stat label={t.tdeeEstimate} value={fmtNum(estimate.tdee, isRtl)} sub={t.kcal} />
              <Stat label={t.weeklyChange}
                value={`${estimate.weeklyChangeKg > 0 ? "+" : ""}${n(estimate.weeklyChangeKg)}`}
                sub={`${t.kg}${sep}${estimate.weeklyChangeKg < 0 ? t.losing : estimate.weeklyChangeKg > 0 ? t.gaining : t.holding}`} />
              <Stat label={t.maintenance} value={fmtNum(targets.maintenance, isRtl)} sub={t[targets.source] || targets.source} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Stat label={t.maintenance} value={fmtNum(targets.maintenance, isRtl)} sub={t[targets.source] || targets.source} />
              <Stat label={t.target} value={fmtNum(targets.kcal, isRtl)} sub={t.kcal} />
            </div>
          )}

          {estimate && !profile.useAdaptive && (
            <button type="button" onClick={() => store.useAdaptiveTdee(true)}
              className="h-11 rounded-full bg-jet text-coach text-sm font-bold border-0 cursor-pointer active:scale-[0.98] transition-transform">
              {t.applyTdee}
            </button>
          )}

          {trend.length >= 2 && (
            <div className="pt-3 border-t border-on-accent/15 flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-semibold">{t.trend}</span>
                <span className="text-sm font-bold">{n(trend[trend.length - 1].trend.toFixed(1))} {t.kg}</span>
              </div>
              <TrendSpark points={trend} color="rgb(var(--ui-on-accent))" />
            </div>
          )}
        </section>
      )}

      {/* ── Water ──────────────────────────────────────────────── */}
      {view.water && (
        <section aria-labelledby="fuel-water" className="rounded-3xl bg-card text-ink p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center gap-3">
            <h2 id="fuel-water" className="m-0 text-base font-bold">{t.water}</h2>
            <span className="text-sm text-muted">
              <span className="font-bold text-ink">{litres(day.water || 0, isRtl)}</span> / {litres(targets.water, isRtl)} {t.litres}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: waterTarget }).map((_, i) => (
              <button key={i} type="button" aria-pressed={i < waterGlasses}
                aria-label={fill(t.glassesN, { n: n(i + 1) })}
                // Tapping the top filled glass empties it; any other sets the count.
                onClick={() => store.setWater((i + 1 === waterGlasses ? i : i + 1) * GLASS_ML)}
                className={cx("flex-1 min-w-0 h-9 rounded-xl border-0 p-0 cursor-pointer transition-colors",
                  i < waterGlasses ? "bg-ink" : "bg-line")} />
            ))}
            <IconButton label={t.addGlass} tone="soft" className="ms-1" onClick={() => store.setWater((day.water || 0) + GLASS_ML)}>
              <Plus className="w-5 h-5" strokeWidth={2.2} />
            </IconButton>
          </div>
        </section>
      )}

      {/* ── Saved meals ────────────────────────────────────────── */}
      {view.savedMeals && store.diary.savedMeals.length > 0 && (
        <>
          <h2 className="m-0 mt-2 font-display font-bold text-[22px] tracking-[-0.02em] text-ink">{t.savedMeals}</h2>
          <List>
            {store.diary.savedMeals.map((saved) => {
              const preview = sumMacros(saved.items.map((i) => ({ ...i, id: "x", meal: "x" })));
              return (
                <li key={saved.id} className="list-none min-h-[64px] flex items-center gap-2 ps-4 pe-1.5 py-2.5">
                  <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="text-[15px] font-semibold text-ink truncate">{saved.name}</span>
                    <span className="text-xs text-muted line-clamp-2">
                      {fmtNum(preview.kcal, isRtl)} {t.kcal}{sep}{macroLine(preview, isRtl, t)}{sep}{fill(saved.items.length === 1 ? t.item : t.items, { n: n(saved.items.length) })}
                    </span>
                  </span>
                  <span className="relative shrink-0">
                    <select
                      aria-label={t.repeat}
                      value=""
                      onChange={(e) => { if (e.target.value) store.logSavedMeal(saved.id, e.target.value); e.target.value = ""; }}
                      className="h-11 ps-4 pe-9 rounded-full bg-inv text-on-inv text-[13px] font-semibold border-0 appearance-none cursor-pointer outline-none"
                    >
                      <option value="">{t.repeat}</option>
                      {MEALS.map((m) => (
                        <option key={m.id} value={m.id}>{isRtl ? m.fa : m.en}</option>
                      ))}
                    </select>
                    <ChevronDown aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-inv" strokeWidth={2.2} />
                  </span>
                  <IconButton label={`${t.delete} ${saved.name}`} tone="ghost" onClick={() => store.removeSavedMeal(saved.id)}>
                    <Trash2 className="w-[18px] h-[18px] text-muted" strokeWidth={2} />
                  </IconButton>
                </li>
              );
            })}
          </List>
        </>
      )}

      {/* ── Recipe & guide shortcuts ───────────────────────────── */}
      {view.shortcuts && (
        <List className="mt-1">
          <Row isRtl={isRtl} chevron onClick={onGoToRecipe} title={t.recipes} subtitle={t.recipesHint}
            icon={<IconWell tone="sand" square size={40}><Utensils className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>} />
          <Row isRtl={isRtl} chevron onClick={onGoToGuide} title={t.guide} subtitle={t.guideHint}
            icon={<IconWell tone="sage" square size={40}><BookOpen className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>} />
        </List>
      )}

      <div className="flex flex-col items-center gap-1 pt-1 text-xs text-muted text-center">
        {/* Sodium is worth watching but doesn't deserve a bar of its own. */}
        {totals.sodium > 0 && <span>{t.sodium} {fmtNum(totals.sodium, isRtl)} {t.mg}</span>}
        <span className="inline-flex items-center gap-1.5"><Info className="w-3.5 h-3.5" strokeWidth={2} /> {backendOn && loadSession().userId ? t.syncedNote : t.localOnly}</span>
      </div>

      {/* ── Sheets ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {addingTo && (
          <FoodSearchSheet
            mealId={addingTo} isRtl={isRtl} t={t} recentIds={store.diary.recentFoodIds} kcalLeft={round(kcalLeft)}
            onRemember={store.rememberFood}
            onPick={(food, grams) => {
              store.addEntry({ foodId: food.id, grams, meal: addingTo.id });
              setOpenMeals((s) => new Set(s).add(addingTo.id));
              setAddingTo(null);
            }}
            onQuickAdd={() => { setQuickAddTo(addingTo); setAddingTo(null); }}
            onClose={() => setAddingTo(null)}
          />
        )}
      </AnimatePresence>

      {quickAddTo && (
        <QuickAddSheet isRtl={isRtl} t={t}
          onSave={(custom) => {
            store.addEntry({ custom, grams: 0, meal: quickAddTo.id });
            setOpenMeals((s) => new Set(s).add(quickAddTo.id));
            setQuickAddTo(null);
          }}
          onClose={() => setQuickAddTo(null)} />
      )}

      {savingMeal && (
        <SaveMealSheet meal={savingMeal} isRtl={isRtl} t={t}
          onSave={(name) => { store.saveMeal(name, savingMeal.entries); setSavingMeal(null); }}
          onClose={() => setSavingMeal(null)} />
      )}

      {sheet === "menu" && (
        <Sheet title={t.options} isRtl={isRtl} t={t} onClose={() => setSheet(null)}>
          <List>
            <Row isRtl={isRtl} chevron onClick={() => setSheet("targets")}
              icon={<IconWell size={40}><SlidersHorizontal className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>}
              title={t.editTargets} right={`${fmtNum(targets.kcal, isRtl)} ${t.kcal}`} />
            <Row isRtl={isRtl} chevron onClick={() => setSheet("weight")}
              icon={<IconWell size={40}><Scale className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>}
              title={t.logWeight}
              right={(day.weight ?? profile.weight) ? `${n(day.weight ?? profile.weight)} ${t.kg}` : null} />
            <Row isRtl={isRtl} chevron onClick={() => setSheet("view")}
              icon={<IconWell size={40}><Eye className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>}
              title={t.customize} />
            <Row isRtl={isRtl} chevron onClick={() => setSheet("share")}
              icon={<IconWell size={40}><Share2 className="w-[18px] h-[18px]" strokeWidth={2} /></IconWell>}
              title={tt.sharePlan} />
          </List>
        </Sheet>
      )}

      {sheet === "weight" && (
        <WeightSheet current={day.weight ?? profile.weight} trend={trend} isRtl={isRtl} t={t}
          onSave={(kg) => { store.setWeight(kg); setSheet(null); }}
          onClose={() => setSheet(null)} />
      )}

      <AnimatePresence>
        {planSheet === "settings" && (
          <PlanSettingsSheet isRtl={isRtl} settings={plan.settings}
            onApply={(settings) => { store.buildMealPlan(settings); setPlanSheet(null); }}
            onClose={() => setPlanSheet(null)} />
        )}
        {planSheet === "week" && (
          <WeekSheet isRtl={isRtl} plan={plan} today={today}
            onSwap={(date, mealIndex, itemIndex) => setSwapping({ date, mealIndex, itemIndex })}
            onRebuild={() => store.buildMealPlan()}
            onOpenSettings={() => setPlanSheet("settings")}
            onRemoveRule={store.removeMealPlanRule}
            onClose={() => setPlanSheet(null)} />
        )}
        {planSheet === "shop" && <ShoppingSheet isRtl={isRtl} plan={plan} today={today} onClose={() => setPlanSheet(null)} />}
        {planSheet === "library" && (
          <MealLibrarySheet isRtl={isRtl} profile={profile} plan={plan}
            onUse={(preset) => { store.applyMealPreset(preset); setPlanSheet(null); }}
            onClose={() => setPlanSheet(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {swapItem && (
          <SwapSheet isRtl={isRtl} profile={profile} settings={plan.settings}
            onOpenRecipe={onGoToRecipe ? (id) => { setSwapping(null); onGoToRecipe(id); } : undefined}
            item={swapItem.items[swapping.itemIndex]} slot={swapItem.id[0]}
            onPick={(option, scope) => {
              store.swapPlannedFood({ ...swapping, foodId: option.foodId, grams: option.grams, scope });
              setSwapping(null);
            }}
            onClose={() => setSwapping(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sheet === "share" && (
          <ShareSheet
            title={tt.sharePlan} isRtl={isRtl} t={tt}
            payload={compactMealPlan({
              name: isRtl ? "برنامه غذایی" : "Nutrition plan",
              author: { name: loadSession().name || "Isaac", role: training.coachMode ? "coach" : "user" },
              targets, meals: store.diary.savedMeals, notes: "",
            })}
            coachMode={training.coachMode} onToggleCoach={training.setCoachMode}
            onClose={() => setSheet(null)} />
        )}
      </AnimatePresence>

      {sheet === "view" && (
        <ViewSheet view={view} isRtl={isRtl} t={t}
          onChange={(patch) => store.updateView(patch)}
          onReset={() => { store.resetView(); setSheet(null); }}
          onClose={() => setSheet(null)} />
      )}

      {sheet === "targets" && (
        <TargetsSheet profile={profile} targets={targets} isRtl={isRtl} t={t}
          onSave={(next) => { store.updateProfile(next); setSheet(null); }}
          onClose={() => setSheet(null)} />
      )}
    </Screen>
  );
}

/**
 * One meal in the list: an icon well, the name, what's in it and its
 * calories. An empty meal logs straight away; a full one opens its items.
 */
function MealRow({ meal, entries, open, isRtl, t, sep, onToggle, onAdd, onSave, onRemove }) {
  const Icon = MEAL_ICONS[meal.id] || Utensils;
  const name = isRtl ? meal.fa : meal.en;
  const empty = entries.length === 0;
  const totals = sumMacros(entries);
  const summary = entries
    .map((e) => (e.foodId ? `${entryName(e, isRtl)} ${num(round(e.grams), isRtl)} ${t.grams}` : entryName(e, isRtl)))
    .join(sep);

  return (
    <li className="list-none">
      <button type="button" onClick={empty ? onAdd : onToggle}
        aria-expanded={empty ? undefined : open}
        aria-label={empty ? `${t.addTo} ${name}` : undefined}
        className="w-full flex items-center gap-3 px-4 py-3 text-start bg-transparent border-0 cursor-pointer text-ink">
        <span className={cx("w-11 h-11 shrink-0 rounded-[14px] flex items-center justify-center",
          empty ? "border-[1.5px] border-dashed border-faint text-muted" : "bg-sunk text-ink")}>
          <Icon className="w-5 h-5" strokeWidth={1.9} />
        </span>
        <span className="flex-1 min-w-0 flex flex-col gap-[3px]">
          <span className="text-base font-bold leading-snug">{name}</span>
          <span className="text-[13px] text-muted truncate">{empty ? t.emptyMeal : summary}</span>
        </span>
        {empty ? (
          <span aria-hidden="true" className="h-[34px] px-3 shrink-0 rounded-full bg-jet text-accent inline-flex items-center gap-1 text-[13px] font-bold dark:ring-1 dark:ring-inset dark:ring-line">
            <Plus className="w-3.5 h-3.5" strokeWidth={2.6} />{t.add}
          </span>
        ) : (
          <>
            <span className="text-[15px] font-semibold shrink-0">{fmtNum(totals.kcal, isRtl)}</span>
            <ChevronDown aria-hidden="true" className={cx("w-4 h-4 shrink-0 text-muted transition-transform", open && "rotate-180")} strokeWidth={2} />
          </>
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && !empty && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }} className="overflow-hidden">
            <div className="ms-[72px] me-2 pb-2 flex flex-col">
              <span className="text-xs text-muted pb-1">{fmtNum(totals.kcal, isRtl)} {t.kcal}{sep}{macroLine(totals, isRtl, t)}</span>
              {entries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} isRtl={isRtl} t={t} sep={sep} onRemove={() => onRemove(entry.id)} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 px-4 pb-3.5">
              <Button tone="soft" size="sm" className="!h-11 !px-3" onClick={onAdd} aria-label={`${t.addTo} ${name}`}
                icon={<Plus className="w-4 h-4 shrink-0" strokeWidth={2.4} />}><span className="truncate">{t.addFood}</span></Button>
              <Button tone="soft" size="sm" className="!h-11 !px-3" onClick={() => onSave(entries)} aria-label={`${t.saveMeal}: ${name}`}
                icon={<Star className="w-4 h-4 shrink-0" strokeWidth={2} />}><span className="truncate">{t.saveShort}</span></Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function EntryRow({ entry, isRtl, t, sep, onRemove }) {
  const m = entryMacros(entry);
  const name = entryName(entry, isRtl);

  return (
    <div className="flex items-center gap-2 min-h-[52px] border-t border-hair">
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-ink truncate">{name}</span>
        <span className="text-xs text-muted truncate">
          {entry.foodId ? `${num(round(entry.grams), isRtl)} ${t.grams}${sep}` : ""}{macroLine(m, isRtl, t)}
        </span>
      </span>
      <span className="text-sm font-semibold text-ink shrink-0">{fmtNum(m.kcal, isRtl)}</span>
      <IconButton label={`${t.removeEntry} ${name}`} tone="ghost" onClick={onRemove}>
        <Trash2 className="w-[18px] h-[18px] text-muted" strokeWidth={2} />
      </IconButton>
    </div>
  );
}

function SaveMealSheet({ meal, isRtl, t, onSave, onClose }) {
  const [name, setName] = useState(isRtl ? meal.meal.fa : meal.meal.en);
  const totals = sumMacros(meal.entries);

  return (
    <Sheet title={t.saveMeal} isRtl={isRtl} t={t} onClose={onClose}
      footer={
        <>
          <Button tone="card" size="lg" className="flex-1" onClick={onClose}>{t.cancel}</Button>
          <Button tone="ink" size="lg" className="flex-1" onClick={() => onSave(name.trim())} disabled={!name.trim()}>{t.save}</Button>
        </>
      }>
      <p className="m-0 text-sm text-muted">{t.saveMealHint}</p>
      <Field inputClass="!outline-none" label={t.mealName} autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      <Card pad={false} className="px-4 py-1">
        {meal.entries.map((e) => (
          <div key={e.id} className="min-h-[44px] flex items-center justify-between gap-3 border-b border-hair">
            <span className="text-sm text-ink truncate">{entryName(e, isRtl)}</span>
            <span className="text-sm text-muted shrink-0">{fmtNum(entryMacros(e).kcal, isRtl)}</span>
          </div>
        ))}
        <div className="min-h-[48px] flex items-center justify-between gap-3">
          <Label>{t.calories}</Label>
          <span className="text-[17px] font-bold text-ink">{fmtNum(totals.kcal, isRtl)}</span>
        </div>
      </Card>
    </Sheet>
  );
}
