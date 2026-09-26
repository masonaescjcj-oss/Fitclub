/**
 * What the meal planner needs to know about each food, beside its nutrients
 * (foods.js): its exchange group, the meals it belongs in, a sensible
 * portion range, what it costs as eaten, and the diets and allergies that
 * rule it out.
 *
 * - `group` is the exchange group a swap stays inside; `sub` narrows it
 *   (a meat swaps best with another meat).
 * - `slots`: b breakfast, l lunch, d dinner, s snack.
 * - `yield` is weight as eaten ÷ weight as bought: rice triples when it
 *   cooks, meat loses a quarter, a banana loses its peel. The price per kg
 *   as eaten is the market price ÷ yield, and the shopping list divides by
 *   it to get what to buy.
 * - `pair` (dishes): what a Persian dish is eaten with.
 * - `meat`: rules the food out for vegetarians; `keto`: allowed on keto;
 *   `allergens`: dairy, egg, gluten, nuts, peanut, fish, shellfish, soy.
 * - `unit`: a household measure for the plan screen, when foods.js has none
 *   better (USDA household weights).
 */

import { MARKET_PRICES } from "./prices";
import { DISH_RECIPES, FOODS_IR } from "./foodsIr";

/** Portion range per meal, in grams as eaten, by group. */
const BOUNDS = {
  protein: { min: 80, max: 250, step: 10 },
  egg: { min: 50, max: 200, step: 50 },
  cheese: { min: 20, max: 80, step: 10 },
  yogurt: { min: 100, max: 350, step: 50 },
  milk: { min: 150, max: 400, step: 50 },
  starch: { min: 50, max: 350, step: 25 },
  bread: { min: 30, max: 180, step: 15 },
  oats: { min: 30, max: 100, step: 10 },
  legume: { min: 100, max: 350, step: 25 },
  veg: { min: 80, max: 300, step: 20 },
  fruit: { min: 80, max: 300, step: 20 },
  oil: { min: 5, max: 25, step: 5 },
  nuts: { min: 10, max: 45, step: 5 },
  spread: { min: 10, max: 30, step: 5 },
  dish: { min: 200, max: 500, step: 50 },
  supp: { min: 30, max: 60, step: 15 },
  drink: { min: 200, max: 350, step: 50 },
};

// id: [group, sub, slots, bounds key, extras]
const RAW = {
  chicken_breast: ["protein", "poultry", "ld", "protein", { yield: 0.75, meat: true, keto: true }],
  chicken_thigh: ["protein", "poultry", "ld", "protein", { yield: 0.72, meat: true, keto: true }],
  beef_lean: ["protein", "meat", "ld", "protein", { yield: 0.75, meat: true, keto: true }],
  lamb: ["protein", "meat", "ld", "protein", { yield: 0.7, meat: true, keto: true }],
  salmon: ["protein", "fish", "ld", "protein", { yield: 0.8, meat: true, keto: true, allergens: ["fish"] }],
  white_fish: ["protein", "fish", "ld", "protein", { yield: 0.8, meat: true, keto: true, allergens: ["fish"] }],
  tuna_can: ["protein", "fish", "ld", "protein", { yield: 0.75, meat: true, keto: true, allergens: ["fish"] }],
  shrimp: ["protein", "fish", "ld", "protein", { yield: 0.85, meat: true, keto: true, allergens: ["shellfish"] }],
  // Rare in Iranian shops: loggable, never planned.
  turkey: ["protein", "poultry", "", "protein", { yield: 0.75, meat: true, keto: true }],
  egg: ["protein", "egg", "bld", "egg", { keto: true, allergens: ["egg"] }],
  egg_white: ["protein", "egg", "bld", "egg", { keto: true, allergens: ["egg"] }],
  greek_yogurt: ["dairy", "yogurt", "bs", "yogurt", { keto: true, allergens: ["dairy"] }],
  yogurt_plain: ["dairy", "yogurt", "blds", "yogurt", { allergens: ["dairy"] }],
  milk_2: ["dairy", "milk", "bs", "milk", { allergens: ["dairy"] }],
  cottage: ["dairy", "cheese", "bs", "yogurt", { keto: true, allergens: ["dairy"] }],
  feta: ["dairy", "cheese", "bs", "cheese", { keto: true, allergens: ["dairy"] }],
  cheddar: ["dairy", "cheese", "bs", "cheese", { keto: true, allergens: ["dairy"] }],
  rice_white: ["starch", "rice", "ld", "starch", { yield: 2.8, unit: { en: "cup", fa: "پیمانه", g: 158 } }],
  rice_brown: ["starch", "rice", "ld", "starch", { yield: 2.5, unit: { en: "cup", fa: "پیمانه", g: 195 } }],
  oats: ["starch", "oats", "b", "oats", { allergens: ["gluten"] }],
  bread_barbari: ["starch", "bread", "bld", "bread", { allergens: ["gluten"] }],
  bread_sangak: ["starch", "bread", "bld", "bread", { allergens: ["gluten"] }],
  bread_lavash: ["starch", "bread", "bld", "bread", { allergens: ["gluten"] }],
  bread_whole: ["starch", "bread", "bld", "bread", { allergens: ["gluten"] }],
  pasta: ["starch", "pasta", "ld", "starch", { yield: 2.4, allergens: ["gluten"], unit: { en: "cup", fa: "پیمانه", g: 140 } }],
  potato: ["starch", "potato", "ld", "starch", { yield: 0.85 }],
  sweet_potato: ["starch", "potato", "ld", "starch", { yield: 0.85 }],
  quinoa: ["starch", "rice", "ld", "starch", { yield: 2.7, unit: { en: "cup", fa: "پیمانه", g: 185 } }],
  lentils: ["legume", "legume", "ld", "legume", { yield: 2.5, unit: { en: "cup", fa: "پیمانه", g: 198 } }],
  chickpeas: ["legume", "legume", "ld", "legume", { yield: 2.2, unit: { en: "cup", fa: "پیمانه", g: 164 } }],
  kidney_beans: ["legume", "legume", "ld", "legume", { yield: 2.4, unit: { en: "cup", fa: "پیمانه", g: 177 } }],
  tofu: ["legume", "soy", "ld", "protein", { keto: true, allergens: ["soy"] }],
  // Textured soy (سویا), weighed dry: the cheapest protein a vegetarian plan has.
  // Only ever added to top up protein (repair), never a meal's main food.
  soy_tvp: ["legume", "soy", "ld", "legume", { allergens: ["soy"], portion: { min: 30, max: 90, step: 10 }, booster: true }],
  broccoli: ["veg", "veg", "ld", "veg", { yield: 0.8, keto: true }],
  spinach: ["veg", "leafy", "ld", "veg", { yield: 0.9, keto: true }],
  cucumber: ["veg", "salad", "blds", "veg", { yield: 0.95, keto: true }],
  tomato: ["veg", "salad", "bld", "veg", { yield: 0.95, keto: true }],
  carrot: ["veg", "veg", "ld", "veg", { yield: 0.9 }],
  // An ingredient, not a side: loggable, never planned on its own.
  onion: ["veg", "veg", "", "veg", { yield: 0.9, keto: true }],
  eggplant: ["veg", "veg", "ld", "veg", { yield: 0.8, keto: true }],
  salad_shirazi: ["veg", "salad", "ld", "veg", { keto: true }],
  banana: ["fruit", "fruit", "bs", "fruit", { yield: 0.65 }],
  apple: ["fruit", "fruit", "bs", "fruit", { yield: 0.9 }],
  orange: ["fruit", "fruit", "bs", "fruit", { yield: 0.72 }],
  dates: ["fruit", "dried", "bs", "spread", { yield: 0.9 }],
  grapes: ["fruit", "fruit", "bs", "fruit", { yield: 0.95 }],
  watermelon: ["fruit", "fruit", "s", "fruit", { yield: 0.55 }],
  strawberry: ["fruit", "fruit", "bs", "fruit", { yield: 0.95, keto: true }],
  almonds: ["fat", "nuts", "bs", "nuts", { keto: true, allergens: ["nuts"] }],
  walnuts: ["fat", "nuts", "bs", "nuts", { keto: true, allergens: ["nuts"] }],
  pistachio: ["fat", "nuts", "s", "nuts", { yield: 0.55, keto: true, allergens: ["nuts"] }],
  peanut_butter: ["fat", "spread", "bs", "spread", { allergens: ["peanut"] }],
  vegetable_oil: ["fat", "oil", "ld", "oil", { keto: true, unit: { en: "tbsp", fa: "قاشق غذاخوری", g: 14 } }],
  olive_oil: ["fat", "oil", "ld", "oil", { keto: true, unit: { en: "tbsp", fa: "قاشق غذاخوری", g: 13.5 } }],
  butter: ["fat", "oil", "b", "oil", { keto: true, allergens: ["dairy"], unit: { en: "tbsp", fa: "قاشق غذاخوری", g: 14 } }],
  avocado: ["fat", "fruit", "bld", "nuts", { yield: 0.7, keto: true }],
  honey: ["sweet", "sweet", "b", "spread", {}],
  kabab_koobideh: ["dish", "meat", "ld", "dish", { meat: true, pair: "rice", keto: true }],
  joojeh: ["dish", "poultry", "ld", "dish", { meat: true, pair: "rice", keto: true }],
  ghormeh_sabzi: ["dish", "stew", "ld", "dish", { meat: true, pair: "rice" }],
  gheymeh: ["dish", "stew", "ld", "dish", { meat: true, pair: "rice" }],
  fesenjan: ["dish", "stew", "ld", "dish", { meat: true, pair: "rice", allergens: ["nuts"] }],
  adasi: ["dish", "soup", "ld", "dish", { pair: "bread" }],
  ash_reshteh: ["dish", "soup", "ld", "dish", { pair: "none", allergens: ["gluten", "dairy"] }],
  mirza_ghasemi: ["dish", "veg", "ld", "dish", { pair: "bread", allergens: ["egg"] }],
  kotlet: ["dish", "meat", "ld", "dish", { meat: true, pair: "bread", allergens: ["egg", "gluten"] }],
  tahchin: ["dish", "rice", "ld", "dish", { meat: true, pair: "none", allergens: ["egg", "dairy"] }],
  whey: ["supp", "supp", "s", "supp", { keto: true, allergens: ["dairy"] }],
  doogh: ["drink", "dairy", "ld", "drink", { allergens: ["dairy"] }],
};

// The Iranian dishes (foodsIr.js) join the planner as lunch and dinner dishes; the sweet ones stay out.
for (const r of DISH_RECIPES) {
  if (RAW[r.id] || r.planSub === "sweet" || !["lunch", "dinner"].includes(r.meal)) continue;
  // Its portion range comes from its own serving (a falafel plate is not a bowl of stew).
  const step = r.serving >= 250 ? 50 : 20;
  const min = Math.max(step, Math.round((r.serving * 0.6) / step) * step);
  const max = Math.max(min + step, Math.round((r.serving * 1.35) / step) * step);
  RAW[r.id] = ["dish", r.planSub || "dish", "ld", "dish", { meat: r.diet === "meat" || r.diet === "fish", pair: r.pair || "none", allergens: r.allergens || [], portion: { min, max, step } }];
}
const IR_PRICES = Object.fromEntries(FOODS_IR.filter((f) => f.price > 0).map((f) => [f.id, { price: f.price, est: !!f.priceEst }]));

const META = Object.fromEntries(Object.entries(RAW).map(([id, [group, sub, slots, bounds, x]]) => {
  const market = MARKET_PRICES[id] || IR_PRICES[id];
  const y = x.yield || 1;
  return [id, {
    id, group, sub, slots, ...BOUNDS[bounds], ...(x.portion || {}), bounds,
    yield: y,
    meat: !!x.meat,
    keto: !!x.keto,
    allergens: x.allergens || [],
    pair: x.pair || null,
    booster: !!x.booster,
    unit: x.unit || null,
    // toman per gram as eaten
    pricePerG: market ? market.price / y / 1000 : null,
    priceEstimate: market ? !!market.est : true,
  }];
}));

/** The planner's view of a food, or null for foods it doesn't plan with (tea, creatine, juice). */
export const foodMeta = (id) => META[id] || null;
export const PLAN_FOOD_IDS = Object.keys(META);

export const ALLERGENS = [
  { id: "dairy", en: "Dairy", fa: "لبنیات" },
  { id: "egg", en: "Eggs", fa: "تخم‌مرغ" },
  { id: "gluten", en: "Gluten", fa: "گلوتن" },
  { id: "nuts", en: "Tree nuts", fa: "مغزها" },
  { id: "peanut", en: "Peanuts", fa: "بادام‌زمینی" },
  { id: "fish", en: "Fish", fa: "ماهی" },
  { id: "shellfish", en: "Shellfish", fa: "میگو و صدف" },
  { id: "soy", en: "Soy", fa: "سویا" },
];
