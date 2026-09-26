#!/usr/bin/env node
/**
 * Turns each exercise's animation into the one file the app shows: an
 * animated WebP (the GIF of today, a third of the size), 360 px, on white,
 * frame for frame and with the original timing. About 70 KB each.
 *
 * Usage
 *   npm i --no-save sharp          # image decoding; not an app dependency
 *   node scripts/exercise-media.mjs <exercises.json> --out <dir>
 *
 * <exercises.json> is what scripts/crawl-exercises.mjs writes. Downloads go
 * to <dir>/src/, the app's files to <dir>/animations/<slug>.webp. Anything
 * already made is skipped, so a second run only does what's new.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith("--"));
const out = args[args.indexOf("--out") + 1];
if (!input || !out || args.indexOf("--out") < 0) {
  console.error("usage: node scripts/exercise-media.mjs <exercises.json> --out <dir>");
  process.exit(2);
}
let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error("needs sharp: npm i --no-save sharp");
  process.exit(2);
}

// The media bucket takes files up to 1 MB; the odd long animation is made smaller until it fits.
const LIMIT = 1024 * 1024;
const QUALITIES = [55, 40, 28];
const SRC = join(out, "src");
const ANIM = join(out, "animations");
mkdirSync(SRC, { recursive: true });
mkdirSync(ANIM, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(url, file) {
  if (existsSync(file)) return readFileSync(file);
  for (let i = 1; ; i += 1) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "FitClub exercise importer (site owner's app)" } });
      if (!res.ok) throw new Error(String(res.status));
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(file, buf);
      return buf;
    } catch (e) {
      if (i >= 4) throw new Error(`${url}: ${e.message}`);
      await wait(1000 * 2 ** i);
    }
  }
}

async function toAnimation(buf, file) {
  for (const quality of QUALITIES) {
    await sharp(buf, { animated: true, limitInputPixels: false })
      .flatten({ background: "#ffffff" })
      .resize({ width: 360, height: 360, fit: "inside", withoutEnlargement: true })
      .webp({ quality, effort: 6, smartSubsample: true, loop: 0 })
      .toFile(file);
    if (statSync(file).size <= LIMIT) return;
  }
  rmSync(file, { force: true });
  throw new Error("still over 1 MB at the lowest quality");
}

const exercises = JSON.parse(readFileSync(input, "utf8"));
const queue = exercises.filter((x) => x.animation);
const failures = [];
let n = 0;
async function worker() {
  for (;;) {
    const x = queue.shift();
    if (!x) return;
    const file = join(ANIM, `${x.slug}.webp`);
    try {
      if (!existsSync(file)) {
        const ext = x.animation.split("?")[0].split(".").pop().toLowerCase();
        await toAnimation(await download(x.animation, join(SRC, `${x.slug}.${ext}`)), file);
      }
    } catch (e) {
      failures.push({ slug: x.slug, error: e.message });
      rmSync(file, { force: true });
    }
    n += 1;
    if (n % 100 === 0) console.log(new Date().toISOString().slice(11, 19), n, "done,", failures.length, "failed");
  }
}
await Promise.all(Array.from({ length: Number(process.env.WORKERS) || 3 }, worker));
writeFileSync(join(out, "media-failures.json"), JSON.stringify(failures, null, 1));
console.log(`media: ${n - failures.length} of ${n} ready; ${failures.length} failed (see media-failures.json)`);
