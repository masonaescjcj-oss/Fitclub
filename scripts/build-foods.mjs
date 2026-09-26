#!/usr/bin/env node
// Builds src/lib/nutrition/foodsIr.js, the Iranian food bank, from the rows in
// scripts/data/foods-ir-*.mjs (base foods) and scripts/data/dishes-ir.mjs
// (dishes as recipes).
//
//   node scripts/build-foods.mjs --usda <path to sr.json>
//
// A base food's per-100 g values come from USDA FoodData Central, SR Legacy
// (the row's `usda` is its FDC id; sr.json is { fdcId: { desc, n: { kcal,
// protein, carbs, fat, fiber, sodium } } } built from the SR Legacy CSVs), or
// from the row's own `n` when USDA has no match (an Iranian product), which
// then counts as an estimate. A dish's values are worked out from its
// ingredients (base foods, cooked where it matters) and its cooked weight.
//
// Every row is checked: known category and group, both names, a household
// unit, a price, numbers that add up (energy within 15% of 4/4/9 from the
// macros, or the row says why not).

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : null; };
const usdaPath = arg("usda");
if (!usdaPath) { console.error("usage: node scripts/build-foods.mjs --usda <sr.json>"); process.exit(1); }
const USDA = JSON.parse(readFileSync(usdaPath, "utf8"));
const { MARKET_PRICES } = await import(join(root, "src", "lib", "nutrition", "prices.js"));

const CATS = ["protein", "carbs", "dairy", "veg", "fruit", "fat", "legume", "dish", "supp", "drink", "sweet", "condiment"];
const GROUPS = ["protein", "dairy", "starch", "legume", "veg", "fruit", "fat", "nuts", "sweet", "drink", "condiment", "dish"];
const KEYS = ["kcal", "protein", "carbs", "fat", "fiber", "sodium"];

const dataDir = join(root, "scripts", "data");
// --only <file>: check one data file and write nothing (dishes are checked against every base file).
const only = arg("only");
const baseFiles = readdirSync(dataDir).filter((f) => /^foods-ir-.*\.mjs$/.test(f) && (!only || only.endsWith(f) || only.includes("dishes"))).sort();
const base = [];
for (const f of baseFiles) base.push(...(await import(join(dataDir, f))).default.map((row) => ({ ...row, file: f })));
const dishes = only && !only.includes("dishes") ? [] : (await import(join(dataDir, "dishes-ir.mjs")).catch(() => ({ default: [] }))).default;

// The foods already in foods.js: their ids are taken, and dishes may use them as ingredients.
const existingSrc = readFileSync(join(root, "src", "lib", "nutrition", "foods.js"), "utf8");
const existing = new Map();
for (const m of existingSrc.matchAll(/f\("([a-z0-9_]+)", "([a-z]+)", "[^"]*", "[^"]*", ([\d.]+), ([\d.]+), ([\d.]+), ([\d.]+), ([\d.]+), ([\d.]+)/g)) {
  existing.set(m[1], { kcal: +m[3], protein: +m[4], carbs: +m[5], fat: +m[6], fiber: +m[7], sodium: +m[8] });
}

const problems = [];
const say = (id, what) => problems.push(`${id}: ${what}`);
const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

const out = [];
const per100 = new Map(existing);
for (const row of base) {
  const id = row.id;
  if (!/^[a-z][a-z0-9_]*$/.test(id)) say(id, "bad id");
  if (per100.has(id)) { say(id, `duplicate id (${row.file})`); continue; }
  if (!CATS.includes(row.cat)) say(id, `unknown cat ${row.cat}`);
  if (!GROUPS.includes(row.group)) say(id, `unknown group ${row.group}`);
  if (!row.nameEn || !row.nameFa || !/[؀-ۿ]/.test(row.nameFa)) say(id, "names");
  if (!Array.isArray(row.servings) || !row.servings.length || row.servings.some((s) => !(s.length === 3 && s[0] && /[؀-ۿ]/.test(s[1]) && s[2] > 0))) say(id, "servings");
  if (!(row.price > 0)) say(id, "price");
  let n;
  let estimate = !!row.estimate;
  if (row.usda) {
    const u = USDA[String(row.usda)];
    if (!u) { say(id, `usda ${row.usda} not found`); continue; }
    n = Object.fromEntries(KEYS.map((k) => [k, u.n[k] ?? 0]));
    if (u.n.kcal == null) say(id, `usda ${row.usda} has no energy`);
  } else if (row.n) {
    n = Object.fromEntries(KEYS.map((k) => [k, row.n[k] ?? 0]));
    estimate = true;
    if (!row.source) say(id, "own values need a source note");
  } else { say(id, "no usda id and no values"); continue; }
  const fromMacros = n.protein * 4 + n.carbs * 4 + n.fat * 9;
  if (n.kcal > 20 && Math.abs(fromMacros - n.kcal) > n.kcal * 0.15 && !row.energyNote) say(id, `energy ${n.kcal} vs macros ${Math.round(fromMacros)}`);
  per100.set(id, n);
  out.push({
    id, cat: row.cat, group: row.group, nameEn: row.nameEn, nameFa: row.nameFa,
    per100: Object.fromEntries(KEYS.map((k) => [k, round(n[k], k === "sodium" ? 0 : 1)])),
    servings: row.servings.map(([en, fa, g]) => ({ en, fa, g })),
    price: row.price, ...(row.priceEst ? { priceEst: true } : {}),
    ...(estimate ? { estimate: true } : {}),
    ...(row.usda ? { usda: row.usda } : {}),
    ...(row.tags?.length ? { tags: row.tags } : {}),
    ...(row.aliases?.length ? { aliases: row.aliases } : {}),
  });
}

// Dishes: per 100 g from the ingredients and the cooked weight.
const recipes = [];
for (const d of dishes) {
  const id = d.id;
  if (per100.has(id)) { say(id, "duplicate dish id"); continue; }
  const tot = Object.fromEntries(KEYS.map((k) => [k, 0]));
  let raw = 0;
  for (const [fid, g] of d.ingredients) {
    const n = per100.get(fid);
    if (!n) { say(id, `unknown ingredient ${fid}`); continue; }
    for (const k of KEYS) tot[k] += (n[k] || 0) * g / 100;
    raw += g;
  }
  const cooked = d.cookedWeight || raw;
  if (!(cooked > 0)) { say(id, "cooked weight"); continue; }
  if (cooked > raw * 1.6 || cooked < raw * 0.5) say(id, `cooked weight ${cooked} vs ingredients ${raw}`);
  if (!d.nameEn || !/[؀-ۿ]/.test(d.nameFa || "")) say(id, "names");
  if (!d.stepsEn?.length || d.stepsEn.length !== d.stepsFa?.length) say(id, "steps");
  if (!(d.serving > 0)) say(id, "serving");
  const n = Object.fromEntries(KEYS.map((k) => [k, (tot[k] / cooked) * 100]));
  per100.set(id, n);
  // Toman for the pot: each ingredient at its price per kg as bought; cooked meat cost a quarter more raw weight.
  const priceOf = (fid) => {
    const row = out.find((x) => x.id === fid);
    const kg = row?.price ?? MARKET_PRICES[fid]?.price ?? 0;
    const cookedMeat = (row ? row.cat === "protein" && /cooked|پخته/i.test(`${row.nameEn} ${row.nameFa}`) : ["chicken_breast", "chicken_thigh", "beef_lean", "lamb", "salmon", "white_fish", "shrimp"].includes(fid));
    const cookedGrain = !row && ["rice_white", "rice_brown", "pasta", "quinoa"].includes(fid) ? 1 / 2.8 : ["lentils", "chickpeas", "kidney_beans"].includes(fid) && !row ? 1 / 2.5 : 1;
    return (kg * cookedGrain) / (cookedMeat ? 0.72 : 1);
  };
  const price = d.ingredients.reduce((s, [fid, g]) => s + (priceOf(fid) * g) / 1000, 0) / cooked * 1000;
  out.push({
    id, cat: "dish", group: "dish", nameEn: d.nameEn, nameFa: d.nameFa,
    per100: Object.fromEntries(KEYS.map((k) => [k, round(n[k], k === "sodium" ? 0 : 1)])),
    servings: [{ en: d.servingEn || "plate", fa: d.servingFa || "یک بشقاب", g: d.serving }, ...(d.servingsMore || []).map(([en, fa, g]) => ({ en, fa, g }))],
    price: Math.round(price / 1000) * 1000 || null, priceEst: true, estimate: true, recipe: id,
    ...(d.tags?.length ? { tags: d.tags } : {}),
    ...(d.aliases?.length ? { aliases: d.aliases } : {}),
  });
  recipes.push({
    id, titleEn: d.nameEn, titleFa: d.nameFa, tag: "persian", minutes: d.minutes || 60, meal: d.meal || "lunch",
    // One portion of the dish, as its ingredients: logging it logs the dish's own entry.
    serving: d.serving, cookedWeight: cooked, portions: Math.round((cooked / d.serving) * 10) / 10,
    ingredients: d.ingredients.map(([foodId, grams]) => ({ foodId, grams })),
    stepsEn: d.stepsEn, stepsFa: d.stepsFa,
    ...(d.diet ? { diet: d.diet } : {}),
    ...(d.allergens?.length ? { allergens: d.allergens } : {}),
    pair: d.pair || "none", planSub: d.planSub || "dish",
  });
}

if (problems.length) {
  console.error(`${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
  if (!process.argv.includes("--force")) process.exit(1);
}

if (only) { console.log(`${only}: ${out.length} rows, ${problems.length} problem(s)`); process.exit(problems.length ? 1 : 0); }

const header = `// Generated by scripts/build-foods.mjs from scripts/data/foods-ir-*.mjs and
// scripts/data/dishes-ir.mjs: do not edit by hand. Per-100 g values from USDA
// FoodData Central (SR Legacy) where \`usda\` is set, otherwise estimated from
// composition (\`estimate: true\`); dishes from their ingredients. Prices are
// approximate Tehran retail, toman per kg as bought (\`priceEst\`: set from a
// similar item).\n\n`;
writeFileSync(join(root, "src", "lib", "nutrition", "foodsIr.js"),
  `${header}export const FOODS_IR = ${JSON.stringify(out, null, 0).replace(/\},\{"id"/g, '},\n{"id"')};\n\nexport const DISH_RECIPES = ${JSON.stringify(recipes, null, 0).replace(/\},\{"id"/g, '},\n{"id"')};\n`);
console.log(`foodsIr.js: ${out.length} foods (${out.filter((x) => x.cat === "dish").length} dishes), ${recipes.length} recipes; with foods.js ${out.length + existing.size} in all`);
