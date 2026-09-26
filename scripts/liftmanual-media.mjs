#!/usr/bin/env node
/**
 * Turns liftmanual.com's exercise animations into what the app streams:
 * a small MP4 (H.264, 20 fps, at most 360 px, on white) and a 150 px still
 * poster (WebP) per exercise. An animated WebP of ~180 KB becomes an MP4 of
 * ~25 KB that looks the same.
 *
 * Usage
 *   npm i --no-save sharp          # image decoding; not an app dependency
 *   FFMPEG=/path/to/ffmpeg node scripts/liftmanual-media.mjs <exercises.json> --out <dir>
 *
 * <exercises.json> is what scripts/crawl-liftmanual.mjs writes. Files go to
 * <dir>/src/ (the downloads) and <dir>/media/ (<slug>.mp4, <slug>.webp).
 * Anything already converted is skipped, so a second run only does what's new.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith("--"));
const out = args[args.indexOf("--out") + 1];
const FFMPEG = process.env.FFMPEG || "ffmpeg";
if (!input || !out || args.indexOf("--out") < 0) {
  console.error("usage: node scripts/liftmanual-media.mjs <exercises.json> --out <dir>");
  process.exit(2);
}
let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error("needs sharp: npm i --no-save sharp");
  process.exit(2);
}

const SRC = join(out, "src");
const MEDIA = join(out, "media");
mkdirSync(SRC, { recursive: true });
mkdirSync(MEDIA, { recursive: true });
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

function run(cmd, argv) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, argv, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => { err += d; });
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(err.split("\n").filter(Boolean).slice(-2).join(" ")))));
  });
}

/** Every frame on white, with its delay, into an MP4 that loops like the original. */
async function toMp4(buf, file) {
  const meta = await sharp(buf, { animated: true }).metadata();
  const pages = meta.pages || 1;
  const delays = Array.isArray(meta.delay) && meta.delay.length === pages ? meta.delay : Array(pages).fill(100);
  const dir = join(tmpdir(), `lm-${process.pid}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir);
  try {
    let list = "";
    for (let i = 0; i < pages; i += 1) {
      await sharp(buf, { page: i }).flatten({ background: "#ffffff" }).png().toFile(join(dir, `f${i}.png`));
      list += `file 'f${i}.png'\nduration ${Math.max(delays[i] || 100, 20) / 1000}\n`;
    }
    list += `file 'f${pages - 1}.png'\n`;
    writeFileSync(join(dir, "list.txt"), list);
    await run(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", join(dir, "list.txt"),
      "-vf", "fps=20,scale='min(360,trunc(iw/2)*2)':-2,format=yuv420p", "-c:v", "libx264", "-crf", "28", "-preset", "slow",
      "-tune", "animation", "-movflags", "+faststart", "-an", file]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function toPoster(buf, file) {
  await sharp(buf, { page: 0 }).flatten({ background: "#ffffff" })
    .resize(150, 150, { fit: "contain", background: "#ffffff" }).webp({ quality: 72 }).toFile(file);
}

const exercises = JSON.parse(readFileSync(input, "utf8"));
const queue = exercises.filter((x) => x.animation);
const failures = [];
let n = 0;
async function worker() {
  for (;;) {
    const x = queue.shift();
    if (!x) return;
    const mp4 = join(MEDIA, `${x.slug}.mp4`);
    const poster = join(MEDIA, `${x.slug}.webp`);
    try {
      if (!existsSync(mp4) || !existsSync(poster)) {
        const ext = x.animation.split("?")[0].split(".").pop().toLowerCase();
        const buf = await download(x.animation, join(SRC, `${x.slug}.${ext}`));
        if (!existsSync(mp4)) await toMp4(buf, mp4);
        if (!existsSync(poster)) {
          // The site's own still (the first frame, 150 px) when there is one, else ours.
          const still = x.still ? await download(x.still, join(SRC, `${x.slug}-still.${x.still.split(".").pop()}`)).catch(() => null) : null;
          await toPoster(still || buf, poster);
        }
      }
    } catch (e) {
      failures.push({ slug: x.slug, error: e.message });
      rmSync(mp4, { force: true });
    }
    n += 1;
    if (n % 100 === 0) console.log(new Date().toISOString().slice(11, 19), n, "done,", failures.length, "failed");
  }
}
await Promise.all(Array.from({ length: 3 }, worker));
writeFileSync(join(out, "media-failures.json"), JSON.stringify(failures, null, 1));
console.log(`media: ${n - failures.length} of ${n} converted; ${failures.length} failed (see media-failures.json)`);
