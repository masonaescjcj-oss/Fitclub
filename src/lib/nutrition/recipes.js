// Recipes built from the food bank (./foods.js): every ingredient is a food
// with its grams, so a recipe's calories and macros are worked out from the
// same numbers as the diary, and adding it logs exactly those ingredients.

import { findFood, macrosFor } from "./foods";

const r = (id, titleEn, titleFa, tag, minutes, meal, ingredients, stepsEn, stepsFa) =>
  ({ id, titleEn, titleFa, tag, minutes, meal, ingredients: ingredients.map(([foodId, grams]) => ({ foodId, grams })), stepsEn, stepsFa });

export const RECIPE_TAGS = {
  protein: { en: "High protein", fa: "پرپروتئین" },
  breakfast: { en: "Breakfast", fa: "صبحانه" },
  persian: { en: "Persian", fa: "ایرانی" },
  quick: { en: "Quick", fa: "سریع" },
  post: { en: "After training", fa: "بعد از تمرین" },
};

export const RECIPES = [
  r("chicken_bowl", "Chicken rice bowl", "کاسه‌ی مرغ و برنج", "protein", 20, "lunch",
    [["chicken_breast", 150], ["rice_white", 180], ["broccoli", 100], ["olive_oil", 5]],
    ["Season the chicken and cook it in the oil, 6 to 7 minutes a side.", "Steam the broccoli for 5 minutes.", "Slice the chicken and serve it over the rice with the broccoli."],
    ["مرغ را مزه‌دار کن و در روغن، هر طرف ۶ تا ۷ دقیقه بپز.", "بروکلی را ۵ دقیقه بخارپز کن.", "مرغ را برش بزن و روی برنج با بروکلی سرو کن."]),
  r("joojeh_plate", "Joojeh kabab with rice and Shirazi salad", "جوجه‌کباب با برنج و سالاد شیرازی", "persian", 30, "dinner",
    [["joojeh", 200], ["rice_white", 150], ["salad_shirazi", 150]],
    ["Grill the marinated chicken pieces until golden, turning often.", "Serve with the rice and a bowl of Shirazi salad."],
    ["تکه‌های جوجه‌ی مزه‌دارشده را کباب کن و مرتب بچرخان تا طلایی شود.", "با برنج و یک کاسه سالاد شیرازی سرو کن."]),
  r("feta_omelette", "Omelette with feta and sangak", "املت پنیر فتا با نان سنگک", "breakfast", 10, "breakfast",
    [["egg", 150], ["feta", 30], ["tomato", 80], ["bread_sangak", 60], ["olive_oil", 5]],
    ["Soften the chopped tomato in the oil for 2 minutes.", "Add the beaten eggs and crumble in the feta; cook until just set.", "Eat with the sangak."],
    ["گوجه‌ی خردشده را ۲ دقیقه در روغن تفت بده.", "تخم‌مرغ‌های زده‌شده را اضافه کن و پنیر را رویش خرد کن؛ بپز تا تازه ببندد.", "با نان سنگک بخور."]),
  r("egg_avocado_toast", "Egg and avocado toast", "تست تخم‌مرغ و آووکادو", "breakfast", 10, "breakfast",
    [["bread_whole", 60], ["egg", 100], ["avocado", 50], ["tomato", 50]],
    ["Toast the bread and spread the avocado on it.", "Boil or fry the eggs and lay them on top with sliced tomato."],
    ["نان را تست کن و آووکادو را رویش بمال.", "تخم‌مرغ‌ها را آب‌پز یا نیمرو کن و با گوجه‌ی برش‌خورده رویش بگذار."]),
  r("yogurt_oats", "Greek yogurt and oat bowl", "کاسه‌ی ماست یونانی و جو دوسر", "quick", 5, "snack",
    [["greek_yogurt", 200], ["oats", 40], ["banana", 100], ["walnuts", 15], ["honey", 10]],
    ["Stir the oats into the yogurt.", "Top with the sliced banana, walnuts and honey."],
    ["جو دوسر را در ماست هم بزن.", "موز برش‌خورده، گردو و عسل را رویش بریز."]),
  r("adasi_breakfast", "Adasi with barbari", "عدسی با نان بربری", "persian", 5, "breakfast",
    [["adasi", 250], ["bread_barbari", 60]],
    ["Warm the adasi and serve it with the barbari."],
    ["عدسی را گرم کن و با نان بربری سرو کن."]),
  r("salmon_quinoa", "Salmon and quinoa salad", "سالاد سالمون و کینوا", "protein", 20, "lunch",
    [["salmon", 120], ["quinoa", 150], ["spinach", 40], ["cucumber", 60], ["olive_oil", 10]],
    ["Bake the salmon at 200 °C for 12 minutes.", "Toss the quinoa, spinach and cucumber with the oil.", "Flake the salmon over the salad."],
    ["سالمون را در فر ۲۰۰ درجه ۱۲ دقیقه بپز.", "کینوا، اسفناج و خیار را با روغن مخلوط کن.", "سالمون را تکه‌تکه روی سالاد بریز."]),
  r("tuna_potato", "Tuna and potato salad", "سالاد تن ماهی و سیب‌زمینی", "quick", 15, "lunch",
    [["tuna_can", 120], ["potato", 200], ["cucumber", 50], ["yogurt_plain", 50]],
    ["Boil the potato, cool it and cut it into cubes.", "Mix it with the drained tuna, chopped cucumber and the yogurt."],
    ["سیب‌زمینی را آب‌پز کن، خنک کن و مکعبی خرد کن.", "با تن ماهی آب‌کشیده، خیار خردشده و ماست مخلوط کن."]),
  r("beef_sweet_potato", "Beef with sweet potato", "گوشت چرخ‌کرده با سیب‌زمینی شیرین", "protein", 25, "dinner",
    [["beef_lean", 130], ["sweet_potato", 200], ["spinach", 50]],
    ["Bake the sweet potato until soft, about 40 minutes (or 8 in the microwave).", "Brown the beef in a dry pan and wilt the spinach in at the end."],
    ["سیب‌زمینی شیرین را حدود ۴۰ دقیقه در فر (یا ۸ دقیقه در مایکروویو) بپز تا نرم شود.", "گوشت را در تابه‌ی بدون روغن سرخ کن و آخر کار اسفناج را اضافه کن تا نرم شود."]),
  r("recovery_shake", "Recovery shake", "شیک ریکاوری", "post", 3, "postworkout",
    [["whey", 30], ["milk_2", 250], ["banana", 100], ["peanut_butter", 15]],
    ["Blend everything until smooth."],
    ["همه را با هم در مخلوط‌کن بزن تا یکدست شود."]),
];

/** A recipe's total calories and macros, from its ingredients. */
export function recipeMacros(recipe) {
  const total = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  for (const { foodId, grams } of recipe.ingredients) {
    const food = findFood(foodId);
    if (!food) continue;
    const m = macrosFor(food, grams);
    for (const k of Object.keys(total)) total[k] += m[k] || 0;
  }
  return Object.fromEntries(Object.entries(total).map(([k, v]) => [k, Math.round(v)]));
}
