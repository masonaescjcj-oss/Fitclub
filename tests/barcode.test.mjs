// Barcodes (src/lib/nutrition/barcode.js): valid numbers only, Open Food
// Facts products as foods, and scanned foods found again by the diary.
const { cleanBarcode, productToFood, lookupBarcode } = await import("../src/lib/nutrition/barcode.js");
const { findFood, macrosFor, registerFoods, searchFoods } = await import("../src/lib/nutrition/foods.js");

let pass = 0, fail = 0;
const check = (name, cond, got) => { cond ? pass++ : fail++; if (!cond) console.log("✗", name, got !== undefined ? `(got ${JSON.stringify(got).slice(0, 300)})` : ""); };

check("a valid EAN-13 passes, spaces and dashes dropped", cleanBarcode("5449000000996") === "5449000000996" && cleanBarcode("5 449000-000996") === "5449000000996");
check("valid EAN-8 and UPC-A pass", cleanBarcode("96385074") === "96385074" && cleanBarcode("036000291452") === "036000291452");
check("a wrong check digit, letters or a short number fail", cleanBarcode("5449000000997") === null && cleanBarcode("54490000abc96") === null && cleanBarcode("1234") === null);

const coke = { product_name: "Coca-Cola", brands: "Coca-Cola", serving_size: "1 can (330 ml)", serving_quantity: 330,
  nutriments: { "energy-kcal_100g": 42, proteins_100g: 0, carbohydrates_100g: 10.6, fat_100g: 0, sodium_100g: 0.01 } };
const food = productToFood(coke, "5449000000996");
check("a product becomes a food per 100 g, sodium in mg", food.id === "off:5449000000996" && food.per100.kcal === 42 && food.per100.carbs === 10.6 && food.per100.sodium === 10, food);
check("…its serving is the product's", food.servings[0].g === 330 && food.servings[0].en === "1 can (330 ml)");
check("…named once, not 'Coca-Cola (Coca-Cola)'", food.nameEn === "Coca-Cola");
const milk = productToFood({ product_name_fa: "شیر کم چرب", brands: "ماجان", nutriments: { energy_100g: 180 } }, "6260161564450");
check("a Persian-only product keeps its Persian name and brand, kJ turned to kcal", milk.nameFa === "شیر کم چرب (ماجان)" && milk.nameEn === "شیر کم چرب (ماجان)" && milk.per100.kcal === 43, milk);
check("no calories, no food: the diary can't use it", productToFood({ product_name: "Mystery", nutriments: {} }, "5449000000996") === null);
check("absurd calories are refused", productToFood({ product_name: "X", nutriments: { "energy-kcal_100g": 4000 } }, "5449000000996") === null);

const fake = (status, body) => async () => ({ status, ok: status < 400, json: async () => body });
check("lookup: found", (await lookupBarcode("5449000000996", fake(200, { status: 1, product: coke }))).food?.per100.kcal === 42);
check("lookup: not in the database", (await lookupBarcode("5449000000996", fake(404, { status: 0 }))).missing === true);
check("lookup: found but without calories counts as missing", (await lookupBarcode("5449000000996", fake(200, { status: 1, product: { product_name: "X" } }))).missing === true);
check("lookup: an invalid number never goes out", (await lookupBarcode("123", () => { throw new Error("sent"); })).invalid === true);
let threw = false; try { await lookupBarcode("5449000000996", fake(503, {})); } catch { threw = true; }
check("lookup: a server failure is an error, not 'missing'", threw);

check("an unregistered scanned food isn't known", findFood(food.id) === null);
registerFoods([food]);
check("once registered, the diary resolves it and scales it", findFood(food.id)?.nameEn === "Coca-Cola" && Math.round(macrosFor(findFood(food.id), 330).kcal) === 139);
check("…and search finds it by name", searchFoods("coca").some((f) => f.id === food.id) && !searchFoods("", "protein").some((f) => f.id === food.id));

console.log(`barcode: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
