// Two devices, one account, a fake Supabase: what one device writes, the
// other sees; a fresh device never overwrites the account with sample data.

import { SYNCED_KEYS, createSync, hookWrites } from "../src/lib/backend/sync.js";

let passed = 0;
let failed = 0;
const check = (name, cond) => {
  if (cond) passed += 1;
  else { failed += 1; console.log("FAIL:", name); }
};

/** A localStorage stand-in. */
function memoryStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem(k, v) { map.set(k, String(v)); },
    removeItem: (k) => map.delete(k),
    has: (k) => map.has(k),
  };
}

/** Just enough of supabase.from("user_state") for sync.js, answering Postgres-style timestamps. */
function fakeServer() {
  const rows = new Map();
  const pgTime = (iso) => new Date(iso).toISOString().replace("Z", "000+00:00"); // microseconds + offset
  return {
    rows,
    uploads: [],
    from(table) {
      const server = this;
      if (table !== "fitclub_user_state") throw new Error(`unexpected table ${table}`);
      return {
        select() {
          return {
            eq(col, val) {
              const data = [...rows.values()].filter((r) => r[col] === val).map((r) => ({ key: r.key, data: JSON.parse(JSON.stringify(r.data)), updated_at: pgTime(r.updated_at) }));
              return Promise.resolve({ data, error: null });
            },
          };
        },
        upsert(list) {
          for (const r of list) {
            server.uploads.push(r);
            rows.set(`${r.user_id}:${r.key}`, { ...r, data: JSON.parse(JSON.stringify(r.data)) });
          }
          return Promise.resolve({ error: null });
        },
      };
    },
  };
}

let clock = Date.parse("2026-09-25T10:00:00Z");
const now = () => new Date((clock += 1000)).toISOString();
const USER = "u-1";
const server = fakeServer();
const TRAIN = "fitclub.training.v1";
const DIARY = "fitclub.diary.v1";
const COACH = "fitclub.coach.v1";

// Device 1 used the app before signing up: its data becomes the account's.
const phone = memoryStorage({
  [TRAIN]: JSON.stringify({ programs: ["my split"], sessions: 12 }),
  [COACH]: JSON.stringify({ apiKey: "sk-ant-secret-key-on-this-phone", messages: ["hi"] }),
  "fitclub.theme": "dark",
});
const syncPhone = createSync({ client: server, storage: phone, userId: USER, device: "phone", now, debounceMs: 5 });
const unhookPhone = hookWrites(phone, (k) => syncPhone.noteWrite(k));

await syncPhone.link();
check("linking an empty account uploads the local stores", server.rows.has(`${USER}:training.v1`) && server.rows.has(`${USER}:coach.v1`));
check("device settings are not synced", ![...server.rows.keys()].some((k) => k.includes("theme")));
check("the coach API key never leaves the device", server.rows.get(`${USER}:coach.v1`).data.apiKey === "");
check("only known keys are synced", Object.values(SYNCED_KEYS).includes("training.v1"));

// Device 2 is a fresh install with seeded sample data.
const laptop = memoryStorage({ [TRAIN]: JSON.stringify({ programs: ["sample program"], sessions: 0 }) });
const syncLaptop = createSync({ client: server, storage: laptop, userId: USER, device: "laptop", now, debounceMs: 5 });
const unhookLaptop = hookWrites(laptop, (k) => syncLaptop.noteWrite(k));
const uploadsBefore = server.uploads.length;
const changed = await syncLaptop.link();
check("a fresh device takes the account's data", JSON.parse(laptop.getItem(TRAIN)).programs[0] === "my split");
check("…and reports what changed", changed.includes(TRAIN));
check("…without uploading its sample data", !server.uploads.slice(uploadsBefore).some((r) => r.key === "training.v1"));
check("the coach history arrives without a key", JSON.parse(laptop.getItem(COACH)).apiKey === "");

// The laptop logs food; the phone sees it on its next pull.
laptop.setItem(DIARY, JSON.stringify({ days: { "2026-09-25": { kcal: 600 } } }));
await syncLaptop.flush();
check("a write on one device is uploaded", server.rows.get(`${USER}:diary.v1`)?.data.days["2026-09-25"].kcal === 600);
const phoneChanged = await syncPhone.pull();
check("the other device pulls it", JSON.parse(phone.getItem(DIARY) || "{}").days?.["2026-09-25"]?.kcal === 600);
check("…and reports it", phoneChanged.includes(DIARY));
check("pulling keeps this device's own coach key", JSON.parse(phone.getItem(COACH)).apiKey === "sk-ant-secret-key-on-this-phone");

// Debounced push from the write hook alone.
phone.setItem(TRAIN, JSON.stringify({ programs: ["my split"], sessions: 13 }));
await new Promise((r) => setTimeout(r, 30));
check("the write hook schedules an upload", server.rows.get(`${USER}:training.v1`).data.sessions === 13);

// Last write wins: the laptop edits after the phone's upload, then both pull.
laptop.setItem(TRAIN, JSON.stringify({ programs: ["my split"], sessions: 14 }));
await syncLaptop.pull(); // local change is newer than the server copy: kept and pushed
check("a newer local change survives a pull", JSON.parse(laptop.getItem(TRAIN)).sessions === 14);
check("…and is uploaded", server.rows.get(`${USER}:training.v1`).data.sessions === 14);
await syncPhone.pull();
check("the other device catches up", JSON.parse(phone.getItem(TRAIN)).sessions === 14);

// Nothing new: a pull changes nothing.
check("a quiet pull reports no changes", (await syncPhone.pull()).length === 0);

// Signing out clears the account's data from the device, but not its settings.
syncPhone.unlink();
check("signing out clears synced stores", !phone.has(TRAIN) && !phone.has(DIARY) && !phone.has(COACH));
check("…and keeps device settings", phone.getItem("fitclub.theme") === "dark");

// A different account on the same device starts from its own data.
const other = createSync({ client: server, storage: laptop, userId: "u-2", device: "laptop", now, debounceMs: 5 });
unhookLaptop();
const unhookOther = hookWrites(laptop, (k) => other.noteWrite(k));
await other.pull(); // not linked to u-2 yet → link
check("another account's data left on the device is not uploaded", !server.rows.has("u-2:training.v1"));
check("…and is cleared from the device", !laptop.has(TRAIN) && !laptop.has(DIARY));
check("…and the first account is untouched", server.rows.get(`${USER}:training.v1`).data.sessions === 14);
laptop.setItem(TRAIN, JSON.stringify({ programs: ["u-2 plan"], sessions: 1 }));
await other.flush();
check("the second account's own writes sync under its id", server.rows.get("u-2:training.v1")?.data.programs[0] === "u-2 plan");

// The hook can be removed.
unhookOther();
unhookPhone();
let heard = 0;
const s = memoryStorage();
const off = hookWrites(s, () => { heard += 1; });
s.setItem("a", "1");
off();
s.setItem("b", "2");
check("hookWrites reports writes until removed", heard === 1);

console.log(`sync: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
