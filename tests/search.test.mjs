import { ME, createChat, createUser, slugifyUsername, uniqueUsername, membershipMessage } from '../src/lib/chat/chatModel.js';
import { parseLink, globalSearch } from '../src/lib/chat/search.js';
const session = { name: 'Hakim', username: 'hakim_lifts' };
globalThis.window = { localStorage: { getItem: (k) => (k === 'fitclub.session.v1' ? JSON.stringify(session) : null), setItem: () => {} } };
const { loadChat, DIRECTORY, findUser, registerCustomUsers, takenUsernames, directoryMessages } = await import('../src/lib/chat/chatStore.js');

let pass = 0, fail = 0;
const ok = (c, m, got) => { c ? pass++ : fail++; if (!c) console.log('✗', m, got !== undefined ? `(got ${JSON.stringify(got)})` : ''); };

// ── usernames from names ──
ok(slugifyUsername('Ali Reza') === 'ali_reza', 'slug from name', slugifyUsername('Ali Reza'));
ok(/^u_1st/.test(slugifyUsername('1st Gym')), 'digit start gets a prefix', slugifyUsername('1st Gym'));
ok(slugifyUsername('Bo').length >= 5, 'short names padded', slugifyUsername('Bo'));
ok(uniqueUsername('Sara Jenkins', ['sara_jenkins']) === 'sara_jenkins_2', 'clash gets a counter');
ok(uniqueUsername('Sara Jenkins', ['sara_jenkins', 'sara_jenkins_2']) === 'sara_jenkins_3', 'counter keeps climbing');

// ── links ──
ok(JSON.stringify(parseLink('fitclub.app/lift_log')) === JSON.stringify({ kind: 'public', slug: 'lift_log' }), 'public link');
ok(JSON.stringify(parseLink('https://fitclub.app/Lift_Log/')) === JSON.stringify({ kind: 'public', slug: 'lift_log' }), 'https + trailing slash + case');
ok(JSON.stringify(parseLink('fitclub.app/+AbCd1234')) === JSON.stringify({ kind: 'invite', token: 'AbCd1234' }), 'invite link');
ok(JSON.stringify(parseLink('@Sara_runs')) === JSON.stringify({ kind: 'public', slug: 'sara_runs' }), '@handle');
ok(parseLink('sara') === null && parseLink('') === null, 'plain text is not a link');

// ── global search over the seeded world ──
const st = loadChat();
const people = [createUser({ id: 'sara', name: 'Sara Jenkins', username: 'sara_runs' }), createUser({ id: 'x1', name: 'Ali Reza', username: 'ali_reza', phone: '+98 912 000 1111' })];
let r = globalSearch('run', { chats: st.chats, people, directory: DIRECTORY });
ok(r.global.some((c) => c.id === 'dir_runclub'), 'directory hit by title');
ok(r.people.some((u) => u.id === 'sara') && r.people.some((u) => u.id === 'x1') === false, 'contact hit by username fragment', r.people.map((u) => u.id));
r = globalSearch('@sunrise_run_club', { chats: st.chats, people, directory: DIRECTORY });
ok(r.link && r.link.chat?.id === 'dir_runclub' && r.link.joined === false, 'exact @handle resolves to directory, not joined');
r = globalSearch('fitclub.app/fitclub_news', { chats: st.chats, people, directory: DIRECTORY });
ok(r.link && r.link.chat?.id === 'news' && r.link.joined === true, 'my own public channel by link → joined');
r = globalSearch('fitclub.app/+SquadShred14', { chats: st.chats, people, directory: DIRECTORY });
ok(r.link && r.link.chat?.id === 'squad' && r.link.joined, 'private invite link of my group resolves');
r = globalSearch('fitclub.app/+Nope', { chats: st.chats, people, directory: DIRECTORY });
ok(r.link && r.link.chat === null, 'unknown invite → not found');
r = globalSearch('@ali_reza', { chats: st.chats, people, directory: DIRECTORY });
ok(r.link && r.link.user?.id === 'x1' && r.link.known === false, 'person by @handle');
r = globalSearch('0001111', { chats: st.chats, people, directory: DIRECTORY });
ok(r.people.some((u) => u.id === 'x1'), 'phone digits find a contact');
r = globalSearch('', { chats: st.chats, people, directory: DIRECTORY });
ok(!r.chats.length && !r.people.length && !r.global.length && !r.link, 'empty query → nothing');
const joinedDir = [...st.chats, { ...DIRECTORY[0], members: [...DIRECTORY[0].members, ME] }];
r = globalSearch('recipes', { chats: joinedDir, people, directory: DIRECTORY });
ok(r.chats.some((c) => c.id === 'dir_recipes') && !r.global.some((c) => c.id === 'dir_recipes'), 'joined community moves from global to my chats');

// ── identity from the signed-up account ──
ok(st.me.username === 'hakim_lifts' && st.me.name === 'Hakim', 'me takes name + username from the session', st.me);
ok(takenUsernames(st).includes('hakim_lifts') && takenUsernames(st).includes('fitclub_recipes') && takenUsernames(st).includes('sara_runs'), 'taken usernames span me, directory, people');

// ── added people resolve by id everywhere ──
registerCustomUsers([{ id: 'zz9', name: 'Nima', nameFa: 'نیما', avatar: '🧑', color: '#111', username: 'nima_fit' }]);
ok(findUser('zz9').name === 'Nima' && findUser('zz9').username === 'nima_fit', 'custom user found by id (not the raw id)');
ok(findUser('nobody').name === 'nobody', 'unknown id still falls back');

// ── membership pills ──
const m1 = membershipMessage('c1', 'added', { names: ['Sara', 'Amir'], namesFa: ['سارا', 'امیر'] });
ok(m1.kind === 'system' && m1.text === 'You added Sara, Amir' && m1.textFa === 'سارا، امیر را اضافه کردید', 'added pill', m1.text);
ok(membershipMessage('c1', 'joinedChannel').text === 'You joined the channel', 'joined pill');
ok(membershipMessage('c1', 'renamed', { title: 'X' }).text.includes('“X”'), 'renamed pill');
ok(directoryMessages('dir_power').length === 2 && directoryMessages('dir_power').every((m) => m.chatId === 'dir_power'), 'directory seeds carry the chat id');

console.log(`search: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
