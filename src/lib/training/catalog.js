/**
 * The liftmanual exercise catalog: public/exercises/catalog.json, written by
 * scripts/import-exercises.mjs (see docs/EXERCISE-IMPORT.md).
 *
 * loadExerciseCatalog() runs once at start-up (src/index.js). When the file
 * is there, its exercises are merged into the list that findExercise() and
 * searchExercises() read; when it is missing, unreadable or empty, nothing
 * changes and nothing is reported: the app runs on its built-ins as before.
 *
 * Merge rules (mergeCatalog):
 *  - A catalog exercise whose slug is a built-in's enriches that built-in:
 *    the built-in keeps its id, names, coarse group, equipment text and mode
 *    (so logged sets keep their meaning), and takes the catalog's type,
 *    muscles, equipment slugs, steps, benefits, muscles worked, variations,
 *    media and source.
 *  - Any other catalog exercise is added with id = its slug (or "lm-<slug>"
 *    when a built-in already uses that id).
 *  - Invalid records and repeated slugs are skipped.
 */

import { EXERCISES, findExercise, setExerciseRegistry, touchExercises } from "./exercises";
import { detailShard, findEquipment, groupOfMuscles, normalizeExercise } from "./liftmanual";

export { detailShard };

// CRA replaces process.env.PUBLIC_URL at build time; plain Node (the tests) has no such variable.
let PUBLIC_URL = "";
try {
  PUBLIC_URL = process.env.PUBLIC_URL || "";
} catch {
  PUBLIC_URL = "";
}

export const catalogUrl = () => `${PUBLIC_URL}/exercises/catalog.json`;

// Where relative media paths resolve. catalog.json can move it (a CDN) with "mediaBase".
const DEFAULT_MEDIA_BASE = "exercises/";
let mediaBase = DEFAULT_MEDIA_BASE;

/** A media path from the catalog as a URL the browser can load. */
export function mediaUrl(path) {
  if (!path) return "";
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  if (path.startsWith("/")) return `${PUBLIC_URL}${path}`;
  const base = /^https?:\/\//i.test(mediaBase) ? mediaBase : `${PUBLIC_URL}/${mediaBase.replace(/^\/+/, "")}`;
  return `${base.replace(/\/*$/, "/")}${path}`;
}

/** One normalized catalog record in the shape findExercise() returns. */
export function toAppExercise(rec, builtin = null, id = rec.slug) {
  const rich = {
    slug: rec.slug,
    type: rec.type,
    musclesWorked: rec.musclesWorked || [],
    steps: rec.steps || { en: [] },
    benefits: rec.benefits || { en: [] },
    variations: rec.variations || [],
    source: rec.source,
    ...(rec.description ? { description: rec.description } : {}),
    ...(rec.media ? { media: rec.media } : {}),
  };
  if (builtin) {
    return {
      ...builtin,
      ...rich,
      muscles: rec.muscles.length ? rec.muscles : builtin.muscles,
      equipmentSlugs: rec.equipment.length ? rec.equipment : builtin.equipmentSlugs,
    };
  }
  return {
    id,
    muscle: groupOfMuscles(rec.muscles) || "core",
    nameEn: rec.nameEn,
    nameFa: rec.nameFa || rec.nameEn,
    equipment: rec.equipment.map((s) => findEquipment(s)?.en).filter(Boolean).join(", "),
    mode: rec.mode,
    muscles: rec.muscles,
    equipmentSlugs: rec.equipment,
    ...rich,
  };
}

/**
 * Built-ins plus catalog records, by the rules above. Pure: returns the new
 * list and what happened, and touches nothing else.
 */
export function mergeCatalog(builtins, records) {
  const list = builtins.slice();
  const at = new Map(builtins.map((e, i) => [e.slug, i]));
  const ids = new Set(builtins.map((e) => e.id));
  const seen = new Set();
  let enriched = 0;
  let added = 0;
  let skipped = 0;
  for (const raw of Array.isArray(records) ? records : []) {
    const { ok, value } = normalizeExercise(raw);
    if (!ok || seen.has(value.slug)) { skipped += 1; continue; }
    seen.add(value.slug);
    if (at.has(value.slug)) {
      const i = at.get(value.slug);
      list[i] = toAppExercise(value, list[i]);
      enriched += 1;
      continue;
    }
    const id = !ids.has(value.slug) ? value.slug : !ids.has(`lm-${value.slug}`) ? `lm-${value.slug}` : null;
    if (!id) { skipped += 1; continue; }
    ids.add(id);
    list.push(toAppExercise(value, null, id));
    added += 1;
  }
  return { list, enriched, added, skipped };
}

/** The records of a catalog file: {exercises: [...]} or a bare array. */
export const catalogRecords = (data) =>
  (Array.isArray(data) ? data : Array.isArray(data?.exercises) ? data.exercises : []);

let loading = null;

/*
 * A big library ships its list lean: catalog.json names each exercise with
 * its muscles, equipment and media, and the long text (description, steps,
 * benefits, muscles worked, variations) sits in "detailShards" files under
 * "detailsBase", each exercise in the shard its slug hashes to. The text of
 * an exercise loads when it is first opened (loadExerciseDetails).
 */
let detailsBase = null;
let detailShards = 0;
const shardLoads = new Map();

const DETAIL_KEYS = ["description", "steps", "benefits", "musclesWorked", "variations"];

/**
 * Loads one exercise's long text when the catalog keeps it apart, and
 * resolves to the exercise with it. Each shard is fetched once; a failed
 * fetch is tried again next time. Never throws.
 */
export async function loadExerciseDetails(id, { fetch: fetchImpl } = {}) {
  const ex = findExercise(id);
  if (!ex || ex.detailsLoaded || !detailsBase || !detailShards || !ex.slug) return ex;
  const get = fetchImpl || (typeof fetch === "function" ? fetch : null);
  if (!get) return ex;
  const n = detailShard(ex.slug, detailShards);
  if (!shardLoads.has(n)) {
    const url = mediaUrlFrom(detailsBase, `${String(n).padStart(2, "0")}.json`);
    shardLoads.set(n, Promise.resolve(get(url)).then((res) => (res && res.ok ? res.json() : Promise.reject(new Error("unavailable"))))
      .catch(() => { shardLoads.delete(n); return null; }));
  }
  const shard = await shardLoads.get(n);
  const text = shard && shard[ex.slug];
  if (!shard) return ex;
  if (text && typeof text === "object") {
    for (const k of DETAIL_KEYS) if (text[k] !== undefined) ex[k] = text[k];
  }
  ex.detailsLoaded = true;
  touchExercises();
  return ex;
}

// Like mediaUrl, against a base of its own.
function mediaUrlFrom(base, path) {
  const root = /^https?:\/\//i.test(base) ? base : `${PUBLIC_URL}/${base.replace(/^\/+/, "")}`;
  return `${root.replace(/\/*$/, "/")}${path}`;
}

/**
 * Fetches and merges the catalog, once. Resolves to the merge summary, or
 * null when there is no usable catalog. Never throws.
 * `fetch` and `url` can be passed in (the tests do); `force` loads again.
 */
export function loadExerciseCatalog({ fetch: fetchImpl, url, force = false } = {}) {
  if (loading && !force) return loading;
  loading = (async () => {
    try {
      const get = fetchImpl || (typeof fetch === "function" ? fetch : null);
      if (!get) return null;
      const res = await get(url || catalogUrl(), { cache: "no-cache" });
      if (!res || !res.ok) return null;
      // A dev server or an SPA host answers a missing file with index.html; that fails to parse here.
      const data = await res.json();
      const records = catalogRecords(data);
      if (!records.length) return null;
      mediaBase = typeof data?.mediaBase === "string" && data.mediaBase ? data.mediaBase : DEFAULT_MEDIA_BASE;
      detailsBase = typeof data?.detailsBase === "string" && data.detailsBase ? data.detailsBase : null;
      detailShards = Number.isInteger(data?.detailShards) && data.detailShards > 0 && data.detailShards <= 4096 ? data.detailShards : 0;
      const merged = mergeCatalog(EXERCISES, records);
      if (!merged.enriched && !merged.added) return null;
      setExerciseRegistry(merged.list);
      return merged;
    } catch {
      return null;
    }
  })();
  return loading;
}
