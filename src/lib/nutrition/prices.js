/**
 * Approximate Tehran retail prices, in toman per kilogram as bought (bread
 * per loaf and eggs per tray are converted to kg below). The meal planner
 * reads them through foodMeta.js, which turns them into a price per kg as
 * eaten (cooked, peeled). They change every few weeks: update the numbers
 * and PRICES_AS_OF together.
 *
 * `est: true` marks a price that no source listed and that is set from a
 * similar item; the app labels every cost "approximate" either way.
 *
 * Sources, Shahrivar–Mehr 1405 (Sep 2026):
 *  - basic goods, week to 3 Mehr 1405 (chicken 250–290k/kg, eggs 260–530k per 30,
 *    Iranian rice 360–560k/kg, veal loin 1.79M, lamb 1.53M): eghtesadonline.com/fa/news/2165163
 *  - dairy, legumes, oil (milk 900 g 84k, yogurt 2 kg 228.7k, UF cheese 400 g 203k,
 *    lentils 290k, split peas 330k, white beans 350.5k, chickpeas 390.5k, cooking oil 810 g 330–379k):
 *    nabzgheymat.ir (dairy and basic-goods tables, 30 Shahrivar – 3 Mehr 1405)
 *  - ground meat 1.36M/kg: hamshahrionline.ir/news/1060590
 *  - bread (lavash 2,700, barbari 10,000, sangak 15,500 a piece): nabzgheymat.ir (bread, 22 Shahrivar 1405)
 *  - produce, Tehran wholesale markets (potato 69k, tomato 54k, onion 32–42k, cucumber 58k,
 *    banana 259–299k): nabzgheymat.ir (fruit and produce, 31 Shahrivar 1405); retail set ~15% higher
 *  - walnut kernel 350–540k, pistachio 578k–2.03M: nabzgheymat.ir (nuts, 24 Shahrivar 1405)
 *  - tuna 180 g can 170–320k, pasta 700 g 78.5k, trout (cleaned) 309.9k:
 *    nabzgheymat.ir (canned goods and pasta, 30 Shahrivar 1405)
 *  - white cheese 400 g 166.5k, butter 100 g 72.65k: nabzgheymat.ir (butter and cheese, 31 Shahrivar 1405)
 */

export const PRICES_AS_OF = "1405-07-03";
export const PRICE_REGION = { en: "Tehran", fa: "تهران" };

/** toman per kg as bought. */
export const MARKET_PRICES = {
  chicken_breast: { price: 360000 },           // fillet, from whole-bird 250–290k
  chicken_thigh: { price: 300000, est: true },
  beef_lean: { price: 1360000 },
  lamb: { price: 1900000, est: true },         // boneless, from 1.53M bone-in
  salmon: { price: 3000000, est: true },
  white_fish: { price: 309900 },               // trout, cleaned
  tuna_can: { price: 1280000 },                // 230k per 180 g can
  shrimp: { price: 1200000, est: true },
  turkey: { price: 700000, est: true },
  egg: { price: 266000 },                      // 400k per 30 eggs, 50 g each
  egg_white: { price: 400000, est: true },
  greek_yogurt: { price: 350000, est: true },
  yogurt_plain: { price: 114000 },
  milk_2: { price: 93000 },
  cottage: { price: 400000, est: true },
  feta: { price: 460000 },                     // white / UF cheese 416–507k
  cheddar: { price: 600000, est: true },
  rice_white: { price: 460000 },
  rice_brown: { price: 500000, est: true },
  oats: { price: 250000, est: true },
  bread_barbari: { price: 41700 },             // 10,000 per 240 g loaf
  bread_sangak: { price: 64600 },              // 15,500 per 240 g loaf
  bread_lavash: { price: 60000 },              // 2,700 per 45 g sheet
  bread_whole: { price: 150000, est: true },
  pasta: { price: 112000 },
  potato: { price: 80000 },
  sweet_potato: { price: 150000, est: true },
  quinoa: { price: 1500000, est: true },
  lentils: { price: 290000 },
  chickpeas: { price: 390500 },
  kidney_beans: { price: 380000, est: true },
  tofu: { price: 600000, est: true },
  broccoli: { price: 150000, est: true },
  spinach: { price: 80000, est: true },
  cucumber: { price: 67000 },
  tomato: { price: 62000 },
  carrot: { price: 50000, est: true },
  onion: { price: 45000 },
  eggplant: { price: 50000, est: true },
  salad_shirazi: { price: 70000, est: true },
  banana: { price: 320000 },
  apple: { price: 90000, est: true },
  orange: { price: 80000, est: true },
  dates: { price: 250000, est: true },
  grapes: { price: 120000, est: true },
  watermelon: { price: 30000, est: true },
  strawberry: { price: 250000, est: true },
  almonds: { price: 1100000, est: true },
  walnuts: { price: 410000 },
  pistachio: { price: 1200000 },
  peanut_butter: { price: 760000, est: true },
  vegetable_oil: { price: 440000 },            // cooking oil, 810 g 330–379k
  olive_oil: { price: 1300000, est: true },
  butter: { price: 726500 },
  avocado: { price: 700000, est: true },
  kabab_koobideh: { price: 1100000, est: true },
  joojeh: { price: 380000, est: true },
  ghormeh_sabzi: { price: 450000, est: true },
  gheymeh: { price: 400000, est: true },
  fesenjan: { price: 450000, est: true },
  adasi: { price: 120000, est: true },
  ash_reshteh: { price: 120000, est: true },
  mirza_ghasemi: { price: 120000, est: true },
  kotlet: { price: 500000, est: true },
  tahchin: { price: 250000, est: true },
  whey: { price: 3000000, est: true },
  doogh: { price: 60000, est: true },
  orange_juice: { price: 150000, est: true },
  honey: { price: 900000, est: true },
};
