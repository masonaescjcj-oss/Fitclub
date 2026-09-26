// Packaged food by barcode, from Open Food Facts (openfoodfacts.org): an open,
// free database anyone can add to. Only the barcode number leaves the device.
// A product becomes a food like those in ./foods.js (per 100 g), saved with
// the diary so its entries keep resolving later and on other devices.

const API = "https://world.openfoodfacts.org/api/v2/product";
const FIELDS = "code,product_name,product_name_fa,product_name_en,generic_name,brands,nutriments,serving_size,serving_quantity,quantity";

/** Digits only, 8 to 14 of them, with a valid check digit (EAN-8, UPC-A, EAN-13, GTIN-14). */
export function cleanBarcode(raw) {
  const code = String(raw || "").replace(/[\s-]/g, "");
  if (!/^\d{8,14}$/.test(code)) return null;
  const digits = code.split("").map(Number);
  const check = digits.pop();
  const sum = digits.reverse().reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check ? code : null;
}

const n = (v) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(+v) ? +v : null);

/**
 * An Open Food Facts product as a food, or null when it lacks the calories
 * per 100 g the diary needs.
 */
export function productToFood(p, code) {
  if (!p) return null;
  const m = p.nutriments || {};
  const kcal = n(m["energy-kcal_100g"]) ?? (n(m.energy_100g) != null ? n(m.energy_100g) / 4.184 : null);
  if (kcal == null || kcal < 0 || kcal > 900) return null;
  const name = (p.product_name || p.product_name_en || p.generic_name || "").trim();
  const nameFa = (p.product_name_fa || "").trim();
  const brand = String(p.brands || "").split(",")[0].trim();
  const label = (s) => (s ? (brand && !s.toLowerCase().includes(brand.toLowerCase()) ? `${s} (${brand})` : s) : brand || `#${code}`);
  const serving = n(p.serving_quantity);
  return {
    id: `off:${code}`,
    cat: "scanned",
    nameEn: label(name || nameFa),
    nameFa: label(nameFa || name),
    per100: {
      kcal: Math.round(kcal),
      protein: n(m.proteins_100g) ?? 0,
      carbs: n(m.carbohydrates_100g) ?? 0,
      fat: n(m.fat_100g) ?? 0,
      fiber: n(m.fiber_100g) ?? 0,
      sodium: n(m.sodium_100g) != null ? Math.round(n(m.sodium_100g) * 1000) : 0, // g → mg
    },
    servings: serving && serving > 0 && serving < 2000
      ? [{ en: p.serving_size || `${serving} g`, fa: p.serving_size || `${serving} گرم`, g: serving }]
      : [{ en: "100 g", fa: "۱۰۰ گرم", g: 100 }],
    barcode: code,
    source: "openfoodfacts",
    estimate: false,
  };
}

/**
 * Looks a barcode up. Resolves { food } when found with nutrition, { missing: true }
 * when Open Food Facts doesn't know it (or has no calories for it), and
 * rejects on a network failure.
 */
export async function lookupBarcode(raw, fetchImpl = fetch) {
  const code = cleanBarcode(raw);
  if (!code) return { invalid: true };
  const res = await fetchImpl(`${API}/${code}.json?fields=${FIELDS}`, { headers: { Accept: "application/json" } });
  if (res.status === 404) return { missing: true, code };
  if (!res.ok) throw new Error(`lookup failed (${res.status})`);
  const data = await res.json();
  const food = data?.status === 1 ? productToFood(data.product, code) : null;
  return food ? { food, code } : { missing: true, code };
}

/** Whether this browser can read barcodes from the camera by itself. */
export const nativeScanner = () => typeof window !== "undefined" && "BarcodeDetector" in window;
