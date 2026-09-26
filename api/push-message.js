// POST /api/push-message: after the server accepts a message, the sender's
// app asks here to notify the chat's other members (see ./_push.js).
const { createMessageHandler } = require("./_push");

let handler;
module.exports = async (req, res) => (handler || (handler = createMessageHandler()))(req, res);
