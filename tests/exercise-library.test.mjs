// The shipped exercise library (public/exercises/, scripts/build-exercises.mjs):
// every exercise has its animation on FitClub's media bucket and a Persian
// name, and nothing in it links anywhere: no page addresses, no source.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "exercises");
let pass = 0, fail = 0;
const check = (name, cond, got) => { cond ? pass++ : fail++; if (!cond) console.log("✗", name, got !== undefined ? `(got ${JSON.stringify(got).slice(0, 300)})` : ""); };

const catalog = JSON.parse(readFileSync(join(dir, "catalog.json"), "utf8"));
const list = catalog.exercises;
const shards = readdirSync(join(dir, "details")).filter((f) => f.endsWith(".json"));
const details = Object.assign({}, ...shards.map((f) => JSON.parse(readFileSync(join(dir, "details", f), "utf8"))));

check("the whole library is there", list.length > 3400, list.length);
check("…with its text in 64 files", shards.length === 64 && catalog.detailShards === 64 && Object.keys(details).length === list.length,
  [shards.length, Object.keys(details).length]);
check("the animations come from FitClub's own media bucket",
  /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/fitclub-exercises\/animations\/$/.test(catalog.mediaBase), catalog.mediaBase);
const noAnim = list.filter((e) => JSON.stringify(e.media) !== JSON.stringify({ webp: `${e.slug}.webp` }));
check("every exercise has exactly one file: its animation", noAnim.length === 0, noAnim.slice(0, 3).map((e) => [e.slug, e.media]));
check("every exercise has a Persian name", list.every((e) => e.nameFa && /[؀-ۿ]/.test(e.nameFa)), list.filter((e) => !e.nameFa).map((e) => e.slug).slice(0, 5));

// Nothing points back to where the library came from.
const { mediaBase, ...rest } = catalog;
const shipped = JSON.stringify(rest) + JSON.stringify(details);
check("no record carries a source", !("source" in catalog) && list.every((e) => !("source" in e)) && Object.values(details).every((d) => !("source" in d)));
const links = shipped.match(/https?:\/\/[^"\s]+|www\.[^"\s]+|\b[a-z0-9-]+\.(?:com|net|org|io|co)\b/gi) || [];
check("no links or web addresses anywhere in the library's text", links.length === 0, [...new Set(links)].slice(0, 5));

console.log(`exercise library: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
