// @username mentions: finding the one being typed, inserting a pick, and
// splitting a message into text and mention runs for rendering. Pure functions.

const HANDLE = "[A-Za-z0-9_]{1,32}";

/**
 * The mention under the caret, if the athlete is in the middle of typing one:
 * `{ start, query }` where `start` is the index of the "@". Null otherwise.
 */
export function mentionQuery(text, caret) {
  const before = String(text || "").slice(0, caret ?? text.length);
  const m = before.match(new RegExp(`(^|\\s)@(${HANDLE})?$`));
  if (!m) return null;
  return { start: before.length - (m[2] || "").length - 1, query: (m[2] || "").toLowerCase() };
}

/** Replaces the mention being typed with the chosen username and a trailing space. Returns { text, caret }. */
export function applyMention(text, start, caret, username) {
  const head = String(text || "").slice(0, start);
  const tail = String(text || "").slice(caret);
  const inserted = `@${username} `;
  return { text: `${head}${inserted}${tail}`, caret: head.length + inserted.length };
}

/** Members whose name or handle starts with what was typed, the typist excluded. */
export function mentionCandidates(query, users, { exclude = [] } = {}) {
  const q = String(query || "").toLowerCase();
  return users
    .filter((u) => u.username && !exclude.includes(u.id))
    .filter((u) => !q || u.username.toLowerCase().startsWith(q) || u.name.toLowerCase().startsWith(q) || (u.nameFa || "").startsWith(q))
    .slice(0, 6);
}

/** Splits text into runs: `{ type: "text", value }` and `{ type: "mention", value, username }`. */
export function splitMentions(text) {
  const out = [];
  const re = new RegExp(`(^|[^A-Za-z0-9_])@(${HANDLE})`, "g");
  let last = 0;
  const src = String(text || "");
  for (let m = re.exec(src); m; m = re.exec(src)) {
    const at = m.index + m[1].length;
    if (at > last) out.push({ type: "text", value: src.slice(last, at) });
    out.push({ type: "mention", value: `@${m[2]}`, username: m[2].toLowerCase() });
    last = at + m[2].length + 1;
  }
  if (last < src.length) out.push({ type: "text", value: src.slice(last) });
  return out.length ? out : [{ type: "text", value: src }];
}

/** True when the message mentions this username. */
export const mentions = (text, username) =>
  !!username && splitMentions(text).some((r) => r.type === "mention" && r.username === String(username).toLowerCase());
