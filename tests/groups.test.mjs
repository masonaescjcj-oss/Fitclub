import {
  ME, LINK_HOST, validateUsername, makeInviteLink, chatLink, isAdminOf, buildGroupChat, buildChannelChat,
  createdSystemMessage, createChat, previewOf,
} from '../src/lib/chat/chatModel.js';
globalThis.window = { localStorage: { getItem: () => null, setItem: () => {} } };
const { loadChat } = await import('../src/lib/chat/chatStore.js');

let pass = 0, fail = 0;
const ok = (c, m, got) => { c ? pass++ : fail++; if (!c) console.log('✗', m, got !== undefined ? `(got ${JSON.stringify(got)})` : ''); };

// ── username rules ──
ok(validateUsername('abc') === 'short', 'too short');
ok(validateUsername('a'.repeat(33)) === 'long', 'too long');
ok(validateUsername('my-club') === 'chars', 'dash rejected');
ok(validateUsername('MyClub!') === 'chars', 'punctuation rejected');
ok(validateUsername('_club1') === 'start', 'underscore start rejected');
ok(validateUsername('1club') === 'start', 'digit start rejected');
ok(validateUsername('admin') === 'taken', 'reserved word taken');
ok(validateUsername('Morning_Crew') === null, 'mixed case normalises fine');
ok(validateUsername('  squad_1 ') === null, 'trimmed');
const others = [createChat({ id: 'x', username: 'squad_1' })];
ok(validateUsername('SQUAD_1', others) === 'taken', 'clash is case-insensitive');
ok(validateUsername('squad_1', others, 'x') === null, 'own username is not a clash');

// ── links ──
const inv = makeInviteLink();
ok(inv.startsWith(`${LINK_HOST}/+`) && inv.length === LINK_HOST.length + 2 + 16, 'invite link shape', inv);
ok(makeInviteLink() !== inv, 'invite links differ');
ok(chatLink(createChat({ isPublic: true, username: 'gym_rats', inviteLink: 'x/+1' })) === `${LINK_HOST}/gym_rats`, 'public link wins');
ok(chatLink(createChat({ isPublic: false, username: 'gym_rats', inviteLink: 'x/+1' })) === 'x/+1', 'private falls back to invite');
ok(chatLink(createChat({})) === '', 'no link when nothing set');

// ── builders ──
const g = buildGroupChat({ title: 'Morning Crew', memberIds: ['sara', 'amir', 'sara', ME, null] });
ok(g.type === 'group' && g.title === 'Morning Crew' && g.titleFa === 'Morning Crew', 'group basics');
ok(JSON.stringify(g.members) === JSON.stringify([ME, 'sara', 'amir']), 'members deduped, me first', g.members);
ok(isAdminOf(g) && g.createdBy === ME && g.inviteLink.startsWith(LINK_HOST), 'creator is admin with a link');
ok(g.createdAt && g.lastReadAt === g.createdAt, 'timestamps set');

const ch = buildChannelChat({ title: 'Lift Log', description: 'daily', isPublic: true, username: ' LIFT_log ', memberIds: ['sara'] });
ok(ch.type === 'channel' && ch.username === 'lift_log' && ch.isPublic === true, 'public channel slug normalised', ch.username);
ok(ch.subscribers === 2 && ch.members.length === 2, 'subscribers = me + added', ch.subscribers);
ok(chatLink(ch) === `${LINK_HOST}/lift_log`, 'channel link');
const pv = buildChannelChat({ title: 'Secret', isPublic: false, username: 'ignored' });
ok(pv.username === '' && pv.subscribers === 1 && chatLink(pv) === pv.inviteLink, 'private channel drops username, links to invite');

const sys = createdSystemMessage(ch);
ok(sys.kind === 'system' && sys.text === 'Channel created' && sys.textFa === 'کانال ساخته شد' && sys.at === ch.createdAt, 'channel created pill');
ok(createdSystemMessage(g).text === 'Group created', 'group created pill');
ok(previewOf(sys, true, {}) === 'کانال ساخته شد' && previewOf(sys, false, {}) === 'Channel created', 'preview picks language');

// ── seeded world carries the new fields ──
const st = loadChat();
const news = st.chats.find((c) => c.id === 'news');
ok(news.isPublic && news.username === 'fitclub_news' && chatLink(news) === `${LINK_HOST}/fitclub_news`, 'seed channel is public with a link');
ok(st.chats.every((c) => 'isPublic' in c && 'inviteLink' in c && 'description' in c), 'every chat has the new fields');
ok(validateUsername('fitclub_news', st.chats) === 'taken', 'seed username reserved against new channels');

console.log(`groups: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
