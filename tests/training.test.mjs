import {
  createProgram, createDay, createProgramExercise, createSession, createSet,
  e1rm, sessionVolume, detectPRs, lastPerformance, lastPerformanceFor, exerciseTrend,
  weeklyVolume, sessionStats, compactProgram, expandProgram, compactMealPlan, expandMealPlan,
  encodeShare, decodeShare,
} from '../src/lib/training/programModel.js';
import { EXERCISES, findExercise, searchExercises } from '../src/lib/training/exercises.js';

let pass=0, fail=0;
const ok=(c,m,got)=>{c?pass++:fail++; if(!c) console.log('✗',m, got!==undefined?`(got ${JSON.stringify(got)})`:'');};
const near=(a,b,tol,m)=>ok(Math.abs(a-b)<=tol,m,a);
const daysAgo=(n)=>{const d=new Date(); d.setDate(d.getDate()-n); return d.toISOString();};

// ── exercise db integrity ──
const ids=new Set(); let dup=false;
for (const e of EXERCISES){ if(ids.has(e.id)) dup=true; ids.add(e.id); }
ok(!dup,'no duplicate exercise ids');
ok(EXERCISES.every(e=>e.nameEn&&e.nameFa&&e.muscle&&e.equipment),'every exercise has both names, muscle, equipment');
ok(['ex1','ex2','ex3','ex4','ex5','ex6'].every(id=>findExercise(id)),'original graphic ids preserved');
ok(!EXERCISES.some(e=>/^ex\d\d/.test(e.id)),'no ex10+ ids that would collide with the ex1 substring match');
ok(searchExercises('پرس').length>0 && searchExercises('bench').length>0,'search works in both languages');
ok(searchExercises('',  'legs').every(e=>e.muscle==='legs'),'muscle filter');

// ── maths ──
near(e1rm(100,1),100,0.01,'1 rep = the weight');
near(e1rm(100,10),133.33,0.1,'Epley 100x10');
ok(e1rm(0,10)===0 && e1rm(100,0)===0,'no weight or reps -> 0');

const sess=(startedAt, sets)=>({ id:'s', startedAt, finishedAt:startedAt, durationSec:1800,
  exercises:[{exerciseId:'bench_press', sets: sets.map(([w,r,done=true])=>createSet({weight:w,reps:r,done}))}]});
const s1=sess(daysAgo(9),[[60,8],[60,8],[60,8]]);
near(sessionVolume(s1),1440,0.01,'volume = sum(weight*reps) of done sets');
near(sessionVolume(sess(daysAgo(1),[[60,8,false]])),0,0.01,'undone sets add no volume');

// ── PR detection ──
const s2=sess(daysAgo(5),[[62.5,8],[62.5,8]]);
let prs=detectPRs(s2,[s1]);
ok(prs.length===1 && prs[0].kind==='weight' && prs[0].value===62.5 && prs[0].prev===60,'heavier top set is a weight PR',prs);
const s3=sess(daysAgo(2),[[60,12]]);               // lighter but more reps -> better e1rm (60*1.4=84 > 62.5*1.267=79.2)
prs=detectPRs(s3,[s1,s2]);
ok(prs.length===1 && prs[0].kind==='e1rm','more reps at lower weight is an e1rm PR',prs);
prs=detectPRs(sess(daysAgo(0),[[50,5]]),[s1,s2,s3]);
ok(prs.length===0,'a worse session sets no PR',prs);
prs=detectPRs(s1,[]);
ok(prs.length===1 && prs[0].kind==='first','first ever log counts as a first PR',prs);
ok(detectPRs(sess(daysAgo(0),[[60,8,false]]),[]).length===0,'undone sets never make a PR');

// ── prefill from last time ──
const last=lastPerformance([s1,s2,s3],'bench_press');
ok(last && last[0].weight===60 && last[0].reps===12,'last performance is the most recent finished session');
ok(lastPerformance([s1],'squat')===null,'unknown exercise -> null');
const day=createDay({exercises:[createProgramExercise({exerciseId:'bench_press',sets:4,reps:8,weight:70}),
                                createProgramExercise({exerciseId:'ex4',sets:3,reps:5,weight:100})]});
const draft=createSession({program:createProgram({name:'P'}), day, lastPerf:lastPerformanceFor([s1,s2,s3],day)});
ok(draft.exercises[0].sets.length===4,'session has the programmed number of sets');
ok(draft.exercises[0].sets[0].weight===60,'first set prefilled from last time, not the program target');
ok(draft.exercises[0].sets[3].weight===60,'extra sets fall back to the last logged weight');
ok(draft.exercises[1].sets[0].weight===100 && draft.exercises[1].sets[0].reps===5,'no history -> program target');
ok(draft.exercises.every(e=>e.sets.every(s=>s.done===false)),'nothing is done at start');

// ── trend & weekly ──
const tr=exerciseTrend([s3,s1,s2],'bench_press');
ok(tr.length===3 && tr[0].weight===60 && tr[1].weight===62.5,'trend is chronological top sets',tr.map(p=>p.weight));
const wk=weeklyVolume([s1,s2,s3],4);
ok(wk.length===4 && wk.reduce((a,b)=>a+b.sessions,0)===3,'all three sessions land in some week',wk.map(w=>w.sessions));
ok(wk[3].from <= new Date(),'last bucket is the current week');
const st=sessionStats([s1,s2,s3,{...s1,finishedAt:null}]);
ok(st.count===3 && st.minutes===90,'unfinished sessions are excluded from stats',st);

// ── share codec ──
const prog=createProgram({name:'Coach Block', nameFa:'بلوک مربی', emoji:'⚡', author:{name:'Dana',role:'coach'}, weeks:8,
  days:[createDay({title:'Push', exercises:[createProgramExercise({exerciseId:'bench_press',sets:4,reps:8,weight:70,restSec:120,note:'pause'})]}),
        createDay({title:'Rest', type:'rest'})]});
const compact=compactProgram(prog);
const code=await encodeShare(compact);
ok(code.startsWith('z1.')||code.startsWith('j1.'),'code carries a scheme prefix',code.slice(0,3));
ok(!/[+/=]/.test(code),'base64url: no +, / or =');
const back=await decodeShare(code);
const restored=expandProgram(back);
ok(restored.name==='Coach Block' && restored.nameFa==='بلوک مربی' && restored.author.role==='coach','program round-trips with author role');
ok(restored.source==='imported' && restored.id!==prog.id,'import gets a fresh id and source=imported');
ok(restored.days[0].exercises[0].weight===70 && restored.days[0].exercises[0].note==='pause' && restored.days[1].type==='rest','exercise details and rest days survive');
const fromLink=await decodeShare(`https://fitclub.app/#share=${code}&x=1`);
ok(fromLink.n==='Coach Block','a full link is accepted, not just the code');
const b64u=(str)=>btoa(String.fromCharCode(...new TextEncoder().encode(str))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const plainCode = 'j1.' + b64u(JSON.stringify(compact));
ok((await decodeShare(plainCode)).n==='Coach Block','plain j1 scheme decodes too');
if (code.startsWith('z1.')) ok(code.length < plainCode.length,'deflate actually shrinks the code',[code.length,plainCode.length]);

// meal plan
const meal=compactMealPlan({name:'Cut Week', author:{name:'Dana',role:'coach'}, targets:{kcal:1900,protein:167,carbs:180,fat:60},
  meals:[{name:'Breakfast', items:[{foodId:'oats',grams:40},{foodId:null,grams:0,custom:{name:'Shake',kcal:200,protein:30,carbs:10,fat:3}}]}]});
const mealBack=expandMealPlan(await decodeShare(await encodeShare(meal)));
ok(mealBack.targets.protein===167 && mealBack.meals[0].items[0].foodId==='oats' && mealBack.meals[0].items[1].custom.name==='Shake','meal plan round-trips db items and custom items');

// rejections
const rej=async(input)=>{ try{ await decodeShare(input); return 'accepted'; } catch(e){ return e.message; } };
ok(await rej('hello')==='bad_format','garbage rejected');
ok(await rej('q9.abcd')==='bad_format','unknown scheme rejected');
ok(await rej('j1.'+btoa('{"t":"program","v":2}'))==='bad_version','wrong version rejected');
ok(await rej('j1.'+btoa('{"t":"program","v":1,"n":"x","days":[]}'))==='bad_shape','program with no days rejected');
ok(await rej('j1.'+btoa('{"t":"weird","v":1}'))==='bad_type','unknown type rejected');
const huge='j1.'+b64u(JSON.stringify({t:'program',v:1,n:'x',days:[{t:'a',x:[]}],pad:'x'.repeat(70000)}));
ok(await rej(huge)==='too_large','oversized payload rejected');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
