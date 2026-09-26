import { bmr, tdee, targetsFor, DEFAULT_PROFILE } from '../src/lib/nutrition/profile.js';
let pass=0, fail=0;
const ok=(cond,m,got)=>{ cond?pass++:fail++; if(!cond) console.log('✗',m, got!==undefined?`(got ${got})`:''); };
const near=(a,b,tol,m)=>ok(Math.abs(a-b)<=tol, m, a);

// Mifflin-St Jeor, checked against the formula by hand
// male 76kg 174cm 26y -> 10*76 + 6.25*174 - 5*26 + 5 = 760 + 1087.5 - 130 + 5 = 1722.5
near(bmr({gender:'male',weight:76,height:174,age:26}), 1723, 1, 'male BMR');
// female same stats -> 1722.5 - 5 - 161 = 1556.5
near(bmr({gender:'female',weight:76,height:174,age:26}), 1557, 1, 'female BMR');

// TDEE = BMR * (activity + intensity)
near(tdee(DEFAULT_PROFILE), Math.round(1723*1.465), 2, 'TDEE default 3_4 moderate');
near(tdee({...DEFAULT_PROFILE, frequency:'5_6', difficulty:'extreme'}), Math.round(1723*(1.725+0.08)), 2, 'TDEE high activity');

// macros must actually add up to the calorie target
for (const goal of ['Weight Loss','Muscle Gain','Keep Fit','Max Strength']) {
  for (const dietType of ['standard','high_protein','vegetarian','keto']) {
    const p = {...DEFAULT_PROFILE, goal, dietType};
    const t = targetsFor(p);
    const fromMacros = t.protein*4 + t.carbs*4 + t.fat*9;
    near(fromMacros, t.kcal, Math.max(t.kcal*0.06, 60), `macros sum to kcal (${goal}/${dietType})`);
    ok(t.protein > 0 && t.carbs >= 0 && t.fat > 0, `no negative macros (${goal}/${dietType})`);
    ok(t.fat >= Math.round(p.weight*0.8)*0.999, `fat floor respected (${goal}/${dietType})`, t.fat);
  }
}

// protein scales with bodyweight and goal
ok(targetsFor({...DEFAULT_PROFILE, goal:'Weight Loss'}).protein === Math.round(2.2*76), 'cut protein 2.2 g/kg');
ok(targetsFor({...DEFAULT_PROFILE, goal:'Muscle Gain'}).protein === Math.round(1.8*76), 'bulk protein 1.8 g/kg');

// goal shifts calories the right direction
const keep = targetsFor({...DEFAULT_PROFILE, goal:'Keep Fit'}).kcal;
ok(targetsFor({...DEFAULT_PROFILE, goal:'Weight Loss'}).kcal < keep, 'cut is below maintenance');
ok(targetsFor({...DEFAULT_PROFILE, goal:'Muscle Gain'}).kcal > keep, 'bulk is above maintenance');

// a deep cut must never dip under the safety floor
const tiny = targetsFor({...DEFAULT_PROFILE, goal:'Weight Loss', weight:45, height:150, age:60, gender:'female'});
ok(tiny.kcal >= Math.max(bmr({gender:'female',weight:45,height:150,age:60}), 1200) - 1, 'never prescribes below the resting burn or 1,200 kcal', tiny.kcal);

// keto keeps carbs low and fat high
const keto = targetsFor({...DEFAULT_PROFILE, dietType:'keto'});
ok(keto.carbs <= 35, 'keto carbs capped', keto.carbs);
ok(keto.fat*9 > keto.kcal*0.5, 'keto is fat-dominant');

// training vs rest day cycling brackets the neutral day
const neutral = targetsFor(DEFAULT_PROFILE).kcal;
const train = targetsFor(DEFAULT_PROFILE, {trainingDay:true}).kcal;
const rest  = targetsFor(DEFAULT_PROFILE, {trainingDay:false}).kcal;
ok(train > neutral && rest < neutral, 'training day up, rest day down', `${rest}/${neutral}/${train}`);

// an adaptive TDEE overrides the formula
const adaptive = targetsFor(DEFAULT_PROFILE, {estimatedTdee: 3000});
ok(adaptive.source === 'adaptive' && adaptive.maintenance === 3000, 'adaptive TDEE used');

// hand-set targets win outright
const custom = targetsFor({...DEFAULT_PROFILE, customTargets:{kcal:2000,protein:150,carbs:200,fat:60,fiber:28,water:2600}});
ok(custom.source==='custom' && custom.kcal===2000, 'custom targets respected');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
