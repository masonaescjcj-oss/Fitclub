// The food bank (src/lib/nutrition/foods.js + the generated foodsIr.js): about
// 400 foods, each with a group, a price and a household unit; Persian search
// that forgives Arabic letters and joiners; and the Iranian dishes, whose
// numbers come from their ingredients, in the recipes and in the meal planner.
import { CATEGORIES, FOODS, findFood, searchFoods, servingsOf } from "../src/lib/nutrition/foods.js";
import { DISH_RECIPES, FOODS_IR } from "../src/lib/nutrition/foodsIr.js";
import { foodMeta } from "../src/lib/nutrition/foodMeta.js";
import { MARKET_PRICES } from "../src/lib/nutrition/prices.js";
import { RECIPES, recipeMacros } from "../src/lib/nutrition/recipes.js";
import { MEALS } from "../src/lib/nutrition/diaryStore.js";

let pass = 0, fail = 0;
const check = (name, cond, got) => { cond ? pass++ : fail++; if (!cond) console.log("✗", name, got !== undefined ? `(got ${JSON.stringify(got).slice(0, 400)})` : ""); };

check("about 400 foods", FOODS.length >= 380, FOODS.length);
check("ids are unique", new Set(FOODS.map((f) => f.id)).size === FOODS.length);
const cats = new Set(CATEGORIES.map((c) => c.id));
check("every food is in a known category", FOODS.every((f) => cats.has(f.cat)), FOODS.filter((f) => !cats.has(f.cat)).map((f) => f.id));
check("every category has foods", CATEGORIES.every((c) => FOODS.some((f) => f.cat === c.id)), CATEGORIES.filter((c) => !FOODS.some((f) => f.cat === c.id)).map((c) => c.id));

// Group, price and a household unit for every food.
const CAT_GROUP = { protein: "protein", carbs: "starch", dairy: "dairy", veg: "veg", fruit: "fruit", fat: "fat", legume: "legume", dish: "dish", supp: "supp", drink: "drink", sweet: "sweet", condiment: "condiment" };
const groupOf = (f) => f.group || foodMeta(f.id)?.group || CAT_GROUP[f.cat];
const priceOf = (f) => f.price || MARKET_PRICES[f.id]?.price || 0;
check("every food has an exchange group", FOODS.every((f) => groupOf(f)));
check("every food has a price", FOODS.every((f) => priceOf(f) > 0), FOODS.filter((f) => !(priceOf(f) > 0)).map((f) => f.id));
// A household measure is a thing (a skewer, a glass, a slice), not a gram amount, whatever it weighs.
const household = (f) => (f.servings || []).some((s) => s.g > 0 && /[؀-ۿ]/.test(s.fa) && !/گرم/.test(s.fa));
check("every food has at least one household unit", FOODS.every(household), FOODS.filter((f) => !household(f)).map((f) => f.id).slice(0, 10));
check("…and can always be logged in grams too", FOODS.every((f) => servingsOf(f).some((s) => s.g === 100)));
check("every food has both names", FOODS.every((f) => f.nameEn && /[؀-ۿ]/.test(f.nameFa)));

// Numbers that make sense.
const odd = FOODS.filter((f) => {
  const p = f.per100;
  const macro = p.protein * 4 + p.carbs * 4 + p.fat * 9;
  return !(p.kcal >= 0 && p.kcal <= 900 && p.protein >= 0 && p.carbs >= 0 && p.fat >= 0 && p.protein + p.carbs + p.fat <= 101)
    || (p.kcal > 40 && !f.energyNote && Math.abs(macro - p.kcal) > p.kcal * 0.25);
});
check("per-100 g values are physically possible and add up", odd.length === 0, odd.map((f) => [f.id, f.per100]).slice(0, 5));
check("most new foods carry USDA values", FOODS_IR.filter((f) => f.cat !== "dish" && f.usda).length / FOODS_IR.filter((f) => f.cat !== "dish").length > 0.7);

// Search.
const top = (q) => searchFoods(q)[0]?.id;
check("Persian search finds the plain food first", top("کشک") === "kashk" && top("لپه") === "split_peas", [top("کشک"), top("لپه")]);
check("…with Arabic letters too", top("كشك") === "kashk", top("كشك"));
check("…and every word counts", searchFoods("مرغ پخته").every((f) => [f.nameFa, f.nameEn, ...(f.aliases || [])].join(" ").includes("مرغ")));
check("English search still works", searchFoods("lentil").some((f) => f.id === "lentils"));
check("a category lists only its own", searchFoods("", "sweet").every((f) => f.cat === "sweet") && searchFoods("", "sweet").length >= 10);

// The dishes.
check("50 Iranian dishes from recipes", DISH_RECIPES.length >= 50, DISH_RECIPES.length);
const dishFoods = DISH_RECIPES.map((r) => findFood(r.id));
check("each dish is also a food, per 100 g from its ingredients", dishFoods.every((f) => f && f.cat === "dish" && f.recipe && f.estimate));
const missing = DISH_RECIPES.flatMap((r) => r.ingredients.filter((i) => !findFood(i.foodId)).map((i) => `${r.id}:${i.foodId}`));
check("every ingredient is in the bank", missing.length === 0, missing);
const perPortion = DISH_RECIPES.map((r) => ({ id: r.id, kcal: recipeMacros(r).kcal, serving: r.serving }));
check("a portion is a believable meal (80–1,300 kcal)", perPortion.every((x) => x.kcal >= 80 && x.kcal <= 1300), perPortion.filter((x) => x.kcal < 80 || x.kcal > 1300));
check("…and matches the dish's own numbers", DISH_RECIPES.every((r) => {
  const f = findFood(r.id);
  return Math.abs(recipeMacros(r).kcal - (f.per100.kcal * r.serving) / 100) <= Math.max(8, recipeMacros(r).kcal * 0.03);
}));
check("the dishes are in the recipes, with steps in both languages", DISH_RECIPES.every((r) => RECIPES.includes(r) && r.stepsFa.length && r.stepsFa.length === r.stepsEn.length));
check("…each for a real meal", RECIPES.every((r) => MEALS.some((m) => m.id === r.meal)), RECIPES.filter((r) => !MEALS.some((m) => m.id === r.meal)).map((r) => [r.id, r.meal]));
const planned = DISH_RECIPES.filter((r) => r.planSub !== "sweet" && ["lunch", "dinner"].includes(r.meal));
check("lunch and dinner dishes join the meal planner, with a price", planned.length >= 30 && planned.every((r) => foodMeta(r.id)?.group === "dish" && foodMeta(r.id).pricePerG > 0), planned.filter((r) => !(foodMeta(r.id)?.pricePerG > 0)).map((r) => r.id));
check("…vegetarian ones stay open to vegetarians", DISH_RECIPES.filter((r) => r.diet === "vegetarian" || r.diet === "vegan").every((r) => !foodMeta(r.id)?.meat));
check("…and sweets stay out of it", DISH_RECIPES.filter((r) => r.planSub === "sweet").every((r) => !foodMeta(r.id)));

console.log(`food bank: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
