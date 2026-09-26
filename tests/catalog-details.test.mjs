// A big exercise library (scripts/build-liftmanual.mjs): the list loads
// lean at start-up, and each exercise's text arrives from its shard when
// it's first opened (src/lib/training/catalog.js).
import { EXERCISES, findExercise, setExerciseRegistry, subscribeExercises } from "../src/lib/training/exercises.js";
import { detailShard, loadExerciseCatalog, loadExerciseDetails, mediaUrl } from "../src/lib/training/catalog.js";

let pass = 0, fail = 0;
const check = (name, cond, got) => { cond ? pass++ : fail++; if (!cond) console.log("✗", name, got !== undefined ? `(got ${JSON.stringify(got)})` : ""); };
const json = (body, ok = true) => async () => ({ ok, json: async () => body });

check("a slug always lands in the same shard, within range", detailShard("heel-glute-bridge", 64) === detailShard("heel-glute-bridge", 64)
  && [..."abcdefghij"].every((c) => { const s = detailShard(`${c}-squat`, 64); return s >= 0 && s < 64; }));
const spread = new Set(Array.from({ length: 400 }, (_, i) => detailShard(`exercise-${i}`, 64)));
check("…and slugs spread over the shards", spread.size > 50, spread.size);

const lean = [
  { slug: "heel-glute-bridge", nameEn: "Heel Glute Bridge", nameFa: "پل باسن روی پاشنه", type: "strength", muscles: ["glutes", "hamstrings"], equipment: ["bodyweight"],
    media: { mp4: "heel-glute-bridge.mp4", poster: "heel-glute-bridge.webp" }, mode: "reps", source: "https://liftmanual.com/heel-glute-bridge/" },
  { slug: "barbell-bench-press", nameEn: "Barbell Bench Press", nameFa: "پرس سینه هالتر", type: "strength", muscles: ["chest", "triceps"], equipment: ["barbell"],
    media: { mp4: "barbell-bench-press.mp4" }, mode: "reps", source: "https://liftmanual.com/barbell-bench-press/" },
];
const SHARDS = 8;
const shards = {};
const put = (slug, text) => { const n = String(detailShard(slug, SHARDS)).padStart(2, "0"); shards[n] = { ...(shards[n] || {}), [slug]: text }; };
put("heel-glute-bridge", { description: { en: "A bridge on the heels." }, steps: { en: ["Lie down.", "Lift."] }, benefits: { en: ["Glutes."] }, musclesWorked: ["Gluteus maximus"], variations: ["barbell-bench-press"] });
put("barbell-bench-press", { steps: { en: ["Unrack.", "Lower.", "Press."] }, benefits: { en: [] }, musclesWorked: ["Pectoralis major"], variations: [] });

const asked = [];
let failShard = false;
const fetchImpl = async (url) => {
  asked.push(url);
  if (url.endsWith("catalog.json")) return json({ mediaBase: "https://media.example/lm/", detailsBase: "exercises/details/", detailShards: SHARDS, exercises: lean })();
  const m = url.match(/details\/(\d\d)\.json$/);
  if (m && !failShard) return json(shards[m[1]] || {})();
  return { ok: false, json: async () => ({}) };
};
const merged = await loadExerciseCatalog({ force: true, fetch: fetchImpl });
check("the lean list loads: one added, one built-in enriched", merged && merged.added === 1 && merged.enriched === 1, merged && { added: merged.added, enriched: merged.enriched });
const hgb = findExercise("heel-glute-bridge");
check("it has its name, muscles and animation at once", hgb.nameFa === "پل باسن روی پاشنه" && hgb.muscles.join() === "glutes,hamstrings"
  && mediaUrl(hgb.media.mp4) === "https://media.example/lm/heel-glute-bridge.mp4");
check("…but not its steps yet", !hgb.steps?.en?.length && asked.length === 1);

let bumps = 0;
const stop = subscribeExercises(() => { bumps += 1; });
await loadExerciseDetails("heel-glute-bridge", { fetch: fetchImpl });
check("opening it fetches its shard", asked.length === 2 && asked[1] === `/exercises/details/${String(detailShard("heel-glute-bridge", SHARDS)).padStart(2, "0")}.json`, asked);
check("…and fills in its text", hgb.steps.en.join(" ") === "Lie down. Lift." && hgb.description.en === "A bridge on the heels."
  && hgb.musclesWorked[0] === "Gluteus maximus" && hgb.variations[0] === "barbell-bench-press");
check("…and the screens hear about it", bumps === 1);
await loadExerciseDetails("heel-glute-bridge", { fetch: fetchImpl });
check("opening it again asks for nothing", asked.length === 2 && bumps === 1);

const bench = EXERCISES.find((e) => e.slug === "barbell-bench-press");
failShard = true;
await loadExerciseDetails(bench.id, { fetch: fetchImpl });
check("a shard that fails to arrive leaves the exercise as it was", !findExercise(bench.id).detailsLoaded);
failShard = false;
await loadExerciseDetails(bench.id, { fetch: fetchImpl });
check("…and is tried again next time", findExercise(bench.id).steps.en.length === 3 && findExercise(bench.id).detailsLoaded === true);
check("a built-in keeps its id and name while taking the library's text", findExercise(bench.id).id === bench.id && findExercise(bench.id).nameEn === bench.nameEn);
check("an unknown exercise is ignored", (await loadExerciseDetails("nope", { fetch: fetchImpl })) === null);

stop();
setExerciseRegistry(EXERCISES);
await loadExerciseCatalog({ force: true, fetch: json({ exercises: lean }) });
check("a catalog without shards keeps its text inline as before", (await loadExerciseDetails("heel-glute-bridge", { fetch: fetchImpl }))?.slug === "heel-glute-bridge" && asked.filter((u) => u.includes("details")).length === 3);
setExerciseRegistry(EXERCISES);

console.log(`catalog details: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
