import { FOODS, CATEGORIES, macrosFor, searchFoods, servingsOf, findFood } from '../src/lib/nutrition/foods.js';
let bad=0;
const catIds = new Set(CATEGORIES.map(c=>c.id));
const ids = new Set();

for (const food of FOODS) {
  const p = food.per100;
  // Refined Atwater: protein and available carbs at 4, fibre at 2, fat at 9.
  // Very low-calorie foods are dominated by rounding, so they get more room.
  const netCarbs = Math.max(p.carbs - p.fiber, 0);
  const derived = p.protein*4 + netCarbs*4 + p.fiber*2 + p.fat*9;
  const drift = p.kcal === 0 ? derived : Math.abs(derived - p.kcal) / p.kcal;
  // USDA's own energy factors run a little off 4/4/9 for some foods; rows that differ more say why (energyNote).
  const tol = p.kcal < 50 ? (food.usda ? 0.3 : 0.25) : food.usda ? 0.16 : 0.12;
  if (p.kcal > 5 && drift > tol && !food.energyNote) { console.log(`✗ kcal drift ${(drift*100).toFixed(0)}% ${food.id}: stated ${p.kcal}, macros imply ${derived.toFixed(0)}`); bad++; }
  if (ids.has(food.id)) { console.log('✗ duplicate id', food.id); bad++; }
  ids.add(food.id);
  if (!catIds.has(food.cat)) { console.log('✗ unknown category', food.id, food.cat); bad++; }
  if (!food.nameFa || !food.nameEn) { console.log('✗ missing name', food.id); bad++; }
  if (!food.servings.length) { console.log('✗ no servings', food.id); bad++; }
  for (const s of food.servings) if (!(s.g > 0) || !s.en || !s.fa) { console.log('✗ bad serving', food.id, JSON.stringify(s)); bad++; }
  for (const [k,v] of Object.entries(p)) if (typeof v !== 'number' || v < 0 || Number.isNaN(v)) { console.log('✗ bad value', food.id, k, v); bad++; }
  if (p.fiber > p.carbs + 0.01) { console.log('✗ fiber exceeds carbs', food.id, p.fiber, p.carbs); bad++; }
}

// scaling maths
const chicken = findFood('chicken_breast');
const m = macrosFor(chicken, 200);
if (Math.abs(m.protein - 62) > 0.01) { console.log('✗ scaling protein', m.protein); bad++; }
if (Math.abs(m.kcal - 330) > 0.01) { console.log('✗ scaling kcal', m.kcal); bad++; }

// every food is loggable in grams
for (const food of FOODS) if (!servingsOf(food).some(s=>s.g===100)) { console.log('✗ no 100 g option', food.id); bad++; }

// search works in both languages and filters by category
if (!searchFoods('chicken').length) { console.log('✗ english search'); bad++; }
if (!searchFoods('مرغ').length) { console.log('✗ persian search'); bad++; }
if (!searchFoods('برنج').length) { console.log('✗ persian search rice'); bad++; }
if (searchFoods('', 'dish').some(f=>f.cat!=='dish')) { console.log('✗ category filter leaks'); bad++; }
if (searchFoods('zzzznope').length) { console.log('✗ nonsense query returns hits'); bad++; }

const est = FOODS.filter(f=>f.estimate).length;
console.log(`${FOODS.length} foods across ${CATEGORIES.length} categories, ${est} flagged as recipe estimates`);
console.log(bad ? `\n${bad} problems` : '\nall checks passed');
process.exit(bad?1:0);
