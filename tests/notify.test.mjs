import { ME, createChat, createMessage, unreadMentions, messengerNotifications, membershipMessage } from '../src/lib/chat/chatModel.js';
import { scheduleReply, scheduleGreeting, GREETINGS } from '../src/lib/chat/simulator.js';

let pass = 0, fail = 0;
const ok = (c, m, got) => { c ? pass++ : fail++; if (!c) console.log('✗', m, got !== undefined ? `(got ${JSON.stringify(got)})` : ''); };
const iso = (min) => new Date(Date.now() + min * 60000).toISOString();

// ── unread mentions ──
const chat = createChat({ id: 'g', type: 'group', members: [ME, 'sara', 'amir'], lastReadAt: iso(-30) });
const msgs = [
  createMessage({ id: 'old', chatId: 'g', senderId: 'sara', text: '@hakim_pro old one', at: iso(-60) }),
  createMessage({ id: 'new', chatId: 'g', senderId: 'sara', text: 'hey @hakim_pro ?', at: iso(-10) }),
  createMessage({ id: 'other', chatId: 'g', senderId: 'amir', text: '@someone_else', at: iso(-5) }),
  createMessage({ id: 'mine', chatId: 'g', senderId: ME, text: 'I am @hakim_pro', at: iso(-4) }),
  createMessage({ id: 'gone', chatId: 'g', senderId: 'amir', text: '@hakim_pro deleted', at: iso(-3), deleted: true }),
  createMessage({ id: 'later', chatId: 'g', senderId: 'amir', text: '@hakim_pro scheduled', at: iso(30), scheduledFor: iso(30) }),
];
ok(unreadMentions(msgs, chat, 'hakim_pro').map((m) => m.id).join() === 'new', 'only the unread, incoming, live mention counts', unreadMentions(msgs, chat, 'hakim_pro').map((m) => m.id));
ok(unreadMentions(msgs, chat, 'HAKIM_PRO').length === 1, 'case-insensitive');
ok(unreadMentions(msgs, chat, '').length === 0, 'no username → nothing');
ok(unreadMentions(msgs, { ...chat, lastReadAt: iso(0) }, 'hakim_pro').length === 0, 'read marker clears them');

// ── notifications feed ──
const chats = [chat, createChat({ id: 'p', type: 'private', members: [ME, 'sara'], lastReadAt: iso(-1) }), createChat({ id: 'arch', type: 'group', archived: true })];
const feed = [
  ...msgs,
  membershipMessage('g', 'promoted', { names: ['Sara'], namesFa: ['سارا'] }),
  { ...membershipMessage('p', 'added', { names: ['X'] }), at: iso(-2) },           // private chats don't report
  { ...membershipMessage('arch', 'joinedGroup'), at: iso(-1) },                     // archived chats don't report
  createMessage({ id: 'stale', chatId: 'g', senderId: 'sara', text: '@hakim_pro ancient', at: new Date(Date.now() - 9 * 86400000).toISOString() }),
];
const n = messengerNotifications({ chats, messages: feed, username: 'hakim_pro' });
ok(n.length === 3, 'two mentions + one system pill; private, archived, stale, mine, deleted excluded', n.map((x) => `${x.kind}:${x.id}`));
ok(n[0].kind === 'system' && n[0].text === 'Sara is now an admin', 'newest first', n[0]);
ok(n.find((x) => x.id === 'new')?.unread === true && n.find((x) => x.id === 'old')?.unread === false, 'unread flag follows the read marker');
ok(messengerNotifications({ chats, messages: feed, username: 'hakim_pro' }, { limit: 1 }).length === 1, 'limit respected');

// ── simulator: group replies sometimes address me; greeting names me ──
const group = createChat({ id: 'g2', type: 'group', members: [ME, 'sara', 'amir', 'lena'], admins: ['sara'] });
const seen = new Set();
const origTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn) => { fn(); return 0; };
for (let i = 0; i < 40; i += 1) {
  scheduleReply(group, `msg ${i}`, 'en', { onTyping: () => {}, onReply: (_u, text) => seen.add(text) }, { meUsername: 'hakim_pro' });
}
globalThis.setTimeout = origTimeout;
const mentionsMe = [...seen].filter((t) => t.includes('@hakim_pro'));
ok(mentionsMe.length > 0 && mentionsMe.length < seen.size, 'some group replies mention me, not all', { total: seen.size, me: mentionsMe.length });
ok(![...seen].some((t) => t.includes('{me}')), 'placeholder always filled');

let greet = null;
globalThis.setTimeout = (fn) => { fn(); return 0; };
scheduleGreeting(group, 'fa', 'hakim_pro', (from, text, translation) => { greet = { from, text, translation }; });
globalThis.setTimeout = origTimeout;
ok(greet && greet.from === 'sara' && greet.text.includes('@hakim_pro') && /[؀-ۿ]/.test(greet.text) && /Welcome|glad/.test(greet.translation), 'admin greets in Persian with English translation', greet);
ok(scheduleGreeting(createChat({ id: 'x', members: [ME] }), 'en', 'me', () => {}) instanceof Function, 'no admin → no-op cancel');
ok(GREETINGS.en.length === GREETINGS.fa.length, 'greeting pools parallel');

console.log(`notify: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
