// Where a start lands: the local session (initialPage), the account's profile
// (landingFor), and the fallback when the database is out of reach.
const { initialPage, landingFor } = await import('../src/lib/session.js');
const { lastKnownProfile } = await import('../src/lib/backend/account.js');

let pass = 0, fail = 0;
const check = (name, cond, got) => { cond ? pass++ : fail++; if (!cond) console.log('✗', name, got !== undefined ? `(got ${JSON.stringify(got)})` : ''); };

check('signed out → welcome', initialPage({ signedIn: false }) === 'welcome');
check('signed in, no username yet → profile step', initialPage({ signedIn: true, username: null, onboarded: false }) === 'profile-setup');
check('username set, questionnaire not done → resumes at the questionnaire',
  initialPage({ signedIn: true, username: 'sara_lifts', onboarded: false }) === 'intro-hero');
check('onboarded → the app', initialPage({ signedIn: true, username: 'sara_lifts', onboarded: true }) === 'main-app');

check('a profile without a username → profile step', landingFor({ username: null, onboarded: false }) === 'profile-setup');
check('no profile at all → profile step', landingFor(null) === 'profile-setup');
check('a username but not onboarded → questionnaire', landingFor({ username: 'sara_lifts', onboarded: false }) === 'intro-hero');
check('onboarded → the app', landingFor({ username: 'sara_lifts', onboarded: true }) === 'main-app');

const me = { id: 'u1' };
const known = lastKnownProfile(me, { userId: 'u1', username: 'sara_lifts', name: 'Sara', onboarded: true, avatarUrl: 'https://x/a.png' });
check('database out of reach: an onboarded athlete still lands in the app', landingFor(known) === 'main-app', known);
check('…keeping their name and photo', known.name === 'Sara' && known.avatar_url === 'https://x/a.png', known);
check('another account\'s leftovers are not borrowed', landingFor(lastKnownProfile(me, { userId: 'u2', username: 'someone', onboarded: true })) === 'profile-setup');
check('nothing known → profile step', landingFor(lastKnownProfile(me, {})) === 'profile-setup');

console.log(`session: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
