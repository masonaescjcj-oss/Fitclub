import { mentionQuery, applyMention, mentionCandidates, splitMentions, mentions } from '../src/lib/chat/mentions.js';
import { parseLink, appLinkFor, resolveJoin } from '../src/lib/chat/search.js';
import { ME, createChat, createUser } from '../src/lib/chat/chatModel.js';
globalThis.window = { localStorage: { getItem: () => null, setItem: () => {} } };
const { loadChat, DIRECTORY } = await import('../src/lib/chat/chatStore.js');

let pass = 0, fail = 0;
const ok = (c, m, got) => { c ? pass++ : fail++; if (!c) console.log('✗', m, got !== undefined ? `(got ${JSON.stringify(got)})` : ''); };

// ── typing a mention ──
ok(JSON.stringify(mentionQuery('hi @sa', 6)) === JSON.stringify({ start: 3, query: 'sa' }), 'query mid-word', mentionQuery('hi @sa', 6));
ok(JSON.stringify(mentionQuery('@', 1)) === JSON.stringify({ start: 0, query: '' }), 'bare @ at start');
ok(mentionQuery('email a@b.com', 13) === null, 'an email is not a mention');
ok(mentionQuery('hi @sa there', 6)?.query === 'sa', 'caret inside the handle');
ok(mentionQuery('hi @sa there', 12) === null, 'caret after a finished word → no query');
const applied = applyMention('hi @sa there', 3, 6, 'sara_runs');
ok(applied.text === 'hi @sara_runs  there' && applied.caret === 14, 'insert replaces the typed part', applied);

// ── candidates ──
const users = [
  createUser({ id: 'sara', name: 'Sara Jenkins', nameFa: 'سارا', username: 'sara_runs' }),
  createUser({ id: 'amir', name: 'Amir Reza', username: 'amir_lifts' }),
  createUser({ id: 'nou', name: 'No Handle' }),
];
ok(mentionCandidates('sa', users).map((u) => u.id).join() === 'sara', 'prefix on handle');
ok(mentionCandidates('am', users).map((u) => u.id).join() === 'amir', 'prefix on name');
ok(mentionCandidates('سا', users).map((u) => u.id).join() === 'sara', 'prefix on Persian name');
ok(mentionCandidates('', users).length === 2, 'no handle → not mentionable');
ok(mentionCandidates('', users, { exclude: ['sara'] }).map((u) => u.id).join() === 'amir', 'exclude works');

// ── rendering runs ──
const runs = splitMentions('hey @sara_runs and @amir_lifts, not a@b.com');
ok(runs.filter((r) => r.type === 'mention').map((r) => r.username).join() === 'sara_runs,amir_lifts', 'two mentions, email skipped', runs);
ok(runs.map((r) => r.value).join('') === 'hey @sara_runs and @amir_lifts, not a@b.com', 'runs reassemble the text');
ok(splitMentions('plain').length === 1 && splitMentions('plain')[0].type === 'text', 'plain text → one run');
ok(splitMentions('@Sara_Runs!')[0].username === 'sara_runs', 'mention at start, punctuation stops it, lowercased');
ok(mentions('cc @hakim_pro pls', 'HAKIM_PRO') && !mentions('cc @hakim_pro pls', 'hakim'), 'mentions() exact, case-insensitive');

// ── openable links ──
const loc = { origin: 'https://app.example', pathname: '/fit/' };
const pub = createChat({ id: 'c1', isPublic: true, username: 'lift_log', inviteLink: 'fitclub.app/+AbC123' });
const priv = createChat({ id: 'c2', isPublic: false, inviteLink: 'fitclub.app/+AbC123' });
ok(appLinkFor(pub, loc) === 'https://app.example/fit/#join=lift_log', 'public app link', appLinkFor(pub, loc));
ok(appLinkFor(priv, loc) === 'https://app.example/fit/#join=+AbC123', 'private app link', appLinkFor(priv, loc));
ok(appLinkFor(createChat({}), loc) === '', 'no link when nothing to link to');
ok(JSON.stringify(parseLink('https://app.example/fit/#join=lift_log')) === JSON.stringify({ kind: 'public', slug: 'lift_log' }), 'parseLink reads #join public');
ok(JSON.stringify(parseLink('https://app.example/fit/#join=+AbC123')) === JSON.stringify({ kind: 'invite', token: 'AbC123' }), 'parseLink reads #join invite');

// ── resolving a join code against the world ──
const st = loadChat();
const people = [createUser({ id: 'x1', name: 'Ali', username: 'ali_reza' })];
let r = resolveJoin('fitclub_news', { chats: st.chats, directory: DIRECTORY, people });
ok(r.chat?.id === 'news' && r.joined === true, 'own public channel → joined');
r = resolveJoin('+SunriseRun5k', { chats: st.chats, directory: DIRECTORY, people });
ok(r.chat?.id === 'dir_runclub' && r.joined === false, 'directory invite token → join');
r = resolveJoin('sunrise_run_club', { chats: st.chats, directory: DIRECTORY, people });
ok(r.chat?.id === 'dir_runclub' && r.joined === false, 'directory slug → join');
r = resolveJoin('ali_reza', { chats: st.chats, directory: DIRECTORY, people });
ok(r.user?.id === 'x1', 'person slug → user');
r = resolveJoin('nothing_here', { chats: st.chats, directory: DIRECTORY, people });
ok(!r.chat && !r.user, 'unknown → empty');
r = resolveJoin('https://app.example/fit/#join=+SquadShred14', { chats: st.chats, directory: DIRECTORY, people });
ok(r.chat?.id === 'squad' && r.joined, 'full app URL resolves too');

console.log(`mentions+links: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
