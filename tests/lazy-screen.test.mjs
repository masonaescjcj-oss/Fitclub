// Loading a screen's code (src/lib/lazyScreen.js): tried again on a bad
// connection, and after a release one reload at most.

const { importWithRetry, isChunkError, reloadOnce } = await import("../src/lib/lazyScreen.js");

let passed = 0;
let failed = 0;
const check = (name, cond, got) => {
  if (cond) passed += 1;
  else { failed += 1; console.log("FAIL:", name, got !== undefined ? JSON.stringify(got) : ""); }
};

const chunk = () => Object.assign(new Error("Loading chunk 578 failed.\n(error: https://x/static/js/578.chunk.js)"), { name: "ChunkLoadError" });
check("webpack's chunk error is a loading problem", isChunkError(chunk()));
check("…so are a missing CSS chunk and a failed module import", isChunkError(new Error("Loading CSS chunk 12 failed.")) && isChunkError(new TypeError("Failed to fetch dynamically imported module: https://x/a.js")));
check("a bug in the screen is not", !isChunkError(new TypeError("Cannot read properties of undefined (reading 'map')")) && !isChunkError(null));

const waits = [];
const wait = async (ms) => { waits.push(ms); };
let calls = 0;
let mod = await importWithRetry(async () => { calls += 1; if (calls < 3) throw chunk(); return { default: "Screen" }; }, { wait });
check("a screen that fails twice loads on the third try", mod.default === "Screen" && calls === 3, calls);
check("…waiting longer each time", JSON.stringify(waits) === JSON.stringify([700, 1400]), waits);

calls = 0;
let error = null;
try { await importWithRetry(async () => { calls += 1; throw chunk(); }, { wait }); } catch (e) { error = e; }
check("it gives up after three tries", isChunkError(error) && calls === 3, calls);

calls = 0; error = null;
try { await importWithRetry(async () => { calls += 1; throw new TypeError("x is not a function"); }, { wait }); } catch (e) { error = e; }
check("a real bug is not retried", error instanceof TypeError && calls === 1, calls);

calls = 0;
mod = await importWithRetry(async () => { calls += 1; return { default: 1 }; }, { wait });
check("a screen that loads is asked for once", calls === 1 && mod.default === 1);

const store = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
const storage = store();
let reloads = 0;
const reload = () => { reloads += 1; };
check("a screen that won't load reloads the app once", reloadOnce({ storage, online: true, now: 100000, reload }) === true && reloads === 1);
check("…but not again straight after", reloadOnce({ storage, online: true, now: 110000, reload }) === false && reloads === 1);
check("…only after half a minute", reloadOnce({ storage, online: true, now: 140001, reload }) === true && reloads === 2);
check("offline it never reloads: the error screen says to check the connection", reloadOnce({ storage: store(), online: false, now: 1, reload }) === false && reloads === 2);
const broken = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); } };
check("with storage off it doesn't reload, so it can't loop", reloadOnce({ storage: broken, online: true, now: 1, reload }) === false && reloads === 2);

console.log(`lazy screens: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
