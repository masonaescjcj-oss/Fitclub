#!/usr/bin/env node
/**
 * Builds the app's exercise library from liftmanual.com, the owner's site.
 *
 *   node scripts/crawl-liftmanual.mjs data/liftmanual              # 1. read the site
 *   FFMPEG=… node scripts/liftmanual-media.mjs data/liftmanual/exercises.json --out data/liftmanual   # 2. media
 *   (upload data/liftmanual/media/ to the media host)               # 3. see docs/EXERCISE-IMPORT.md
 *   node scripts/build-liftmanual.mjs data/liftmanual/exercises.json --media data/liftmanual/media \
 *     --media-base https://…/storage/v1/object/public/fitclub-exercises/ [--names-fa scripts/data/liftmanual-names-fa.json]
 *
 * Writes public/exercises/catalog.json, the list the app loads at start-up
 * (names, section, muscles, equipment, media), and public/exercises/details/,
 * the long text of each exercise (description, steps, benefits, muscles
 * worked, alternatives) in 64 files the app fetches when an exercise is
 * opened (src/lib/training/catalog.js). Every exercise is checked with the
 * app's own normalizeExercise; the ones it refuses are listed and left out.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const quiet = process.emitWarning;
process.emitWarning = function hush(w, ...rest) {
  const code = typeof rest[0] === "object" ? rest[0]?.code : rest[1];
  return code === "MODULE_TYPELESS_PACKAGE_JSON" ? undefined : quiet.call(this, w, ...rest);
};
const { detailShard, normalizeExercise } = await import(new URL("../src/lib/training/liftmanual.js", import.meta.url));
process.emitWarning = quiet;

const argv = process.argv.slice(2);
const opt = (name) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : null);
const input = argv.find((a, i) => !a.startsWith("--") && !argv[i - 1]?.startsWith("--"));
const mediaDir = opt("--media");
const mediaBase = opt("--media-base");
const namesFile = opt("--names-fa");
const outDir = opt("--out") || new URL("../public/exercises/", import.meta.url).pathname;
const SHARDS = 64;
if (!input || !mediaBase) {
  console.error("usage: node scripts/build-liftmanual.mjs <exercises.json> --media <dir> --media-base <url> [--names-fa <file>] [--out <dir>]");
  process.exit(2);
}

const crawled = JSON.parse(readFileSync(input, "utf8"));
const have = new Set(mediaDir && existsSync(mediaDir) ? readdirSync(mediaDir) : []);
const namesFa = namesFile && existsSync(namesFile) ? JSON.parse(readFileSync(namesFile, "utf8")) : {};
const slugs = new Set(crawled.map((x) => x.slug));

// A few pages carry no muscle group; their names say it.
function guessMuscles(name) {
  if (/calf|tibialis|ankle/i.test(name)) return ["calves"];
  if (/pose|meditation|breathing|asana/i.test(name)) return ["yoga"];
  return [];
}

const list = [];
const shards = Array.from({ length: SHARDS }, () => ({}));
const refused = [];
for (const x of crawled.sort((a, b) => a.name.localeCompare(b.name, "en"))) {
  const media = {};
  if (have.has(`${x.slug}.mp4`)) media.mp4 = `${x.slug}.mp4`;
  if (have.has(`${x.slug}.webp`)) media.poster = `${x.slug}.webp`;
  const { ok, value, errors } = normalizeExercise({
    nameEn: x.name,
    nameFa: namesFa[x.slug] || "",
    slug: x.slug,
    source: x.url,
    type: x.type,
    muscles: x.muscles.length ? x.muscles.map((m) => m.slug) : guessMuscles(x.name),
    equipment: x.equipment.map((e) => e.slug),
    description: x.description,
    steps: x.instructions,
    benefits: x.benefits,
    musclesWorked: x.musclesWorked,
    // Alternatives the library has, by the page they link to (else by name).
    variations: x.variations.map((v) => v.slug || v.name).filter((s) => slugs.has(s) || slugs.has(String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-"))),
    media,
  });
  if (!ok) { refused.push({ slug: x.slug, errors }); continue; }
  const { description, steps, benefits, musclesWorked, variations, source, mode, ...lean } = value;
  // What the app works out by itself stays out: the page from the slug, the mode from the section.
  list.push({
    ...lean,
    ...(source !== `https://liftmanual.com/${value.slug}/` ? { source } : {}),
    ...(mode !== (value.type === "strength" ? "reps" : "time") ? { mode } : {}),
  });
  shards[detailShard(value.slug, SHARDS)][value.slug] = {
    ...(description ? { description } : {}), steps, benefits, musclesWorked, variations,
  };
}

rmSync(join(outDir, "details"), { recursive: true, force: true });
mkdirSync(join(outDir, "details"), { recursive: true });
writeFileSync(join(outDir, "catalog.json"), `${JSON.stringify({
  source: "https://liftmanual.com/",
  built: new Date().toISOString().slice(0, 10),
  mediaBase,
  detailsBase: "exercises/details/",
  detailShards: SHARDS,
  exercises: list,
})}\n`);
shards.forEach((s, i) => writeFileSync(join(outDir, "details", `${String(i).padStart(2, "0")}.json`), `${JSON.stringify(s)}\n`));

const withMedia = list.filter((e) => e.media?.mp4).length;
const withFa = list.filter((e) => e.nameFa).length;
console.log(`${list.length} exercises (${withMedia} with animation, ${withFa} with a Persian name); ${refused.length} refused`);
if (refused.length) console.log(JSON.stringify(refused.slice(0, 20), null, 1));
