// The meal planner (src/lib/nutrition/planEngine.js): real foods that meet a
// day's targets, within the budget and the person's rules, swaps that keep
// the day on target, and a shopping list that adds up.
import {
  DEFAULT_SETTINGS, allowedFoods, applySwap, dayError, dayTotals, generateWeek, generateWithinCap, mealLayout,
  shoppingList, swapOptions, weekCost,
} from "../src/lib/nutrition/planEngine.js";
import { foodMeta } from "../src/lib/nutrition/foodMeta.js";
import { targetsFor } from "../src/lib/nutrition/profile.js";

let pass = 0, fail = 0;
const check = (name, cond, got) => { cond ? pass++ : fail++; if (!cond) console.log("✗", name, got !== undefined ? `(got ${JSON.stringify(got)})` : ""); };

const person = (patch = {}) => ({ gender: "male", age: 30, height: 178, weight: 80, goal: "Weight Loss", frequency: "3_4", difficulty: "moderate", dietType: "standard", ...patch });
const week = (p, settings = {}, extra = {}) => generateWeek({
  start: "2026-09-26", targetFor: () => targetsFor(p), settings: { ...DEFAULT_SETTINGS, ...settings }, dietType: p.dietType, goal: p.goal, seed: 7, ...extra,
});
const items = (days) => days.flatMap((d) => d.meals.flatMap((m) => m.items));

check("meal shares add up to the day", [3, 4, 5].every((n) => Math.abs(mealLayout(n).reduce((s, m) => s + m.share, 0) - 1) < 1e-9));

const t0 = Date.now();
const base = week(person());
check("a week is built quickly", Date.now() - t0 < 2000, Date.now() - t0);
check("seven days, four meals each, every meal with food", base.length === 7 && base.every((d) => d.meals.length === 4 && d.meals.every((m) => m.items.length >= 1)));
check("the same seed gives the same week", JSON.stringify(week(person())) === JSON.stringify(base));
check("another seed gives another week", JSON.stringify(week(person(), {}, { seed: 8 })) !== JSON.stringify(base));

for (const [label, p, settings, limit] of [
  ["a cut", person(), {}, 0.06],
  ["a bulk", person({ goal: "Muscle Gain" }), { budget: "free" }, 0.06],
  ["maintenance, 3 meals", person({ goal: "Keep Fit" }), { meals: 3 }, 0.06],
  ["strength, 5 meals", person({ goal: "Max Strength", dietType: "high_protein" }), { meals: 5 }, 0.06],
  ["a woman's cut", person({ gender: "female", weight: 62, height: 164 }), {}, 0.06],
  ["keto", person({ dietType: "keto" }), {}, 0.07],
  ["vegetarian", person({ dietType: "vegetarian", goal: "Keep Fit" }), { budget: "economy" }, 0.06],
]) {
  const days = week(p, settings);
  const errors = days.map(dayError);
  check(`${label}: every day within ${limit * 100}% of its targets`, errors.every((e) => e <= limit), errors.map((e) => +(e * 100).toFixed(1)));
  const t = days.map(dayTotals);
  check(`${label}: protein never more than 6% short`, t.every((x, i) => x.protein >= days[i].target.protein * 0.94), t.map((x) => Math.round(x.protein)));
}

const veg = week(person({ dietType: "vegetarian", goal: "Keep Fit" }));
check("a vegetarian week has no meat or fish", items(veg).every((it) => !foodMeta(it.foodId).meat), items(veg).filter((it) => foodMeta(it.foodId).meat).map((it) => it.foodId));
const keto = week(person({ dietType: "keto" }));
check("a keto week has no rice, bread or fruit", items(keto).every((it) => !["starch", "fruit"].includes(foodMeta(it.foodId).group)));
check("keto's carbs stay near their ceiling", keto.every((d) => dayTotals(d).carbs <= d.target.carbs * 1.25), keto.map((d) => Math.round(dayTotals(d).carbs)));

const picky = week(person(), { dislikes: ["chicken_breast", "egg"], allergies: ["fish", "nuts"] });
check("disliked foods are never planned", items(picky).every((it) => !["chicken_breast", "egg"].includes(it.foodId)));
check("allergens are never planned", items(picky).every((it) => !foodMeta(it.foodId).allergens.some((a) => ["fish", "nuts"].includes(a))));
const liked = week(person(), { likes: ["salmon"] });
check("a liked food shows up more", items(liked).filter((it) => it.foodId === "salmon").length > items(base).filter((it) => it.foodId === "salmon").length);
const ruled = week(person(), {}, { rules: [{ from: "beef_lean", to: "chicken_breast" }] });
check("an 'always' rule takes its food out of every day", items(ruled).every((it) => it.foodId !== "beef_lean"));

const cheap = weekCost(week(person(), { budget: "economy" }));
const dear = weekCost(week(person(), { budget: "free" }));
check("an economy week costs less than a free one", cheap < dear, { cheap, dear });
check("…by a real margin", cheap < dear * 0.85, { cheap, dear });
const roomy = generateWithinCap({ start: "2026-09-26", targetFor: () => targetsFor(person()), settings: { ...DEFAULT_SETTINGS, budget: "free", weeklyCap: 10000000 }, dietType: "standard", goal: "Weight Loss", seed: 7 });
check("a generous cap is met at once", roomy.withinCap && roomy.cost <= 10000000);
const tight = generateWithinCap({ start: "2026-09-26", targetFor: () => targetsFor(person()), settings: { ...DEFAULT_SETTINGS, budget: "free", weeklyCap: Math.round(cheap * 1.05) }, dietType: "standard", goal: "Weight Loss", seed: 7 });
check("a tighter cap moves the week to cheaper food", tight.cost < dear, { cost: tight.cost, dear });
const impossible = generateWithinCap({ start: "2026-09-26", targetFor: () => targetsFor(person()), settings: { ...DEFAULT_SETTINGS, weeklyCap: 1000 }, dietType: "standard", goal: "Weight Loss", seed: 7 });
check("an impossible cap is reported, not faked", !impossible.withinCap && impossible.cost > 1000);

// Swaps: 300 g of beef for chicken keeps the protein.
const beef = { foodId: "beef_lean", grams: 250 };
const opts = swapOptions(beef, { pool: allowedFoods(), slot: "l" });
const chicken = opts.find((o) => o.foodId === "chicken_breast");
check("chicken is offered in place of beef", !!chicken, opts.map((o) => o.foodId));
check("…with the same protein, within one step", chicken && Math.abs(chicken.delta.protein) <= 4, chicken);
check("…and fewer calories", chicken && chicken.delta.kcal < -100, chicken);
check("…and grams in kitchen steps", chicken && chicken.grams % 10 === 0);
check("the food itself is never offered", opts.every((o) => o.foodId !== "beef_lean"));
check("a starch swaps for starches only", swapOptions({ foodId: "rice_white", grams: 200 }, { slot: "l" }).every((o) => foodMeta(o.foodId).group === "starch"));
check("a vegetarian is never offered meat", swapOptions({ foodId: "lentils", grams: 200 }, { pool: allowedFoods({ dietType: "vegetarian" }), slot: "l" }).every((o) => !foodMeta(o.foodId).meat));

const day = base[0];
const m = day.meals.findIndex((meal) => meal.items.some((it) => ["protein", "legume"].includes(foodMeta(it.foodId).group)));
const i = day.meals[m].items.findIndex((it) => ["protein", "legume"].includes(foodMeta(it.foodId).group));
const alt = swapOptions(day.meals[m].items[i], { slot: day.meals[m].id === "l" ? "l" : "d" })[0];
const swapped = applySwap(day, { mealIndex: m, itemIndex: i, foodId: alt.foodId, grams: alt.grams });
check("a swap changes that one food", swapped.meals[m].items[i].foodId === alt.foodId && swapped.meals[m].items[i].grams === alt.grams);
check("…and the day stays on target", dayError(swapped) <= 0.07, dayError(swapped));

// Shopping: grams as bought, whole eggs and loaves, a total that adds up.
const shop = shoppingList(base);
const rice = shop.rows.find((r) => r.foodId === "rice_white");
const riceEaten = items(base).filter((it) => it.foodId === "rice_white").reduce((s, it) => s + it.grams, 0);
check("rice is bought dry: about a third of what's eaten", !rice || (rice.grams >= riceEaten / 2.8 && rice.grams < riceEaten / 2.8 + 50), { rice, riceEaten });
const eggs = shop.rows.find((r) => r.foodId === "egg");
check("eggs are counted whole", !eggs || (eggs.unit === "egg" && Number.isInteger(eggs.amount)));
check("the total is the sum of its rows", shop.total === shop.rows.reduce((s, r) => s + (r.cost || 0), 0));
check("…and close to the week's cost (bought is a little more than eaten)", shop.total >= weekCost(base) * 0.95 && shop.total <= weekCost(base) * 1.4, { shop: shop.total, week: weekCost(base) });

console.log(`meal plan: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
