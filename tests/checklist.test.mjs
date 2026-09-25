import { periodKey, periodStart, periodEnd, applyReset, createList, createItem, itemDone, progressOf, ME } from '../src/lib/checklistModel.js';
let pass=0, fail=0;
const eq=(a,b,m)=>{ const ok=JSON.stringify(a)===JSON.stringify(b); ok?pass++:fail++; if(!ok) console.log('✗',m,'\n   got:',JSON.stringify(a),'\n   want:',JSON.stringify(b)); };
const D=(s)=>new Date(s);

// daily, resetHour 0
const daily={mode:'daily',resetHour:0};
eq(periodKey(daily,D('2026-03-10T23:59:00')),'daily:2026-03-10','daily late night');
eq(periodKey(daily,D('2026-03-11T00:01:00')),'daily:2026-03-11','daily rolls at midnight');

// daily, resetHour 4 -> 2am still counts as previous day
const daily4={mode:'daily',resetHour:4};
eq(periodKey(daily4,D('2026-03-11T02:00:00')),'daily:2026-03-10','2am belongs to prev day');
eq(periodKey(daily4,D('2026-03-11T04:00:00')),'daily:2026-03-11','4am starts new day');

// weekly anchored on Saturday(6)
const weekly={mode:'weekly',resetHour:0,weekStart:6};
// 2026-03-11 is a Wednesday; previous Saturday = 2026-03-07
eq(D('2026-03-11T10:00:00').getDay(),3,'sanity: Wed');
eq(periodKey(weekly,D('2026-03-11T10:00:00')),'weekly:2026-03-07','weekly anchors back to Sat');
eq(periodKey(weekly,D('2026-03-07T00:00:00')),'weekly:2026-03-07','on the anchor day itself');
eq(periodKey(weekly,D('2026-03-06T23:00:00')),'weekly:2026-02-28','day before anchor -> prev week');

// monthly on day 1
const monthly={mode:'monthly',resetHour:0,monthDay:1};
eq(periodKey(monthly,D('2026-03-31T12:00:00')),'monthly:2026-03-01','monthly end of month');
eq(periodKey(monthly,D('2026-04-01T00:00:00')),'monthly:2026-04-01','monthly rolls on the 1st');
// monthly on day 15, crossing a year boundary from January
const m15={mode:'monthly',resetHour:0,monthDay:15};
eq(periodKey(m15,D('2026-01-03T12:00:00')),'monthly:2025-12-15','monthly crosses into prev year');

// interval every 3 days from a fixed anchor
const iv={mode:'interval',resetHour:0,every:3,anchor:D('2026-03-01T00:00:00').getTime()};
eq(periodKey(iv,D('2026-03-01T05:00:00')),'interval:2026-03-01','interval day 0');
eq(periodKey(iv,D('2026-03-03T23:00:00')),'interval:2026-03-01','interval day 2 same bucket');
eq(periodKey(iv,D('2026-03-04T00:30:00')),'interval:2026-03-04','interval day 3 new bucket');

// never resets
eq(periodKey({mode:'none'},D('2026-03-11')),'static','none is static');
eq(periodEnd({mode:'none'}),null,'none has no end');
eq(periodEnd(daily,D('2026-03-10T10:00:00')).toISOString().slice(0,10),'2026-03-11','daily end is next day');

// ── streak behaviour ──
const mk=(rule,texts)=>{const l=createList({reset:rule,type:'personal'});l.items=texts.map(t=>createItem({text:t}));return l;};
let l=mk(daily,['a','b']);
l.periodKey=periodKey(daily,D('2026-03-10T09:00'));
l.items=l.items.map(i=>({...i,doneBy:{[ME.id]:'x'}}));           // perfect day
let r=applyReset(l,D('2026-03-11T09:00'));                        // next day
eq(r.streak,1,'perfect day -> streak 1');
eq(progressOf(r).done,0,'ticks cleared on reset');
eq(r.history.length,1,'history recorded');

r.periodKey=periodKey(daily,D('2026-03-11T09:00'));
r.items=r.items.map(i=>({...i,doneBy:{[ME.id]:'x'}}));
let r2=applyReset(r,D('2026-03-12T09:00'));
eq(r2.streak,2,'second perfect day -> streak 2');

// a skipped period breaks the streak even after a perfect one
r2.periodKey=periodKey(daily,D('2026-03-12T09:00'));
r2.items=r2.items.map(i=>({...i,doneBy:{[ME.id]:'x'}}));
let r3=applyReset(r2,D('2026-03-15T09:00'));                      // 3 days later
eq(r3.streak,1,'gap after a perfect day restarts at 1');

// an incomplete period zeroes the streak
let r4={...r3, periodKey:periodKey(daily,D('2026-03-15T09:00')), streak:5};
r4.items=r4.items.map((i,n)=>({...i,doneBy:n===0?{[ME.id]:'x'}:{}}));
eq(applyReset(r4,D('2026-03-16T09:00')).streak,0,'incomplete -> streak 0');

// same period = untouched
const same=applyReset({...r3,periodKey:periodKey(daily,D('2026-03-15T09:00'))},D('2026-03-15T20:00'));
eq(same.periodKey,periodKey(daily,D('2026-03-15T09:00')),'no reset within a period');

// ── group completion rules ──
const A={id:'a',name:'A'},B={id:'b',name:'B'};
const g=(rule,assignees,doneBy)=>{const L=createList({type:'group',groupRule:rule,members:[ME,A,B]});const it=createItem({assignees,doneBy});return itemDone(it,L);};
eq(g('anyone',[],{a:'x'}),true,'anyone: one tick is enough');
eq(g('everyone',[],{a:'x'}),false,'everyone: one tick is not enough');
eq(g('everyone',[],{me:'x',a:'x',b:'x'}),true,'everyone: all ticked');
eq(g('everyone',['a','b'],{a:'x',b:'x'}),true,'everyone: only assignees count');
eq(g('everyone',['a','b'],{me:'x',a:'x'}),false,'everyone: unassigned tick does not help');
eq(g('anyone',['b'],{a:'x'}),false,'anyone: non-assignee tick ignored');
// a member removed from the list must not still be required
const L2=createList({type:'group',groupRule:'everyone',members:[ME,A]});
eq(itemDone(createItem({assignees:['a','ghost'],doneBy:{a:'x'}}),L2),true,'stale assignee ignored');
// personal list ignores other members entirely
eq(itemDone(createItem({doneBy:{a:'x'}}),createList({type:'personal'})),false,'personal: only me counts');
eq(itemDone(createItem({doneBy:{me:'x'}}),createList({type:'personal'})),true,'personal: me counts');
// empty list is not "complete"
eq(progressOf(createList({})).ratio,0,'empty list ratio 0');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
