// Runs every tests/*.test.mjs in its own Node process and sums the results.
// Usage: npm run test:unit   (or: node tests/run.mjs [name-filter])
//
// Each test file is a plain script that prints "N passed, M failed" and exits
// non-zero on a failure. register.mjs lets Node resolve the app's
// extension-less imports the way webpack does.

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const filter = process.argv[2] || "";
const files = readdirSync(here).filter((f) => f.endsWith(".test.mjs") && f.includes(filter)).sort();

let failed = 0;
for (const file of files) {
  const run = spawnSync(process.execPath, ["--import", join(here, "register.mjs"), join(here, file)], { encoding: "utf8" });
  // Node warns on stderr that the app's .js files have no "type"; the verdict is on stdout.
  const out = `${run.stdout}${run.stderr}`.trim();
  const last = run.stdout.trim().split("\n").filter(Boolean).pop() || "(no output)";
  const ok = run.status === 0;
  if (!ok) failed += 1;
  console.log(`${ok ? "ok  " : "FAIL"}  ${file.padEnd(28)} ${last}`);
  if (!ok) console.log(out.split("\n").map((l) => `      ${l}`).join("\n"));
}
console.log(`\n${files.length - failed} of ${files.length} test files passed`);
process.exit(failed ? 1 : 0);
