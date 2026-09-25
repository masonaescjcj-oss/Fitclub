// What a fresh install starts with: a real account gets starters and no
// history; the demo build keeps its lived-in sample.
const training = await import('../src/lib/training/trainingStore.js');
const checklists = await import('../src/lib/checklistStore.js');
const { ME } = await import('../src/lib/checklistModel.js');

let pass = 0, fail = 0;
const check = (name, cond, got) => { cond ? pass++ : fail++; if (!cond) console.log('✗', name, got !== undefined ? `(got ${JSON.stringify(got).slice(0, 300)})` : ''); };

// Training
const realT = training.seed({ demo: false });
const demoT = training.seed({ demo: true });
check('a real account starts with no logged sessions', realT.sessions.length === 0, realT.sessions.length);
check('…but keeps the built-in programs to pick from', realT.programs.length > 0 && realT.programs.length === demoT.programs.length, realT.programs.length);
check('…and an active program', realT.programs.some((p) => p.id === realT.activeProgramId));
check('the demo build keeps its sample sessions', demoT.sessions.length === 3, demoT.sessions.length);

const mine = { id: 's_mine', exercises: [] };
const mixed = { ...demoT, sessions: [...demoT.sessions, mine] };
const cleaned = training.withoutSamples(mixed, false);
check('an older real account loses only the sample sessions', cleaned.sessions.length === 1 && cleaned.sessions[0].id === 's_mine', cleaned.sessions.map((x) => x.id));
check('the demo build keeps them', training.withoutSamples(mixed, true).sessions.length === 4);

// Checklists
const realC = checklists.seed({ demo: false });
const demoC = checklists.seed({ demo: true });
const items = realC.lists.flatMap((l) => l.items);
check('a real account starts with two starter lists', realC.lists.length === 2, realC.lists.map((l) => l.nameEn));
check('…all personal, just the athlete', realC.lists.every((l) => l.type === 'personal' && l.members.length === 1 && l.members[0].id === ME.id));
check('…with nothing ticked', items.length > 0 && items.every((i) => Object.keys(i.doneBy || {}).length === 0));
check('…no streak and no history', realC.lists.every((l) => l.streak === 0 && l.bestStreak === 0 && l.history.length === 0));
check('…and an active list', realC.lists.some((l) => l.id === realC.activeId));
check('every starter has both languages', items.every((i) => i.textEn && i.textFa) && realC.lists.every((l) => l.nameEn && l.nameFa));
check('the demo build keeps its streak and its group list', demoC.lists.some((l) => l.streak === 14) && demoC.lists.some((l) => l.type === 'group'));

console.log(`starter: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
