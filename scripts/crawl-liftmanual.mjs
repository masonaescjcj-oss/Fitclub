#!/usr/bin/env node
/**
 * Reads every exercise on liftmanual.com (the owner's own site) into
 * <dir>/exercises.json: the list and its muscles and equipment from the
 * WordPress REST API, each exercise's text and animation from its page.
 * Six requests at a time, with a pause between. Resumable: an exercise
 * already read, and unchanged on the site since, is kept.
 *
 * Usage: node scripts/crawl-liftmanual.mjs <dir>
 * Next: scripts/liftmanual-media.mjs, then scripts/build-liftmanual.mjs.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const SITE = "https://liftmanual.com";
const OUT = `${(process.argv[2] || "data/liftmanual").replace(/\/+$/, "")}/`;
const FILE = `${OUT}exercises.json`;
const TYPES = { 43: "Strength", 44: "Cardio", 45: "Stretching" };
const UA = "FitClub exercise importer (site owner's app)";
mkdirSync(OUT, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, as = "text", tries = 4) {
  for (let i = 1; ; i += 1) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`${res.status}`);
      return as === "json" ? { body: await res.json(), headers: res.headers } : await res.text();
    } catch (e) {
      if (i >= tries) throw new Error(`${url}: ${e.message}`);
      await wait(1000 * 2 ** i);
    }
  }
}

const decode = (s) => s
  .replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#039;|&apos;/g, "'")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&hellip;/g, "…").replace(/&ndash;/g, "–").replace(/&mdash;/g, "—")
  .replace(/&rsquo;/g, "’").replace(/&lsquo;/g, "‘").replace(/&rdquo;/g, "”").replace(/&ldquo;/g, "“")
  .replace(/\s+/g, " ").trim();

async function terms(base) {
  const all = new Map();
  for (let page = 1; ; page += 1) {
    const r = await get(`${SITE}/wp-json/wp/v2/${base}?per_page=100&page=${page}&_fields=id,slug,name`, "json");
    if (!r || !r.body.length) break;
    r.body.forEach((t) => all.set(t.id, { slug: t.slug, name: decode(t.name) }));
    if (page >= Number(r.headers.get("x-wp-totalpages") || 1)) break;
  }
  return all;
}

/** The page's sections: each h2 with its list items, links and media. */
function parsePage(html) {
  const main = html.slice(html.indexOf("<main"), html.indexOf("</main>")).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "");
  const para = (label) => {
    const at = main.indexOf(`<strong>${label}</strong>`);
    if (at < 0) return "";
    const rest = main.slice(at + label.length + 17);
    const m = rest.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    return m ? decode(m[1]) : "";
  };
  const sections = [];
  const parts = main.split(/<h2[^>]*>/i).slice(1);
  for (const part of parts) {
    const title = decode(part.slice(0, part.search(/<\/h2>/i)));
    const body = part.slice(part.search(/<\/h2>/i));
    const items = [...body.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => ({
      text: decode(m[1]),
      href: (m[1].match(/href="([^"]+)"/i) || [])[1] || null,
    })).filter((x) => x.text);
    const media = [...body.matchAll(/<(?:img|source|video)[^>]+(?:src|data-src)="([^"]+)"/gi)].map((m) => m[1]);
    const srcset = [...body.matchAll(/srcset="([^"]+)"/gi)].flatMap((m) => m[1].split(",").map((x) => x.trim().split(/\s+/)[0]));
    sections.push({ title, items, media, srcset });
  }
  const find = (re) => sections.find((s) => re.test(s.title));
  const visual = find(/Form\s*&\s*Visual/i) || sections.find((s) => s.media.length);
  const media = visual ? [...new Set(visual.media)] : [];
  const stills = visual ? [...new Set(visual.srcset)] : [];
  return {
    description: para("Description"),
    muscleText: para("Muscle Group"),
    equipmentText: para("Equipment Required"),
    instructions: (find(/Instructions$/i)?.items || []).map((x) => x.text),
    benefits: (find(/Benefits$/i)?.items || []).map((x) => x.text),
    musclesWorked: (find(/Muscles Worked$/i)?.items || []).map((x) => x.text),
    variations: (find(/Variations/i)?.items || []).map((x) => ({ name: x.text, slug: x.href && x.href.startsWith(SITE) ? x.href.replace(SITE, "").replace(/^\/|\/$/g, "") : null })),
    animation: media.find((u) => /\.(webp|gif|mp4|webm)(\?|$)/i.test(u) && !/-\d+x\d+\./.test(u)) || null,
    still: stills.find((u) => /-150x150\./.test(u)) || stills.find((u) => /-300x300\./.test(u)) || null,
  };
}

const have = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : [];
const done = new Map(have.map((x) => [x.slug, x]));
console.log("already have", done.size);

const [muscles, equipment] = await Promise.all([terms("muscles"), terms("equipment")]);
console.log("muscles", muscles.size, "equipment", equipment.size);

const posts = [];
for (let page = 1; ; page += 1) {
  const r = await get(`${SITE}/wp-json/wp/v2/posts?categories=43,44,45&per_page=100&page=${page}&_fields=id,slug,link,title,categories,muscles,equipment,featured_media,modified`, "json");
  if (!r || !r.body.length) break;
  posts.push(...r.body);
  if (page >= Number(r.headers.get("x-wp-totalpages") || 1)) break;
}
console.log("exercise posts", posts.length);

let n = 0;
const failures = [];
const queue = posts.filter((p) => !done.has(p.slug) || done.get(p.slug).modified !== p.modified);
async function worker() {
  for (;;) {
    const p = queue.shift();
    if (!p) return;
    try {
      const html = await get(p.link);
      if (!html) { failures.push({ slug: p.slug, error: "404" }); continue; }
      const page = parsePage(html);
      const type = (p.categories || []).map((c) => TYPES[c]).find(Boolean) || "Strength";
      done.set(p.slug, {
        id: p.id, slug: p.slug, url: p.link, modified: p.modified, name: decode(p.title?.rendered || p.slug), type,
        muscles: (p.muscles || []).map((id) => muscles.get(id)).filter(Boolean),
        equipment: (p.equipment || []).map((id) => equipment.get(id)).filter(Boolean),
        ...page,
      });
    } catch (e) {
      failures.push({ slug: p.slug, error: e.message });
    }
    n += 1;
    if (n % 100 === 0) {
      writeFileSync(FILE, JSON.stringify([...done.values()]));
      console.log(new Date().toISOString().slice(11, 19), n, "/", queue.length + n, "failures", failures.length);
    }
    await wait(120);
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
writeFileSync(FILE, JSON.stringify([...done.values()]));
writeFileSync(`${OUT}failures.json`, JSON.stringify(failures, null, 1));
const all = [...done.values()];
console.log("done:", all.length, "exercises;", failures.length, "failures;",
  all.filter((x) => x.animation).length, "with animation;", all.filter((x) => x.instructions.length).length, "with steps");
