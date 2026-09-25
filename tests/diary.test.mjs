import { createEntry, entryMacros, sumMacros, totalsFor, mealEntries, weightTrend, estimateTdee, dayKey, emptyDay } from '../src/lib/nutrition/diaryStore.js';
let pass=0, fail=0;
const ok=(c,m,got)=>{c?pass++:fail++; if(!c) console.log('✗',m, got!==undefined?`(got ${JSON.stringify(got)})`:'');};
const near=(a,b,tol,m)=>ok(Math.abs(a-b)<=tol,m,a);

// entry macros scale from the database
const e = createEntry({foodId:'chicken_breast', grams:200, meal:'lunch'});
near(entryMacros(e).protein, 62, 0.01, 'db entry scales protein');
near(entryMacros(e).kcal, 330, 0.01, 'db entry scales kcal');

// quick-add entries carry their own numbers
const q = createEntry({custom:{kcal:250,protein:20,carbs:30,fat:5}, meal:'snack'});
near(entryMacros(q).kcal, 250, 0.01, 'quick-add kcal');
near(entryMacros(q).fiber, 0, 0.01, 'quick-add missing field defaults to 0');

// an entry pointing at a food that no longer exists must not blow up
const ghost = createEntry({foodId:'does_not_exist', grams:100});
near(entryMacros(ghost).kcal, 0, 0.01, 'unknown food yields zeros');

// sums and per-meal filtering
const day = {...emptyDay(), entries:[e,q,ghost]};
near(totalsFor(day).kcal, 580, 0.01, 'day total kcal');
ok(mealEntries(day,'lunch').length===1, 'meal filter');
ok(mealEntries(day,'dinner').length===0, 'empty meal');
near(sumMacros([]).kcal, 0, 0.01, 'empty sum is zero');

// ── weight trend smoothing ──
const noisy = {'2026-01-01':{weight:80},'2026-01-02':{weight:81},'2026-01-03':{weight:79},'2026-01-04':{weight:80.5}};
const tr = weightTrend(noisy);
ok(tr.length===4, 'trend point count');
ok(tr[0].trend===80, 'trend seeds on first reading');
const spread = Math.max(...tr.map(p=>p.trend)) - Math.min(...tr.map(p=>p.trend));
const rawSpread = Math.max(...tr.map(p=>p.raw)) - Math.min(...tr.map(p=>p.raw));
ok(spread < rawSpread, 'trend is smoother than raw readings', {spread, rawSpread});

// ── adaptive TDEE ──
// Build 21 days: eats 2000 kcal, loses 0.5 kg/week -> TDEE should be ~2550
const mk = (dayCount, kcal, startW, weeklyKg) => {
  const days = {};
  for (let i=0;i<dayCount;i++){
    const d = new Date('2026-01-01T00:00:00'); d.setDate(d.getDate()+i);
    days[dayKey(d)] = { ...emptyDay(),
      entries:[createEntry({custom:{kcal,protein:0,carbs:0,fat:0}})],
      weight: +(startW + (weeklyKg/7)*i).toFixed(2) };
  }
  return days;
};
const cut = estimateTdee(mk(21, 2000, 80, -0.5));
ok(cut !== null, 'cut estimate produced');
near(cut.weeklyChangeKg, -0.5, 0.06, 'weekly change detected');
near(cut.tdee, 2000 + (0.5/7)*7700, 60, 'TDEE inferred on a cut');
near(cut.avgIntake, 2000, 1, 'average intake');

// bulking the other way
const bulk = estimateTdee(mk(21, 3200, 75, 0.35));
near(bulk.tdee, 3200 - (0.35/7)*7700, 60, 'TDEE inferred on a bulk');

// guards: not enough history, no weigh-ins, no food logged
ok(estimateTdee(mk(3, 2000, 80, -0.5)) === null, 'refuses a 3-day span');
ok(estimateTdee({}) === null, 'refuses an empty diary');
const noFood = mk(21, 2000, 80, -0.5);
for (const k of Object.keys(noFood)) noFood[k].entries = [];
ok(estimateTdee(noFood) === null, 'refuses when nothing was eaten');
const noWeight = mk(21, 2000, 80, -0.5);
for (const k of Object.keys(noWeight)) noWeight[k].weight = null;
ok(estimateTdee(noWeight) === null, 'refuses without weigh-ins');

// weight steady -> TDEE equals intake
const steady = estimateTdee(mk(21, 2450, 78, 0));
near(steady.tdee, 2450, 20, 'steady weight means intake is maintenance');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
