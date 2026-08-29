import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Droplets, Dumbbell, Flame, Info, Plus,
  Scale, SlidersHorizontal, Sparkles, Star, Trash2, TrendingUp, Utensils,
} from "lucide-react";
import { MEALS, dayKey, entryMacros, mealEntries, sumMacros } from "../../lib/nutrition/diaryStore";
import { findFood } from "../../lib/nutrition/foods";
import { proteinPerKg } from "../../lib/nutrition/profile";
import { fill, useNutritionT } from "../../lib/nutrition/nutritionI18n";
import { useNutritionStore } from "../../lib/nutrition/nutritionContext";
import { CalorieRing, MACRO_COLORS, MacroBar, Stat, TrendSpark, round } from "../../components/diet/DietBits";
import FoodSearchSheet from "../../components/diet/FoodSearchSheet";
import { QuickAddSheet, Sheet, TargetsSheet, WeightSheet } from "../../components/diet/SmallSheets";

const GLASS_ML = 250;

export default function DietPage({ isRtl, onGoToRecipe, onGoToGuide }) {
  const t = useNutritionT(isRtl);
  const store = useNutritionStore();
  const { day, totals, targets, profile, estimate, trend, cursor } = store;

  const [addingTo, setAddingTo] = useState(null); // meal object
  const [quickAddTo, setQuickAddTo] = useState(null);
  const [sheet, setSheet] = useState(null); // "weight" | "targets"
  const [savingMeal, setSavingMeal] = useState(null);
  const [openMeals, setOpenMeals] = useState(() => new Set(MEALS.map((m) => m.id)));

  const label = useMemo(() => {
    if (cursor === dayKey()) return t.today;
    if (cursor === dayKey(new Date(Date.now() - 86400000))) return t.yesterday;
    if (cursor === dayKey(new Date(Date.now() + 86400000))) return t.tomorrow;
    return new Date(`${cursor}T00:00:00`)
      .toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  }, [cursor, t]);

  const toggleMeal = (id) =>
    setOpenMeals((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const gPerKg = proteinPerKg(totals.protein, profile.weight);
  const waterGlasses = Math.round((day.water || 0) / GLASS_ML);
  const waterTarget = Math.max(Math.round(targets.water / GLASS_ML), 1);

  return (
    <div className="w-full min-h-[100dvh] bg-black text-white pb-28">

      {/* ── Day header ─────────────────────────────────────────── */}
      <div className="px-4 pt-6 pb-5 space-y-4"
        style={{ background: "linear-gradient(180deg, rgba(132,71,131,0.16) 0%, rgba(0,0,0,0) 100%)" }}>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => store.shiftDay(-1)} aria-label={t.yesterday}
              className="w-9 h-9 rounded-xl bg-[#141416] border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-all">
              <ChevronLeft className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
            </button>
            <div className="px-2 min-w-0">
              <span className="block text-[10px] font-black text-[#844783] uppercase tracking-wider">{t.eyebrow}</span>
              <span className="block text-lg font-black text-white truncate leading-tight">{label}</span>
            </div>
            <button type="button" onClick={() => store.shiftDay(1)} aria-label={t.tomorrow}
              className="w-9 h-9 rounded-xl bg-[#141416] border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-all">
              <ChevronRight className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button type="button" onClick={() => setSheet("weight")} aria-label={t.logWeight}
              className="w-9 h-9 rounded-xl bg-[#141416] border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-all">
              <Scale className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setSheet("targets")} aria-label={t.editTargets}
              className="w-9 h-9 rounded-xl bg-[#141416] border border-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-all">
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Calories + macros */}
        <div className="p-4 rounded-3xl bg-[#141416]/80 border border-white/10 backdrop-blur flex items-center gap-4">
          <CalorieRing eaten={totals.kcal} target={targets.kcal} t={t} />
          <div className="flex-1 min-w-0 space-y-2.5">
            <MacroBar label={t.protein} eaten={totals.protein} target={targets.protein} color={MACRO_COLORS.protein}
              sub={`${gPerKg.toFixed(1)} ${t.perKg}`} />
            <MacroBar label={t.carbs} eaten={totals.carbs} target={targets.carbs} color={MACRO_COLORS.carbs} />
            <MacroBar label={t.fat} eaten={totals.fat} target={targets.fat} color={MACRO_COLORS.fat} />
            <MacroBar label={t.fiber} eaten={totals.fiber} target={targets.fiber} color={MACRO_COLORS.fiber} />
          </div>
        </div>

        {/* Training vs rest day */}
        <div className="flex items-center gap-2">
          {[
            { value: true, label: t.trainingDay, icon: Dumbbell },
            { value: false, label: t.restDay, icon: Sparkles },
          ].map((opt) => {
            const Icon = opt.icon;
            const on = day.trainingDay === opt.value;
            return (
              <button key={String(opt.value)} type="button"
                onClick={() => store.setTrainingDay(on ? null : opt.value)}
                className={`flex-1 h-10 rounded-2xl border text-[11px] font-black flex items-center justify-center gap-1.5 transition-all ${
                  on ? "bg-[#844783]/20 border-[#844783]/60 text-white" : "bg-[#141416] border-white/10 text-neutral-500 hover:border-white/20"
                }`}>
                <Icon className="w-3.5 h-3.5" /> {opt.label}
              </button>
            );
          })}
        </div>

        <p className="text-[9px] font-medium text-neutral-600 text-center">{t.dayTypeHint}</p>
      </div>

      <div className="px-4 space-y-3">

        {/* ── Coach card: adaptive TDEE ───────────────────────── */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-[#844783]/20 to-transparent border border-[#844783]/30 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#c07dbf]" />
            <span className="text-[10px] font-black text-[#c07dbf] uppercase tracking-wider">{t.coach}</span>
          </div>

          {estimate ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Stat label={t.tdeeEstimate} value={`${estimate.tdee}`} sub={t.kcal} />
                <Stat label={t.weeklyChange} tone={estimate.weeklyChangeKg < 0 ? "text-emerald-400" : estimate.weeklyChangeKg > 0 ? "text-amber-400" : "text-white"}
                  value={`${estimate.weeklyChangeKg > 0 ? "+" : ""}${estimate.weeklyChangeKg} kg`}
                  sub={estimate.weeklyChangeKg < 0 ? t.losing : estimate.weeklyChangeKg > 0 ? t.gaining : t.holding} />
                <Stat label={t.maintenance} value={`${targets.maintenance}`} sub={t[targets.source] || targets.source} />
              </div>
              <p className="text-[9px] font-medium text-neutral-500">
                {fill(t.tdeeFrom, { days: estimate.daysOfData })}
              </p>
              {!profile.useAdaptive && (
                <button type="button" onClick={() => store.useAdaptiveTdee(true)}
                  className="w-full h-10 rounded-2xl bg-[#844783] text-white font-black text-[11px] hover:brightness-110 transition-all">
                  {t.applyTdee}
                </button>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Stat label={t.maintenance} value={`${targets.maintenance}`} sub={t[targets.source] || targets.source} />
                <Stat label={t.target} value={`${targets.kcal}`} sub={t.kcal} />
              </div>
              <p className="text-[9px] font-medium text-neutral-500">{fill(t.tdeeNeedMore, { days: 7 })}</p>
            </>
          )}

          {trend.length >= 2 && (
            <div className="pt-2 border-t border-white/10">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[9px] font-black text-neutral-500 uppercase tracking-wider">{t.trend}</span>
                <span className="text-xs font-black text-white tabular-nums" dir="ltr">
                  {trend[trend.length - 1].trend.toFixed(1)} kg
                </span>
              </div>
              <TrendSpark points={trend} color="#c07dbf" />
            </div>
          )}
        </div>

        {/* ── Water ───────────────────────────────────────────── */}
        <div className="p-4 rounded-3xl bg-[#141416] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10px] font-black text-cyan-400 uppercase tracking-wider">
              <Droplets className="w-3.5 h-3.5" /> {t.water}
            </span>
            <span className="text-[10px] font-black text-neutral-400 tabular-nums" dir="ltr">
              {waterGlasses} / {waterTarget} {t.glasses}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: waterTarget }).map((_, i) => (
              <button key={i} type="button"
                onClick={() => store.setWater((i + 1) * GLASS_ML)}
                aria-label={`${i + 1}`}
                className={`w-7 h-9 rounded-lg border transition-all ${
                  i < waterGlasses ? "bg-cyan-500/30 border-cyan-400/60" : "bg-white/[0.04] border-white/10 hover:border-white/25"
                }`} />
            ))}
            <button type="button" onClick={() => store.setWater((day.water || 0) + GLASS_ML)}
              className="w-7 h-9 rounded-lg border border-dashed border-white/15 flex items-center justify-center text-neutral-600 hover:text-white transition-all"
              aria-label={t.addGlass}>
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* ── Meals ───────────────────────────────────────────── */}
        {MEALS.map((meal) => {
          const entries = mealEntries(day, meal.id);
          const mealTotals = sumMacros(entries);
          const open = openMeals.has(meal.id);

          return (
            <div key={meal.id} className="rounded-3xl bg-[#141416] border border-white/10 overflow-hidden">
              <div className="p-4 flex items-center gap-3">
                <button type="button" onClick={() => toggleMeal(meal.id)} className="flex items-center gap-3 flex-1 min-w-0 text-start">
                  <span className="text-xl shrink-0">{meal.emoji}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-white truncate">{isRtl ? meal.fa : meal.en}</span>
                    <span className="block text-[10px] font-bold text-neutral-500 tabular-nums" dir="ltr">
                      {round(mealTotals.kcal)} kcal · P{round(mealTotals.protein)} C{round(mealTotals.carbs)} F{round(mealTotals.fat)}
                    </span>
                  </span>
                </button>
                {entries.length > 0 && (
                  <button type="button" onClick={() => setSavingMeal({ meal, entries })} aria-label={t.saveMeal}
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-500 hover:text-amber-400 transition-all shrink-0">
                    <Star className="w-4 h-4" />
                  </button>
                )}
                <button type="button" onClick={() => setAddingTo(meal)} aria-label={`${t.addTo} ${isRtl ? meal.fa : meal.en}`}
                  className="w-9 h-9 rounded-xl bg-[#844783]/20 border border-[#844783]/40 flex items-center justify-center text-[#c07dbf] hover:bg-[#844783]/30 transition-all shrink-0">
                  <Plus className="w-4 h-4 stroke-[3]" />
                </button>
              </div>

              <AnimatePresence initial={false}>
                {open && entries.length > 0 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    <div className="px-4 pb-3 space-y-1.5">
                      {entries.map((entry) => (
                        <EntryRow key={entry.id} entry={entry} isRtl={isRtl} t={t}
                          onRemove={() => store.removeEntry(entry.id)} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {open && entries.length === 0 && (
                <p className="px-4 pb-4 text-[10px] font-bold text-neutral-600">{t.emptyMeal}</p>
              )}
            </div>
          );
        })}

        {/* Sodium is worth watching but doesn't deserve a bar of its own. */}
        {totals.sodium > 0 && (
          <p className="text-center text-[9px] font-bold text-neutral-600 pt-1" dir="ltr">
            {t.sodium} {round(totals.sodium)} mg
          </p>
        )}

        {store.diary.savedMeals.length > 0 && (
          <div className="space-y-2 pt-2">
            <h3 className="flex items-center gap-1.5 text-[10px] font-black text-neutral-500 uppercase tracking-wider px-1">
              <Star className="w-3 h-3" /> {t.savedMeals}
            </h3>
            {store.diary.savedMeals.map((saved) => {
              const preview = sumMacros(saved.items.map((i) => ({ ...i, id: "x", meal: "x" })));
              return (
                <div key={saved.id} className="p-3 rounded-2xl bg-[#141416] border border-white/10 flex items-center gap-2.5">
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-black text-white truncate">{saved.name}</span>
                    <span className="block text-[9px] font-bold text-neutral-500 tabular-nums" dir="ltr">
                      {round(preview.kcal)} kcal · P{round(preview.protein)} C{round(preview.carbs)} F{round(preview.fat)} · {saved.items.length}
                    </span>
                  </span>
                  <select
                    aria-label={t.repeat}
                    value=""
                    onChange={(e) => { if (e.target.value) store.logSavedMeal(saved.id, e.target.value); e.target.value = ""; }}
                    className="h-8 px-2 rounded-lg bg-[#844783]/20 border border-[#844783]/40 text-[10px] font-black text-[#c07dbf] focus:outline-none shrink-0"
                  >
                    <option value="">{t.repeat}</option>
                    {MEALS.map((m) => (
                      <option key={m.id} value={m.id}>{isRtl ? m.fa : m.en}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => store.removeSavedMeal(saved.id)} aria-label={t.delete}
                    className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-neutral-600 hover:text-rose-400 transition-all shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button type="button" onClick={onGoToRecipe}
            className="p-4 rounded-2xl bg-[#141416] border border-white/10 flex items-center gap-2.5 hover:border-[#844783]/50 transition-all">
            <Utensils className="w-5 h-5 text-[#844783]" />
            <span className="text-xs font-black text-white">{isRtl ? "دستور غذاها" : "Recipes"}</span>
          </button>
          <button type="button" onClick={onGoToGuide}
            className="p-4 rounded-2xl bg-[#141416] border border-white/10 flex items-center gap-2.5 hover:border-amber-400/50 transition-all">
            <Flame className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-black text-white">{isRtl ? "راهنمای تغذیه" : "Guide"}</span>
          </button>
        </div>

        <p className="flex items-center justify-center gap-1.5 pt-1 text-[9px] font-bold text-neutral-700">
          <Info className="w-3 h-3" /> {t.localOnly}
        </p>
      </div>

      {/* ── Sheets ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {addingTo && (
          <FoodSearchSheet
            mealId={addingTo} isRtl={isRtl} t={t} recentIds={store.diary.recentFoodIds}
            onPick={(food, grams) => {
              store.addEntry({ foodId: food.id, grams, meal: addingTo.id });
              setAddingTo(null);
            }}
            onQuickAdd={() => { setQuickAddTo(addingTo); setAddingTo(null); }}
            onClose={() => setAddingTo(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {quickAddTo && (
          <QuickAddSheet isRtl={isRtl} t={t}
            onSave={(custom) => { store.addEntry({ custom, grams: 0, meal: quickAddTo.id }); setQuickAddTo(null); }}
            onClose={() => setQuickAddTo(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {savingMeal && (
          <SaveMealSheet meal={savingMeal} isRtl={isRtl} t={t}
            onSave={(name) => { store.saveMeal(name, savingMeal.entries); setSavingMeal(null); }}
            onClose={() => setSavingMeal(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sheet === "weight" && (
          <WeightSheet current={day.weight ?? profile.weight} trend={trend} isRtl={isRtl} t={t}
            onSave={(kg) => { store.setWeight(kg); setSheet(null); }}
            onClose={() => setSheet(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sheet === "targets" && (
          <TargetsSheet profile={profile} targets={targets} isRtl={isRtl} t={t}
            onSave={(next) => { store.updateProfile(next); setSheet(null); }}
            onClose={() => setSheet(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function EntryRow({ entry, isRtl, t, onRemove }) {
  const m = entryMacros(entry);
  const food = entry.foodId ? findFood(entry.foodId) : null;
  const name = entry.custom?.name || (food ? (isRtl ? food.nameFa : food.nameEn) : "—");

  return (
    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
      <span className="flex-1 min-w-0">
        <span className="block text-[11px] font-black text-white truncate">{name}</span>
        <span className="block text-[9px] font-bold text-neutral-500 tabular-nums" dir="ltr">
          {entry.foodId ? `${round(entry.grams)}g · ` : ""}P{round(m.protein)} C{round(m.carbs)} F{round(m.fat)}
        </span>
      </span>
      <span className="text-[11px] font-black text-white tabular-nums shrink-0">{round(m.kcal)}</span>
      <button type="button" onClick={onRemove} aria-label={t.removeEntry}
        className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-neutral-600 hover:text-rose-400 transition-all shrink-0">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
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
          <button type="button" onClick={onClose} className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/10 text-neutral-300 font-black text-sm">{t.cancel}</button>
          <button type="button" onClick={() => onSave(name.trim())} disabled={!name.trim()}
            className="flex-1 h-12 rounded-2xl bg-[#844783] text-white font-black text-sm disabled:opacity-40">{t.save}</button>
        </>
      }>
      <p className="text-[10px] font-medium text-neutral-500">{t.saveMealHint}</p>
      <div>
        <span className="block text-[10px] font-black text-neutral-500 uppercase tracking-wider mb-1.5">{t.mealName}</span>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
          className="w-full h-11 px-3 rounded-2xl bg-[#141416] border border-white/10 text-sm font-bold text-white focus:outline-none focus:border-white/30" />
      </div>
      <div className="p-3 rounded-2xl bg-[#141416] border border-white/10 space-y-1.5">
        {meal.entries.map((e) => {
          const food = e.foodId ? findFood(e.foodId) : null;
          return (
            <div key={e.id} className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-neutral-300 truncate">
                {e.custom?.name || (food ? (isRtl ? food.nameFa : food.nameEn) : "—")}
              </span>
              <span className="text-[10px] font-black text-neutral-500 tabular-nums shrink-0">{round(entryMacros(e).kcal)}</span>
            </div>
          );
        })}
        <div className="pt-1.5 border-t border-white/10 flex items-center justify-between">
          <span className="text-[10px] font-black text-neutral-500 uppercase">{t.calories}</span>
          <span className="text-sm font-black text-white tabular-nums">{round(totals.kcal)}</span>
        </div>
      </div>
    </Sheet>
  );
}
