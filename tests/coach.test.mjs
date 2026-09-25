// Unit tests for the coach's data layer: snapshot, prompt, chips, offline replies.
globalThis.window = { localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } };

const { buildCoachSnapshot, snapshotToText, coachSystemBlocks, suggestionChips, demoReply, nextProgramDay } =
  await import('../src/lib/coach/context.js');
const { toApiMessages, createMessage } = await import('../src/lib/coach/coachStore.js');
const { createProgram, createDay, createProgramExercise, createSet } = await import('../src/lib/training/programModel.js');
const { createList, createItem } = await import('../src/lib/checklistModel.js');
const { dayKey, createEntry } = await import('../src/lib/nutrition/diaryStore.js');
const { DEFAULT_PROFILE, targetsFor } = await import('../src/lib/nutrition/profile.js');

let pass = 0, fail = 0;
const ok = (c, m, got) => { c ? pass++ : fail++; if (!c) console.log('✗', m, got !== undefined ? `(got ${JSON.stringify(got).slice(0, 300)})` : ''); };

const now = new Date('2026-09-18T14:00:00');
const daysAgo = (n, h = 18) => { const d = new Date(now); d.setDate(d.getDate() - n); d.setHours(h, 0, 0, 0); return d; };
const iso = (n) => daysAgo(n).toISOString();

// ── fixtures ──
const program = createProgram({
  id: 'p1', name: 'Push Pull Legs', nameFa: 'پوش پول لگ', weeks: 8, author: { name: 'Coach Ali', role: 'coach' },
  days: [
    createDay({ id: 'd_push', title: 'Push', titleFa: 'پوش', exercises: [createProgramExercise({ exerciseId: 'bench_press', sets: 4, reps: 8, weight: 60 }), createProgramExercise({ exerciseId: 'ohp', sets: 3, reps: 10 })] }),
    createDay({ id: 'd_pull', title: 'Pull', titleFa: 'پول', exercises: [createProgramExercise({ exerciseId: 'pullup', sets: 4, reps: 6 })] }),
    createDay({ id: 'd_rest', type: 'rest' }),
    createDay({ id: 'd_legs', title: 'Legs', titleFa: 'پا', exercises: [createProgramExercise({ exerciseId: 'ex4', sets: 4, reps: 8 })] }),
  ],
});
const s = (w, r) => createSet({ weight: w, reps: r, done: true });
const session = (n, dayId, dayTitle, exercises, prs = []) => ({
  id: `s${n}`, programId: 'p1', programName: 'PPL', dayId, dayTitle, dayTitleFa: '', startedAt: iso(n), finishedAt: iso(n), durationSec: 3000, prs, exercises,
});
const sessions = [
  session(9, 'd_push', 'Push', [{ exerciseId: 'bench_press', sets: [s(60, 8), s(60, 8), s(60, 7)] }]),
  session(6, 'd_pull', 'Pull', [{ exerciseId: 'pullup', sets: [s(0, 8), s(0, 7)] }]),
  session(3, 'd_push', 'Push', [{ exerciseId: 'bench_press', sets: [s(62.5, 8), s(62.5, 8), s(62.5, 6)] }, { exerciseId: 'ohp', sets: [s(40, 8)] }],
    [{ exerciseId: 'bench_press', kind: 'weight', value: 62.5, prev: 60 }]),
];
const training = { sessions, activeProgram: program, programs: [program] };

const todayKey = dayKey(now);
const days = {};
for (let i = 1; i <= 10; i += 1) {
  const d = daysAgo(i);
  days[dayKey(d)] = { entries: [createEntry({ foodId: 'chicken_breast', grams: 200, meal: 'lunch' }), createEntry({ foodId: 'rice_white', grams: 250, meal: 'dinner' })], water: 1500, weight: 75.5 + i * 0.1, trainingDay: null };
}
days[todayKey] = { entries: [createEntry({ foodId: 'oats', grams: 80, meal: 'breakfast' }), createEntry({ custom: { name: 'Protein shake', kcal: 120, protein: 24, carbs: 3, fat: 1 }, grams: 30, meal: 'snack' })], water: 800, weight: 75.4, trainingDay: true };
const diary = { days, recentFoodIds: [], savedMeals: [] };
const { weightTrend, estimateTdee } = await import('../src/lib/nutrition/diaryStore.js');
const profile = { ...DEFAULT_PROFILE, weight: 75.4, goal: 'Weight Loss' };
const nutrition = { diary, profile, estimate: estimateTdee(days), trend: weightTrend(days) };

const lists = [
  createList({ name: 'Morning routine', items: [createItem({ text: 'Water 500 ml', doneBy: { me: now.toISOString() } }), createItem({ text: 'Stretch 10 min' }), createItem({ text: 'Creatine' })], streak: 5, bestStreak: 12 }),
  createList({ name: 'Archived', archived: true, items: [createItem({ text: 'x' })] }),
];

// ── next program day ──
ok(nextProgramDay(program, sessions)?.id === 'd_pull', 'next day follows the last logged one', nextProgramDay(program, sessions)?.id);
ok(nextProgramDay(program, [sessions[0], sessions[2], session(1, 'd_legs', 'Legs', [])])?.id === 'd_push', 'cycles back past the rest day to the first workout');
ok(nextProgramDay(program, [])?.id === 'd_push', 'no history → first workout day');
ok(nextProgramDay(null, sessions) === null, 'no program → null');

// ── snapshot ──
const snap = buildCoachSnapshot({ nutrition, training, lists, name: 'Isaac', isRtl: false, now });
const target = targetsFor(profile, { trainingDay: true, estimatedTdee: profile.useAdaptive ? nutrition.estimate?.tdee : null });
ok(snap.nutrition.targets.kcal === Math.round(target.kcal), 'targets are for today (training day)', [snap.nutrition.targets.kcal, target.kcal]);
ok(snap.nutrition.today.kcal > 0 && snap.nutrition.today.protein >= 24, 'today totals include quick-add protein', snap.nutrition.today);
ok(snap.nutrition.today.remaining.kcal === Math.round(target.kcal) - snap.nutrition.today.kcal, 'remaining = target − eaten');
ok(snap.nutrition.today.meals.length === 2 && snap.nutrition.today.meals.some((m) => m.items.includes('Protein shake')), 'meals list names, incl. quick add', snap.nutrition.today.meals);
ok(snap.nutrition.weekAvg?.days === 7, 'week average uses the last 7 logged days, today excluded', snap.nutrition.weekAvg);
ok(snap.nutrition.weight && snap.nutrition.weight.latestKg === 75.4 && snap.nutrition.weight.changeKg < 0, 'weight section: latest reading and downward change', snap.nutrition.weight);
ok(snap.training.next?.title === 'Pull' && snap.training.daysSinceLast === 3, 'training: next day + days since last', [snap.training.next, snap.training.daysSinceLast]);
ok(snap.training.recent[0].prs[0].includes('Bench Press') && snap.training.recent[0].prs[0].includes('62.5'), 'PRs are named, not ids', snap.training.recent[0].prs);
ok(snap.training.lifts[0].exercise === 'Barbell Bench Press' && snap.training.lifts[0].e1rm === Math.round(62.5 * (1 + 8 / 30)), 'best lift with Epley e1RM', snap.training.lifts[0]);
ok(snap.training.program.author === 'Coach Ali (coach)', 'program author carries the coach role');
ok(snap.habits.lists.length === 1 && snap.habits.lists[0].done === 1 && snap.habits.lists[0].open.length === 2 && snap.habits.streak === 5, 'habits: archived skipped, open items listed', snap.habits);

// Persian names where the program has them
const snapFa = buildCoachSnapshot({ nutrition, training, lists, name: 'Isaac', isRtl: true, now });
ok(snapFa.training.next.title === 'پول' && snapFa.training.program.name === 'پوش پول لگ' && snapFa.language === 'fa', 'RTL snapshot uses Persian titles');

// include flags
const priv = buildCoachSnapshot({ nutrition, training, lists, now, include: { nutrition: false, training: true, habits: false } });
ok(priv.nutrition === null && priv.habits === null && priv.training, 'include flags drop whole sections');
ok(/chose not to share nutrition/.test(snapshotToText(priv)) && /chose not to share checklist/.test(snapshotToText(priv)), 'prompt says an area is private instead of guessing');

// ── prompt text ──
const text = snapshotToText(snap);
ok(text.includes(`## Today (${todayKey})`) && text.includes(`remaining: ${snap.nutrition.today.remaining.kcal} kcal`), 'prompt carries today and remaining');
ok(text.includes('next up: Pull → Pull-Ups 4×6'), 'prompt names the next session with exercises', text.split('\n').find((l) => l.startsWith('next up')));
ok(text.includes('PR: Barbell Bench Press 62.5 (was 60)'), 'prompt lists the PR');
ok(text.includes('- Morning routine (personal, resets daily): 1/3 done · streak 5 (best 12) · open: Stretch 10 min, Creatine'), 'prompt lists checklist state', text.split('\n').find((l) => l.includes('Morning routine')));
ok(text.length < 4000, 'prompt stays compact', text.length);

const blocks = coachSystemBlocks(snap);
ok(blocks.length === 2 && blocks[0].cache_control?.type === 'ephemeral' && !blocks[1].cache_control, 'stable rules cached, volatile data not');
ok(blocks[0].text.includes('not a doctor') && blocks[0].text.includes('Keep responses focused, brief, and concise'), 'rules include safety + conciseness');
ok(blocks[1].text.startsWith('# Athlete data'), 'data block is labelled');

// ── chips ──
const chipsEn = suggestionChips(snap, false);
ok(chipsEn.length >= 3 && chipsEn.length <= 5, 'three to five chips', chipsEn.length);
ok(chipsEn.some((c) => c.includes(`${snap.nutrition.today.remaining.kcal} kcal`)), 'a chip quotes the real remaining kcal', chipsEn);
ok(chipsEn.some((c) => c.includes('Next is Pull')), 'a chip names the next session', chipsEn);
ok(chipsEn.some((c) => c.includes('3 days since I trained')), 'a chip notices the gap since training', chipsEn);
const chipsFa = suggestionChips(snap, true);
ok(chipsFa.every((c) => /[؀-ۿ]/.test(c)), 'Persian chips are Persian');

const emptySnap = buildCoachSnapshot({ nutrition: { diary: { days: {}, recentFoodIds: [], savedMeals: [] }, profile: DEFAULT_PROFILE, estimate: null, trend: [] }, training: { sessions: [], activeProgram: null }, lists: [], now });
ok(suggestionChips(emptySnap, false)[0].startsWith('Nothing logged yet'), 'fresh install gets a planning chip');
ok(emptySnap.training.next === null && emptySnap.training.daysSinceLast === null && emptySnap.nutrition.weight === null, 'empty data stays null, never NaN');
ok(!/NaN|undefined/.test(snapshotToText(emptySnap)), 'empty prompt has no NaN/undefined', snapshotToText(emptySnap));

// ── offline coach ──
const food = demoReply('What should I eat for dinner?', snap, false);
ok(food.includes(`${snap.nutrition.today.remaining.kcal} kcal left`) && food.includes(`${snap.nutrition.today.remaining.protein} g protein`), 'food reply quotes remaining numbers', food);
ok(food.includes('training day') && food.includes('post-workout'), 'notices training day with no post-workout meal', food);
const train = demoReply('what weights for my next workout?', snap, false);
ok(train.includes('**Pull**') && train.includes('Pull-Ups 4×6') && train.includes('3 days'), 'training reply names next day, exercises, gap', train);
const weight = demoReply('is my weight trend ok?', snap, false);
ok(weight.includes('trend weight is') && /kg\/week/.test(weight) && weight.includes('Weight Loss'), 'weight reply computes per-week rate against the goal', weight);
const habit = demoReply('which checklist item first?', snap, false);
ok(habit.includes('Morning routine') && habit.includes('Stretch 10 min'), 'habit reply names the open item', habit);
const sum = demoReply('how am I doing', snap, false);
ok(sum.includes('Nutrition:') && sum.includes('Training:') && sum.includes('Habits:'), 'summary covers all three', sum);
const fa = demoReply('شام چی بخورم؟', snap, true);
ok(/کالری/.test(fa) && fa.includes(String(snap.nutrition.today.remaining.kcal)), 'Persian food reply in Persian with numbers', fa);
const faTrain = demoReply('جلسه بعدی چه وزنه‌هایی بزنم', snapFa, true);
ok(faTrain.includes('**پول**'), 'Persian training reply uses Persian day title', faTrain);
const privFood = demoReply('what should I eat', priv, false);
ok(privFood.includes('switched off'), 'private area → says so');

// ── transcript shaping ──
const msgs = [
  createMessage({ role: 'assistant', text: 'welcome' }),
  createMessage({ role: 'user', text: 'a' }), createMessage({ role: 'assistant', text: '' }),
  createMessage({ role: 'user', text: 'b' }), createMessage({ role: 'user', text: 'c' }), createMessage({ role: 'assistant', text: 'd' }),
];
const api = toApiMessages(msgs);
ok(api[0].role === 'user', 'transcript opens with the athlete');
ok(api.length === 2 && api[0].content === 'a\n\nb\n\nc' && api[1].role === 'assistant', 'adjacent same-role turns merge once empty turns drop', api);

console.log(`coach: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
