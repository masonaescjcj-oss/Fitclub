/**
 * Ready plans to switch to: 60 meal plans and 60 workout programs, one for
 * every combination of the filters, so whatever someone picks there is a
 * plan. A ready plan is a named set of choices, not a fixed menu: the meal
 * planner and the workout planner build it for the person who picks it
 * (their own calories, allergies, equipment and injuries), so it is as
 * personal as the one made from the questionnaire.
 *
 *   Meal plans:  goal × diet × budget (48), plus the goals' other meal counts
 *                on a standard diet (12).
 *   Workouts:    goal × place × days a week (60); the level is the person's.
 */

import { BUDGETS } from "../nutrition/planEngine";
import { DIET_TYPES, GOALS } from "../nutrition/profile";
import { splitFor } from "../training/programGen";

const GOAL_NAME = {
  "Weight Loss": ["Fat loss", "چربی‌سوزی"],
  "Muscle Gain": ["Muscle gain", "عضله‌سازی"],
  "Keep Fit": ["Keep fit", "تناسب اندام"],
  "Max Strength": ["Strength", "قدرت"],
};
const DIET_NAME = {
  standard: ["balanced", "متعادل"],
  high_protein: ["high protein", "پرپروتئین"],
  vegetarian: ["vegetarian", "گیاهی"],
  keto: ["keto", "کتوژنیک"],
};
const BUDGET_NAME = { economy: ["economy", "اقتصادی"], medium: ["mid-range", "میانه"], free: ["no budget limit", "بدون محدودیت بودجه"] };
const PLACE_NAME = { gym: ["gym", "باشگاه"], home_gear: ["home, dumbbells", "خانه با دمبل"], home: ["home, no equipment", "خانه بدون وسیله"] };

const faDigits = (v) => String(v).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);

/** The usual meal count for a goal: more, smaller meals when eating more. */
const USUAL_MEALS = { "Weight Loss": 4, "Muscle Gain": 5, "Keep Fit": 4, "Max Strength": 4 };
const OTHER_MEALS = { "Weight Loss": 3, "Muscle Gain": 4, "Keep Fit": 3, "Max Strength": 5 };

const DIET_NOTE = {
  standard: ["Rice, bread and stews in their place, with the protein up front.", "برنج، نان و خورش سر جای خودشان، با پروتئین کافی."],
  high_protein: ["More eggs, chicken, dairy and fish; a little less rice and bread.", "تخم‌مرغ، مرغ، لبنیات و ماهی بیشتر؛ کمی برنج و نان کمتر."],
  vegetarian: ["No meat or fish: legumes, eggs, dairy and tofu carry the protein.", "بدون گوشت و ماهی: حبوبات، تخم‌مرغ، لبنیات و توفو پروتئین را می‌رسانند."],
  keto: ["Almost no rice, bread or fruit; fats and protein instead.", "تقریباً بدون برنج، نان و میوه؛ به‌جایش چربی و پروتئین."],
};
const BUDGET_NOTE = {
  economy: ["Eggs, legumes, dairy and chicken first: the cheapest way to your protein.", "اول تخم‌مرغ، حبوبات، لبنیات و مرغ: ارزان‌ترین راه رسیدن به پروتئین."],
  medium: ["Price and variety balanced, red meat and fish now and then.", "تعادل قیمت و تنوع، گاهی گوشت قرمز و ماهی."],
  free: ["Price hardly counts: the most variety.", "قیمت کم‌اهمیت است: بیشترین تنوع."],
};

const mealPreset = (goal, dietType, budget, meals) => {
  const [gEn, gFa] = GOAL_NAME[goal];
  const [dEn, dFa] = DIET_NAME[dietType];
  const [bEn, bFa] = BUDGET_NAME[budget];
  return {
    id: `meal:${goal}:${dietType}:${budget}:${meals}`,
    kind: "meal",
    goal, dietType, budget, meals,
    name: `${gEn}, ${dEn}, ${bEn} · ${meals} meals`,
    nameFa: `${gFa}، ${dFa}، ${bFa} · ${faDigits(meals)} وعده`,
    description: `${DIET_NOTE[dietType][0]} ${BUDGET_NOTE[budget][0]}`,
    descriptionFa: `${DIET_NOTE[dietType][1]} ${BUDGET_NOTE[budget][1]}`,
  };
};

export const MEAL_PRESETS = [
  ...GOALS.flatMap((goal) => DIET_TYPES.flatMap((diet) => BUDGETS.map((budget) => mealPreset(goal, diet, budget, USUAL_MEALS[goal])))),
  ...GOALS.flatMap((goal) => BUDGETS.map((budget) => mealPreset(goal, "standard", budget, OTHER_MEALS[goal]))),
];

const workoutPreset = (goal, location, days) => {
  const [gEn, gFa] = GOAL_NAME[goal];
  const [pEn, pFa] = PLACE_NAME[location];
  const split = splitFor(days);
  return {
    id: `workout:${goal}:${location}:${days}`,
    kind: "workout",
    goal, location, days,
    // A strength program wants longer sessions; fat loss fits in less.
    minutes: goal === "Max Strength" ? 75 : goal === "Weight Loss" ? 45 : 60,
    name: `${gEn}: ${split.en}, ${pEn}`,
    nameFa: `${gFa}: ${split.fa}، ${pFa}`,
    split: split.id,
  };
};

export const PLACES = ["gym", "home_gear", "home"];
export const WEEK_DAYS = [2, 3, 4, 5, 6];

export const WORKOUT_PRESETS = GOALS.flatMap((goal) => PLACES.flatMap((place) => WEEK_DAYS.map((d) => workoutPreset(goal, place, d))));

const match = (value, want) => want == null || want === "all" || value === want;

/** Meal plans matching the filters (null or "all" = any). */
export const mealPresets = ({ goal, dietType, budget } = {}) =>
  MEAL_PRESETS.filter((p) => match(p.goal, goal) && match(p.dietType, dietType) && match(p.budget, budget));

/** Workout programs matching the filters (null or "all" = any). */
export const workoutPresets = ({ goal, location, days } = {}) =>
  WORKOUT_PRESETS.filter((p) => match(p.goal, goal) && match(p.location, location) && match(p.days, days));

export const findPreset = (id) => MEAL_PRESETS.find((p) => p.id === id) || WORKOUT_PRESETS.find((p) => p.id === id) || null;

export { GOAL_NAME, DIET_NAME, BUDGET_NAME, PLACE_NAME };
