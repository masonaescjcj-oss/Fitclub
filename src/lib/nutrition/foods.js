/**
 * Local food database.
 *
 * `per100` is per 100 g (or 100 ml for drinks): kcal, protein/carbs/fat/fiber
 * in grams, sodium in mg. Single-ingredient values follow standard reference
 * tables. Composite dishes — the Persian home-cooked ones especially — vary a
 * lot by recipe, so treat those as reasonable estimates rather than lab values;
 * `estimate: true` marks them so the UI can say so.
 *
 * `servings` are household measures, most useful first. Every food also gets a
 * plain gram option added at runtime.
 */

export const CATEGORIES = [
  { id: "protein", en: "Protein", fa: "پروتئین", emoji: "🍗" },
  { id: "carbs", en: "Grains & Starch", fa: "غلات و نشاسته", emoji: "🍚" },
  { id: "dairy", en: "Dairy & Eggs", fa: "لبنیات و تخم‌مرغ", emoji: "🥛" },
  { id: "veg", en: "Vegetables", fa: "سبزیجات", emoji: "🥦" },
  { id: "fruit", en: "Fruit", fa: "میوه", emoji: "🍎" },
  { id: "fat", en: "Fats & Nuts", fa: "چربی و مغزها", emoji: "🥑" },
  { id: "legume", en: "Legumes", fa: "حبوبات", emoji: "🫘" },
  { id: "dish", en: "Persian Dishes", fa: "غذاهای ایرانی", emoji: "🍲" },
  { id: "supp", en: "Supplements", fa: "مکمل‌ها", emoji: "🥤" },
  { id: "drink", en: "Drinks", fa: "نوشیدنی", emoji: "🧃" },
];

const f = (id, cat, nameEn, nameFa, kcal, p, c, fat, fiber, sodium, servings, estimate) => ({
  id, cat, nameEn, nameFa,
  per100: { kcal, protein: p, carbs: c, fat, fiber, sodium },
  servings,
  estimate: !!estimate,
});

export const FOODS = [
  /* ── protein ── */
  f("chicken_breast", "protein", "Chicken breast, cooked", "سینه مرغ پخته", 165, 31, 0, 3.6, 0, 74,
    [{ en: "breast", fa: "عدد", g: 172 }, { en: "100 g", fa: "۱۰۰ گرم", g: 100 }]),
  f("chicken_thigh", "protein", "Chicken thigh, cooked", "ران مرغ پخته", 209, 26, 0, 10.9, 0, 88,
    [{ en: "thigh", fa: "عدد", g: 111 }]),
  f("beef_lean", "protein", "Ground beef 90/10, cooked", "گوشت چرخ‌کرده کم‌چرب", 217, 26, 0, 11.7, 0, 75,
    [{ en: "serving", fa: "پرس", g: 113 }]),
  f("lamb", "protein", "Lamb, cooked", "گوشت گوسفند پخته", 258, 25, 0, 17, 0, 72,
    [{ en: "serving", fa: "پرس", g: 100 }]),
  f("salmon", "protein", "Salmon, cooked", "ماهی سالمون پخته", 208, 20, 0, 13, 0, 59,
    [{ en: "fillet", fa: "فیله", g: 154 }]),
  f("white_fish", "protein", "White fish, cooked", "ماهی سفید پخته", 105, 23, 0, 1.2, 0, 78,
    [{ en: "fillet", fa: "فیله", g: 150 }]),
  f("tuna_can", "protein", "Tuna in water, canned", "تن ماهی در آب", 116, 26, 0, 0.8, 0, 247,
    [{ en: "can", fa: "قوطی", g: 142 }]),
  f("shrimp", "protein", "Shrimp, cooked", "میگو پخته", 99, 24, 0.2, 0.3, 0, 111,
    [{ en: "serving", fa: "پرس", g: 100 }]),
  f("turkey", "protein", "Turkey breast, cooked", "سینه بوقلمون پخته", 135, 30, 0, 1, 0, 1015,
    [{ en: "slice", fa: "برش", g: 28 }]),

  /* ── dairy & eggs ── */
  f("egg", "dairy", "Egg, whole", "تخم‌مرغ کامل", 143, 12.6, 0.7, 9.5, 0, 142,
    [{ en: "large egg", fa: "عدد بزرگ", g: 50 }]),
  f("egg_white", "dairy", "Egg white", "سفیده تخم‌مرغ", 52, 10.9, 0.7, 0.2, 0, 166,
    [{ en: "white", fa: "عدد", g: 33 }]),
  f("greek_yogurt", "dairy", "Greek yogurt, plain 2%", "ماست یونانی کم‌چرب", 73, 10, 3.9, 1.9, 0, 34,
    [{ en: "cup", fa: "لیوان", g: 170 }]),
  f("yogurt_plain", "dairy", "Yogurt, plain", "ماست ساده", 61, 3.5, 4.7, 3.3, 0, 46,
    [{ en: "cup", fa: "لیوان", g: 245 }]),
  f("milk_2", "dairy", "Milk, 2%", "شیر کم‌چرب", 50, 3.3, 4.8, 2, 0, 47,
    [{ en: "glass", fa: "لیوان", g: 244 }]),
  f("cottage", "dairy", "Cottage cheese, 2%", "پنیر کاتیج", 84, 11, 4.3, 2.3, 0, 330,
    [{ en: "cup", fa: "لیوان", g: 226 }]),
  f("feta", "dairy", "Feta cheese", "پنیر فتا", 264, 14, 4.1, 21, 0, 1116,
    [{ en: "portion", fa: "قاچ", g: 30 }]),
  f("cheddar", "dairy", "Cheddar cheese", "پنیر چدار", 403, 25, 1.3, 33, 0, 621,
    [{ en: "slice", fa: "برش", g: 28 }]),

  /* ── grains & starch ── */
  f("rice_white", "carbs", "White rice, cooked", "برنج سفید پخته", 130, 2.7, 28, 0.3, 0.4, 1,
    [{ en: "cup", fa: "پیمانه", g: 158 }, { en: "plate", fa: "بشقاب", g: 250 }]),
  f("rice_brown", "carbs", "Brown rice, cooked", "برنج قهوه‌ای پخته", 123, 2.7, 25.6, 1, 1.6, 4,
    [{ en: "cup", fa: "پیمانه", g: 195 }]),
  f("oats", "carbs", "Oats, dry", "جو دوسر خام", 389, 16.9, 66.3, 6.9, 10.6, 2,
    [{ en: "1/2 cup", fa: "نصف پیمانه", g: 40 }]),
  f("bread_barbari", "carbs", "Barbari bread", "نان بربری", 275, 8.5, 55, 1.5, 2.4, 490,
    [{ en: "1/4 loaf", fa: "یک‌چهارم نان", g: 60 }], true),
  f("bread_sangak", "carbs", "Sangak bread", "نان سنگک", 250, 8, 50, 1, 3.5, 430,
    [{ en: "1/4 loaf", fa: "یک‌چهارم نان", g: 60 }], true),
  f("bread_lavash", "carbs", "Lavash bread", "نان لواش", 275, 9, 56, 1.2, 2.2, 480,
    [{ en: "sheet", fa: "برگ", g: 45 }], true),
  f("bread_whole", "carbs", "Whole wheat bread", "نان سبوس‌دار", 247, 13, 41, 3.4, 7, 450,
    [{ en: "slice", fa: "برش", g: 32 }]),
  f("pasta", "carbs", "Pasta, cooked", "ماکارونی پخته", 158, 5.8, 30.9, 0.9, 1.8, 1,
    [{ en: "cup", fa: "پیمانه", g: 140 }]),
  f("potato", "carbs", "Potato, boiled", "سیب‌زمینی آب‌پز", 87, 1.9, 20.1, 0.1, 1.8, 4,
    [{ en: "medium", fa: "متوسط", g: 173 }]),
  f("sweet_potato", "carbs", "Sweet potato, baked", "سیب‌زمینی شیرین", 90, 2, 20.7, 0.2, 3.3, 36,
    [{ en: "medium", fa: "متوسط", g: 151 }]),
  f("quinoa", "carbs", "Quinoa, cooked", "کینوا پخته", 120, 4.4, 21.3, 1.9, 2.8, 7,
    [{ en: "cup", fa: "پیمانه", g: 185 }]),

  /* ── legumes ── */
  f("lentils", "legume", "Lentils, cooked", "عدس پخته", 116, 9, 20.1, 0.4, 7.9, 2,
    [{ en: "cup", fa: "پیمانه", g: 198 }]),
  f("chickpeas", "legume", "Chickpeas, cooked", "نخود پخته", 164, 8.9, 27.4, 2.6, 7.6, 7,
    [{ en: "cup", fa: "پیمانه", g: 164 }]),
  f("kidney_beans", "legume", "Kidney beans, cooked", "لوبیا قرمز پخته", 127, 8.7, 22.8, 0.5, 6.4, 2,
    [{ en: "cup", fa: "پیمانه", g: 177 }]),
  f("tofu", "legume", "Tofu, firm", "توفو", 144, 17.3, 2.8, 8.7, 2.3, 14,
    [{ en: "block", fa: "قالب", g: 122 }]),

  /* ── vegetables ── */
  f("broccoli", "veg", "Broccoli, cooked", "کلم بروکلی پخته", 35, 2.4, 7.2, 0.4, 3.3, 41,
    [{ en: "cup", fa: "پیمانه", g: 156 }]),
  f("spinach", "veg", "Spinach, raw", "اسفناج خام", 23, 2.9, 3.6, 0.4, 2.2, 79,
    [{ en: "cup", fa: "پیمانه", g: 30 }]),
  f("cucumber", "veg", "Cucumber", "خیار", 15, 0.7, 3.6, 0.1, 0.5, 2,
    [{ en: "medium", fa: "متوسط", g: 201 }]),
  f("tomato", "veg", "Tomato", "گوجه‌فرنگی", 18, 0.9, 3.9, 0.2, 1.2, 5,
    [{ en: "medium", fa: "متوسط", g: 123 }]),
  f("carrot", "veg", "Carrot", "هویج", 41, 0.9, 9.6, 0.2, 2.8, 69,
    [{ en: "medium", fa: "متوسط", g: 61 }]),
  f("onion", "veg", "Onion", "پیاز", 40, 1.1, 9.3, 0.1, 1.7, 4,
    [{ en: "medium", fa: "متوسط", g: 110 }]),
  f("eggplant", "veg", "Eggplant, cooked", "بادمجان پخته", 35, 0.8, 8.7, 0.2, 2.5, 1,
    [{ en: "cup", fa: "پیمانه", g: 99 }]),
  f("salad_shirazi", "veg", "Shirazi salad", "سالاد شیرازی", 30, 1, 5, 0.8, 1.2, 8,
    [{ en: "bowl", fa: "کاسه", g: 150 }], true),

  /* ── fruit ── */
  f("banana", "fruit", "Banana", "موز", 89, 1.1, 22.8, 0.3, 2.6, 1,
    [{ en: "medium", fa: "متوسط", g: 118 }]),
  f("apple", "fruit", "Apple", "سیب", 52, 0.3, 13.8, 0.2, 2.4, 1,
    [{ en: "medium", fa: "متوسط", g: 182 }]),
  f("orange", "fruit", "Orange", "پرتقال", 47, 0.9, 11.8, 0.1, 2.4, 0,
    [{ en: "medium", fa: "متوسط", g: 131 }]),
  f("dates", "fruit", "Dates", "خرما", 282, 2.5, 75, 0.4, 8, 2,
    [{ en: "date", fa: "عدد", g: 24 }]),
  f("grapes", "fruit", "Grapes", "انگور", 69, 0.7, 18.1, 0.2, 0.9, 2,
    [{ en: "cup", fa: "پیمانه", g: 151 }]),
  f("watermelon", "fruit", "Watermelon", "هندوانه", 30, 0.6, 7.6, 0.2, 0.4, 1,
    [{ en: "slice", fa: "قاچ", g: 280 }]),
  f("strawberry", "fruit", "Strawberries", "توت‌فرنگی", 32, 0.7, 7.7, 0.3, 2, 1,
    [{ en: "cup", fa: "پیمانه", g: 152 }]),

  /* ── fats & nuts ── */
  f("almonds", "fat", "Almonds", "بادام", 579, 21.2, 21.6, 49.9, 12.5, 1,
    [{ en: "10 nuts", fa: "۱۰ عدد", g: 12 }]),
  f("walnuts", "fat", "Walnuts", "گردو", 654, 15.2, 13.7, 65.2, 6.7, 2,
    [{ en: "half", fa: "لَپه", g: 8 }]),
  f("pistachio", "fat", "Pistachios", "پسته", 560, 20.2, 27.2, 45.3, 10.6, 1,
    [{ en: "30 nuts", fa: "۳۰ عدد", g: 30 }]),
  f("peanut_butter", "fat", "Peanut butter", "کره بادام‌زمینی", 588, 25, 20, 50, 6, 17,
    [{ en: "tbsp", fa: "قاشق غذاخوری", g: 16 }]),
  f("olive_oil", "fat", "Olive oil", "روغن زیتون", 884, 0, 0, 100, 0, 2,
    [{ en: "tbsp", fa: "قاشق غذاخوری", g: 14 }]),
  f("butter", "fat", "Butter", "کره", 717, 0.9, 0.1, 81.1, 0, 643,
    [{ en: "tbsp", fa: "قاشق غذاخوری", g: 14 }]),
  f("avocado", "fat", "Avocado", "آووکادو", 160, 2, 8.5, 14.7, 6.7, 7,
    [{ en: "half", fa: "نصف", g: 100 }]),

  /* ── Persian dishes (recipe-dependent estimates) ── */
  f("kabab_koobideh", "dish", "Kabab koobideh", "کباب کوبیده", 250, 17, 3, 19, 0.3, 420,
    [{ en: "skewer", fa: "سیخ", g: 100 }], true),
  f("joojeh", "dish", "Joojeh kabab", "جوجه کباب", 190, 25, 2, 9, 0.2, 380,
    [{ en: "skewer", fa: "سیخ", g: 120 }], true),
  f("ghormeh_sabzi", "dish", "Ghormeh sabzi", "قرمه سبزی", 180, 9, 6, 13, 2.4, 460,
    [{ en: "bowl", fa: "کاسه", g: 200 }], true),
  f("gheymeh", "dish", "Gheymeh", "خورش قیمه", 170, 8, 9, 11, 2.1, 450,
    [{ en: "bowl", fa: "کاسه", g: 200 }], true),
  f("fesenjan", "dish", "Fesenjan", "خورش فسنجان", 245, 9, 12, 18, 2, 380,
    [{ en: "bowl", fa: "کاسه", g: 200 }], true),
  f("adasi", "dish", "Adasi", "عدسی", 115, 7, 18, 3, 6.5, 320,
    [{ en: "bowl", fa: "کاسه", g: 250 }], true),
  f("ash_reshteh", "dish", "Ash reshteh", "آش رشته", 120, 5, 18, 3.2, 3.4, 480,
    [{ en: "bowl", fa: "کاسه", g: 300 }], true),
  f("mirza_ghasemi", "dish", "Mirza ghasemi", "میرزا قاسمی", 130, 4, 8, 9, 2.6, 300,
    [{ en: "portion", fa: "پرس", g: 200 }], true),
  f("kotlet", "dish", "Kotlet", "کتلت", 230, 12, 14, 14, 1.4, 400,
    [{ en: "piece", fa: "عدد", g: 90 }], true),
  f("tahchin", "dish", "Tahchin", "ته‌چین", 210, 9, 27, 7.5, 0.8, 350,
    [{ en: "portion", fa: "پرس", g: 220 }], true),

  /* ── supplements & drinks ── */
  f("whey", "supp", "Whey protein powder", "پودر پروتئین وی", 400, 80, 7, 5, 0.5, 300,
    [{ en: "scoop", fa: "اسکوپ", g: 30 }]),
  f("creatine", "supp", "Creatine monohydrate", "کراتین مونوهیدرات", 0, 0, 0, 0, 0, 0,
    [{ en: "scoop", fa: "اسکوپ", g: 5 }]),
  f("doogh", "drink", "Doogh", "دوغ", 35, 1.6, 2.8, 1.8, 0, 300,
    [{ en: "glass", fa: "لیوان", g: 250 }], true),
  f("orange_juice", "drink", "Orange juice", "آب پرتقال", 45, 0.7, 10.4, 0.2, 0.2, 1,
    [{ en: "glass", fa: "لیوان", g: 248 }]),
  f("tea_black", "drink", "Tea, no sugar", "چای بدون قند", 1, 0, 0.3, 0, 0, 3,
    [{ en: "cup", fa: "استکان", g: 180 }]),
  f("honey", "fat", "Honey", "عسل", 304, 0.3, 82.4, 0, 0.2, 4,
    [{ en: "tbsp", fa: "قاشق غذاخوری", g: 21 }]),
];

/** Every food can also be logged in plain grams. */
export const servingsOf = (food) => [
  ...food.servings,
  ...(food.servings.some((s) => s.g === 100) ? [] : [{ en: "100 g", fa: "۱۰۰ گرم", g: 100 }]),
];

export const findFood = (id) => FOODS.find((x) => x.id === id) || null;

/** Scales a food's per-100 values to an actual gram amount. */
export function macrosFor(food, grams) {
  const k = grams / 100;
  const p = food.per100;
  return {
    kcal: p.kcal * k,
    protein: p.protein * k,
    carbs: p.carbs * k,
    fat: p.fat * k,
    fiber: p.fiber * k,
    sodium: p.sodium * k,
  };
}

/** Accent-insensitive-ish search across both languages. */
export function searchFoods(query, category = null) {
  const q = query.trim().toLowerCase();
  return FOODS.filter((food) => {
    if (category && food.cat !== category) return false;
    if (!q) return true;
    return food.nameEn.toLowerCase().includes(q) || food.nameFa.includes(q);
  });
}
