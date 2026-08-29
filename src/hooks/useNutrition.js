import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createEntry, dayKey, emptyDay, estimateTdee, loadDiary, saveDiary,
  totalsFor, weightTrend,
} from "../lib/nutrition/diaryStore";
import { loadProfile, saveProfile, targetsFor, tdee } from "../lib/nutrition/profile";
import { DEFAULT_VIEW, loadView, saveView } from "../lib/nutrition/viewPrefs";

const RECENT_LIMIT = 12;

/** Owns the diary and the athlete profile, and keeps both in localStorage. */
export default function useNutrition() {
  const [diary, setDiary] = useState(loadDiary);
  const [profile, setProfile] = useState(loadProfile);
  const [cursor, setCursor] = useState(() => dayKey());
  const [view, setView] = useState(loadView);
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

  const api = useMemo(() => ({
    goToDay: (key) => setCursor(key),
    shiftDay: (delta) => setCursor((k) => {
      const d = new Date(`${k}T00:00:00`);
      d.setDate(d.getDate() + delta);
      return dayKey(d);
    }),

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
    diary, profile, view, cursor, day, totals, targets, estimate, trend,
    maintenance: tdee(profile),
    isToday: cursor === dayKey(),
    ...api,
  };
}
