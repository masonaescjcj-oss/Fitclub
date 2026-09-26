// Web Push for FitClub (supabase/migrations/0008), shared by
// api/push-message.js and api/push-reminders.js. Files starting with "_" are
// not routes on Vercel.
//
// Env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (the pair the app subscribes
// with), FITCLUB_PUSH_SECRET (the server's own secret; the database keeps
// only its SHA-256), and the project's public URL and anon key (the
// REACT_APP_ pair serves). The service key is never used.
//
// Nothing about a message is logged: only counts and statuses.

const REMINDER = {
  fa: { title: "فیت‌کلاب", body: "امروز هنوز چیزی ثبت نکرده‌ای. یک تمرین کوتاه یا چک‌لیستت، استریکت را زنده نگه می‌دارد." },
  en: { title: "FitClub", body: "Nothing logged today yet. A short workout or your checklist keeps your streak alive." },
};

function config(env = process.env) {
  return {
    url: env.SUPABASE_URL || env.REACT_APP_SUPABASE_URL || "",
    anonKey: env.SUPABASE_ANON_KEY || env.REACT_APP_SUPABASE_ANON_KEY || "",
    secret: env.FITCLUB_PUSH_SECRET || "",
    vapidPublic: env.VAPID_PUBLIC_KEY || env.REACT_APP_VAPID_PUBLIC_KEY || "",
    vapidPrivate: env.VAPID_PRIVATE_KEY || "",
    subject: env.VAPID_SUBJECT || "https://fitclub-ai.vercel.app",
  };
}

/** Calls a fitclub_ function as the anon role (the secret is the credential). */
function rpcClient(cfg, fetchImpl = fetch) {
  return async (fn, args) => {
    const res = await fetchImpl(`${cfg.url}/rest/v1/rpc/fitclub_${fn}`, {
      method: "POST",
      headers: { apikey: cfg.anonKey, Authorization: `Bearer ${cfg.anonKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    if (!res.ok) throw new Error(`rpc ${fn} ${res.status}`);
    return res.json();
  };
}

/** The signed-in user behind an access token, or null. */
async function userFromToken(cfg, token, fetchImpl = fetch) {
  if (!token) return null;
  const res = await fetchImpl(`${cfg.url}/auth/v1/user`, { headers: { apikey: cfg.anonKey, Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const u = await res.json();
  return u && u.id ? { id: u.id } : null;
}

/**
 * Sends `payload` to each target; forgets the ones the push service says are
 * gone. Resolves { sent, gone, failed }.
 */
async function sendAll({ webpush, rpc, secret }, targets, payloadFor) {
  let sent = 0, gone = 0, failed = 0;
  await Promise.all((targets || []).map(async (t) => {
    try {
      await webpush.sendNotification({ endpoint: t.endpoint, keys: t.keys }, JSON.stringify(payloadFor(t)), { TTL: 60 * 60 * 12, urgency: "normal" });
      sent += 1;
    } catch (e) {
      if (e && (e.statusCode === 404 || e.statusCode === 410)) {
        gone += 1;
        await rpc("push_gone", { p_secret: secret, p_endpoint: t.endpoint }).catch(() => {});
      } else {
        failed += 1;
      }
    }
  }));
  return { sent, gone, failed };
}

function makeWebpush(cfg, webpush = require("web-push")) {
  webpush.setVapidDetails(cfg.subject, cfg.vapidPublic, cfg.vapidPrivate);
  return webpush;
}

const ready = (cfg) => !!(cfg.url && cfg.anonKey && cfg.secret && cfg.vapidPublic && cfg.vapidPrivate);

/**
 * POST /api/push-message { messageId } with the sender's access token: tells
 * the chat's other members. Answers { sent } (0 when there is nobody to tell).
 */
function createMessageHandler(deps = {}) {
  return async (req, res) => {
    const cfg = deps.config || config();
    if (req.method !== "POST") { res.status(405).json({ error: "method" }); return; }
    if (!ready(cfg)) { res.status(503).json({ error: "not_configured" }); return; }
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const user = await (deps.userFromToken || userFromToken)(cfg, token).catch(() => null);
    if (!user) { res.status(401).json({ error: "auth" }); return; }
    const messageId = req.body && typeof req.body === "object" ? req.body.messageId : null;
    if (!/^[0-9a-f-]{36}$/.test(String(messageId || ""))) { res.status(400).json({ error: "request" }); return; }
    const rpc = deps.rpc || rpcClient(cfg);
    try {
      const plan = await rpc("push_for_message", { p_secret: cfg.secret, p_message: messageId, p_sender: user.id });
      const webpush = deps.webpush || makeWebpush(cfg);
      const result = await sendAll({ webpush, rpc, secret: cfg.secret }, plan.targets,
        () => ({ title: plan.title, body: plan.body, tag: `chat-${plan.chatId}`, url: `/?chat=${plan.chatId}` }));
      console.log("push-message", JSON.stringify(result));
      res.status(200).json(result);
    } catch (e) {
      console.log("push-message failed", e && e.message ? e.message.slice(0, 80) : "");
      res.status(502).json({ error: "server" });
    }
  };
}

/**
 * The daily cron (vercel.json): an evening nudge to people who logged
 * nothing today. Vercel sends `Authorization: Bearer $CRON_SECRET`.
 */
function createReminderHandler(deps = {}) {
  return async (req, res) => {
    const cfg = deps.config || config();
    const cron = deps.cronSecret ?? process.env.CRON_SECRET;
    if (!cron || req.headers.authorization !== `Bearer ${cron}`) { res.status(401).json({ error: "auth" }); return; }
    if (!ready(cfg)) { res.status(503).json({ error: "not_configured" }); return; }
    const rpc = deps.rpc || rpcClient(cfg);
    try {
      const plan = await rpc("push_due_reminders", { p_secret: cfg.secret });
      const webpush = deps.webpush || makeWebpush(cfg);
      const result = await sendAll({ webpush, rpc, secret: cfg.secret }, plan.targets,
        (t) => ({ ...(REMINDER[t.lang] || REMINDER.fa), tag: "reminder", url: "/" }));
      console.log("push-reminders", JSON.stringify(result));
      res.status(200).json(result);
    } catch (e) {
      console.log("push-reminders failed", e && e.message ? e.message.slice(0, 80) : "");
      res.status(502).json({ error: "server" });
    }
  };
}

module.exports = { createMessageHandler, createReminderHandler, sendAll, config, REMINDER };
