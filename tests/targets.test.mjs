// The day's numbers (src/lib/nutrition/profile.js) across many kinds of
// people: the chosen pace of losing or gaining, and the safety limits that
// hold whatever is asked for.
import { KCAL_FLOOR, PACE_KG, bmr, paceFor, targetsFor, tdee } from "../src/lib/nutrition/profile.js";

let pass = 0, fail = 0;
const check = (name, cond, got) => { cond ? pass++ : fail++; if (!cond) console.log("✗", name, got !== undefined ? `(got ${JSON.stringify(got).slice(0, 500)})` : ""); };

// 50+ people: both sexes, 18 to 70, small to large, every goal, pace and diet.
const people = [];
const bodies = [
  ["female", 19, 155, 48], ["female", 28, 162, 58], ["female", 35, 168, 72], ["female", 45, 160, 88], ["female", 62, 158, 66], ["female", 24, 175, 110],
  ["male", 18, 170, 58], ["male", 26, 178, 76], ["male", 33, 183, 92], ["male", 41, 175, 105], ["male", 55, 172, 84], ["male", 70, 168, 70], ["male", 29, 190, 130],
];
const goals = ["Weight Loss", "Muscle Gain", "Keep Fit", "Max Strength"];
const paces = ["slow", "normal", "fast"];
const diets = ["standard", "high_protein", "vegetarian", "keto"];
let i = 0;
for (const [gender, age, height, weight] of bodies) {
  for (const goal of goals) {
    i += 1;
    people.push({ gender, age, height, weight, goal, pace: paces[i % 3], dietType: diets[i % 4], frequency: ["2_3", "3_4", "4_5", "5_6"][i % 4], difficulty: "moderate" });
  }
}
check("the sweep covers 50 people or more", people.length >= 50, people.length);

const problems = [];
for (const p of people) {
  const t = targetsFor(p);
  const m = tdee(p);
  const floor = Math.max(bmr(p), KCAL_FLOOR[p.gender]);
  const who = `${p.gender} ${p.age}y ${p.weight}kg ${p.goal} ${p.pace} ${p.dietType}`;
  const say = (what) => problems.push(`${who}: ${what}`);
  if (t.kcal < floor - 1) say(`${t.kcal} kcal is under the floor ${Math.round(floor)}`);
  if (p.goal === "Weight Loss") {
    if (-t.pace.weeklyKg > p.weight * 0.01 + 0.01) say(`loses ${-t.pace.weeklyKg} kg a week, over 1% of body weight`);
    if (m - t.kcal > m * 0.25 + 1) say(`a deficit of ${m - t.kcal}, over 25% of ${m}`);
    if (t.kcal >= m && floor < m) say("a cut that isn't below maintenance");
  } else if (p.goal !== "Keep Fit") {
    if (t.kcal - m > m * 0.15 + 1) say(`a surplus of ${t.kcal - m}, over 15% of ${m}`);
    if (t.kcal <= m) say("a gain that isn't above maintenance");
  } else if (Math.abs(t.kcal - Math.max(m, floor)) > 1) say(`maintenance is ${t.kcal}, not ${m}`);
  const perKg = t.protein / p.weight;
  if (perKg < 1.55 || perKg > 2.25) say(`protein ${perKg.toFixed(2)} g/kg`);
  if (p.dietType === "vegetarian" && perKg > 1.81) say(`vegetarian protein ${perKg.toFixed(2)} g/kg`);
  if (t.fat < p.weight * 0.8 - 1) say(`fat ${t.fat} g, under 0.8 g/kg`);
  if (t.carbs < 0) say("negative carbs");
  if (p.dietType === "keto" && t.carbs > 30) say(`keto carbs ${t.carbs}`);
  const fromMacros = t.protein * 4 + t.carbs * 4 + t.fat * 9;
  if (Math.abs(fromMacros - t.kcal) > Math.max(t.kcal * 0.08, 80)) say(`macros make ${fromMacros}, not ${t.kcal}`);
  if (!(t.fiber > 10 && t.water > 1000)) say("no fiber or water target");
}
check(`every person's day is inside the limits (${people.length} people)`, problems.length === 0, problems.slice(0, 8));

// The pace.
const man = { gender: "male", age: 30, height: 180, weight: 85, goal: "Weight Loss", frequency: "3_4", difficulty: "moderate", dietType: "standard" };
const at = (pace, extra = {}) => targetsFor({ ...man, pace, ...extra });
check("a faster cut eats less", at("slow").kcal > at("normal").kcal && at("normal").kcal > at("fast").kcal, paces.map((x) => at(x).kcal));
check("a normal cut is about half a kilo a week", Math.abs(at("normal").pace.weeklyKg + 0.5) < 0.03 && !at("normal").pace.capped, at("normal").pace);
check("a faster gain eats more", at("slow", { goal: "Muscle Gain" }).kcal < at("fast", { goal: "Muscle Gain" }).kcal);
check("gaining goes slower than losing", PACE_KG["Muscle Gain"].normal < PACE_KG["Weight Loss"].normal);
check("no pace set means normal", targetsFor({ ...man }).kcal === at("normal").kcal);
check("keeping fit has no pace", targetsFor({ ...man, goal: "Keep Fit", pace: "fast" }).pace.weeklyKg === 0);

// The limits say when they held a pace back.
const small = { gender: "female", age: 30, height: 155, weight: 50, goal: "Weight Loss", pace: "fast", frequency: "2_3", difficulty: "light", dietType: "standard" };
const s = targetsFor(small);
check("a small woman's fast cut is slowed to what is safe", s.pace.capped && -s.pace.weeklyKg <= 0.5 + 0.01, s.pace);
check("…and never goes below 1,200 kcal", s.kcal >= 1200, s.kcal);
const lightMan = { ...small, gender: "male", height: 165, weight: 55 };
check("a man's day never goes below 1,500 kcal", targetsFor(lightMan).kcal >= 1500, targetsFor(lightMan).kcal);
const big = { ...man, weight: 140, height: 185, pace: "fast" };
const deficit = tdee(big) - targetsFor(big).kcal;
check("a big cut stops at a quarter under maintenance", deficit <= tdee(big) * 0.25 + 1, [deficit, tdee(big)]);
check("paceFor on its own agrees", paceFor({ ...man, pace: "normal" }, tdee(man)).kcal === targetsFor({ ...man, pace: "normal" }).kcal || Math.abs(paceFor({ ...man, pace: "normal" }, tdee(man)).kcal - at("normal").kcal) < 1);

// Adaptive maintenance and hand-set numbers still win.
check("a measured maintenance is used when there is one", targetsFor({ ...man, pace: "normal" }, { estimatedTdee: 3000 }).maintenance === 3000);
check("hand-set targets are kept as they are", targetsFor({ ...man, customTargets: { kcal: 2100, protein: 170, carbs: 200, fat: 70 } }).kcal === 2100);

console.log(`targets: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
