import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createEntry, dayKey, emptyDay, estimateTdee, loadDiary, saveDiary,
  totalsFor, weightTrend,
} from "../lib/nutrition/diaryStore";
import { loadProfile, saveProfile, targetsFor, tdee } from "../lib/nutrition/profile";
import { DEFAULT_VIEW, loadView, saveView } from "../lib/nutrition/viewPrefs";
import { registerFoods } from "../lib/nutrition/foods";
import { buildWeek, loadMealPlan, saveMealPlan } from "../lib/nutrition/mealPlanStore";
import { applySwap } from "../lib/nutrition/planEngine";

const RECENT_LIMIT = 12;

/** Owns the diary and the athlete profile, and keeps both in localStorage. */
export default function useNutrition() {
  const [diary, setDiary] = useState(loadDiary);
  const [profile, setProfile] = useState(loadProfile);
  const [cursor, setCursor] = useState(() => dayKey());
  const [view, setView] = useState(loadView);
  const [mealPlan, setMealPlan] = useState(loadMealPlan);
  const firstPlan = useRef(true);
  const firstDiary = useRef(true);
  const firstProfile = useRef(true);

  useEffect(() => {
    if (firstDiary.current) { firstDiary.current = false; return; }
    saveDiary(diary);
  }, [diary]);

  useEffect(() => {
    if (firstProfile.current) { firstProfile.current = false; return; }
    saveProfile(profile);
  }, [profile]);

  useEffect(() => { saveView(view); }, [view]);

  useEffect(() => {
    if (firstPlan.current) { firstPlan.current = false; return; }
    saveMealPlan(mealPlan);
  }, [mealPlan]);

  const day = diary.days[cursor] || emptyDay();

  const patchDay = useCallback((key, fn) => {
    setDiary((s) => {
      const current = s.days[key] || emptyDay();
      return { ...s, days: { ...s.days, [key]: fn(current) } };
    });
  }, []);

  const estimate = useMemo(() => estimateTdee(diary.days), [diary.days]);
  const trend = useMemo(() => weightTrend(diary.days), [diary.days]);

  const targets = useMemo(
    () => targetsFor(profile, {
      trainingDay: day.trainingDay,
      estimatedTdee: profile.useAdaptive ? estimate?.tdee ?? null : null,
    }),
    [profile, day.trainingDay, estimate]
  );

  const totals = useMemo(() => totalsFor(day), [day]);

  // The plan is built on the day's baseline targets (the adaptive estimate when it's on).
  const planTargets = useCallback(() => targetsFor(profile, {
    estimatedTdee: profile.useAdaptive ? estimate?.tdee ?? null : null,
  }), [profile, estimate]);

  const planApi = useMemo(() => ({
    /** A new week from `start` (today), with the settings as they are after `patch`. */
    buildMealPlan: (patch = {}, start = dayKey()) => {
      setMealPlan((plan) => {
        const next = { ...plan, settings: { ...plan.settings, ...patch } };
        const t = planTargets();
        return { ...next, week: buildWeek({ plan: next, profile, targetFor: () => t, start }) };
      });
    },
    updateMealPlanSettings: (patch) => setMealPlan((plan) => ({ ...plan, settings: { ...plan.settings, ...patch } })),
    clearMealPlan: () => setMealPlan((plan) => ({ ...plan, week: null })),

    /**
     * One planned food swapped. scope "once" changes that meal, "week" every
     * day of the week still ahead that has it, "always" also adds a rule the
     * next weeks keep. Each changed day is re-balanced to its targets.
     */
    swapPlannedFood: ({ date, mealIndex, itemIndex, foodId, grams, scope = "once" }) => {
      setMealPlan((plan) => {
        if (!plan.week) return plan;
        const budget = plan.settings.budget;
        const dietType = profile.dietType || "standard";
        const day0 = plan.week.days.find((d) => d.date === date);
        const from = day0?.meals[mealIndex]?.items[itemIndex]?.foodId;
        if (!from) return plan;
        const days = plan.week.days.map((d) => {
          if (d.date === date) return applySwap(d, { mealIndex, itemIndex, foodId, grams, budget, dietType });
          if (scope === "once" || d.date < date) return d;
          let out = d;
          out.meals.forEach((m, mi) => m.items.forEach((it, ii) => {
            if (it.foodId === from && !m.status) out = applySwap(out, { mealIndex: mi, itemIndex: ii, foodId, grams: it.grams, budget, dietType });
          }));
          return out;
        });
        const rules = scope === "always"
          ? [...plan.rules.filter((r) => r.from !== from), { from, to: foodId }]
          : plan.rules;
        return { ...plan, rules, week: { ...plan.week, days } };
      });
    },
    removeMealPlanRule: (from) => setMealPlan((plan) => ({ ...plan, rules: plan.rules.filter((r) => r.from !== from) })),

    /**
     * Ticks a planned meal: "ate" logs its foods into the diary meal it
     * belongs to, "skipped" logs nothing, null undoes either.
     */
    markPlannedMeal: (date, mealIndex, status) => {
      const plan = mealPlan;
      const d = plan.week?.days.find((x) => x.date === date);
      const meal = d?.meals[mealIndex];
      if (!meal) return;
      // Undo what an earlier tick logged.
      if (meal.logged?.length) {
        const ids = new Set(meal.logged);
        patchDay(date, (cur) => ({ ...cur, entries: cur.entries.filter((e) => !ids.has(e.id)) }));
      }
      let logged = [];
      if (status === "ate") {
        const entries = meal.items.filter((it) => it.grams > 0).map((it) => createEntry({ foodId: it.foodId, grams: it.grams, meal: meal.slot }));
        logged = entries.map((e) => e.id);
        patchDay(date, (cur) => ({ ...cur, entries: [...cur.entries, ...entries] }));
      }
      setMealPlan((p) => ({
        ...p,
        week: {
          ...p.week,
          days: p.week.days.map((x) => (x.date !== date ? x : {
            ...x, meals: x.meals.map((m, i) => (i !== mealIndex ? m : { ...m, status: status || null, logged })),
          })),
        },
      }));
    },
  }), [mealPlan, planTargets, patchDay, profile]);

  const api = useMemo(() => ({
    goToDay: (key) => setCursor(key),
    shiftDay: (delta) => setCursor((k) => {
      const d = new Date(`${k}T00:00:00`);
      d.setDate(d.getDate() + delta);
      return dayKey(d);
    }),

    /** Keeps a scanned product with the diary, so its entries resolve here and on other devices. */
    rememberFood: (food) => {
      if (!food?.id) return;
      registerFoods([food]);
      setDiary((s) => ({ ...s, scanned: { ...(s.scanned || {}), [food.id]: food } }));
    },

    addEntry: (patch, key = cursor) => {
      const entry = createEntry(patch);
      patchDay(key, (d) => ({ ...d, entries: [...d.entries, entry] }));
      if (entry.foodId) {
        setDiary((s) => ({
          ...s,
          recentFoodIds: [entry.foodId, ...s.recentFoodIds.filter((id) => id !== entry.foodId)].slice(0, RECENT_LIMIT),
        }));
      }
      return entry;
    },

    updateEntry: (id, patch, key = cursor) =>
      patchDay(key, (d) => ({ ...d, entries: d.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),

    removeEntry: (id, key = cursor) =>
      patchDay(key, (d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) })),

    setWater: (ml, key = cursor) => patchDay(key, (d) => ({ ...d, water: Math.max(ml, 0) })),
    setWeight: (kg, key = cursor) => {
      patchDay(key, (d) => ({ ...d, weight: kg }));
      // The scale is the source of truth for bodyweight-based targets.
      if (typeof kg === "number" && key === dayKey()) setProfile((p) => ({ ...p, weight: kg }));
    },
    setTrainingDay: (value, key = cursor) => patchDay(key, (d) => ({ ...d, trainingDay: value })),

    updateProfile: (patch) => setProfile((p) => ({ ...p, ...patch })),
    updateView: (patch) => setView((v) => ({ ...v, ...patch })),
    resetView: () => setView({ ...DEFAULT_VIEW }),
    setCustomTargets: (t) => setProfile((p) => ({ ...p, customTargets: t })),
    useAdaptiveTdee: (on) => setProfile((p) => ({ ...p, useAdaptive: on })),

    saveMeal: (name, entries) =>
      setDiary((s) => ({
        ...s,
        savedMeals: [...s.savedMeals, {
          id: `${Date.now().toString(36)}`,
          name,
          items: entries.map(({ foodId, custom, grams }) => ({ foodId, custom, grams })),
        }],
      })),

    removeSavedMeal: (id) =>
      setDiary((s) => ({ ...s, savedMeals: s.savedMeals.filter((m) => m.id !== id) })),

    logSavedMeal: (mealId, slot, key = cursor) =>
      setDiary((s) => {
        const saved = s.savedMeals.find((m) => m.id === mealId);
        if (!saved) return s;
        const current = s.days[key] || emptyDay();
        const entries = saved.items.map((i) => createEntry({ ...i, meal: slot }));
        return { ...s, days: { ...s.days, [key]: { ...current, entries: [...current.entries, ...entries] } } };
      }),
  }), [cursor, patchDay]);

  return {
    diary, profile, view, cursor, day, totals, targets, estimate, trend, mealPlan, planTargets,
    ...planApi,
    maintenance: tdee(profile),
    isToday: cursor === dayKey(),
    ...api,
  };
}
