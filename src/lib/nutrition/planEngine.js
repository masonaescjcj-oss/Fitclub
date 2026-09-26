/**
 * The meal planner: turns a day's targets (profile.js targetsFor) into
 * meals of real foods, at the least cost the budget asks for, and keeps
 * them on target when a food is swapped.
 *
 *   generateWeek(input)   → 7 days of meals
 *   solveDay(day, …)      → portions for chosen foods, hitting the targets
 *   swapOptions(…)        → equivalent foods for one item, closest first
 *   applySwap(…)          → one item changed and its day re-balanced
 *   shoppingList(days)    → what to buy, and what it costs
 *
 * Pure and synchronous: no storage, no clock (dates and a seed come in), so
 * the same input always gives the same plan and the tests can pin it down.
 *
 * How a day is built
 *  1. Each meal takes a template: roles like "main", "starch", "veg" and
 *     "fat", filled from foods whose group and slot fit, never a disliked,
 *     allergenic or diet-excluded one.
 *  2. Each role's food is picked by score: cheap for the nutrient it brings
 *     (toman per gram of protein for a main, of carbs for a starch), weighted
 *     by the budget; liked foods up; foods eaten in the last two days down.
 *  3. solveDay sets the grams: a small box-constrained least-squares over the
 *     day (calories, protein, carbs, fat, each meal's share of the day),
 *     solved by coordinate descent, then rounded to kitchen steps (10 g of
 *     meat, 25 g of rice, whole eggs) and polished by local search.
 *  4. The best of a few tries is kept.
 */

import { findFood } from "./foods";
import { PLAN_FOOD_IDS, foodMeta } from "./foodMeta";

export const BUDGETS = ["economy", "medium", "free"];
export const MEAL_COUNTS = [3, 4, 5];

export const DEFAULT_SETTINGS = {
  budget: "medium",        // economy | medium | free
  weeklyCap: null,         // toman for the week, optional
  meals: 4,                // 3 | 4 | 5
  dislikes: [],            // food ids never planned
  likes: [],               // food ids planned more often
  allergies: [],           // allergen ids (foodMeta.ALLERGENS)
};

/* ─────────────────────────────── meals of a day ─────────────────────────────── */

/** The meals of a day and each one's share of its calories. `slot` is the diary meal it logs into. */
export function mealLayout(count = 4) {
  if (count <= 3) {
    return [
      { id: "b", slot: "breakfast", kind: "b", share: 0.3 },
      { id: "l", slot: "lunch", kind: "l", share: 0.4 },
      { id: "d", slot: "dinner", kind: "d", share: 0.3 },
    ];
  }
  if (count === 4) {
    return [
      { id: "b", slot: "breakfast", kind: "b", share: 0.25 },
      { id: "l", slot: "lunch", kind: "l", share: 0.35 },
      { id: "s", slot: "snack", kind: "s", share: 0.1 },
      { id: "d", slot: "dinner", kind: "d", share: 0.3 },
    ];
  }
  return [
    { id: "b", slot: "breakfast", kind: "b", share: 0.22 },
    { id: "s1", slot: "snack", kind: "s", share: 0.1, part: 1 },
    { id: "l", slot: "lunch", kind: "l", share: 0.3 },
    { id: "s2", slot: "snack", kind: "s", share: 0.1, part: 2 },
    { id: "d", slot: "dinner", kind: "d", share: 0.28 },
  ];
}

/* ─────────────────────────────── the food pool ─────────────────────────────── */

/** Foods the planner may use for this person, as { food, meta } records. */
export function allowedFoods({ dietType = "standard", dislikes = [], allergies = [] } = {}) {
  const out = [];
  for (const id of PLAN_FOOD_IDS) {
    const meta = foodMeta(id);
    const food = findFood(id);
    if (!meta || !food) continue;
    if (dislikes.includes(id)) continue;
    if (meta.allergens.some((a) => allergies.includes(a))) continue;
    if (dietType === "vegetarian" && meta.meat) continue;
    if (dietType === "keto" && !meta.keto) continue;
    out.push({ id, food, meta });
  }
  return out;
}

const has = (m, slot) => m.slots.includes(slot);

/** The foods that can fill one role of one meal. */
function rolePool(pool, role, kind, ctx = {}) {
  const at = pool.filter((f) => has(f.meta, kind));
  switch (role) {
    case "main": return at.filter((f) => (f.meta.group === "protein" && f.meta.sub !== "egg") || f.meta.group === "legume"
      || (ctx.eggMain && f.meta.sub === "egg" && f.id === "egg"));
    case "dish": return at.filter((f) => f.meta.group === "dish");
    case "starch": return at.filter((f) => f.meta.group === "starch" && f.meta.sub !== "oats"
      && (!ctx.pair || (ctx.pair === "rice" ? f.meta.sub === "rice" : f.meta.sub === "bread")));
    case "bstarch": return at.filter((f) => f.meta.group === "starch");
    case "veg": return at.filter((f) => f.meta.group === "veg" && (!ctx.salad || f.meta.sub === "salad"));
    case "fat": return at.filter((f) => f.meta.group === "fat" && f.meta.bounds === "oil");
    case "bprotein": return at.filter((f) => ctx.oats
      ? f.meta.sub === "milk" || f.meta.sub === "yogurt"
      : (f.meta.sub === "egg" && f.id === "egg") || f.meta.sub === "cheese" || f.meta.sub === "yogurt");
    case "bside": return at.filter((f) => (ctx.oats ? f.meta.group === "fruit" : f.meta.sub === "salad" || f.meta.group === "fruit"));
    case "bfat": return at.filter((f) => f.meta.group === "fat" && (f.meta.sub === "nuts" || f.meta.sub === "spread" || f.id === "butter" || f.id === "avocado"));
    case "side": return at.filter((f) => f.meta.sub === "yogurt" || f.id === "doogh");
    case "fruit": return at.filter((f) => f.meta.group === "fruit");
    case "sprotein": return at.filter((f) => (f.meta.group === "dairy" && f.meta.sub !== "milk") || f.meta.group === "supp"
      || (f.meta.group === "fat" && f.meta.sub === "nuts"));
    default: return [];
  }
}

/* ─────────────────────────────── picking foods ─────────────────────────────── */

// How much a cheap food wins over a dear one, by budget.
const COST_WEIGHT = { economy: 1.4, medium: 0.55, free: 0.1 };

/** A small seeded random generator (mulberry32): the same seed, the same plan. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const seedOf = (text) => {
  let h = 2166136261;
  for (const ch of String(text)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h;
};

/** What a food costs per unit of what it's in the meal for (toman per g protein for a main). */
function unitCost(entry, role) {
  const p = entry.food.per100;
  const per = entry.meta.pricePerG;
  if (per == null) return null;
  const key = role === "main" || role === "bprotein" || role === "sprotein" || role === "dish" ? p.protein
    : role === "starch" || role === "bstarch" || role === "fruit" ? p.carbs
      : role === "fat" || role === "bfat" ? p.fat : 100;
  return key > 0 ? (per * 100) / key : null;
}

function pick(pool, role, ctx) {
  const { random, budget, likes, recent, today, goal } = ctx;
  if (!pool.length) return null;
  const costs = pool.map((e) => unitCost(e, role));
  const known = costs.filter((c) => c != null).sort((a, b) => a - b);
  const rank = (c) => (c == null || known.length < 2 ? 0.5 : known.indexOf(c) / (known.length - 1));
  let best = null;
  pool.forEach((e, i) => {
    let s = 1 - (COST_WEIGHT[budget] ?? 0.55) * rank(costs[i]);
    if (likes.includes(e.id)) s += 0.9;
    if (today.has(e.id)) s -= 1.2;
    const lastSeen = recent.get(e.id);
    if (lastSeen === 1) s -= 0.7;
    else if (lastSeen === 2) s -= 0.35;
    // Rice is lunch; bread, potato and pasta are more often dinner.
    if (role === "starch") s += ctx.kind === "l" ? (e.meta.sub === "rice" ? 0.5 : 0) : (e.meta.sub === "rice" ? 0 : 0.2);
    // Liquid oil is what most kitchens cook with.
    if (role === "fat" && e.id === "vegetable_oil") s += 0.4;
    // On a cut, lean mains (more protein per calorie) are worth a little more.
    if (goal === "Weight Loss" && (role === "main" || role === "dish")) {
      const p = e.food.per100;
      s += 0.4 * Math.min(1, (p.protein * 4) / Math.max(p.kcal, 1));
    }
    s += random() * 0.45;
    if (!best || s > best.s) best = { e, s };
  });
  return best.e;
}

/** The roles of one meal, and the foods filling them. */
function buildMeal(kind, pool, ctx) {
  const items = [];
  const add = (role, c = {}) => {
    const e = pick(rolePool(pool, role, kind, c), role, { ...ctx, kind });
    if (e) { items.push({ foodId: e.id, role }); ctx.today.add(e.id); }
    return e;
  };
  const keto = ctx.dietType === "keto";
  if (kind === "b") {
    const starch = keto ? null : add("bstarch");
    const oats = starch?.meta.sub === "oats";
    add("bprotein", { oats });
    if (!keto) add("bside", { oats });
    else add("veg");
    if (keto || ctx.random() < 0.5) add("bfat");
  } else if (kind === "s") {
    if (!keto) add("fruit");
    add("sprotein");
    if (keto) add("bfat");
  } else {
    const dishFirst = !keto && ctx.random() < (kind === "l" ? 0.35 : 0.2);
    const dish = dishFirst ? add("dish") : null;
    if (!dish) add("main", { eggMain: kind === "d" });
    const pair = dish?.meta.pair;
    if (!keto && pair !== "none") add("starch", { pair: dish ? pair : null });
    add("veg", { salad: !!dish });
    if (keto) add("veg");
    if (!dish) add("fat");
    if (!dish && !keto && ctx.random() < 0.4) add("side");
  }
  return items;
}

/* ─────────────────────────────── portions ─────────────────────────────── */

const WEIGHTS = { kcal: 4, protein: 3, carbs: 1.5, fat: 1.2, meal: 1.2, reg: 0.04 };
const SOLVER_COST = { economy: 0.03, medium: 0.008, free: 0 };
const DAILY_COST_REF = 600000; // toman: scales cost against macro error

// On keto, fat carries most of the calories: its portions may go higher.
const KETO_MAX = { oil: 45, nuts: 60, cheese: 120, spread: 40 };
// …and vegetables may go smaller: two or three sides a day add up past the carb ceiling.
const KETO_MIN = { veg: 40 };

function prepare(meals, layout, dietType) {
  const vars = [];
  meals.forEach((meal, m) => {
    meal.items.forEach((item) => {
      const meta = foodMeta(item.foodId);
      const food = findFood(item.foodId);
      if (!meta || !food) return;
      const p = food.per100;
      // On keto a fat's usual portion is the middle of its keto range, or the solver holds it back.
      const top = dietType === "keto" && KETO_MAX[meta.bounds] ? KETO_MAX[meta.bounds] : meta.max;
      const bottom = dietType === "keto" && KETO_MIN[meta.bounds] ? KETO_MIN[meta.bounds] : meta.min;
      const typical = (bottom + top) / 2;
      vars.push({
        item, m, meta,
        e: { kcal: p.kcal / 100, protein: p.protein / 100, carbs: p.carbs / 100, fat: p.fat / 100 },
        cost: meta.pricePerG ?? 0,
        min: bottom,
        // An added food (repair) stays a side: at most halfway up its range.
        max: item.role === "extra" ? (meta.min + meta.max) / 2 : top,
        step: meta.step, typical: item.role === "extra" ? meta.min : typical,
        x: item.grams ?? typical,
      });
    });
  });
  return { vars, shares: layout.map((l) => l.share) };
}

function objective(vars, target, shares, budget) {
  const tot = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const mk = shares.map(() => 0);
  let cost = 0;
  let reg = 0;
  for (const v of vars) {
    for (const k in tot) tot[k] += v.e[k] * v.x;
    mk[v.m] += v.e.kcal * v.x;
    cost += v.cost * v.x;
    reg += ((v.x - v.typical) / v.typical) ** 2;
  }
  let f = 0;
  for (const k of ["kcal", "protein", "carbs", "fat"]) {
    if (!target[k]) continue;
    let r = (tot[k] - target[k]) / target[k];
    // Keto's carbs are a ceiling: under it is fine.
    if (k === "carbs" && target.carbsCap && r < 0) r = 0;
    // Short on protein is worse than a little over; on keto, over the carb ceiling is worse still.
    if (k === "protein" && r < 0) r *= 1.6;
    if (k === "carbs" && target.carbsCap && r > 0) r *= 2;
    f += WEIGHTS[k] * r * r;
  }
  shares.forEach((s, m) => { f += WEIGHTS.meal * ((mk[m] - s * target.kcal) / target.kcal) ** 2; });
  f += (SOLVER_COST[budget] ?? 0) * (cost / DAILY_COST_REF);
  f += WEIGHTS.reg * reg;
  return f;
}

/** Coordinate descent on the continuous problem: each gram amount in turn to its exact optimum, within its bounds. */
function descend(vars, target, shares, budget, sweeps = 60) {
  const K = target.kcal;
  const keys = ["kcal", "protein", "carbs", "fat"].filter((k) => target[k]);
  const lambda = (SOLVER_COST[budget] ?? 0) / DAILY_COST_REF;
  for (let s = 0; s < sweeps; s += 1) {
    for (const v of vars) {
      if (v.fixed) continue;
      let a = WEIGHTS.reg / (v.typical * v.typical);
      let b = -2 * WEIGHTS.reg / v.typical;
      for (const k of keys) {
        let rest = -target[k];
        for (const u of vars) if (u !== v) rest += u.e[k] * u.x;
        const under = rest + v.e[k] * v.x < target[k];
        if (k === "carbs" && target.carbsCap && under) continue;
        const w = WEIGHTS[k] * (k === "protein" && under ? 2.56 : k === "carbs" && target.carbsCap ? 4 : 1);
        const T2 = target[k] * target[k];
        a += (w * v.e[k] * v.e[k]) / T2;
        b += (2 * w * v.e[k] * rest) / T2;
      }
      let mealRest = -shares[v.m] * K;
      for (const u of vars) if (u !== v && u.m === v.m) mealRest += u.e.kcal * u.x;
      a += (WEIGHTS.meal * v.e.kcal * v.e.kcal) / (K * K);
      b += (2 * WEIGHTS.meal * v.e.kcal * mealRest) / (K * K);
      b += lambda * v.cost;
      const x = a > 0 ? -b / (2 * a) : v.x;
      v.x = Math.min(v.max, Math.max(v.min, x));
    }
  }
}

/** Rounds to kitchen steps, then tries one step up or down on each food while that helps. */
function polish(vars, target, shares, budget) {
  for (const v of vars) {
    if (v.fixed) continue;
    v.x = Math.min(v.max, Math.max(v.min, Math.round(v.x / v.step) * v.step));
  }
  let f = objective(vars, target, shares, budget);
  for (let pass = 0; pass < 25; pass += 1) {
    let improved = false;
    for (const v of vars) {
      if (v.fixed) continue;
      for (const d of [v.step, -v.step]) {
        const x = v.x + d;
        if (x < v.min - 1e-9 || x > v.max + 1e-9) continue;
        const old = v.x;
        v.x = x;
        const g = objective(vars, target, shares, budget);
        if (g < f - 1e-12) { f = g; improved = true; } else v.x = old;
      }
    }
    if (!improved) break;
  }
  return f;
}

/** Totals of a list of { foodId, grams }. */
export function itemsTotals(items) {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, cost: 0 };
  for (const it of items || []) {
    const food = findFood(it.foodId);
    if (!food) continue;
    const k = (it.grams || 0) / 100;
    t.kcal += food.per100.kcal * k;
    t.protein += food.per100.protein * k;
    t.carbs += food.per100.carbs * k;
    t.fat += food.per100.fat * k;
    t.fiber += (food.per100.fiber || 0) * k;
    const meta = foodMeta(it.foodId);
    if (meta?.pricePerG != null) t.cost += meta.pricePerG * (it.grams || 0);
  }
  return t;
}

export const dayTotals = (day) => itemsTotals((day?.meals || []).flatMap((m) => m.items));

/** How far a day is from its targets: the largest relative miss of the four numbers. */
export function dayError(day) {
  const t = dayTotals(day);
  const target = day.target;
  let worst = 0;
  for (const k of ["kcal", "protein", "carbs", "fat"]) {
    if (!target[k]) continue;
    const r = k === "carbs" && target.carbsCap
      ? Math.max(0, t[k] - target[k] * 1.2) / target[k]
      : Math.abs(t[k] - target[k]) / target[k];
    // Carbs on keto and fat are allowed more slack: they're whatever the rest leaves.
    worst = Math.max(worst, k === "kcal" || k === "protein" ? r : r / 2);
  }
  return worst;
}

/**
 * Sets the grams of every item of a day so its totals meet `day.target`.
 * `fixed` item ids (foodId@meal) keep their grams. Returns the day, re-portioned.
 */
export function solveDay(day, { budget = "medium", layout, fixed = [], dietType = "standard" } = {}) {
  const lay = layout || mealLayout(day.meals.length);
  const { vars, shares } = prepare(day.meals, lay, dietType);
  for (const v of vars) if (fixed.includes(`${v.item.foodId}@${v.m}`)) v.fixed = true;
  descend(vars, day.target, shares, budget);
  polish(vars, day.target, shares, budget);
  const grams = new Map(vars.map((v) => [v.item, Math.round(v.x)]));
  return {
    ...day,
    meals: day.meals.map((meal) => ({ ...meal, items: meal.items.map((it) => ({ ...it, grams: grams.get(it) ?? it.grams ?? 0 })) })),
  };
}

/* ─────────────────────────────── the week ─────────────────────────────── */

const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * Seven days of meals.
 *
 * @param {Object} input
 * @param {string} input.start       first day, YYYY-MM-DD
 * @param {(date: string) => {kcal, protein, carbs, fat}} input.targetFor
 * @param {Object} input.settings    DEFAULT_SETTINGS' shape
 * @param {string} [input.dietType]  standard | high_protein | vegetarian | keto
 * @param {string} [input.goal]      profile.goal
 * @param {Array}  [input.rules]     [{ from, to }]: always swap `from` for `to`
 * @param {number} [input.seed]
 * @param {number} [input.days]      7
 * @param {number} [input.tries]     attempts per day, the best kept
 */
export function generateWeek({ start, targetFor, settings = DEFAULT_SETTINGS, dietType = "standard", goal = "Keep Fit",
  rules = [], seed = 1, days = 7, tries = 6 }) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  const layout = mealLayout(s.meals);
  const pool = applyRules(allowedFoods({ dietType, dislikes: s.dislikes, allergies: s.allergies }), rules);
  const random = rng(seed);
  // A rule's substitute is planned where the replaced food would have been.
  const likes = [...s.likes, ...rules.map((r) => r.to)];
  const recent = new Map(); // food id → days ago
  const out = [];
  for (let i = 0; i < days; i += 1) {
    const date = addDays(start, i);
    const target = { ...roundTarget(targetFor(date)), ...(dietType === "keto" ? { carbsCap: true } : {}) };
    let best = null;
    for (let t = 0; t < tries; t += 1) {
      const ctx = { random, budget: s.budget, likes, recent, today: new Set(), dietType, goal };
      const meals = layout.map((l) => ({ id: l.id, slot: l.slot, ...(l.part ? { part: l.part } : {}), items: buildMeal(l.kind, pool, ctx), status: null }));
      const day = solveDay({ date, target, meals }, { budget: s.budget, layout, dietType });
      const err = dayError(day);
      const cost = dayTotals(day).cost;
      const score = err + (COST_WEIGHT[s.budget] ?? 0.5) * 0.02 * (cost / DAILY_COST_REF);
      if (!best || score < best.score) best = { day, score, err };
      if (err < 0.03 && t >= 2) break;
    }
    if (best.err > 0.04) best.day = repair(best.day, pool, { budget: s.budget, layout, dietType, likes });
    out.push(best.day);
    for (const [id, ago] of [...recent]) recent.set(id, ago + 1);
    for (const it of best.day.meals.flatMap((m) => m.items)) recent.set(it.foodId, 1);
  }
  return out;
}

// Cheap, plain protein that fits beside almost any meal.
const BOOSTERS = ["egg", "egg_white", "yogurt_plain", "greek_yogurt", "cottage", "tuna_can", "chicken_breast", "whey", "tofu", "feta"];

/**
 * A day that still misses after its tries is usually short on protein (a
 * lentil lunch on a cut) or on calories: one more food goes where it fits
 * best, cheapest first, and the day is solved again. At most two additions.
 */
function repair(day, pool, { budget, layout, dietType, likes }) {
  let best = { day, err: dayError(day) };
  for (let round = 0; round < 3 && best.err > 0.04; round += 1) {
    const t = dayTotals(best.day);
    const shortProtein = t.protein < best.day.target.protein * 0.96;
    const ids = shortProtein
      ? BOOSTERS
      : ["bread_lavash", "bread_barbari", "rice_white", "potato", "walnuts", "almonds", "vegetable_oil", "banana", "dates"];
    const candidates = ids.map((id) => pool.find((e) => e.id === id)).filter(Boolean)
      .sort((a, b) => (likes.includes(b.id) - likes.includes(a.id)) || (a.meta.pricePerG ?? 9) - (b.meta.pricePerG ?? 9));
    const current = best.day;
    const tries = [];
    for (const e of candidates.slice(0, 5)) {
      current.meals.forEach((meal, m) => {
        const kind = layout[m]?.kind || "l";
        if (!e.meta.slots.includes(kind) || meal.items.some((it) => it.foodId === e.id)) return;
        const meals = current.meals.map((mm, i) => (i === m ? { ...mm, items: [...mm.items, { foodId: e.id, role: "extra" }] } : mm));
        const tried = solveDay({ ...current, meals }, { budget, layout, dietType });
        tries.push({ day: tried, err: dayError(tried) });
      });
    }
    const next = tries.reduce((a, b) => (!a || b.err < a.err ? b : a), null);
    if (!next || next.err >= best.err - 0.005) break;
    best = next;
  }
  return best.day;
}

const roundTarget = (t) => ({
  kcal: Math.round(t.kcal), protein: Math.round(t.protein), carbs: Math.round(t.carbs), fat: Math.round(t.fat),
});

/** "Always chicken instead of beef": the replaced food leaves the pool (its substitute is liked, above). */
function applyRules(pool, rules) {
  if (!rules?.length) return pool;
  const out = new Set(rules.map((r) => r.from));
  return pool.filter((e) => !out.has(e.id));
}

/** A week's cost and how it compares with a cap. */
export function weekCost(days) {
  return Math.round(days.reduce((sum, d) => sum + dayTotals(d).cost, 0));
}

/**
 * The week within a toman cap, when it can be: each pass weighs cost more.
 * Returns { days, cost, withinCap, cheapest }.
 */
export function generateWithinCap(input) {
  const cap = input.settings?.weeklyCap;
  let days = generateWeek(input);
  let cost = weekCost(days);
  if (!cap || cost <= cap) return { days, cost, withinCap: true };
  for (const budget of ["medium", "economy"]) {
    if (BUDGETS.indexOf(budget) > BUDGETS.indexOf(input.settings.budget)) continue;
    days = generateWeek({ ...input, settings: { ...input.settings, budget } });
    cost = weekCost(days);
    if (cost <= cap) return { days, cost, withinCap: true };
  }
  return { days, cost, withinCap: false };
}

/* ─────────────────────────────── swaps ─────────────────────────────── */

/** The nutrient a swap keeps equal, by group. */
const KEY_NUTRIENT = { protein: "protein", legume: "protein", dish: "protein", dairy: "protein", supp: "protein",
  starch: "carbs", fruit: "carbs", sweet: "carbs", fat: "fat", veg: null, drink: null };

/**
 * Foods that can take an item's place, with the grams that keep its key
 * nutrient (protein for a main, carbs for a starch) and what changes.
 * Closest first. Same group only; a legume may stand in for a meat, a meat
 * for a legume (vegetarians never see meat: the pool is theirs).
 */
export function swapOptions(item, { pool, slot = "l", limit = 12 } = {}) {
  const meta = foodMeta(item.foodId);
  const food = findFood(item.foodId);
  if (!meta || !food) return [];
  const key = KEY_NUTRIENT[meta.group];
  const base = itemsTotals([item]);
  const groups = meta.group === "protein" || meta.group === "legume" ? ["protein", "legume"]
    : meta.group === "dish" ? ["dish", "protein"] : [meta.group];
  const candidates = (pool || allowedFoods()).filter((e) => e.id !== item.foodId && groups.includes(e.meta.group)
    && e.meta.slots.includes(slot) && (meta.bounds !== "oil" || e.meta.bounds === "oil"));
  const options = [];
  for (const e of candidates) {
    const per = key ? e.food.per100[key] : null;
    let grams = key && per > 0 ? (base[key] / per) * 100 : item.grams;
    grams = Math.min(e.meta.max, Math.max(e.meta.min, Math.round(grams / e.meta.step) * e.meta.step));
    const t = itemsTotals([{ foodId: e.id, grams }]);
    const delta = {
      kcal: Math.round(t.kcal - base.kcal), protein: Math.round(t.protein - base.protein),
      carbs: Math.round(t.carbs - base.carbs), fat: Math.round(t.fat - base.fat), cost: Math.round(t.cost - base.cost),
    };
    const distance = Math.abs(delta.kcal) / Math.max(base.kcal, 1) + (key ? Math.abs(t[key] - base[key]) / Math.max(base[key], 1) : 0)
      + (e.meta.sub === meta.sub ? 0 : 0.25);
    options.push({ foodId: e.id, grams, delta, distance });
  }
  return options.sort((a, b) => a.distance - b.distance).slice(0, limit);
}

/**
 * One item swapped for another food; the rest of the day is re-portioned so
 * the day still meets its targets (the new food's grams stay as chosen).
 */
export function applySwap(day, { mealIndex, itemIndex, foodId, grams, budget = "medium", dietType = "standard" }) {
  const meals = day.meals.map((meal, m) => (m !== mealIndex ? meal : {
    ...meal,
    items: meal.items.map((it, i) => (i !== itemIndex ? it : { ...it, foodId, grams, swapped: true })),
  }));
  return solveDay({ ...day, meals }, { budget, dietType, fixed: [`${foodId}@${mealIndex}`] });
}

/**
 * The same day's foods re-portioned for new targets (a weekly review moved
 * the calories): nothing is swapped, only the grams change.
 */
export function retargetDay(day, target, { budget = "medium", dietType = "standard" } = {}) {
  const next = { ...roundTarget(target), ...(dietType === "keto" ? { carbsCap: true } : {}) };
  return solveDay({ ...day, target: next }, { budget, dietType });
}

/* ─────────────────────────────── shopping ─────────────────────────────── */

/**
 * What to buy for these days: grams as bought (eaten ÷ yield), rounded up to
 * 50 g (eggs to whole eggs, bread to whole loaves), and the cost.
 */
export function shoppingList(days) {
  const eaten = new Map();
  for (const d of days) for (const m of d.meals) for (const it of m.items) eaten.set(it.foodId, (eaten.get(it.foodId) || 0) + (it.grams || 0));
  const rows = [];
  for (const [foodId, g] of eaten) {
    const meta = foodMeta(foodId);
    const food = findFood(foodId);
    if (!meta || !food || g <= 0) continue;
    const bought = g / meta.yield;
    let amount;
    let unit;
    if (foodId === "egg") { amount = Math.ceil(bought / 50); unit = "egg"; }
    else if (meta.sub === "bread" && foodId !== "bread_whole") {
      const piece = foodId === "bread_lavash" ? 45 : 240;
      amount = Math.ceil(bought / piece); unit = foodId === "bread_lavash" ? "sheet" : "loaf";
    } else { amount = Math.ceil(bought / 50) * 50; unit = "g"; }
    const grams = unit === "g" ? amount : unit === "egg" ? amount * 50 : amount * (foodId === "bread_lavash" ? 45 : 240);
    const cost = meta.pricePerG != null ? Math.round((meta.pricePerG * meta.yield) * grams) : null;
    rows.push({ foodId, group: meta.group, amount, unit, grams, cost, estimate: meta.priceEstimate });
  }
  const order = ["protein", "legume", "dish", "dairy", "starch", "veg", "fruit", "fat", "sweet", "supp", "drink"];
  rows.sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || (b.cost || 0) - (a.cost || 0));
  return { rows, total: rows.reduce((s, r) => s + (r.cost || 0), 0) };
}
