// The liftmanual taxonomy, normalizeExercise(), name → slug matching, and the
// import script (scripts/import-exercises.mjs) end to end on small inputs.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXERCISE_TYPES, LM_EQUIPMENT, LM_MUSCLES, LM_TYPES, MUSCLE_GROUP, SLUG_RE, equipmentSlug, fieldOf, muscleSlug,
  normalizeExercise, slugFromUrl, slugify, splitList, splitSteps, typeSlug,
} from "../src/lib/training/liftmanual.js";
import { MUSCLES } from "../src/lib/training/exercises.js";
import { buildCatalog, parseCsv, run } from "../scripts/import-exercises.mjs";

let pass = 0, fail = 0;
const check = (name, cond, got) => { cond ? pass++ : fail++; if (!cond) console.log("✗", name, got !== undefined ? `(got ${JSON.stringify(got)})` : ""); };

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "scripts", "import-exercises.mjs");
const sample = join(root, "scripts", "sample-exercises.csv");
const scratch = mkdtempSync(join(tmpdir(), "fitclub-import-test-"));

// ── taxonomy ──
check("25 muscles, 19 equipment, 5 types", LM_MUSCLES.length === 25 && LM_EQUIPMENT.length === 19 && LM_TYPES.length === 5);
const unique = (list) => new Set(list.map((x) => x.slug)).size === list.length;
check("taxonomy slugs are unique and kebab-case", unique(LM_MUSCLES) && unique(LM_EQUIPMENT) && [...LM_MUSCLES, ...LM_EQUIPMENT].every((x) => SLUG_RE.test(x.slug)));
check("every entry has an English and a Persian label", [...LM_MUSCLES, ...LM_EQUIPMENT, ...LM_TYPES].every((x) => x.en && /[؀-ۿ]/.test(x.fa)));
const groups = new Set(MUSCLES.map((m) => m.id));
check("every liftmanual muscle maps to one of the 7 coarse groups", LM_MUSCLES.every((m) => groups.has(MUSCLE_GROUP[m.slug])));
check("every coarse group is reachable", [...groups].every((g) => Object.values(MUSCLE_GROUP).includes(g)));
check("the site's list, A–Z", ["abs", "back", "biceps", "calves", "cardio", "chest", "forearms", "front-deltoid", "glutes", "hamstrings", "hips", "latissimus-dorsi", "neck", "obliques", "quadriceps", "rear-deltoid", "shoulders", "side-deltoid", "thighs", "traps", "triceps", "upper-arms", "waist", "wrist", "yoga"].every((s) => LM_MUSCLES.some((m) => m.slug === s)));
check("exercise types are the first three sections", EXERCISE_TYPES.join() === "strength,cardio,stretching");

// ── name → slug ──
check("each slug, English and Persian label maps to itself",
  LM_MUSCLES.every((m) => muscleSlug(m.slug) === m.slug && muscleSlug(m.en) === m.slug && muscleSlug(m.fa) === m.slug)
  && LM_EQUIPMENT.every((e) => equipmentSlug(e.slug) === e.slug && equipmentSlug(e.en) === e.slug && equipmentSlug(e.fa) === e.slug));
const cases = [["GLUTES", "glutes"], ["glute", "glutes"], ["Front Deltoid", "front-deltoid"], ["front-deltoids", "front-deltoid"],
  ["Lats", "latissimus-dorsi"], ["Quads", "quadriceps"], ["calf", "calves"], ["  Hamstrings ", "hamstrings"], ["Rear Delts", "rear-deltoid"]];
check("muscle names match case- and spacing-insensitively", cases.every(([n, s]) => muscleSlug(n) === s), cases.map(([n]) => muscleSlug(n)));
const gear = [["Dumbbells", "dumbbell"], ["EZ Curl Bar", "ez-curl-bar"], ["ez bar", "ez-curl-bar"], ["Body Weight", "bodyweight"], ["TRX", "suspension-trainer"],
  ["Weights", "weight-plate"], ["Stick", "stick-pvc"], ["Suspension", "suspension-trainer"], ["battle ropes", "battle-ropes"], ["Machine", "leverage-machine"], ["Resistance Bands", "resistance-band"]];
check("equipment names (and the site's own labels) match", gear.every(([n, s]) => equipmentSlug(n) === s), gear.map(([n]) => equipmentSlug(n)));
check("unknown names give null", muscleSlug("elbows") === null && equipmentSlug("sled") === null && muscleSlug("") === null);
check("type labels", typeSlug("Strength Workouts") === "strength" && typeSlug("Stretches") === "stretching" && typeSlug("Cardio Exercises") === "cardio" && typeSlug("Guides") === "guides");
check("column names", fieldOf("Muscle Group") === "muscles" && fieldOf("Equipment Required") === "equipment" && fieldOf("Heel Glute Bridge Instructions") === "steps"
  && fieldOf("Variations & Alternatives") === "variations" && fieldOf("Muscles Worked") === "musclesWorked" && fieldOf("Name FA") === "nameFa" && fieldOf("whatever") === null);
check("slugify", slugify("Farmer’s Walk") === "farmers-walk" && slugify("90 to 90 Stretch") === "90-to-90-stretch" && slugify("Push-Up") === "push-up");
check("slug from a liftmanual URL", slugFromUrl("https://liftmanual.com/heel-glute-bridge/") === "heel-glute-bridge" && slugFromUrl("https://liftmanual.com/muscle/glutes") === "glutes");
check("lists split on lines first, else on commas outside brackets",
  splitList("Glutes, Hamstrings").length === 2 && splitList("a (b, c), d").length === 2 && splitList("x, y\nz").join("|") === "x, y|z");
check("numbered steps split and lose their numbers", splitSteps("1. Lie down. 2. Lift, then hold. 3) Lower.").join("|") === "Lie down.|Lift, then hold.|Lower.");
check("Persian step numbers are stripped too", splitSteps("۱. دراز بکشید\n۲. بالا بیایید").join("|") === "دراز بکشید|بالا بیایید");

// ── normalizeExercise ──
const row = {
  Name: "Heel Glute Bridge", URL: "https://liftmanual.com/heel-glute-bridge/", "Muscle Group": "Glutes, Hamstrings",
  "Equipment Required": "Bodyweight", Instructions: "1. Lie flat.\n2. Lift toes.\n3. Drive up.", "Muscles Worked": "Gluteus maximus\nAdductor magnus",
  Benefits: "No equipment needed", "Variations & Alternatives": "Dumbbell Glute Bridge, Barbell Glute Bridge", id: "17",
};
const n1 = normalizeExercise(row);
check("a liftmanual-labelled row is valid", n1.ok && n1.errors.length === 0, n1.errors);
const v = n1.value;
check("slug from the URL, not the numeric id", v.slug === "heel-glute-bridge", v.slug);
check("muscles and equipment become slugs", v.muscles.join() === "glutes,hamstrings" && v.equipment.join() === "bodyweight");
check("steps are numbered-free, English", v.steps.en.length === 3 && v.steps.en[0] === "Lie flat." && !v.steps.fa);
check("muscles worked, benefits, variations", v.musclesWorked.length === 2 && v.benefits.en[0] === "No equipment needed" && v.variations.join() === "dumbbell-glute-bridge,barbell-glute-bridge");
check("type and mode default to strength / reps", v.type === "strength" && v.mode === "reps");
check("source is kept", v.source === "https://liftmanual.com/heel-glute-bridge/");
check("a catalog record normalizes to itself", JSON.stringify(normalizeExercise(v).value) === JSON.stringify(v));

const bad = (raw) => normalizeExercise(raw).errors.join(" | ");
check("missing name", !normalizeExercise({ "Muscle Group": "Glutes" }).ok && bad({ "Muscle Group": "Glutes" }).includes("missing name"));
check("unknown muscle is an error", bad({ name: "X", muscles: "Glutes, Elbows", equipment: "Dumbbell" }).includes('unknown muscle "Elbows"'));
check("unknown equipment is an error", bad({ name: "X", muscles: "Glutes", equipment: "Sled" }).includes('unknown equipment "Sled"'));
check("no muscle group is an error", bad({ name: "X", equipment: "Dumbbell" }).includes("no muscle group"));
check("a routine is not an exercise", bad({ name: "PPL", muscles: "Chest", type: "Workout Routines" }).includes("not an exercise"));
check("unknown mode is an error", bad({ name: "X", muscles: "Abs", mode: "laps" }).includes('unknown mode "laps"'));
const noGear = normalizeExercise({ name: "Air Squat", muscles: "Quads" });
check("no equipment is only a warning", noGear.ok && noGear.warnings.includes("no equipment listed"));
const stretch = normalizeExercise({ name: "90 to 90 Stretch", "Muscle Group": "Hips", type: "Stretches" }).value;
check("stretches time by default", stretch.type === "stretching" && stretch.mode === "time");
check("type inferred from cardio / yoga / the name", normalizeExercise({ name: "Jumping Jack", muscles: "Cardio" }).value.type === "cardio"
  && normalizeExercise({ name: "Dog Pose", muscles: "Yoga" }).value.type === "stretching");
check("mode aliases", normalizeExercise({ name: "Plank", muscles: "Abs", mode: "Seconds" }).value.mode === "time"
  && normalizeExercise({ name: "Sprint", muscles: "Cardio", mode: "metres" }).value.mode === "distance");
const media = normalizeExercise({ name: "X", muscles: "Abs", gif: "media/x.gif", webp: "../secret.webp", mp4: "x.gif", poster: "https://cdn.example.com/x.jpg" });
check("media: good paths kept, escapes and wrong types dropped with a warning",
  media.ok && media.value.media.gif === "media/x.gif" && media.value.media.poster === "https://cdn.example.com/x.jpg" && !media.value.media.webp && !media.value.media.mp4 && media.warnings.filter((w) => w.startsWith("ignored")).length === 2,
  media.value?.media);
check("Persian name and steps", (() => { const r = normalizeExercise({ name: "X", "Name FA": "ایکس", muscles: "Abs", steps: ["a"], "Instructions FA": "۱. الف\n۲. ب" }).value; return r.nameFa === "ایکس" && r.steps.fa.length === 2; })());

// ── CSV ──
const csv = parseCsv('﻿Name;Muscle Group;Instructions\n"Bridge, heel";"Glutes, Hamstrings";"1. Lie ""flat""\n2. Lift"\r\n\r\nPlank;Abs;Hold\n');
check("CSV: BOM, ; delimiter, quotes, escaped quotes, new lines in cells, blank lines",
  csv.length === 2 && csv[0].data.Name === "Bridge, heel" && csv[0].data.Instructions === '1. Lie "flat"\n2. Lift' && csv[1].data.Name === "Plank", csv);
check("CSV rows are numbered like a spreadsheet", csv[0].row === 2 && csv[1].row === 4, csv.map((r) => r.row));

// ── the import on a messy file ──
const mediaDir = join(scratch, "gifs");
mkdirSync(mediaDir, { recursive: true });
const gif = Buffer.from("R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==", "base64");
for (const f of ["push-up.gif", "push-up.jpg", "orphan-move.gif", "air-squat-300x300.gif"]) writeFileSync(join(mediaDir, f), gif);
const messy = join(scratch, "messy.csv");
writeFileSync(messy, [
  "Exercise,Muscle Group,Equipment Required,Type",
  "Push-Up,\"Chest, Triceps\",Bodyweight,Strength",
  "Air Squat,Quads,Body Weight,Strength",
  "Elbow Thing,Elbows,Dumbbell,Strength",
  "Sled Drag,Quadriceps,Sled,Cardio",
  "push up,Chest,Bodyweight,Strength",
].join("\n"));
const built = buildCatalog(parseCsv(readFileSync(messy, "utf8")), { mediaDir, dataDir: scratch });
const msgs = built.errors.map((e) => `${e.row}:${e.message}`);
check("unknown muscle reported with its row", msgs.includes('4:unknown muscle "Elbows"'), msgs);
check("unknown equipment reported", msgs.includes('5:unknown equipment "Sled"'), msgs);
check("duplicate slug reported", msgs.some((m) => m.startsWith("6:duplicate slug")), msgs);
check("valid rows kept", built.records.map((r) => r.rec.slug).join() === "push-up,air-squat");
check("media found by slug, poster too; size copies used when there is no original",
  built.records[0].files.gif && built.records[0].files.poster && built.records[1].files.gif?.file.endsWith("air-squat-300x300.gif"));
check("media with no exercise reported", built.orphans.join() === "orphan-move.gif", built.orphans);
writeFileSync(join(scratch, "one.json"), JSON.stringify([{ name: "Hollow Hold", muscles: ["abs"], mode: "time" }]));
const noMedia = buildCatalog([{ row: 1, data: { name: "Hollow Hold", muscles: "Abs" } }], { mediaDir });
check("missing GIF reported when a media folder is given", noMedia.warnings.some((w) => w.kind === "missing-gif" && w.slug === "hollow-hold"));

const logs = [];
const log = (s) => logs.push(s);
const out = join(scratch, "out");
check("errors → exit code 1", run([messy, "--media", mediaDir, "--out", out], { log }) === 1);
const written = JSON.parse(readFileSync(join(out, "catalog.json"), "utf8"));
check("valid rows are still written, sorted, with copied media", written.count === 2 && written.exercises[0].slug === "air-squat"
  && written.exercises[1].media.gif === "media/push-up.gif" && existsSync(join(out, "media", "push-up.gif")) && existsSync(join(out, "media", "air-squat.gif")));
check("the report names each problem", /unknown muscle "Elbows"/.test(logs.join("\n")) && /missing GIF|no matching exercise/.test(logs.join("\n")));
const strictOut = join(scratch, "strict");
check("--strict writes nothing when a row fails", run([messy, "--strict", "--out", strictOut], { log }) === 1 && !existsSync(join(strictOut, "catalog.json")));
check("JSON input works", run([join(scratch, "one.json"), "--out", join(scratch, "json")], { log }) === 0
  && JSON.parse(readFileSync(join(scratch, "json", "catalog.json"), "utf8")).exercises[0].mode === "time");
check("--media-base is written and --no-copy keeps paths", run([messy, "--media", mediaDir, "--no-copy", "--media-base", "https://cdn.example.com/lm/", "--out", join(scratch, "cdn")], { log }) === 1
  && (() => { const c = JSON.parse(readFileSync(join(scratch, "cdn", "catalog.json"), "utf8")); return c.mediaBase === "https://cdn.example.com/lm/" && c.exercises[1].media.gif === "push-up.gif" && !existsSync(join(scratch, "cdn", "media")); })());
check("bad usage → exit 2", run(["--bogus"], { log }) === 2 && run([join(scratch, "missing.csv")], { log }) === 2);

// ── the CLI itself, dry run on the shipped sample ──
const publicCatalog = join(root, "public", "exercises", "catalog.json");
const hadCatalog = existsSync(publicCatalog);
const dry = spawnSync(process.execPath, [cli, sample, "--dry-run"], { encoding: "utf8", env: { ...process.env, TMPDIR: scratch } });
check("dry run on the sample exits 0", dry.status === 0, dry.stdout + dry.stderr);
check("dry run reads 3 rows, all valid", /rows read\s+3/.test(dry.stdout) && /exercises\s+3\s+\(dry run/.test(dry.stdout) && /No errors\./.test(dry.stdout), dry.stdout);
check("dry run prints no Node warnings", !/Warning/.test(dry.stderr), dry.stderr);
check("dry run writes nothing", existsSync(publicCatalog) === hadCatalog);
const trial = spawnSync(process.execPath, [cli, sample], { encoding: "utf8", env: { ...process.env, TMPDIR: scratch } });
const trialDir = (trial.stdout.match(/Trial output in (\S+)\./) || [])[1];
check("without --out the output lands in a temp folder, not public/", trial.status === 0 && trialDir && trialDir.startsWith(scratch) && existsSync(join(trialDir, "catalog.json")) && existsSync(publicCatalog) === hadCatalog, trial.stdout);
const sampleCatalog = trialDir ? JSON.parse(readFileSync(join(trialDir, "catalog.json"), "utf8")) : { exercises: [] };
const hgb = sampleCatalog.exercises.find((e) => e.slug === "heel-glute-bridge");
check("the sample's Heel Glute Bridge", hgb && hgb.muscles.join() === "glutes,hamstrings" && hgb.equipment.join() === "bodyweight" && hgb.steps.en.length === 8 && hgb.steps.fa.length === 8 && hgb.nameFa);

rmSync(scratch, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
