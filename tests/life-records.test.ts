import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceYear, createLife, DEFAULT_SETTINGS, lifeTable } from '../src/game/engine';
import { decodeSave, encodeSave } from '../src/game/storage';
import { lifeInsights, lifeGrain, GRAIN_NAMES } from '../src/lib/life-insights';
import { companionLifetimes } from '../src/game/endings';
const birth = () => createLife({...DEFAULT_SETTINGS,country:'JPN',autoChoices:true,gentler:true,dailyThemeDay:'2026-10-20'},124);
function ending(){let life=birth();while(life.alive)life=advanceYear(life);return life;}

test('annual records survive retirement, serialize and resume deterministically',()=>{
 const life=ending(), info=lifeInsights(life);
 assert.equal(life.mechanicsVersion,7);
 assert.ok(life.history.every(row=>row.annual!==null));
 assert.ok(info.lastJob && !['none','student','retired'].includes(info.lastJob));
 assert.equal(life.history.length,life.age+1);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 let live=birth();while(live.age<25)live=advanceYear(live);
 assert.deepEqual(advanceYear(decodeSave(encodeSave(live,[])).life!),advanceYear(live));
});
test('version 5 upgrades preserve unknown annual history and RNG',()=>{
 const life=ending(), old:any=structuredClone(life);old.mechanicsVersion=5;delete old.career;
 old.history.forEach((row:any)=>delete row.annual);
 const restored=decodeSave(JSON.stringify({version:1,life:old,past:[]})).life!;
 assert.equal(restored.rng,life.rng);assert.equal(restored.mechanicsVersion,7);
 assert.ok(restored.history.every(row=>row.annual===null));
 assert.equal(lifeInsights(restored).lastJob,null);
 assert.equal(lifeInsights(restored).recordedAdultYears,0);
});
test('snapshot import rejects invalid enums, arithmetic, counts and future careers',()=>{
 const life=birth();
 for(const alter of [
  (s:any)=>s.history[0].annual.country='BAD',
  (s:any)=>s.history[0].annual.focus='magic',
  (s:any)=>s.history[0].annual.savings=-1,
  (s:any)=>s.history[0].annual.education=5,
  (s:any)=>s.history[0].annual.childrenAlive=7,
  (s:any)=>s.history[0].annual.annualSavings+=10,
  (s:any)=>s.career=[{age:1,job:'engineer'}],
  (s:any)=>delete s.history[0].annual,
 ]){const bad=structuredClone(life);alter(bad);assert.throws(()=>decodeSave(JSON.stringify({version:1,life:bad,past:[]})));}
});
test('survival comparison uses birth country and focus counts use recorded completed adult years',()=>{
 const life=ending();life.country=life.companions.find(c=>c.country.id!=='JPN')!.country;
 const info=lifeInsights(life);
 assert.equal(info.cohortSurvival,lifeTable(life.migration.birthCountry,life.sex).survival[life.age]);
 assert.equal(Object.values(info.adultFocusYears).reduce((a,b)=>a+b,0),info.recordedAdultYears);
 assert.equal(info.recordedAdultYears,life.history.filter(row=>row.age>=18&&row.annual?.completed===true).length);
 assert.ok(info.countries.includes('JPN'));
});
test('four-axis grain is deterministic, has 16 unique names and discloses missing evidence',()=>{
 const life=ending();assert.equal(new Set(GRAIN_NAMES).size,16);
 assert.deepEqual(lifeGrain(life),lifeGrain(structuredClone(life)));
 const grain=lifeGrain(life);assert.equal(grain.axes.length,4);
 grain.axes.forEach(axis=>assert.ok(axis.score>=0&&axis.score<=100));
 life.history.forEach(row=>row.annual=null);life.career=[];
 assert.equal(lifeGrain(life).insufficient,true);assert.equal(lifeGrain(birth()).insufficient,true);
});
test('companion endings finish all four lives without consuming player RNG or changing existing deaths',()=>{
 const life=birth(), before=structuredClone(life), result=companionLifetimes(life);
 assert.deepEqual(life,before);assert.equal(result.length,4);
 assert.deepEqual(result,companionLifetimes(decodeSave(encodeSave(life,[])).life!));
 for(const end of result){assert.equal(end.alive,false);assert.ok(end.deathAge!==null&&end.deathAge<=110);assert.ok(end.cause);assert.equal(end.projected,true);}
 const done=ending();for(const c of done.companions.filter(c=>!c.alive)){
  const end=companionLifetimes(done).find(e=>e.id===c.id)!;
  assert.equal(end.deathAge,c.deathAge);assert.equal(end.cause,c.cause);assert.equal(end.projected,false);
 }
});

test('recorded focus, residence and risk choices drive the stated grain axes',()=>{
 const life=ending();
 for(const row of life.history){if(!row.annual)continue;row.annual.focus='relationships';row.annual.focusWeights={relationships:1};row.annual.country='JPN';row.annual.allocation='cash';row.annual.income=100;row.annual.totalExpenses=100;row.annual.annualSavings=0;row.annual.job='teacher';row.health=80;row.happiness=70;}
 assert.deepEqual(lifeGrain(life).axes.map(axis=>axis.score),[0,0,0,0]);
 assert.equal(lifeGrain(life).name,GRAIN_NAMES[0]);
 for(const row of life.history){if(!row.annual)continue;row.annual.focus='career';row.annual.focusWeights={career:1};row.annual.country='USA';row.annual.allocation='stocks';row.annual.totalExpenses=50;row.annual.annualSavings=50;row.annual.job=row.age%2?'teacher':'engineer';}
 assert.deepEqual(lifeGrain(life).axes.map(axis=>axis.score),[100,100,100,100]);
 assert.equal(lifeGrain(life).name,GRAIN_NAMES[15]);
});

test('resuming a version 5 life records new observations without filling its earlier gaps',()=>{
 let life=birth();while(life.age<25)life=advanceYear(life);
 const old:any=structuredClone(life);old.mechanicsVersion=5;delete old.career;old.history.forEach((row:any)=>delete row.annual);
 const restored=decodeSave(JSON.stringify({version:1,life:old,past:[]})).life!;
 const next=advanceYear(restored);
 assert.ok(next.history.slice(0,25).every(row=>row.annual===null));
 assert.ok(next.history.at(-1)!.annual);
 assert.equal(lifeInsights(next).missingAdultYears,Math.max(0,next.age-18-lifeInsights(next).recordedAdultYears));
 assert.deepEqual(decodeSave(encodeSave(next,[])).life,next);
});

test('annual budget snapshots refresh when an adult changes recurring lifestyle costs',async()=>{
 const { setLifestyle }=await import('../src/game/engine');
 let life=birth();while(life.age<25)life=advanceYear(life);
 const changed=setLifestyle(life,'diet','healthy');
 assert.equal(changed.history.at(-1)!.annual!.totalExpenses,changed.budget.totalExpenses);
 assert.equal(changed.history.at(-1)!.annual!.annualSavings,changed.budget.annualSavings);
 assert.notEqual(changed.budget.totalExpenses,life.budget.totalExpenses);
});

test('version 5 migration preserves a known current job through immediate retirement',()=>{
 let life=birth();while(life.age<64)life=advanceYear(life);
 while(life.timeline&&!life.timeline.complete)life=advanceYear(life);
 const knownJob=life.stats.job;
 assert.equal(life.age,64);assert.ok(!['none','student','retired'].includes(knownJob));
 const old:any=structuredClone(life);old.mechanicsVersion=5;delete old.career;old.history.forEach((row:any)=>delete row.annual);
 const restored=decodeSave(JSON.stringify({version:1,life:old,past:[]})).life!;
 assert.ok(restored.history.every(row=>row.annual===null));
 assert.deepEqual(restored.career,[{age:64,job:knownJob}]);
 let retired=advanceYear(restored);
 for(let i=0;i<30&&retired.alive&&retired.age===64;i++)retired=advanceYear(retired);
 assert.equal(retired.age,65);assert.equal(retired.stats.job,'retired');
 assert.equal(lifeInsights(retired).lastJob,knownJob);
 assert.deepEqual(decodeSave(encodeSave(retired,[])).life,retired);
});
