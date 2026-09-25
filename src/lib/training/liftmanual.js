/**
 * liftmanual.com's taxonomy, and the shape one exercise takes in FitClub's
 * exercise catalog (public/exercises/catalog.json).
 *
 * Pure data and helpers with no imports, so the import script
 * (scripts/import-exercises.mjs), the tests and the app all share this one
 * file. The taxonomy mirrors the site:
 *
 *   muscles    → https://liftmanual.com/muscle/<slug>/     (25)
 *   equipment  → https://liftmanual.com/equipment/<slug>/  (19)
 *   types      → https://liftmanual.com/<slug>/            (5 sections)
 *   exercises  → https://liftmanual.com/<slug>/            media named <slug>.gif / .webp / .jpg
 *
 * Each liftmanual muscle also maps to one of the app's seven coarse groups
 * (MUSCLES in exercises.js), so the older filters keep working.
 */

export const LIFTMANUAL_URL = "https://liftmanual.com";

/**
 * @typedef {Object} Localized
 * @property {string[]} en
 * @property {string[]} [fa]
 */

/**
 * One exercise in the catalog. This is exactly what scripts/import-exercises.mjs
 * writes and what normalizeExercise() returns.
 *
 * @typedef {Object} CatalogExercise
 * @property {string} slug        liftmanual URL slug, kebab-case, unique: "heel-glute-bridge"
 * @property {string} nameEn      "Heel Glute Bridge"
 * @property {string} [nameFa]    Persian name; the app falls back to nameEn
 * @property {"strength"|"cardio"|"stretching"} type   the liftmanual section
 * @property {string[]} muscles   liftmanual muscle slugs, primary first ("Muscle Group"): ["glutes", "hamstrings"]
 * @property {string[]} musclesWorked  detailed anatomy, free text ("Muscles Worked"): ["Gluteus maximus", "Adductor magnus"]
 * @property {string[]} equipment liftmanual equipment slugs ("Equipment Required"): ["bodyweight"]
 * @property {{en?: string, fa?: string}} [description]
 * @property {Localized} steps    numbered "Instructions", one string per step, numbers stripped
 * @property {Localized} benefits "Benefits", one string per line
 * @property {string[]} variations slugs of "Variations & Alternatives"
 * @property {{gif?: string, webp?: string, mp4?: string, poster?: string}} [media]
 *           paths relative to the catalog's media base ("media/heel-glute-bridge.gif"),
 *           or absolute http(s) URLs
 * @property {"reps"|"time"|"distance"} mode  what the second number of a logged set means
 * @property {string} source      the liftmanual page: "https://liftmanual.com/heel-glute-bridge/"
 */

/* ───────────────────────────── taxonomy ───────────────────────────── */

/** The 25 muscle categories, in body order (the site lists them A–Z). `group` is the app's coarse group. */
export const LM_MUSCLES = [
  { slug: "chest", en: "Chest", fa: "سینه", group: "chest" },
  { slug: "back", en: "Back", fa: "پشت", group: "back" },
  { slug: "latissimus-dorsi", en: "Latissimus Dorsi", fa: "زیربغل", group: "back" },
  { slug: "traps", en: "Traps", fa: "کول و ذوزنقه", group: "back" },
  { slug: "neck", en: "Neck", fa: "گردن", group: "back" },
  { slug: "shoulders", en: "Shoulders", fa: "سرشانه", group: "shoulders" },
  { slug: "front-deltoid", en: "Front Deltoid", fa: "سرشانه جلو", group: "shoulders" },
  { slug: "side-deltoid", en: "Side Deltoid", fa: "سرشانه کناری", group: "shoulders" },
  { slug: "rear-deltoid", en: "Rear Deltoid", fa: "سرشانه پشت", group: "shoulders" },
  { slug: "biceps", en: "Biceps", fa: "جلو بازو", group: "arms" },
  { slug: "triceps", en: "Triceps", fa: "پشت بازو", group: "arms" },
  { slug: "upper-arms", en: "Upper Arms", fa: "بازو", group: "arms" },
  { slug: "forearms", en: "Forearms", fa: "ساعد", group: "arms" },
  { slug: "wrist", en: "Wrist", fa: "مچ دست", group: "arms" },
  { slug: "abs", en: "Abs", fa: "شکم", group: "core" },
  { slug: "obliques", en: "Obliques", fa: "پهلو", group: "core" },
  { slug: "waist", en: "Waist", fa: "دور کمر", group: "core" },
  { slug: "glutes", en: "Glutes", fa: "باسن", group: "legs" },
  { slug: "hips", en: "Hips", fa: "لگن", group: "legs" },
  { slug: "quadriceps", en: "Quadriceps", fa: "جلو ران", group: "legs" },
  { slug: "hamstrings", en: "Hamstrings", fa: "پشت ران", group: "legs" },
  { slug: "thighs", en: "Thighs", fa: "ران", group: "legs" },
  { slug: "calves", en: "Calves", fa: "ساق پا", group: "legs" },
  { slug: "cardio", en: "Cardio", fa: "هوازی", group: "cardio" },
  // Poses and mobility have no coarse group of their own; they sit with core work.
  { slug: "yoga", en: "Yoga", fa: "یوگا", group: "core" },
];

/** The 19 equipment categories, as the site lists them. */
export const LM_EQUIPMENT = [
  { slug: "resistance-band", en: "Resistance Band", fa: "کش مقاومتی" },
  { slug: "barbell", en: "Barbell", fa: "هالتر" },
  { slug: "battle-ropes", en: "Battle Ropes", fa: "طناب بتل" },
  { slug: "bodyweight", en: "Bodyweight", fa: "وزن بدن" },
  { slug: "bosu-ball", en: "Bosu Ball", fa: "توپ بوسو" },
  { slug: "cable", en: "Cable", fa: "سیم‌کش" },
  { slug: "dumbbell", en: "Dumbbell", fa: "دمبل" },
  { slug: "ez-curl-bar", en: "EZ Curl Bar", fa: "هالتر زیگزاگ" },
  { slug: "kettlebell", en: "Kettlebell", fa: "کتل‌بل" },
  { slug: "leverage-machine", en: "Leverage Machine", fa: "دستگاه" },
  { slug: "medicine-ball", en: "Medicine Ball", fa: "مدیسین بال" },
  { slug: "foam-roller", en: "Foam Roller", fa: "فوم رولر" },
  { slug: "smith-machine", en: "Smith Machine", fa: "دستگاه اسمیت" },
  { slug: "stability-ball", en: "Stability Ball", fa: "توپ تعادلی" },
  { slug: "stick-pvc", en: "Stick / PVC", fa: "چوب تمرینی" },
  { slug: "suspension-trainer", en: "Suspension Trainer", fa: "بند تعلیقی" },
  { slug: "trap-bar", en: "Trap Bar", fa: "هالتر شش‌ضلعی" },
  { slug: "weight-plate", en: "Weight Plate", fa: "صفحه وزنه" },
  { slug: "wheel-roller", en: "Wheel Roller", fa: "چرخ شکم" },
];

/** The site's five sections. Only the first three hold single exercises. */
export const LM_TYPES = [
  { slug: "strength", en: "Strength Workouts", fa: "تمرین‌های قدرتی", exercise: true },
  { slug: "cardio", en: "Cardio Exercises", fa: "تمرین‌های هوازی", exercise: true },
  { slug: "stretching", en: "Stretches", fa: "حرکات کششی", exercise: true },
  { slug: "routines", en: "Workout Routines", fa: "برنامه‌های تمرینی", exercise: false },
  { slug: "guides", en: "Guides", fa: "راهنماها", exercise: false },
];

export const EXERCISE_TYPES = LM_TYPES.filter((t) => t.exercise).map((t) => t.slug);
export const MODES = ["reps", "time", "distance"];

/** liftmanual muscle slug → the app's coarse group (legs, back, chest, shoulders, arms, core, cardio). */
export const MUSCLE_GROUP = Object.fromEntries(LM_MUSCLES.map((m) => [m.slug, m.group]));

/** The coarse group of an exercise: its primary (first) liftmanual muscle's. */
export const groupOfMuscles = (muscles = []) => {
  for (const slug of muscles) if (MUSCLE_GROUP[slug]) return MUSCLE_GROUP[slug];
  return null;
};

const bySlug = (list) => Object.fromEntries(list.map((x) => [x.slug, x]));
const MUSCLE_BY_SLUG = bySlug(LM_MUSCLES);
const EQUIPMENT_BY_SLUG = bySlug(LM_EQUIPMENT);
export const findMuscle = (slug) => MUSCLE_BY_SLUG[slug] || null;
export const findEquipment = (slug) => EQUIPMENT_BY_SLUG[slug] || null;

/** A taxonomy entry's label in the current language. */
export const lmLabel = (entry, isRtl) => (entry ? (isRtl ? entry.fa : entry.en) : "");

/** liftmanual page of an exercise, muscle or equipment. */
export const liftmanualUrl = (slug, kind) =>
  `${LIFTMANUAL_URL}/${kind === "muscle" ? "muscle/" : kind === "equipment" ? "equipment/" : ""}${slug}/`;

/** A search on liftmanual: always lands somewhere, unlike a guessed slug. */
export const liftmanualSearchUrl = (query) => `${LIFTMANUAL_URL}/?s=${encodeURIComponent(query)}`;

/* ───────────────────────── names → slugs ───────────────────────── */

/** Case, spacing, hyphens and punctuation don't matter: "Front-Deltoid" = "front deltoid". */
export const normKey = (s) => String(s ?? "")
  .normalize("NFKC")
  .toLowerCase()
  .replace(/&/g, "and")
  .replace(/[‌‏‎]/g, "")
  .replace(/[^a-z0-9؀-ۿ]+/g, "");

const singular = (k) => (k.length > 3 && k.endsWith("s") && !k.endsWith("ss") ? k.slice(0, -1) : k);

// Other names people (and spreadsheets) use for the same category.
const MUSCLE_ALIASES = {
  abs: ["abdominals", "abdominal", "ab", "core", "rectus abdominis", "six pack"],
  back: ["upper back", "lower back", "middle back", "mid back", "erector spinae", "spinal erectors"],
  "latissimus-dorsi": ["lats", "lat", "latissimus"],
  traps: ["trapezius", "trap"],
  shoulders: ["shoulder", "delts", "deltoids", "deltoid"],
  "front-deltoid": ["front delts", "front delt", "anterior deltoid", "anterior delts", "front shoulder"],
  "side-deltoid": ["side delts", "side delt", "lateral deltoid", "medial deltoid", "middle deltoid", "lateral delts"],
  "rear-deltoid": ["rear delts", "rear delt", "posterior deltoid", "posterior delts", "rear shoulder"],
  biceps: ["bicep", "biceps brachii"],
  triceps: ["tricep", "triceps brachii"],
  "upper-arms": ["upper arm", "arms", "arm"],
  forearms: ["forearm", "grip"],
  wrist: ["wrists"],
  obliques: ["oblique"],
  glutes: ["glute", "gluteus", "gluteus maximus", "buttocks", "butt"],
  hips: ["hip", "hip flexors", "hip flexor", "abductors", "abductor"],
  quadriceps: ["quads", "quad", "quadricep"],
  hamstrings: ["hamstring", "hams"],
  thighs: ["thigh", "adductors", "adductor", "inner thigh", "outer thigh"],
  calves: ["calf", "gastrocnemius", "soleus"],
  cardio: ["cardiovascular", "conditioning", "aerobic"],
};
const EQUIPMENT_ALIASES = {
  "resistance-band": ["band", "bands", "mini band", "loop band", "resistance bands"],
  barbell: ["olympic barbell", "olympic bar", "bar"],
  "battle-ropes": ["battle rope", "battling ropes", "battling rope"],
  bodyweight: ["body weight", "none", "no equipment", "bodyweight only", "calisthenics"],
  "bosu-ball": ["bosu"],
  cable: ["cables", "cable machine", "cable station", "pulley"],
  dumbbell: ["db"],
  "ez-curl-bar": ["ez bar", "ez curl", "curl bar", "ez barbell"],
  kettlebell: ["kb", "kettle bell"],
  "leverage-machine": ["machine", "lever machine", "lever", "leverage", "plate loaded machine", "selectorized machine"],
  "medicine-ball": ["med ball", "medball"],
  "foam-roller": ["foam roll"],
  "smith-machine": ["smith"],
  "stability-ball": ["swiss ball", "exercise ball", "physio ball", "gym ball", "fitball"],
  "stick-pvc": ["stick", "pvc", "pvc pipe", "dowel", "broomstick"],
  "suspension-trainer": ["suspension", "trx", "suspension straps"],
  "trap-bar": ["hex bar", "hexagonal bar"],
  "weight-plate": ["weights", "weight", "plate", "plates"],
  "wheel-roller": ["ab wheel", "ab roller", "wheel"],
};
const TYPE_ALIASES = {
  strength: ["strength workouts", "strength workout", "strength exercises", "strength training", "weights", "resistance"],
  cardio: ["cardio exercises", "cardio exercise", "cardio workouts", "conditioning", "aerobic"],
  stretching: ["stretch", "stretches", "flexibility", "mobility", "yoga"],
  routines: ["routine", "workout routines", "workout routine", "program", "programs"],
  guides: ["guide", "article"],
};
const MODE_ALIASES = {
  reps: ["rep", "repetitions", "count"],
  time: ["timed", "seconds", "second", "sec", "duration", "hold"],
  distance: ["meters", "metres", "meter", "metre", "m", "km", "distance"],
};

function buildIndex(entries, aliases) {
  const index = new Map();
  const put = (name, slug) => {
    const k = normKey(name);
    if (!k) return;
    if (!index.has(k)) index.set(k, slug);
    const s = singular(k);
    if (!index.has(s)) index.set(s, slug);
  };
  for (const e of entries) { put(e.slug, e.slug); put(e.en, e.slug); if (e.fa) put(e.fa, e.slug); }
  for (const [slug, names] of Object.entries(aliases)) for (const name of names) put(name, slug);
  return index;
}
const MUSCLE_INDEX = buildIndex(LM_MUSCLES, MUSCLE_ALIASES);
const EQUIPMENT_INDEX = buildIndex(LM_EQUIPMENT, EQUIPMENT_ALIASES);
const TYPE_INDEX = buildIndex(LM_TYPES, TYPE_ALIASES);
const MODE_INDEX = buildIndex(MODES.map((slug) => ({ slug, en: slug })), MODE_ALIASES);

const lookup = (index) => (name) => {
  const k = normKey(name);
  return (k && (index.get(k) || index.get(singular(k)))) || null;
};
/** "Glutes", "glute", "GLUTES", "باسن" → "glutes"; unknown → null. */
export const muscleSlug = lookup(MUSCLE_INDEX);
/** "Dumbbells", "EZ Bar", "TRX", "Weights" → the equipment slug; unknown → null. */
export const equipmentSlug = lookup(EQUIPMENT_INDEX);
/** "Strength Workouts", "Stretches" → "strength", "stretching"; unknown → null. */
export const typeSlug = lookup(TYPE_INDEX);
export const modeSlug = lookup(MODE_INDEX);

/** Any name to a URL slug: "Farmer's Walk" → "farmers-walk". */
export const slugify = (s) => String(s ?? "")
  .normalize("NFKD")
  .replace(/[̀-ͯ]/g, "")
  .toLowerCase()
  .replace(/['’`]/g, "")
  .replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The slug in a liftmanual URL: "https://liftmanual.com/heel-glute-bridge/" → "heel-glute-bridge". */
export function slugFromUrl(url) {
  const m = String(url ?? "").trim().match(/^https?:\/\/[^/]+\/(?:[^?#]*\/)?([^/?#]+)\/?(?:[?#].*)?$/i);
  return m ? slugify(decodeURIComponent(m[1])) : "";
}

/* ───────────────────────── loose input → record ───────────────────────── */

// Column names as a spreadsheet, a JSON export or the liftmanual page call them.
const FIELD_ALIASES = {
  slug: ["slug", "id", "exerciseslug", "urlslug", "permalink"],
  nameEn: ["nameen", "name", "exercise", "exercisename", "title", "englishname", "nameenglish", "en"],
  nameFa: ["namefa", "fa", "persianname", "namepersian", "farsiname", "namefarsi", "persian", "farsi"],
  type: ["type", "category", "section", "kind", "exercisetype"],
  muscles: ["muscles", "musclegroup", "musclegroups", "muscle", "primarymuscles", "primarymuscle", "target", "targetmuscles", "targetmuscle", "bodypart", "bodyparts"],
  musclesWorked: ["musclesworked", "detailedmuscles", "anatomy", "secondarymuscles", "musclesworkeden"],
  equipment: ["equipment", "equipmentrequired", "equipmentneeded", "gear"],
  description: ["description", "descriptionen", "about", "summary", "intro"],
  descriptionFa: ["descriptionfa", "persiandescription"],
  steps: ["steps", "instructions", "stepsen", "instructionsen", "howto", "howtodo"],
  stepsFa: ["stepsfa", "instructionsfa", "persianinstructions", "persiansteps"],
  benefits: ["benefits", "benefitsen"],
  benefitsFa: ["benefitsfa", "persianbenefits"],
  variations: ["variations", "variationsalternatives", "variationsandalternatives", "alternatives", "related", "relatedexercises"],
  gif: ["gif", "gifurl", "gifpath", "gifile", "giffile", "animation"],
  webp: ["webp", "webpurl", "webppath"],
  mp4: ["mp4", "video", "videourl", "mp4url"],
  poster: ["poster", "image", "imageurl", "thumbnail", "thumb", "jpg", "picture", "photo"],
  media: ["media"],
  mode: ["mode", "measure", "tracking", "unit", "metric"],
  source: ["source", "url", "link", "liftmanualurl", "liftmanual", "page", "pageurl"],
};
const FIELD_OF = new Map();
for (const [field, names] of Object.entries(FIELD_ALIASES)) for (const n of names) FIELD_OF.set(n, field);
// The exercise's own title ("Heel Glute Bridge Instructions") often prefixes the page headings.
const HEADING_TAIL = ["instructions", "benefits", "musclesworked", "variationsalternatives", "variationsandalternatives"];

/** Maps any column name to a record field, or null: "Equipment Required" → "equipment". */
export function fieldOf(column) {
  const k = normKey(column);
  if (FIELD_OF.has(k)) return FIELD_OF.get(k);
  const tail = HEADING_TAIL.find((t) => k.endsWith(t));
  return tail ? FIELD_OF.get(tail) || null : null;
}

/**
 * Rekeys a row by fieldOf(); unknown columns are dropped. When two columns
 * feed one field, the better-known name wins ("slug" over "id", "name" over "title").
 */
export function canonicalRow(raw) {
  const out = {};
  const rank = {};
  for (const [key, value] of Object.entries(raw || {})) {
    const exact = Object.hasOwn(FIELD_ALIASES, key);
    const field = exact ? key : fieldOf(key);
    if (!field || isBlank(value)) continue;
    const at = FIELD_ALIASES[field].indexOf(normKey(key));
    const r = exact ? -1 : at === -1 ? 99 : at;
    if (rank[field] === undefined || r < rank[field]) { out[field] = value; rank[field] = r; }
  }
  return out;
}

const isBlank = (v) => v === undefined || v === null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && !v.length);

/** Splits on commas outside parentheses: "Hips (front leg, external), Glutes" → 2 parts. */
function splitCommas(s) {
  const out = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < s.length; i += 1) {
    if (s[i] === "(") depth += 1;
    else if (s[i] === ")") depth = Math.max(0, depth - 1);
    else if (s[i] === "," && depth === 0) { out.push(s.slice(from, i)); from = i + 1; }
  }
  out.push(s.slice(from));
  return out;
}

/**
 * A list cell: an array, or a string split on new lines, "|" or ";" when it
 * has any, else on commas ("Glutes, Hamstrings").
 */
export function splitList(value) {
  if (isBlank(value)) return [];
  if (Array.isArray(value)) return value.flatMap((v) => splitList(v));
  const s = String(value);
  const parts = /[\n|;]/.test(s) ? s.split(/[\n|;]/) : splitCommas(s);
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** Steps or benefits: one per line; inline "1. … 2. …" numbering is split and stripped. */
export function splitSteps(value) {
  if (isBlank(value)) return [];
  if (Array.isArray(value)) return value.flatMap(splitSteps);
  let s = String(value).replace(/\r/g, "");
  // Latin, Persian and Arabic-Indic digits all count as step numbers.
  if (!/[\n|]/.test(s) && /(^|\s)[0-9۰-۹٠-٩]{1,2}[.)]\s/.test(s)) s = s.replace(/\s+(?=[0-9۰-۹٠-٩]{1,2}[.)]\s)/g, "\n");
  return s.split(/\s*[\n|]\s*/)
    .map((line) => line.replace(/^\s*(?:step\s*|مرحله\s*)?[0-9۰-۹٠-٩]{1,2}\s*[.):\-–]\s*/i, "").replace(/^[-•*]\s+/, "").trim())
    .filter(Boolean);
}

/** A localized list from {en, fa}, an array (English) or a string, plus an optional separate Persian value. */
function localizedList(value, faValue) {
  const isObj = value && typeof value === "object" && !Array.isArray(value);
  const en = splitSteps(isObj ? value.en : value);
  const fa = splitSteps(isObj && value.fa !== undefined ? value.fa : faValue);
  return fa.length ? { en, fa } : { en };
}

const MEDIA_EXT = { gif: /\.gif$/i, webp: /\.webp$/i, mp4: /\.(mp4|webm)$/i, poster: /\.(jpe?g|png|webp|avif)$/i };
// A relative path inside the media folder, a site path or a full URL; never "..", "//host" or "C:\\".
const pathOk = (p) => /^https?:\/\//i.test(p) || (!p.startsWith("//") && !p.split(/[\\/]/).includes("..") && !/^[a-z]:/i.test(p));

/**
 * Validates and normalizes one exercise from any loose shape: a CSV row with
 * liftmanual's column names, a JSON object, or a catalog record.
 *
 * Errors make the record unusable (no name, a bad slug, an unknown muscle or
 * equipment name, no muscle at all, a routine or guide instead of an
 * exercise); warnings don't.
 *
 * @param {Object} raw
 * @returns {{ok: boolean, value: CatalogExercise|null, errors: string[], warnings: string[], slug: string}}
 */
export function normalizeExercise(raw) {
  const errors = [];
  const warnings = [];
  const r = canonicalRow(raw);
  const text = (v) => (isBlank(v) ? "" : String(v).trim());

  const nameEn = text(r.nameEn);
  if (!nameEn) errors.push("missing name");

  const source = text(r.source);
  // A numeric "id" column is a row number, not a slug.
  const given = /^\d+$/.test(text(r.slug)) ? "" : text(r.slug);
  const slug = given ? slugify(given) : slugFromUrl(source) || slugify(nameEn);
  if (!SLUG_RE.test(slug)) errors.push(`bad slug "${given || nameEn}"`);

  const muscles = [];
  for (const name of splitList(r.muscles)) {
    const m = muscleSlug(name);
    if (!m) errors.push(`unknown muscle "${name}"`);
    else if (!muscles.includes(m)) muscles.push(m);
  }
  if (!muscles.length && !errors.some((e) => e.startsWith("unknown muscle"))) errors.push("no muscle group");

  const equipment = [];
  for (const name of splitList(r.equipment)) {
    const e = equipmentSlug(name);
    if (!e) errors.push(`unknown equipment "${name}"`);
    else if (!equipment.includes(e)) equipment.push(e);
  }
  if (!equipment.length && !errors.some((e) => e.startsWith("unknown equipment"))) warnings.push("no equipment listed");

  let type = null;
  if (text(r.type)) {
    type = typeSlug(r.type);
    if (!type) errors.push(`unknown type "${text(r.type)}"`);
    else if (!EXERCISE_TYPES.includes(type)) { errors.push(`"${text(r.type)}" is not an exercise`); type = null; }
  }
  if (!type) type = muscles[0] === "cardio" ? "cardio" : muscles.includes("yoga") || /\b(stretch|pose)\b/i.test(nameEn) ? "stretching" : "strength";

  let mode = type === "strength" ? "reps" : "time";
  if (text(r.mode)) {
    const m = modeSlug(r.mode);
    if (m) mode = m;
    else errors.push(`unknown mode "${text(r.mode)}"`);
  }

  const media = {};
  const mediaIn = r.media && typeof r.media === "object" ? r.media : {};
  for (const kind of ["gif", "webp", "mp4", "poster"]) {
    const p = text(r[kind] ?? mediaIn[kind]);
    if (!p) continue;
    if (!pathOk(p)) warnings.push(`ignored ${kind} path "${p}"`);
    else if (!MEDIA_EXT[kind].test(p.split(/[?#]/)[0])) warnings.push(`ignored ${kind} "${p}": wrong file type`);
    else media[kind] = p.replace(/\\/g, "/");
  }

  const descIn = r.description && typeof r.description === "object" ? r.description : { en: r.description };
  const description = {};
  if (text(descIn.en)) description.en = text(descIn.en);
  if (text(descIn.fa ?? r.descriptionFa)) description.fa = text(descIn.fa ?? r.descriptionFa);

  const variations = [];
  for (const v of splitList(r.variations)) {
    const s = /^https?:\/\//i.test(v) ? slugFromUrl(v) : slugify(v);
    if (s && s !== slug && !variations.includes(s)) variations.push(s);
  }

  const value = {
    slug,
    nameEn,
    ...(text(r.nameFa) ? { nameFa: text(r.nameFa) } : {}),
    type,
    muscles,
    musclesWorked: splitList(r.musclesWorked),
    equipment,
    ...(Object.keys(description).length ? { description } : {}),
    steps: localizedList(r.steps, r.stepsFa),
    benefits: localizedList(r.benefits, r.benefitsFa),
    variations,
    ...(Object.keys(media).length ? { media } : {}),
    mode,
    source: /^https?:\/\//i.test(source) ? source : liftmanualUrl(slug),
  };
  const ok = errors.length === 0;
  return { ok, value: ok ? value : null, errors, warnings, slug };
}
