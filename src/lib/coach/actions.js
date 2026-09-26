/**
 * The coach's hands: when the athlete asks it to change their plan, the
 * coach ends its reply with a `fitclub-action` block (a JSON list of
 * actions, spelled out in ACTION_RULES). Nothing here trusts it: every
 * action is checked against the planners and turned into a before/after
 * card, and nothing changes until the athlete taps Apply.
 *
 *   parseActions(text)         → { text without the block, actions[] }
 *   previewActions(actions, s) → one card per action: ok, title, before, after
 *
 * Pure: the stores' data comes in as `state`; applying is useCoach's job.
 */

import { ALLERGENS, PLAN_FOOD_IDS, foodMeta } from "../nutrition/foodMeta";
import { findFood } from "../nutrition/foods";
import { PACES, targetsFor } from "../nutrition/profile";
import { BUDGETS, DEFAULT_SETTINGS, MEAL_COUNTS, generateWeek, swapOptions, weekCost } from "../nutrition/planEngine";
import { INJURIES, LEVELS, SESSION_MINUTES, generateProgram, swapExercise } from "../training/programGen";
import { exerciseName, findExercise } from "../training/exercises";

export const ACTION_TAG = "fitclub-action";
const DIETS = ["standard", "high_protein", "vegetarian", "keto"];
const PLACES = ["gym", "home_gear", "home"];
const GOALS = ["Weight Loss", "Muscle Gain", "Keep Fit", "Max Strength"];
const MAX_ACTIONS = 4;

/** The foods the planner can use, for the prompt: `id = name`. */
export const plannableFoods = (isRtl) => PLAN_FOOD_IDS
  .filter((id) => foodMeta(id)?.slots?.length)
  .map((id) => `${id} = ${(isRtl ? findFood(id)?.nameFa : findFood(id)?.nameEn) || id}`);

export const ACTION_RULES = `Changing the plan: FitClub builds the athlete's meal plan and workout program with its own planners. When the athlete asks you to change either one, or their daily targets (or clearly says yes to a change you offered), end your reply with ONE fenced code block tagged ${ACTION_TAG} holding a JSON array of actions. The app checks each action against its planners and shows the athlete a before/after card; nothing changes until they tap Apply. So in your text say what you propose and why, in a sentence or two; never say it is already done. Do not send a block for questions, explanations or advice that changes nothing.
Actions (use only these fields and values; ids from "Plannable foods"):
- {"type":"swap_food","from":"<food id>","to":"<food id>","scope":"week"|"always"} replace one food in the meal plan with another; "always" keeps it swapped in every future plan.
- {"type":"meal_settings","budget":"economy"|"medium"|"free","meals":3|4|5,"dislike":["<food id>"],"allergy":[${ALLERGENS.map((a) => `"${a.id}"`).join("|")}]} any of these fields; the week is rebuilt.
- {"type":"diet","dietType":"standard"|"high_protein"|"vegetarian"|"keto"}
- {"type":"pace","pace":"slow"|"normal"|"fast"} how fast to lose or gain weight.
- {"type":"calories","delta":<whole number from -300 to 300>} move the daily calorie target.
- {"type":"program","days":<2-6>,"minutes":30|45|60|90,"location":"gym"|"home_gear"|"home","level":"beginner"|"intermediate"|"advanced","injuries":[${INJURIES.map((i) => `"${i.id}"`).join("|")}],"goal":"Weight Loss"|"Muscle Gain"|"Keep Fit"|"Max Strength"} any of these fields; a new workout program from the planner, everything not given kept as it is. "home_gear" is home with dumbbells.
- {"type":"swap_exercise","from":"<exercise name as written in the program>","to":"<an exercise name, optional>"} replace one exercise in the active program with the same kind of movement.
Example: the athlete says they don't eat red meat → your advice, then
\`\`\`${ACTION_TAG}
[{"type":"swap_food","from":"beef_lean","to":"chicken_breast","scope":"always"},{"type":"meal_settings","dislike":["lamb"]}]
\`\`\``;

const BLOCK = new RegExp("```\\s*" + ACTION_TAG + "\\s*\\n([\\s\\S]*?)```", "i");
// A block still streaming in, not yet closed: hidden from the bubble too.
const OPEN_BLOCK = new RegExp("```\\s*" + ACTION_TAG + "[\\s\\S]*$", "i");

/** The reply without its action block, and the actions in it (at most four, objects only). */
export function parseActions(text = "") {
  const m = String(text).match(BLOCK);
  if (!m) return { text: String(text).replace(OPEN_BLOCK, "").trimEnd(), actions: [] };
  let actions = [];
  try {
    const raw = JSON.parse(m[1].trim());
    actions = (Array.isArray(raw) ? raw : [raw]).filter((a) => a && typeof a === "object" && typeof a.type === "string").slice(0, MAX_ACTIONS);
  } catch {
    actions = [];
  }
  return { text: String(text).replace(BLOCK, "").replace(OPEN_BLOCK, "").trim(), actions };
}

/* ─────────────────────────────── checking ─────────────────────────────── */

const pick = (v, allowed) => (allowed.includes(v) ? v : undefined);
const foodId = (v) => {
  if (typeof v !== "string") return null;
  const id = v.trim();
  if (PLAN_FOOD_IDS.includes(id) && foodMeta(id)?.slots?.length) return id;
  // A name instead of an id: match it against the planner's foods.
  const low = id.toLowerCase();
  return PLAN_FOOD_IDS.find((f) => {
    const food = findFood(f);
    return food && (food.nameFa === id || food.nameEn?.toLowerCase() === low || food.nameFa?.replace(/\s*پخته$/, "") === id);
  }) || null;
};
const exerciseIn = (program, name) => {
  if (!program || typeof name !== "string") return null;
  const want = name.trim().toLowerCase();
  const all = program.days.flatMap((d) => d.exercises.map((e) => e.exerciseId));
  const scored = [...new Set(all)].map((id) => {
    const ex = findExercise(id);
    const names = [ex?.nameEn, ex?.nameFa, exerciseName(id, false), exerciseName(id, true)].filter(Boolean).map((s) => s.toLowerCase());
    const exact = names.some((s) => s === want) ? 3 : names.some((s) => s.includes(want) || want.includes(s)) ? 2 : 0;
    return { id, exact };
  }).filter((x) => x.exact).sort((a, b) => b.exact - a.exact);
  return scored[0]?.id || null;
};

/** One action made safe: known type, known values, numbers in range. Null when nothing usable is left. */
export function checkAction(a, state) {
  switch (a?.type) {
    case "swap_food": {
      const from = foodId(a.from);
      const to = foodId(a.to);
      if (!from || !to || from === to) return null;
      return { type: "swap_food", from, to, scope: a.scope === "always" ? "always" : "week" };
    }
    case "meal_settings": {
      const out = { type: "meal_settings" };
      if (pick(a.budget, BUDGETS)) out.budget = a.budget;
      if (MEAL_COUNTS.includes(+a.meals)) out.meals = +a.meals;
      const dislike = (Array.isArray(a.dislike) ? a.dislike : []).map(foodId).filter(Boolean);
      const allergy = (Array.isArray(a.allergy) ? a.allergy : []).filter((x) => ALLERGENS.some((al) => al.id === x));
      if (dislike.length) out.dislike = [...new Set(dislike)];
      if (allergy.length) out.allergy = [...new Set(allergy)];
      return Object.keys(out).length > 1 ? out : null;
    }
    case "diet":
      return pick(a.dietType, DIETS) ? { type: "diet", dietType: a.dietType } : null;
    case "pace":
      return pick(a.pace, PACES) ? { type: "pace", pace: a.pace } : null;
    case "calories": {
      const d = Math.round(+a.delta);
      if (!Number.isFinite(d) || d === 0) return null;
      return { type: "calories", delta: Math.max(-300, Math.min(300, Math.round(d / 10) * 10)) };
    }
    case "program": {
      const out = { type: "program" };
      const days = Math.round(+a.days);
      if (days >= 2 && days <= 6) out.days = days;
      if (SESSION_MINUTES.includes(+a.minutes)) out.minutes = +a.minutes;
      if (pick(a.location, PLACES)) out.location = a.location;
      if (pick(a.level, LEVELS)) out.level = a.level;
      if (pick(a.goal, GOALS)) out.goal = a.goal;
      if (Array.isArray(a.injuries)) out.injuries = a.injuries.filter((x) => INJURIES.some((i) => i.id === x));
      return Object.keys(out).length > 1 ? out : null;
    }
    case "swap_exercise": {
      const program = state.program;
      const from = exerciseIn(program, a.from);
      if (!from) return null;
      const options = swapExercise(findExercise(from), { location: state.generator?.location || "gym", level: state.generator?.level || "advanced", injuries: state.generator?.injuries || [], limit: 30 });
      if (!options.length) return null;
      // A named replacement is taken when it is a real alternative; otherwise the planner's best.
      const want = typeof a.to === "string" ? a.to.trim().toLowerCase() : "";
      const named = want && options.find((x) => [x.nameEn, x.nameFa].filter(Boolean).some((s) => s.toLowerCase() === want || s.toLowerCase().includes(want)));
      return { type: "swap_exercise", from, to: (named || options[0]).id };
    }
    default:
      return null;
  }
}

/* ─────────────────────────────── before / after ─────────────────────────────── */

const COPY = {
  en: {
    swap_food: "Swap a food", meal_settings: "Meal plan settings", diet: "Diet", pace: "Pace", calories: "Daily calories",
    program: "Workout program", swap_exercise: "Swap an exercise",
    inPlan: (n) => `in ${n} meal${n === 1 ? "" : "s"} still ahead`, notInPlan: "not in this week's plan yet",
    samePortion: (g) => `about ${g} g, same key nutrient`, always: "and in every future plan",
    budget: { economy: "economy", medium: "medium", free: "no limit" }, meals: (n) => `${n} meals`, perWeek: (v) => `about ${v} toman a week`,
    leaveOut: "leave out", diets: { standard: "balanced", high_protein: "high protein", vegetarian: "vegetarian", keto: "keto" },
    paces: { slow: "slow", normal: "steady", fast: "fast" }, kcal: (k, p) => `${k} kcal · ${p} g protein`,
    days: (d, m) => `${d} days a week · ${m} min`, sameMove: "same kind of movement", none: "nothing to change",
    perWeekKg: (k) => `about ${k} kg a week`, capped: "Held to what is safe for your size.",
    places: { gym: "gym", home_gear: "home, dumbbells", home: "home, no equipment" }, spares: (j) => `spares: ${j}`,
  },
  fa: {
    swap_food: "جایگزینی غذا", meal_settings: "تنظیمات برنامه‌ی غذایی", diet: "نوع رژیم", pace: "سرعت تغییر وزن", calories: "کالری روزانه",
    program: "برنامه‌ی تمرینی", swap_exercise: "جایگزینی حرکت",
    inPlan: (n) => `در ${n} وعده‌ی پیش رو`, notInPlan: "فعلاً در برنامه‌ی این هفته نیست",
    samePortion: (g) => `حدود ${g} گرم، همان ماده‌ی اصلی`, always: "و در همه‌ی برنامه‌های بعدی",
    budget: { economy: "اقتصادی", medium: "میانه", free: "آزاد" }, meals: (n) => `${n} وعده`, perWeek: (v) => `حدود ${v} تومان در هفته`,
    leaveOut: "حذف", diets: { standard: "متعادل", high_protein: "پرپروتئین", vegetarian: "گیاهی", keto: "کتو" },
    paces: { slow: "آهسته", normal: "معمولی", fast: "سریع" }, kcal: (k, p) => `${k} کالری · ${p} گرم پروتئین`,
    days: (d, m) => `${d} روز در هفته · ${m} دقیقه`, sameMove: "همان نوع حرکت", none: "چیزی برای تغییر نیست",
    perWeekKg: (k) => `حدود ${k} کیلو در هفته`, capped: "برای سلامتت، سریع‌تر از این پیشنهاد نمی‌شود.",
    places: { gym: "باشگاه", home_gear: "خانه با دمبل", home: "خانه بدون وسیله" }, spares: (j) => `بدون فشار بر: ${j}`,
  },
};

const faDigits = (s) => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
const grouped = (v, isRtl) => { const s = Math.round(v).toLocaleString("en-US"); return isRtl ? faDigits(s) : s; };
/** Toman, short: 2.2 million, 850 thousand. */
const toman = (v, isRtl) => {
  const x = Math.round(v || 0);
  if (x >= 1e6) { const m = String(Math.round(x / 1e5) / 10); return isRtl ? `${faDigits(m).replace(".", "٫")} میلیون` : `${m} million`; }
  return isRtl ? `${faDigits(Math.round(x / 1000))} هزار` : `${Math.round(x / 1000)} thousand`;
};
const kgWeek = (v, isRtl) => { const t = String(Math.round(Math.abs(v) * 100) / 100); return isRtl ? faDigits(t).replace(".", "٫") : t; };
const foodLabel = (id, isRtl) => (isRtl ? findFood(id)?.nameFa : findFood(id)?.nameEn) || id;
const exLabel = (id, isRtl) => exerciseName(id, isRtl);

/** Plan days still ahead (today's meals not yet ticked, and later days). */
const aheadItems = (plan, today, from) => (plan?.week?.days || [])
  .filter((d) => d.date >= today)
  .flatMap((d) => d.meals.filter((m) => !m.status).flatMap((m) => m.items.filter((it) => it.foodId === from).map((it) => ({ it, slot: m.id[0] }))));

/**
 * Cards for the athlete to confirm: `{ ok, action, title, before, after }`,
 * or `{ ok: false }` for an action the planners can't take.
 *
 * @param {Array}  actions  parsed from the reply
 * @param {Object} state    { profile, plan, program, generator, today, isRtl, estimate }
 */
export function previewActions(actions, state) {
  const { profile, plan, program, generator, today, isRtl } = state;
  const c = COPY[isRtl ? "fa" : "en"];
  const n = (v) => (isRtl ? faDigits(v) : String(v));
  const cards = [];
  for (const raw of actions || []) {
    const a = checkAction(raw, state);
    if (!a) { cards.push({ ok: false, raw }); continue; }
    const card = { ok: true, action: a, title: c[a.type] };
    if (a.type === "swap_food") {
      const found = aheadItems(plan, today, a.from);
      const first = found[0];
      let grams = first?.it.grams || foodMeta(a.to)?.min || 100;
      if (first) {
        const opt = swapOptions(first.it, { pool: [{ id: a.to, food: findFood(a.to), meta: foodMeta(a.to) }], slot: first.slot, limit: 1 })[0];
        if (opt?.grams) grams = opt.grams;
      }
      card.before = `${foodLabel(a.from, isRtl)} · ${found.length ? c.inPlan(n(found.length)) : c.notInPlan}`;
      card.after = `${foodLabel(a.to, isRtl)} · ${c.samePortion(n(grams))}${a.scope === "always" ? ` ${c.always}` : ""}`;
      card.grams = grams;
    } else if (a.type === "meal_settings") {
      const s = { ...DEFAULT_SETTINGS, ...(plan?.settings || {}) };
      const next = {
        ...s,
        ...(a.budget ? { budget: a.budget } : {}),
        ...(a.meals ? { meals: a.meals } : {}),
        dislikes: [...new Set([...(s.dislikes || []), ...(a.dislike || [])])],
        allergies: [...new Set([...(s.allergies || []), ...(a.allergy || [])])],
      };
      const target = targetsFor(profile);
      const costOf = (settings) => {
        try {
          return weekCost(generateWeek({ start: today, days: 7, tries: 2, seed: 3, targetFor: () => target, settings, dietType: profile.dietType, goal: profile.goal, rules: plan?.rules || [] }));
        } catch { return null; }
      };
      const line = (st, extra) => [c.budget[st.budget], c.meals(n(st.meals)), extra].filter(Boolean).join(" · ");
      const before = costOf(s);
      const after = costOf(next);
      const out = [...(a.dislike || []).map((id) => foodLabel(id, isRtl)), ...(a.allergy || []).map((id) => ALLERGENS.find((x) => x.id === id)?.[isRtl ? "fa" : "en"])];
      card.before = line(s, before != null ? c.perWeek(toman(before, isRtl)) : null);
      card.after = line(next, after != null ? c.perWeek(toman(after, isRtl)) : null) + (out.length ? ` · ${c.leaveOut}: ${out.join(isRtl ? "، " : ", ")}` : "");
      card.settings = { budget: next.budget, meals: next.meals, dislikes: next.dislikes, allergies: next.allergies };
    } else if (["diet", "pace", "calories"].includes(a.type)) {
      const patch = a.type === "diet" ? { dietType: a.dietType } : a.type === "pace" ? { pace: a.pace } : { kcalAdjust: Math.max(-600, Math.min(600, (profile.kcalAdjust || 0) + a.delta)) };
      const t0 = targetsFor({ ...profile, customTargets: null });
      const t1 = targetsFor({ ...profile, ...patch, customTargets: null });
      const label = a.type === "diet" ? (p) => c.diets[p.dietType || "standard"]
        : a.type === "pace" ? (p, t) => `${c.paces[p.pace || "normal"]}${t.pace?.weeklyKg ? ` · ${c.perWeekKg(kgWeek(t.pace.weeklyKg, isRtl))}` : ""}` : () => null;
      card.before = [label(profile, t0), c.kcal(grouped(t0.kcal, isRtl), n(t0.protein))].filter(Boolean).join(" · ");
      card.after = [label({ ...profile, ...patch }, t1), c.kcal(grouped(t1.kcal, isRtl), n(t1.protein))].filter(Boolean).join(" · ");
      if (t1.pace?.capped && a.type === "pace") card.note = c.capped;
      card.profile = patch;
      if (t0.kcal === t1.kcal && a.type === "calories") card.ok = false;
    } else if (a.type === "program") {
      const base = { goal: profile.goal || "Keep Fit", days: 3, minutes: 60, level: "intermediate", location: "gym", injuries: [], focus: [], ...(generator || {}) };
      const input = { ...base, ...a, type: undefined };
      delete input.type;
      const next = generateProgram({ ...input, seed: 7 });
      const days = (p) => p.days.filter((d) => d.type !== "rest").length;
      const place = (x) => c.places[x.location] || x.location;
      const hurts = (x) => (x.injuries?.length ? ` · ${c.spares(x.injuries.map((i) => INJURIES.find((j) => j.id === i)?.[isRtl ? "fa" : "en"]).join(isRtl ? "، " : ", "))}` : "");
      card.before = program ? `${(isRtl && program.nameFa) || program.name} · ${c.days(n(days(program)), n(base.minutes))} · ${place(base)}${hurts(base)}` : c.none;
      card.after = `${isRtl ? next.nameFa : next.name} · ${c.days(n(days(next)), n(input.minutes))} · ${place(input)}${hurts(input)}`;
      card.input = input;
    } else if (a.type === "swap_exercise") {
      card.before = exLabel(a.from, isRtl);
      card.after = `${exLabel(a.to, isRtl)} · ${c.sameMove}`;
    }
    cards.push(card);
  }
  return cards;
}
