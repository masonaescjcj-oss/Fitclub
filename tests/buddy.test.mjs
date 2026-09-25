globalThis.window = { localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } };
const M = await import('../src/lib/buddy/buddyModel.js');
const { BUDDIES, compatibility, deriveMyProfile, detectHabits, rankCandidates, likesBack, levelFrom, timeFrom, botWelcome, botProfile, botMatches, MENU } = M;
const { loadChat } = await import('../src/lib/chat/chatStore.js');
const { createList, createItem } = await import('../src/lib/checklistModel.js');
const { DEFAULT_PROFILE } = await import('../src/lib/nutrition/profile.js');

let pass = 0, fail = 0;
const ok = (c, m, got) => { c ? pass++ : fail++; if (!c) console.log('✗', m, got !== undefined ? `(got ${JSON.stringify(got).slice(0, 240)})` : ''); };

// pool integrity
ok(BUDDIES.length >= 12, 'pool has a dozen+ candidates', BUDDIES.length);
ok(new Set(BUDDIES.map((b) => b.id)).size === BUDDIES.length, 'ids unique');
ok(BUDDIES.every((b) => b.alias && b.aliasFa && b.name && b.nameFa && b.bio && b.bioFa && b.habits.length && b.lookingFor.length), 'every candidate is bilingual and tagged');
ok(BUDDIES.every((b) => ['beginner','intermediate','advanced'].includes(b.level) && ['morning','evening','any'].includes(b.time)), 'levels/times valid');

// habit detection from checklist wording
ok(detectHabits(['Drink 8 glasses of water', 'Read 10 pages of a book', '20 minutes meditation & relax', "Complete today's 45-min workout"]).sort().join() === 'meditation,reading,training,water', 'English habits detected', detectHabits(['Drink 8 glasses of water', 'Read 10 pages of a book']));
ok(detectHabits(['۸ لیوان آب بنوشید', 'مطالعه ۱۰ صفحه کتاب']).sort().join() === 'reading,water', 'Persian habits detected');

// level & time from real sessions
const mk = (h, vol) => ({ finishedAt: 'x', startedAt: `2026-09-1${h < 10 ? 0 : 1}T${String(h).padStart(2, '0')}:00:00`, exercises: [{ exerciseId: 'a', sets: [{ weight: vol / 10, reps: 10, done: true }] }] });
ok(levelFrom([mk(7, 1000), mk(8, 1500)], 'moderate') === 'beginner', 'low volume → beginner');
ok(levelFrom([mk(7, 5000), mk(8, 6000)], 'light') === 'advanced', 'high volume → advanced (data beats profile)');
ok(levelFrom([], 'intense') === 'advanced' && levelFrom([], 'light') === 'beginner', 'no sessions → profile difficulty');
ok(timeFrom([mk(7, 1), mk(8, 1), mk(18, 1)]) === 'morning' && timeFrom([mk(18, 1), mk(19, 1)]) === 'evening' && timeFrom([]) === 'any', 'morning/evening from start hours');

// my card
const lists = [createList({ name: 'Daily', items: [createItem({ text: 'Water 2L' }), createItem({ text: 'Read 10 pages' })], streak: 7 })];
const me = deriveMyProfile({ profile: { ...DEFAULT_PROFILE, goal: 'Weight Loss', frequency: '3_4' }, sessions: [mk(7, 2500), mk(8, 2600)], lists, prefs: { lookingFor: ['accountability', 'habits'], time: 'any', showGender: 'any' } });
ok(me.goal === 'Weight Loss' && me.days === 4 && me.time === 'morning' && me.level === 'intermediate' && me.habits.includes('water') && me.habits.includes('reading') && me.streak === 7, 'derived card', me);

// scoring
const niki = BUDDIES.find((b) => b.id === 'bd_niki');   // Weight Loss, intermediate, 4 days, morning, water/steps/nutrition, accountability+habits
const r = compatibility(me, niki);
ok(r.score >= 85, 'near-twin scores high', r);
ok(r.reasons.includes('sameGoal') && r.reasons.includes('sameSchedule') && r.reasons.includes('bothMorning') && r.reasons.includes('sameLevel') && r.reasons.includes('habit:water') && r.reasons.includes('want:accountability'), 'reasons explain the score', r.reasons);
const sam = BUDDIES.find((b) => b.id === 'bd_sam');     // Muscle Gain, advanced, 6 days, evening
const r2 = compatibility(me, sam);
ok(r2.score < 40, 'opposite profile scores low', r2);
ok(compatibility(me, niki).score === compatibility(me, niki).score, 'deterministic');
ok(BUDDIES.every((b) => { const x = compatibility(me, b).score; return x >= 0 && x <= 100; }), 'scores stay within 0–100');

// ranking honours decisions and gender filter
const ranked = rankCandidates(me, { liked: ['bd_niki'], passed: ['bd_sam'] });
ok(!ranked.some((x) => ['bd_niki', 'bd_sam'].includes(x.candidate.id)), 'liked/passed excluded');
ok(ranked.every((x, i) => i === 0 || ranked[i - 1].score >= x.score), 'sorted best first');
const women = rankCandidates({ ...me, showGender: 'female' });
ok(women.length > 0 && women.every((x) => x.candidate.gender === 'female'), 'gender preference filters');

// likes back
ok(likesBack('bd_niki', 90).match && likesBack('bd_niki', 90).delayMs === 0, 'strong fit answers at once');
ok(!likesBack('bd_sam', 20).match, 'weak fit never answers');
const mid = likesBack('bd_reza', 55); ok(mid.match === false || mid.delayMs >= 15000, 'middling fit is delayed or silent', mid);
ok(JSON.stringify(likesBack('bd_reza', 55)) === JSON.stringify(likesBack('bd_reza', 55)), 'deterministic per candidate');

// bot copy
const w = botWelcome();
ok(w.text && w.textFa && w.buttons.length === MENU.length && w.buttons.flat().every((b) => b.id && b.label.startsWith('btn_')), 'welcome is bilingual with a keyboard');
const prof = botProfile(me);
ok(prof.text.includes('Weight Loss') && prof.text.includes('4 days/week') && prof.textFa.includes('کاهش وزن'), 'profile card quotes derived data', prof.text);
const bm = botMatches([{ alias: 'Athlete 1', aliasFa: 'ورزشکار ۱', name: 'N', nameFa: 'ن', score: 80, chatId: 'c1', revealed: false }], false);
ok(bm.text.includes('Athlete 1 — 80%') && bm.buttons[0][0].id === 'open:c1', 'matches list links to chats');
ok(botMatches([], true).textFa.includes('هنوز'), 'empty matches in Persian');

// store seeds the bot chat with its welcome
const st = loadChat();
const bot = st.chats.find((c) => c.id === 'buddy_bot');
ok(bot && bot.type === 'bot' && bot.verified, 'bot chat seeded');
ok(st.messages.some((m) => m.chatId === 'buddy_bot' && m.buttons), 'welcome message with keyboard seeded');
ok(st.buddy && Array.isArray(st.buddy.matches) && st.buddy.prefs.lookingFor.length, 'buddy state seeded');


// ── week, leaderboard, sessions ──
const { buddyWeekStats, myWeekStats, leaderboard, suggestSession, weekKeyOf, botLeaderboard, botSession, MENU: MENU2 } = M;
const wk = weekKeyOf(new Date('2026-09-18T12:00:00'));
ok(wk === weekKeyOf(new Date('2026-09-15T08:00:00')) && wk !== weekKeyOf(new Date('2026-09-25T08:00:00')), 'week key groups Sat–Fri', wk);
const a1 = buddyWeekStats(niki, wk), a2 = buddyWeekStats(niki, wk), a3 = buddyWeekStats(niki, weekKeyOf(new Date('2026-09-25T08:00:00')));
ok(a1.volumeKg === a2.volumeKg && a1.sessions === a2.sessions, 'stand-in week is stable within the week');
ok(a1.volumeKg !== a3.volumeKg || a1.sessions !== a3.sessions, 'and moves the next week');
ok(a1.sessions >= 1 && a1.sessions <= niki.days && a1.volumeKg > 0, 'sessions bounded by their days', a1);
ok(buddyWeekStats(sam, wk).volumeKg > buddyWeekStats(BUDDIES.find((x) => x.id === 'bd_hana'), wk).volumeKg, 'advanced 6-day lifter out-volumes a 2-day beginner');
const nowTs = new Date('2026-09-18T12:00:00');
const mySess = [{ finishedAt: 'x', startedAt: '2026-09-16T18:00:00', exercises: [{ exerciseId: 'a', sets: [{ weight: 100, reps: 10, done: true }, { weight: 100, reps: 10, done: true }] }] }];
ok(myWeekStats(mySess, 5, nowTs).volumeKg === 2000 && myWeekStats(mySess, 5, nowTs).sessions === 1, 'my week from the real log', myWeekStats(mySess, 5, nowTs));
const rows = leaderboard(['me', 'bd_niki', 'bd_sam'], { mySessions: mySess, myStreak: 5, isRtl: false, now: nowTs });
ok(rows.length === 3 && rows[0].rank === 1 && rows.every((r, i) => i === 0 || rows[i - 1].volumeKg >= r.volumeKg), 'leaderboard ranked by volume', rows.map((r) => [r.name, r.volumeKg]));
ok(rows.find((r) => r.me).name === 'You' && leaderboard(['me'], { mySessions: mySess, myStreak: 5, isRtl: true })[0].name === 'شما', 'my row is labelled in both languages');
const sug = suggestSession('morning', [niki, BUDDIES.find((x) => x.id === 'bd_omid')], { now: nowTs });
ok(sug.slot === 'morning' && sug.at.getHours() === 7 && sug.at.getDate() === 19 && sug.fits === 3 && sug.total === 3, 'morning crew → tomorrow 07:00', sug);
const sugAlt = suggestSession('morning', [niki], { alt: true, now: nowTs });
ok(sugAlt.slot === 'evening' && sugAlt.at.getHours() === 18 && sugAlt.at.getDate() === 20, 'alternative flips slot, day after', sugAlt);
ok(suggestSession('any', [sam], { now: nowTs }).slot === 'evening', 'evening lifter + flexible me → evening');
const lb = botLeaderboard(rows, 'c1', false);
ok(lb.text.includes('🥇') && lb.text.includes('You') && lb.buttons[0][0].id === 'session:c1' && lb.textFa.includes('این هفته'), 'leaderboard message bilingual with crew buttons');
const sm = botSession(sug, 'c1', false);
ok(sm.buttons[0][0].id.startsWith('addtask:c1:') && sm.buttons[1][0].id === 'session2:c1' && sm.text.includes('3 of 3'), 'session message carries checklist + alternative buttons', sm.buttons);
ok(MENU2.flat().some((b) => b.id === 'crew:new' && b.label === 'btn_crew') && MENU2.flat().some((b) => b.id === 'leaderboard'), 'menu offers crew and leaderboard');


// ── challenges ──
const { challengeProgress, botChallenge, botChallengeDone, CHALLENGE_PRESETS } = M;
const crew = { id: 'c9', members: ['me', 'bd_niki', 'bd_sam'] };
const pv = challengeProgress(crew, { kind: 'volume', target: 10000 }, { mySessions: mySess, myStreak: 5, now: nowTs });
ok(pv.kind === 'volume' && pv.target === 10000 && pv.contributions.length === 3 && pv.value === pv.contributions.reduce((a, c) => a + c.value, 0), 'volume challenge sums every member', pv);
ok(pv.contributions.find((c) => c.id === 'me').value === 2000, 'my real week counts', pv.contributions);
ok(pv.pct === Math.min(100, Math.round(pv.value / 100)) && (pv.done === (pv.value >= 10000)), 'percent and done flag agree', pv);
const ps = challengeProgress(crew, { kind: 'sessions', target: 3 }, { mySessions: mySess, myStreak: 5, now: nowTs });
ok(ps.value >= 3 && ps.done && ps.pct === 100, 'sessions challenge caps at 100% when met', ps);
const pk = challengeProgress(crew, { kind: 'streak', target: null }, { mySessions: mySess, myStreak: 9, now: nowTs });
ok(pk.target === 3 && pk.contributions.find((c) => c.id === 'me').value === 1 && pk.contributions.every((c) => c.value === 0 || c.value === 1), 'streak challenge counts members on a 7-day streak, target = crew size', pk);
const bc = botChallenge(pv, 'c9');
ok(bc.kind === 'challenge' && bc.challenge === pv && bc.text.includes('/ 10,000 kg') && bc.textFa.includes('کیلو') && bc.buttons[0][0].id === 'progress:c9', 'challenge card message with progress button', bc.buttons);
ok(botChallenge({ ...pv, done: true }, 'c9').buttons[0][0].id === 'challenge:self', 'a finished challenge offers the next one');
ok(botChallengeDone().text.includes('complete') && CHALLENGE_PRESETS.volume.length === 3, 'done copy + presets');

console.log(`buddy: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
