#!/usr/bin/env node
/**
 * Import an exercise library (a spreadsheet or JSON export) into FitClub.
 *
 * Reads a CSV or JSON file of exercises (plus, optionally, a folder of GIFs),
 * checks every row, and writes catalog.json, which the app merges in at start-up
 * (src/lib/training/catalog.js). No code changes are needed; see
 * docs/EXERCISE-IMPORT.md.
 *
 * Usage
 *   node scripts/import-exercises.mjs <exercises.csv|.tsv|.json> [options]
 *
 *   # check only: read everything, print the report, write nothing
 *   node scripts/import-exercises.mjs ~/exercises/exercises.csv --media ~/exercises/gifs --dry-run
 *   # install into the app (copies the media to public/exercises/media/)
 *   node scripts/import-exercises.mjs ~/exercises/exercises.csv --media ~/exercises/gifs --out public/exercises
 *
 * Options
 *   --media <dir>       Media named by slug, searched recursively: <slug>.gif, <slug>.webp,
 *                       <slug>.mp4 / .webm, and <slug>.jpg / .png as the still poster.
 *                       WordPress size copies (<slug>-300x300.webp) are used only when there is no original.
 *   --out <dir>         Where catalog.json (and media/) are written. Without it the output goes
 *                       to a fresh temp folder, so a trial run never touches the app.
 *   --dry-run           Validate and report; write nothing.
 *   --strict            Write nothing when any row has an error.
 *   --no-copy           Don't copy media; paths point at the files where they are (use with
 *                       --media-base, or with a media folder inside --out).
 *   --media-base <url>  Where the app loads media from, e.g. a CDN. Written into catalog.json.
 *   --report <file>     Also save the full report as JSON.
 *   --help              This text.
 *
 * Columns (any order, any case; unknown columns are ignored)
 *   Name | Name FA | Slug or URL | Type | Muscle Group | Equipment Required | Description |
 *   Instructions | Instructions FA | Benefits | Benefits FA | Muscles Worked |
 *   Variations & Alternatives | Mode | GIF | WebP | MP4 | Image
 *   Lists: one item per line, or separated by "|" or ";"; Muscle Group, Equipment and
 *   Variations may also use commas. Muscle and equipment names match the library's
 *   tags case-insensitively ("Glutes", "front deltoid", "Dumbbells", "EZ Bar").
 *   The slug comes from Slug, else the URL, else the name. The URL itself isn't kept.
 *
 * Exit code: 0 all rows imported; 1 some rows had errors (the valid ones are still
 * written unless --strict); 2 bad usage or unreadable input.
 *
 * Plain Node 18+, no dependencies.
 */

import { copyFileSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, readSync, closeSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep as pathSep } from "node:path";
import { fileURLToPath } from "node:url";

// The app's .js files carry no "type" in package.json; keep Node's notice about that out of the report.
const emitWarning = process.emitWarning;
process.emitWarning = function quiet(warning, ...rest) {
  const code = typeof rest[0] === "object" ? rest[0]?.code : rest[1];
  if (code === "MODULE_TYPELESS_PACKAGE_JSON") return undefined;
  return emitWarning.call(this, warning, ...rest);
};
const { canonicalRow, normalizeExercise, slugify } = await import(new URL("../src/lib/training/taxonomy.js", import.meta.url));
process.emitWarning = emitWarning;

/* ───────────────────────────── arguments ───────────────────────────── */

export function parseArgs(argv) {
  const opts = { input: null, media: null, out: null, dryRun: false, strict: false, copy: true, mediaBase: null, report: null, help: false };
  const needs = { "--media": "media", "--out": "out", "--media-base": "mediaBase", "--report": "report" };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const [flag, inline] = a.startsWith("--") && a.includes("=") ? [a.slice(0, a.indexOf("=")), a.slice(a.indexOf("=") + 1)] : [a, null];
    if (needs[flag]) {
      const v = inline ?? argv[++i];
      if (!v) throw new Error(`${flag} needs a value`);
      opts[needs[flag]] = v;
    } else if (flag === "--dry-run") opts.dryRun = true;
    else if (flag === "--strict") opts.strict = true;
    else if (flag === "--no-copy") opts.copy = false;
    else if (flag === "--help" || flag === "-h") opts.help = true;
    else if (flag.startsWith("-")) throw new Error(`unknown option ${flag}`);
    else if (!opts.input) opts.input = a;
    else throw new Error(`unexpected argument ${a}`);
  }
  return opts;
}

/* ───────────────────────────── reading ───────────────────────────── */

/**
 * RFC 4180 CSV (quotes, "" escapes, new lines inside quotes, CRLF); the
 * delimiter is sniffed from the header. `row` is the spreadsheet row number
 * (the header is row 1).
 */
export function parseCsv(text) {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.slice(0, src.search(/\r?\n|$/));
  const delim = [",", ";", "\t"].map((d) => [d, firstLine.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i += 1; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === delim) { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i += 1;
      row.push(field); field = "";
      rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  rows.push(row);
  const header = (rows[0] || []).map((h) => h.trim());
  const out = [];
  rows.slice(1).forEach((cells, i) => {
    if (!cells.some((f) => f.trim())) return;
    const obj = {};
    header.forEach((h, k) => { if (h) obj[h] = (cells[k] ?? "").replace(/\r\n?/g, "\n").trim(); });
    out.push({ row: i + 2, data: obj });
  });
  return out;
}

/** Rows of a data file: [{row, data}], `row` being the spreadsheet row or the JSON position. */
export function readRows(file) {
  const text = readFileSync(file, "utf8");
  const ext = extname(file).toLowerCase();
  if (ext === ".json" || (ext !== ".csv" && ext !== ".tsv" && /^\s*[[{]/.test(text))) {
    const data = JSON.parse(text);
    const list = Array.isArray(data) ? data : Array.isArray(data?.exercises) ? data.exercises : null;
    if (!list) throw new Error("JSON must be an array of exercises or {\"exercises\": [...]}");
    return list.map((data, i) => ({ row: i + 1, data }));
  }
  return parseCsv(text);
}

/* ───────────────────────────── media ───────────────────────────── */

const KIND_OF = { ".gif": "gif", ".webp": "webp", ".mp4": "mp4", ".webm": "mp4", ".jpg": "poster", ".jpeg": "poster", ".png": "poster", ".avif": "poster" };

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (KIND_OF[extname(entry.name).toLowerCase()]) out.push(full);
  }
  return out;
}

/** An animated WebP carries the ANIM flag in its VP8X header; a still one is a poster. */
function isAnimatedWebp(file) {
  const buf = Buffer.alloc(21);
  const fd = openSync(file, "r");
  try { readSync(fd, buf, 0, 21, 0); } finally { closeSync(fd); }
  return buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 12, 16) === "VP8X" && (buf[20] & 0x02) !== 0;
}

/**
 * Indexes a media folder by slug: Map(slug → {gif?, webp?, mp4?, poster?} of absolute paths).
 * Originals win over WordPress size copies; among copies the largest wins.
 */
export function indexMedia(dir) {
  const bySlug = new Map();
  const size = new Map(); // "slug|kind" → pixel area of the chosen copy (Infinity for an original)
  for (const file of walk(dir)) {
    const ext = extname(file).toLowerCase();
    let kind = KIND_OF[ext];
    const stem = basename(file, extname(file));
    const m = stem.match(/^(.*?)-(\d+)x(\d+)$/);
    const slug = slugify(m ? m[1] : stem);
    if (!slug) continue;
    if (kind === "webp" && !isAnimatedWebp(file)) kind = "poster";
    const area = m ? Number(m[2]) * Number(m[3]) : Infinity;
    const key = `${slug}|${kind}`;
    const entry = bySlug.get(slug) || {};
    const prev = size.get(key);
    // A .jpg/.png poster beats a still .webp of the same size.
    const better = prev === undefined || area > prev || (area === prev && kind === "poster" && ext !== ".webp");
    if (better) { entry[kind] = file; size.set(key, area); }
    bySlug.set(slug, entry);
  }
  return bySlug;
}

/* ───────────────────────────── import ───────────────────────────── */

const isUrl = (p) => /^https?:\/\//i.test(p);
const toPosix = (p) => p.split(pathSep).join("/");

/**
 * Validates rows, attaches media, and returns everything the report and the
 * writer need. Pure apart from reading the media folder.
 */
export function buildCatalog(rows, { mediaDir = null, dataDir = process.cwd() } = {}) {
  const media = mediaDir ? indexMedia(mediaDir) : new Map();
  const errors = [];   // {row, name, slug, message}; the row is dropped
  const warnings = []; // {row, name, slug, message}; the row is kept
  const records = [];
  const firstRow = new Map();
  const used = new Set();

  for (const { row, data } of rows) {
    const res = normalizeExercise(data);
    const name = String(canonicalRow(data).nameEn ?? "").trim();
    const where = { row, name, slug: res.slug };
    for (const w of res.warnings) warnings.push({ ...where, message: w });
    if (!res.ok) { for (const e of res.errors) errors.push({ ...where, message: e }); continue; }
    const rec = res.value;
    if (firstRow.has(rec.slug)) {
      errors.push({ ...where, message: `duplicate slug (first on row ${firstRow.get(rec.slug)})` });
      continue;
    }
    firstRow.set(rec.slug, row);

    // Media: explicit columns first, then files named by the slug.
    const files = {};
    for (const [kind, p] of Object.entries(rec.media || {})) {
      if (isUrl(p)) { files[kind] = { url: p }; continue; }
      const candidates = [mediaDir && join(mediaDir, p), mediaDir && join(mediaDir, basename(p)), join(dataDir, p)].filter(Boolean);
      const hit = candidates.find((c) => existsSync(c) && statSync(c).isFile());
      if (hit) files[kind] = { file: hit };
      else warnings.push({ ...where, message: `${kind} file not found: ${p}` });
    }
    const found = media.get(rec.slug);
    if (found) {
      used.add(rec.slug);
      for (const [kind, file] of Object.entries(found)) if (!files[kind]) files[kind] = { file };
    }
    if (mediaDir && !files.gif && !files.webp && !files.mp4) warnings.push({ ...where, message: "missing GIF", kind: "missing-gif" });
    records.push({ row, rec, files });
  }

  const orphans = [...media.entries()]
    .filter(([slug]) => !used.has(slug))
    .flatMap(([, entry]) => Object.values(entry))
    .map((f) => (mediaDir ? toPosix(relative(mediaDir, f)) : f))
    .sort();

  return { records, errors, warnings, orphans, rows: rows.length };
}

/** Final media paths and file copies for the records, relative to the catalog's media base. */
function planMedia(records, { outDir, copy, mediaBase, mediaDir }) {
  const copies = [];
  const problems = [];
  for (const r of records) {
    const media = {};
    for (const [kind, f] of Object.entries(r.files)) {
      if (f.url) { media[kind] = f.url; continue; }
      if (copy) {
        const name = `${r.rec.slug}${extname(f.file).toLowerCase()}`;
        media[kind] = `media/${name}`;
        copies.push({ from: f.file, to: join(outDir, "media", name) });
      } else {
        const rel = relative(outDir, f.file);
        if (!mediaBase && (rel.startsWith("..") || isAbsolute(rel))) {
          problems.push(`${r.rec.slug}: ${f.file} is outside --out and there is no --media-base; the app could not load it`);
        }
        media[kind] = toPosix(mediaBase && mediaDir ? relative(mediaDir, f.file) : rel);
      }
    }
    r.rec = { ...r.rec };
    if (Object.keys(media).length) r.rec.media = media;
    else delete r.rec.media;
  }
  return { copies, problems };
}

/* ───────────────────────────── report ───────────────────────────── */

function list(items, max = 12) {
  const shown = items.slice(0, max).join(", ");
  return items.length > max ? `${shown}, … (+${items.length - max})` : shown;
}

export function formatReport(r) {
  const lines = [];
  const pad = (s) => String(s).padEnd(22);
  lines.push(`FitClub exercise import: ${r.input}`);
  lines.push(`  ${pad("rows read")}${r.rows}`);
  lines.push(`  ${pad("exercises")}${r.written}${r.dryRun ? "  (dry run: nothing written)" : r.out ? `  → ${r.out}` : ""}`);
  lines.push(`  ${pad("by type")}${Object.entries(r.byType).map(([k, v]) => `${k} ${v}`).join(", ") || "–"}`);
  if (r.mediaDir) {
    lines.push(`  ${pad("with GIF/WebP/MP4")}${r.withMotion}`);
    lines.push(`  ${pad("with poster")}${r.withPoster}`);
    if (!r.dryRun) lines.push(`  ${pad("media files copied")}${r.copied}`);
  }
  const rowsWithErrors = new Set(r.errors.map((e) => e.row));
  if (r.errors.length) {
    lines.push("", `Errors (${rowsWithErrors.size} row${rowsWithErrors.size === 1 ? "" : "s"} skipped)`);
    for (const e of r.errors) lines.push(`  row ${String(e.row).padEnd(5)} ${e.slug || e.name || "?"}: ${e.message}`);
  }
  const missing = r.warnings.filter((w) => w.kind === "missing-gif").map((w) => w.slug);
  const other = r.warnings.filter((w) => w.kind !== "missing-gif");
  if (missing.length || r.orphans.length || other.length || r.mediaProblems.length) lines.push("", "Warnings");
  if (missing.length) lines.push(`  missing GIF for ${missing.length} exercise${missing.length === 1 ? "" : "s"} (the app draws a figure instead): ${list(missing)}`);
  if (r.orphans.length) lines.push(`  ${r.orphans.length} media file${r.orphans.length === 1 ? "" : "s"} with no matching exercise: ${list(r.orphans)}`);
  for (const w of other) lines.push(`  row ${String(w.row).padEnd(5)} ${w.slug || w.name}: ${w.message}`);
  for (const p of r.mediaProblems) lines.push(`  ${p}`);
  lines.push("", r.errors.length ? "Fix the errors above and run again." : "No errors.");
  return lines.join("\n");
}

/* ───────────────────────────── main ───────────────────────────── */

export function run(argv, { log = console.log } = {}) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (e) {
    log(`error: ${e.message}\nRun with --help for usage.`);
    return 2;
  }
  if (opts.help || !opts.input) {
    const head = readFileSync(new URL(import.meta.url), "utf8").match(/\/\*\*([\s\S]*?)\*\//)[1];
    log(head.split("\n").map((l) => l.replace(/^ \* ?/, "")).join("\n").trim());
    return opts.help ? 0 : 2;
  }
  const input = resolve(opts.input);
  let rows;
  try {
    rows = readRows(input);
  } catch (e) {
    log(`error: cannot read ${opts.input}: ${e.message}`);
    return 2;
  }
  const mediaDir = opts.media ? resolve(opts.media) : null;
  if (mediaDir && !(existsSync(mediaDir) && statSync(mediaDir).isDirectory())) {
    log(`error: media folder not found: ${opts.media}`);
    return 2;
  }

  const built = buildCatalog(rows, { mediaDir, dataDir: dirname(input) });
  const blocked = opts.strict && built.errors.length > 0;
  const write = !opts.dryRun && !blocked;
  const outDir = opts.out ? resolve(opts.out) : write ? mkdtempSync(join(tmpdir(), "fitclub-exercises-")) : null;
  const { copies, problems } = planMedia(built.records, { outDir: outDir || process.cwd(), copy: opts.copy, mediaBase: opts.mediaBase, mediaDir });

  const exercises = built.records.map((r) => r.rec).sort((a, b) => a.slug.localeCompare(b.slug));
  const catalog = {
    version: 1,
    generatedAt: new Date().toISOString(),
    count: exercises.length,
    ...(opts.mediaBase ? { mediaBase: opts.mediaBase } : {}),
    exercises,
  };

  let copied = 0;
  if (write) {
    mkdirSync(outDir, { recursive: true });
    if (copies.length) mkdirSync(join(outDir, "media"), { recursive: true });
    for (const c of copies) {
      if (resolve(c.from) !== resolve(c.to)) copyFileSync(c.from, c.to);
      copied += 1;
    }
    writeFileSync(join(outDir, "catalog.json"), `${JSON.stringify(catalog, null, 1)}\n`);
  }

  const byType = {};
  for (const e of exercises) byType[e.type] = (byType[e.type] || 0) + 1;
  const report = {
    input: opts.input,
    out: write ? join(outDir, "catalog.json") : null,
    dryRun: opts.dryRun,
    strict: opts.strict,
    rows: built.rows,
    written: write ? exercises.length : 0,
    valid: exercises.length,
    byType,
    mediaDir,
    withMotion: exercises.filter((e) => e.media && (e.media.gif || e.media.webp || e.media.mp4)).length,
    withPoster: exercises.filter((e) => e.media?.poster).length,
    copied,
    errors: built.errors,
    warnings: built.warnings,
    orphans: built.orphans,
    mediaProblems: problems,
  };
  log(formatReport({ ...report, written: opts.dryRun ? exercises.length : report.written }));
  if (blocked) log("\n--strict: nothing was written.");
  if (write && !opts.out) log(`\nTrial output in ${outDir}. To install it in the app, run again with --out public/exercises`);
  if (opts.report) writeFileSync(resolve(opts.report), `${JSON.stringify(report, null, 1)}\n`);
  return built.errors.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = run(process.argv.slice(2));
}
