// The coach's changes (src/lib/coach/actions.js): the action block is read
// out of a reply, every action is checked against the planners, and each
// becomes a before/after card. Six sample replies, like the ones the live
// coach gives, each make the right change.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ACTION_RULES, checkAction, parseActions, previewActions } from "../src/lib/coach/actions.js";
import { coachSystemBlocks, snapshotToText, buildCoachSnapshot } from "../src/lib/coach/context.js";
import { toApiMessages } from "../src/lib/coach/coachStore.js";
import { buildWeek, emptyPlan } from "../src/lib/nutrition/mealPlanStore.js";
import { targetsFor } from "../src/lib/nutrition/profile.js";
import { loadExerciseCatalog } from "../src/lib/training/catalog.js";
import { allExercises, findExercise } from "../src/lib/training/exercises.js";
import { classify } from "../src/lib/training/patterns.js";
import { generateProgram } from "../src/lib/training/programGen.js";

let pass = 0, fail = 0;
const check = (name, cond, got) => { cond ? pass++ : fail++; if (!cond) console.log("✗", name, got !== undefined ? `(got ${JSON.stringify(got).slice(0, 400)})` : ""); };
const block = (actions) => `Advice first.\n\n\`\`\`fitclub-action\n${JSON.stringify(actions)}\n\`\`\``;

/* ── reading the block ── */
let r = parseActions(block([{ type: "pace", pace: "fast" }]));
check("the block is read out of the reply", r.actions.length === 1 && r.actions[0].pace === "fast");
check("…and taken out of the text the athlete sees", r.text === "Advice first.", r.text);
check("a single object counts as one action", parseActions(block({ type: "diet", dietType: "keto" })).actions.length === 1);
check("broken JSON is no action, and still hidden", (() => { const x = parseActions("Hi\n```fitclub-action\n[{oops\n```"); return x.actions.length === 0 && x.text === "Hi"; })());
check("a block still streaming in is hidden", parseActions("Sure.\n```fitclub-action\n[{\"type\":").text === "Sure.");
check("at most four actions", parseActions(block(Array.from({ length: 7 }, () => ({ type: "pace", pace: "slow" })))).actions.length === 4);
check("a reply without a block is left alone", parseActions("Just advice.").text === "Just advice." && parseActions("Just advice.").actions.length === 0);
check("a code block of another kind stays in the text", parseActions("```js\nx\n```").text.includes("```js"));

/* ── checking ── */
const state0 = { profile: {}, plan: null, program: null };
check("unknown actions are dropped", checkAction({ type: "delete_account" }, state0) === null && checkAction({ type: "diet", dietType: "carnivore" }, state0) === null);
check("a food by name is found", checkAction({ type: "swap_food", from: "سینه مرغ پخته", to: "tofu" }, state0)?.from === "chicken_breast");
check("a food the planner can't use is refused", checkAction({ type: "swap_food", from: "unicorn", to: "tofu" }, state0) === null && checkAction({ type: "swap_food", from: "tofu", to: "tofu" }, state0) === null);
check("calories are held to ±300, in tens", checkAction({ type: "calories", delta: -812 }, state0).delta === -300 && checkAction({ type: "calories", delta: 124 }, state0).delta === 120);
check("only known allergies and foods are left out", JSON.stringify(checkAction({ type: "meal_settings", allergy: ["fish", "kryptonite"], dislike: ["lamb", "dragon"] }, state0)) === JSON.stringify({ type: "meal_settings", dislike: ["lamb"], allergy: ["fish"] }));
check("program fields out of range are dropped", JSON.stringify(checkAction({ type: "program", days: 9, minutes: 50, location: "moon", injuries: ["knee", "soul"] }, state0)) === JSON.stringify({ type: "program", injuries: ["knee"] }));
check("an empty change is no change", checkAction({ type: "program", days: 12 }, state0) === null && checkAction({ type: "meal_settings", budget: "gold" }, state0) === null);

/* ── a person, their plan and program ── */
const catalog = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "public", "exercises", "catalog.json"), "utf8"));
await loadExerciseCatalog({ force: true, fetch: async () => ({ ok: true, json: async () => catalog }) });
const profile = { gender: "female", age: 31, height: 166, weight: 72, goal: "Weight Loss", pace: "normal", frequency: "4_5", difficulty: "moderate", dietType: "standard" };
const today = "2026-09-26";
const target = targetsFor(profile);
const base = emptyPlan();
const plan = { ...base, week: buildWeek({ plan: base, profile, targetFor: () => target, start: today, nonce: 5 }) };
const program = generateProgram({ goal: "Weight Loss", days: 4, minutes: 60, level: "intermediate", location: "gym", seed: 3, exercises: allExercises() });
const state = { profile, plan, program, generator: program.generator, today, isRtl: true };
const inPlan = [...new Set(plan.week.days.flatMap((d) => d.meals.flatMap((m) => m.items.map((i) => i.foodId))))];
const aProtein = inPlan.find((id) => ["beef_lean", "chicken_breast", "chicken_thigh", "white_fish", "tuna_can", "lamb"].includes(id));
const squat = program.days.flatMap((d) => d.exercises).map((e) => findExercise(e.exerciseId)).find((e) => classify(e).pattern === "squat");

// Six replies like the live coach's, one per sample request.
const samples = [
  ["I don't eat red meat, give me chicken instead", [{ type: "swap_food", from: aProtein === "chicken_breast" ? "chicken_thigh" : aProtein, to: "chicken_breast", scope: "always" }, { type: "meal_settings", dislike: ["lamb"] }],
    (cards) => cards[0].ok && cards[0].action.to === "chicken_breast" && /همه‌ی برنامه‌های بعدی/.test(cards[0].after) && cards[1].ok && cards[1].settings.dislikes.includes("lamb")],
  ["Make my meal plan cheaper", [{ type: "meal_settings", budget: "economy" }],
    (cards) => cards[0].ok && cards[0].settings.budget === "economy" && /اقتصادی/.test(cards[0].after) && /میلیون|هزار/.test(cards[0].before)],
  ["Only three days to train", [{ type: "program", days: 3 }],
    (cards) => cards[0].ok && cards[0].input.days === 3 && /۴ روز در هفته/.test(cards[0].before) && /۳ روز در هفته/.test(cards[0].after) && cards[0].input.location === "gym"],
  ["My knee hurts", [{ type: "program", injuries: ["knee"] }],
    (cards) => cards[0].ok && cards[0].input.injuries.includes("knee") && /بدون فشار بر: زانو/.test(cards[0].after) && !/زانو/.test(cards[0].before)],
  [`Swap ${squat.nameEn}`, [{ type: "swap_exercise", from: squat.nameEn }],
    (cards) => cards[0].ok && cards[0].action.from === squat.id && cards[0].action.to !== squat.id && classify(findExercise(cards[0].action.to)).pattern === "squat"],
  ["I want to lose faster", [{ type: "pace", pace: "fast" }],
    (cards) => cards[0].ok && cards[0].profile.pace === "fast" && /معمولی/.test(cards[0].before) && /سریع/.test(cards[0].after) && /کیلو در هفته/.test(cards[0].after)],
];
for (const [ask, actions, ok] of samples) {
  const cards = previewActions(parseActions(block(actions)).actions, state);
  check(`"${ask}" → the right change, with a before and an after`, ok(cards), cards.map(({ action, before, after, note }) => ({ action, before, after, note })));
}

const swap = previewActions([{ type: "swap_food", from: aProtein, to: aProtein === "tofu" ? "egg" : "tofu", scope: "week" }], state)[0];
const count = plan.week.days.flatMap((d) => d.meals.flatMap((m) => m.items)).filter((i) => i.foodId === aProtein).length;
check("a swap says how many meals ahead it changes", new RegExp(`${String(count).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d])} وعده`).test(swap.before), swap.before);
check("a calorie shift the floor blocks is no change", previewActions([{ type: "calories", delta: -300 }], { ...state, profile: { ...profile, weight: 45, height: 150, age: 60, kcalAdjust: -600 } })[0].ok === false);
check("a pace the limits hold back says so", !!previewActions([{ type: "pace", pace: "fast" }], { ...state, profile: { ...profile, weight: 50, height: 155 } })[0].note);

/* ── the prompt ── */
const snap = buildCoachSnapshot({ nutrition: { diary: { days: {} }, profile, estimate: null, trend: [], mealPlan: plan }, training: { sessions: [], activeProgram: program }, lists: [], isRtl: true });
const text = snapshotToText(snap);
check("the coach sees the meal plan and the foods it may use", /## Meal plan/.test(text) && /## Plannable foods/.test(text) && /chicken_breast = سینه مرغ/.test(text), text.slice(0, 200));
check("…and what the program was made from", /made by the planner from: goal Weight Loss, days 4/.test(text));
check("…and the rules for changing them", coachSystemBlocks(snap)[0].text.includes(ACTION_RULES) && coachSystemBlocks(snap)[0].cache_control);
check("the prompt stays well inside the proxy's limit", JSON.stringify(coachSystemBlocks(snap)).length < 20000, JSON.stringify(coachSystemBlocks(snap)).length);
const history = toApiMessages([{ role: "user", text: "cheaper please" }, { role: "assistant", text: block([{ type: "meal_settings", budget: "economy" }]), actionState: "applied" }]);
check("the coach is told which proposals were applied", /applied the changes/.test(history[1].content));

console.log(`coach actions: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
