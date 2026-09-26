// GET /api/push-reminders: the daily cron in vercel.json. An evening nudge to
// people who asked for one and logged nothing today (see ./_push.js).
const { createReminderHandler } = require("./_push");

let handler;
module.exports = async (req, res) => (handler || (handler = createReminderHandler()))(req, res);
