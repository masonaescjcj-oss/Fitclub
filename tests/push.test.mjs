// Push on the server (api/_push.js): who may ask, what goes out, what gets
// forgotten; with fakes for the database and the push service.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { createMessageHandler, createReminderHandler, REMINDER } = require("../api/_push.js");

let pass = 0, fail = 0;
const check = (name, cond, got) => { cond ? pass++ : fail++; if (!cond) console.log("✗", name, got !== undefined ? `(got ${JSON.stringify(got).slice(0, 300)})` : ""); };
const cfg = { url: "https://x.supabase.co", anonKey: "anon", secret: "srv-secret", vapidPublic: "pub", vapidPrivate: "priv", subject: "https://fitclub-ai.vercel.app" };
const res = () => { const r = { code: 0, body: null, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } }; return r; };
const MID = "11111111-2222-3333-4444-555555555555";

const calls = [];
const rpc = async (fn, args) => {
  calls.push([fn, args]);
  if (fn === "push_for_message") return args.p_sender === "anna"
    ? { chatId: "c1", title: "Squad", body: "Anna: Gym at 7?", targets: [{ endpoint: "https://push/a", keys: { p256dh: "k", auth: "a" } }, { endpoint: "https://push/gone", keys: { p256dh: "k", auth: "a" } }] }
    : { targets: [] };
  if (fn === "push_due_reminders") return { targets: [{ endpoint: "https://push/fa", keys: {}, lang: "fa" }, { endpoint: "https://push/en", keys: {}, lang: "en" }] };
  return true;
};
const sent = [];
const webpush = { sendNotification: async (sub, payload) => { if (sub.endpoint.endsWith("gone")) { const e = new Error("gone"); e.statusCode = 410; throw e; } sent.push([sub.endpoint, JSON.parse(payload)]); } };
const deps = { config: cfg, rpc, webpush, userFromToken: async (_c, token) => (token === "anna-token" ? { id: "anna" } : token === "ben-token" ? { id: "ben" } : null) };
const msg = createMessageHandler(deps);

let r = res(); await msg({ method: "GET", headers: {}, body: {} }, r);
check("only POST", r.code === 405);
r = res(); await msg({ method: "POST", headers: {}, body: { messageId: MID } }, r);
check("without a sign-in, no push", r.code === 401 && !calls.length);
r = res(); await msg({ method: "POST", headers: { authorization: "Bearer anna-token" }, body: { messageId: "nope" } }, r);
check("a malformed message id is refused", r.code === 400);
r = res(); await msg({ method: "POST", headers: { authorization: "Bearer anna-token" }, body: { messageId: MID } }, r);
check("the sender's request reaches the chat's members", r.code === 200 && r.body.sent === 1 && sent[0][0] === "https://push/a" && sent[0][1].title === "Squad" && sent[0][1].body === "Anna: Gym at 7?" && sent[0][1].url === "/?chat=c1", [r.body, sent]);
check("…the database is asked with the server's secret and the signed-in sender", calls[0][0] === "push_for_message" && calls[0][1].p_secret === "srv-secret" && calls[0][1].p_sender === "anna" && calls[0][1].p_message === MID);
check("…and a device the push service dropped is forgotten", r.body.gone === 1 && calls.some(([fn, a]) => fn === "push_gone" && a.p_endpoint === "https://push/gone"));
sent.length = 0;
r = res(); await msg({ method: "POST", headers: { authorization: "Bearer ben-token" }, body: { messageId: MID } }, r);
check("someone else asking about Anna's message sends nothing", r.code === 200 && r.body.sent === 0 && sent.length === 0);
r = res(); await createMessageHandler({ ...deps, config: { ...cfg, vapidPrivate: "" } })({ method: "POST", headers: { authorization: "Bearer anna-token" }, body: { messageId: MID } }, r);
check("without VAPID keys it says so instead of failing quietly", r.code === 503);

const rem = createReminderHandler({ ...deps, cronSecret: "cron-1" });
r = res(); await rem({ headers: {} }, r);
check("reminders only run for Vercel's cron", r.code === 401);
sent.length = 0;
r = res(); await rem({ headers: { authorization: "Bearer cron-1" } }, r);
check("each reminder in its person's language", r.code === 200 && r.body.sent === 2 && sent.find(([e]) => e.endsWith("fa"))[1].body === REMINDER.fa.body && sent.find(([e]) => e.endsWith("en"))[1].body === REMINDER.en.body);
r = res(); await createReminderHandler({ ...deps, cronSecret: "" })({ headers: { authorization: "Bearer " } }, r);
check("no cron secret configured: nobody can trigger it", r.code === 401);

console.log(`push: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
