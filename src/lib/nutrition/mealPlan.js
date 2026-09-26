/** Applies a shared nutrition plan: targets plus its saved meals. */
export function applyMealPlan(nutrition, meal) {
  const { kcal, protein, carbs, fat } = meal.targets;
  nutrition.setCustomTargets({
    kcal, protein, carbs, fat,
    fiber: Math.round((kcal / 1000) * 14),
    water: Math.round((nutrition.profile?.weight || 70) * 35),
  });
  for (const m of meal.meals) nutrition.saveMeal(m.name, m.items);
}
