// The exercise catalog: built-ins' liftmanual data, the merge rules, the
// failure-silent loader, and the registry that findExercise/searchExercises read.
import {
  EXERCISES, allExercises, equipmentLabel, exerciseName, exercisesVersion, findBySlug, findExercise, muscleLabel,
  searchExercises, setExerciseRegistry, subscribeExercises, unitOf,
} from "../src/lib/training/exercises.js";
import { catalogRecords, catalogUrl, loadExerciseCatalog, mediaUrl, mergeCatalog } from "../src/lib/training/catalog.js";
import { SLUG_RE, findEquipment, findMuscle } from "../src/lib/training/liftmanual.js";

let pass = 0, fail = 0;
const check = (name, cond, got) => { cond ? pass++ : fail++; if (!cond) console.log("✗", name, got !== undefined ? `(got ${JSON.stringify(got)})` : ""); };

// ── built-ins ──
check("51 built-ins, ids unchanged", EXERCISES.length === 51 && ["ex1", "ex2", "ex3", "ex4", "ex5", "ex6", "bench_press", "plank", "jump_rope"].every((id) => findExercise(id)));
check("every built-in has a liftmanual slug", EXERCISES.every((e) => SLUG_RE.test(e.slug)), EXERCISES.filter((e) => !SLUG_RE.test(e.slug || "")).map((e) => e.id));
check("built-in slugs are unique", new Set(EXERCISES.map((e) => e.slug)).size === EXERCISES.length);
check("built-in muscles and equipment are liftmanual slugs", EXERCISES.every((e) => e.muscles.length && e.muscles.every(findMuscle) && e.equipmentSlugs.every(findEquipment)));
check("best-guess slugs", findExercise("ex2").slug === "barbell-deadlift" && findExercise("bench_press").slug === "barbell-bench-press" && findExercise("pullup").slug === "pull-up");
check("old fields intact", findExercise("ex2").equipment === "Barbell" && findExercise("plank").mode === "time" && findExercise("ex3").mode === "distance" && findExercise("lunge").muscle === "legs");
check("findBySlug", findBySlug("push-up")?.id === "pushup" && findBySlug("nope") === null);
check("old search still works", searchExercises("bench").length > 0 && searchExercises("پرس").length > 0 && searchExercises("", "legs").every((e) => e.muscle === "legs"));
check("search by liftmanual muscle", searchExercises("", null, { lmMuscle: "glutes" }).every((e) => e.muscles.includes("glutes")) && searchExercises("", null, { lmMuscle: "glutes" }).length > 5);
check("search by equipment", searchExercises("", null, { equipment: "kettlebell" }).map((e) => e.id).sort().join() === "goblet_squat,kb_swing");
check("filters combine", searchExercises("squat", "legs", { lmMuscle: "quadriceps", equipment: "barbell" }).map((e) => e.id).sort().join() === "ex4,front_squat");
check("search matches muscle labels in both languages", searchExercises("hamstrings").length > 0 && searchExercises("پشت ران").length > 0);
check("labels", equipmentLabel(findExercise("ex5"), false) === "Machine" && equipmentLabel(findExercise("ex5"), true) === "دستگاه اسمیت"
  && equipmentLabel(findExercise("pullup"), true) === "میله بارفیکس" && muscleLabel(findExercise("ex2"), false) === "Glutes, Hamstrings" && muscleLabel(findExercise("ex2"), true) === "باسن، پشت ران");

// ── merge rules ──
const hgb = { slug: "heel-glute-bridge", nameEn: "Heel Glute Bridge", nameFa: "پل باسن روی پاشنه", type: "strength", muscles: ["glutes", "hamstrings"],
  equipment: ["bodyweight"], steps: { en: ["Lie down.", "Lift."] }, benefits: { en: ["Glutes"] }, variations: ["barbell-hip-thrust"],
  media: { gif: "media/heel-glute-bridge.gif" }, mode: "reps", source: "https://liftmanual.com/heel-glute-bridge/" };
const bench = { slug: "barbell-bench-press", nameEn: "Barbell Bench Press", muscles: ["chest", "front-deltoid", "triceps"], equipment: ["barbell"],
  steps: { en: ["Lie back.", "Press."], fa: ["دراز بکشید.", "فشار دهید."] }, media: { gif: "media/barbell-bench-press.gif", poster: "media/barbell-bench-press.jpg" }, mode: "time", type: "strength" };
const plankClash = { slug: "plank", nameEn: "Plank", muscles: ["abs"], equipment: ["bodyweight"] };
const m = mergeCatalog(EXERCISES, [hgb, bench, plankClash, { nameEn: "", muscles: ["abs"] }, { ...hgb, nameEn: "Again" }, { name: "Stretch It", muscles: "Elbows" }]);
check("merge counts: 1 enriched, 2 added, 3 skipped", m.enriched === 1 && m.added === 2 && m.skipped === 3, [m.enriched, m.added, m.skipped]);
check("merge is pure", EXERCISES.length === 51 && !findExercise("bench_press").steps && allExercises() === EXERCISES);
const b = m.list.find((e) => e.id === "bench_press");
check("matched by slug: the built-in keeps its id, names, group, equipment text and mode",
  b && b.nameFa === "پرس سینه با هالتر" && b.nameEn === "Barbell Bench Press" && b.muscle === "chest" && b.equipment === "Barbell" && b.mode === "reps");
check("…and takes the catalog's steps, media, muscles and source", b.steps.fa.length === 2 && b.media.poster === "media/barbell-bench-press.jpg"
  && b.muscles.join() === "chest,front-deltoid,triceps" && b.source === "https://liftmanual.com/barbell-bench-press/");
check("the built-in stays where it was", m.list.indexOf(b) === EXERCISES.findIndex((e) => e.id === "bench_press"));
const h = m.list.find((e) => e.id === "heel-glute-bridge");
check("new exercise: id = slug, coarse group from its first muscle", h && h.muscle === "legs" && h.slug === "heel-glute-bridge" && h.mode === "reps");
check("new exercise: equipment text from the slugs, names kept", h.equipment === "Bodyweight" && h.equipmentSlugs.join() === "bodyweight" && h.nameFa === "پل باسن روی پاشنه");
const p = m.list.find((e) => e.slug === "plank");
check("a slug that is a built-in's id gets an lm- prefix", p && p.id === "lm-plank" && m.list.find((e) => e.id === "plank").slug === "front-plank");
check("no Persian name → English", p.nameFa === "Plank");
check("repeated slug: the first one wins", m.list.filter((e) => e.slug === "heel-glute-bridge").length === 1 && h.nameEn === "Heel Glute Bridge");
check("catalogRecords reads both shapes", catalogRecords([1]).length === 1 && catalogRecords({ exercises: [1, 2] }).length === 2 && catalogRecords(null).length === 0);

// ── loader ──
const respond = (body, ok = true) => async () => ({ ok, json: async () => (typeof body === "string" ? JSON.parse(body) : body) });
let calls = 0;
const unsubscribe = subscribeExercises(() => { calls += 1; });
const v0 = exercisesVersion();
check("catalog URL", catalogUrl() === "/exercises/catalog.json");

for (const [label, fetch] of [
  ["no fetch at all", undefined],
  ["network error", async () => { throw new Error("offline"); }],
  ["404", respond({}, false)],
  ["index.html instead of JSON", respond("<!doctype html><html></html>")],
  ["empty catalog", respond({ exercises: [] })],
  ["nothing valid", respond({ exercises: [{ nameEn: "" }] })],
]) {
  const saved = globalThis.fetch;
  if (!fetch) globalThis.fetch = undefined;
  const r = await loadExerciseCatalog({ fetch, force: true });
  globalThis.fetch = saved;
  check(`failure-silent: ${label}`, r === null && allExercises() === EXERCISES && exercisesVersion() === v0 && calls === 0);
}
check("no catalog → the app behaves as before", findExercise("heel-glute-bridge") === null && exerciseName("heel-glute-bridge", false) === "heel-glute-bridge");

let fetched = null;
const r = await loadExerciseCatalog({ force: true, fetch: async (url) => { fetched = url; return respond({ version: 1, exercises: [hgb, bench] })(); } });
check("loads from /exercises/catalog.json", fetched === "/exercises/catalog.json");
check("loaded: registry swapped, listeners told once, version bumped", r && r.added === 1 && r.enriched === 1 && calls === 1 && exercisesVersion() === v0 + 1);
check("findExercise sees catalog exercises synchronously", findExercise("heel-glute-bridge")?.nameEn === "Heel Glute Bridge" && findExercise("bench_press").steps.en.length === 2);
check("exerciseName / unitOf work on them", exerciseName("heel-glute-bridge", true) === "پل باسن روی پاشنه" && unitOf(findExercise("heel-glute-bridge"), { reps: "reps" }) === "reps");
check("searchExercises sees them, by name and by filter", searchExercises("heel glute").length === 1 && searchExercises("", null, { lmMuscle: "hamstrings", equipment: "bodyweight" }).some((e) => e.id === "heel-glute-bridge"));
check("findBySlug sees them", findBySlug("heel-glute-bridge")?.id === "heel-glute-bridge");
check("loading again without force reuses the first result", (await loadExerciseCatalog()) === r && calls === 1);
check("media paths resolve under /exercises/", mediaUrl("media/x.gif") === "/exercises/media/x.gif" && mediaUrl("https://cdn.example.com/x.gif") === "https://cdn.example.com/x.gif" && mediaUrl("/y.gif") === "/y.gif" && mediaUrl("") === "");
await loadExerciseCatalog({ force: true, fetch: respond({ mediaBase: "https://cdn.example.com/lm", exercises: [hgb] }) });
check("a catalog's mediaBase moves relative media", mediaUrl("media/x.gif") === "https://cdn.example.com/lm/media/x.gif");
unsubscribe();
setExerciseRegistry(EXERCISES);
check("unsubscribe", calls === 2);
check("reset restores the built-ins", findExercise("heel-glute-bridge") === null && allExercises().length === 51);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
