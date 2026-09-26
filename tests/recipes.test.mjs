// Recipes (src/lib/nutrition/recipes.js): every ingredient is in the food
// bank, and each recipe's numbers are the sum of its ingredients.
const { RECIPES, RECIPE_TAGS, recipeMacros } = await import("../src/lib/nutrition/recipes.js");
const { findFood, macrosFor } = await import("../src/lib/nutrition/foods.js");
const { MEALS } = await import("../src/lib/nutrition/diaryStore.js");

let pass = 0, fail = 0;
const check = (name, cond, got) => { cond ? pass++ : fail++; if (!cond) console.log("✗", name, got !== undefined ? `(got ${JSON.stringify(got).slice(0, 300)})` : ""); };

const missing = RECIPES.flatMap((r) => r.ingredients.filter((i) => !findFood(i.foodId)).map((i) => `${r.id}:${i.foodId}`));
check("every ingredient is a food in the food bank", missing.length === 0, missing);
check("every recipe has a title, steps and a tag in both languages", RECIPES.every((r) => r.titleEn && r.titleFa && r.stepsEn.length && r.stepsEn.length === r.stepsFa.length && RECIPE_TAGS[r.tag]));
check("every recipe goes to a real meal", RECIPES.every((r) => MEALS.some((m) => m.id === r.meal)));
check("ids are unique", new Set(RECIPES.map((r) => r.id)).size === RECIPES.length);
const bowl = RECIPES.find((r) => r.id === "chicken_bowl");
const manual = bowl.ingredients.reduce((s, i) => s + macrosFor(findFood(i.foodId), i.grams).kcal, 0);
check("a recipe's calories are its ingredients' added up", recipeMacros(bowl).kcal === Math.round(manual), [recipeMacros(bowl).kcal, manual]);
// Desserts and vegetable sides are allowed little protein, egg and herb dishes some; a portion is 150–1,000 kcal.
check("the numbers are believable: 150–1,000 kcal, and protein in the mains", RECIPES.every((r) => { const m = recipeMacros(r); return m.kcal >= 150 && m.kcal <= 1000 && (m.protein >= (["egg", "soup"].includes(r.planSub) ? 5 : 10) || ["sweet", "veg"].includes(r.planSub)); }),
  RECIPES.filter((r) => { const m = recipeMacros(r); return !(m.kcal >= 150 && m.kcal <= 1000 && (m.protein >= (["egg", "soup"].includes(r.planSub) ? 5 : 10) || ["sweet", "veg"].includes(r.planSub))); }).map((r) => [r.id, recipeMacros(r).kcal, recipeMacros(r).protein]));
check("…and the energy adds up from the macros within 15%", RECIPES.every((r) => { const m = recipeMacros(r); const e = 4 * m.protein + 4 * m.carbs + 9 * m.fat; return Math.abs(e - m.kcal) / m.kcal < 0.15; }), RECIPES.map((r) => { const m = recipeMacros(r); return [r.id, m.kcal, 4 * m.protein + 4 * m.carbs + 9 * m.fat]; }));

console.log(`recipes: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
