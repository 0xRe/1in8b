import test from 'node:test';import assert from 'node:assert/strict';
import {createNewGame} from '../src/game/new-game';import{createLife,DEFAULT_SETTINGS}from'../src/game/engine';
test('the real new-game factory records physical birth facts without changing identity or legacy life RNG',()=>{
 const l=createNewGame({...DEFAULT_SETTINGS,country:'JPN'},41),legacy=createLife({...DEFAULT_SETTINGS,country:'JPN'},41);
 assert.ok((l as any).physicalState,'new births need explicit physical facts rather than an absent unknown');
 assert.equal(l.id,legacy.id);assert.equal(l.rng,legacy.rng);assert.equal(l.name,legacy.name);assert.equal((legacy as any).physicalState,undefined);
 assert.deepEqual((l as any).physicalState,(createNewGame({...DEFAULT_SETTINGS,country:'JPN'},41) as any).physicalState);
});
import {drawPhysicalBirth} from '../src/game/physical-state';
import {encodeSave,decodeSave} from '../src/game/storage';
const draws=(values:number[])=>{let at=0;return()=>{assert.ok(at<values.length,'unexpected extra birth draw');return values[at++];};};
test('physical birth uses conditional branch priority, literal income bands and wheelchair and hearing notice boundaries',()=>{
 const cases=[
  {ppp:4999,draw:[.00399,.44999],kind:'mobility',wheelchair:true,noticeAt:1},
  {ppp:4999,draw:[.00399,.45],kind:'mobility',wheelchair:false,noticeAt:1},
  {ppp:5000,draw:[.00351,.1],kind:'mobility',wheelchair:true,noticeAt:1},
  {ppp:5000,draw:[.00352,.00269,.999],kind:'hearing',wheelchair:false,noticeAt:2},
  {ppp:20000,draw:[.0028,.0012,.00039],kind:'vision',wheelchair:false,noticeAt:1},
  {ppp:20000,draw:[.0028,.00119,0],kind:'hearing',wheelchair:false,noticeAt:1},
 ];
 for(const c of cases){const out=drawPhysicalBirth({ppp:c.ppp,region:'hi',year:2026},draws(c.draw));assert.deepEqual(out.condition,{kind:c.kind,since:0,source:'birth',wheelchair:c.wheelchair,noticeAt:c.noticeAt,aid:false});assert.equal(out.polioAt,undefined);}
 assert.equal(drawPhysicalBirth({ppp:20000,region:'hi',year:2026},draws([.0028,.0012,.0004])).condition,null);
});
test('historical polio schedules only after all birth branches fail and follows exact year and income gates',()=>{
 for(const [region,year,ppp,draw,polioAt] of [
  ['hi',1959,45000,[1,1,1,.00299,.999],4],['hi',1960,45000,[1,1,1],undefined],
  ['mena',1989,19999,[1,1,1,.00499,0],1],['mena',1989,20000,[1,1,1,.002],undefined],
  ['ssa',1999,20000,[1,1,1,.00199,.5],3],['ssa',2000,20000,[1,1,1],undefined],
 ] as const){const out=drawPhysicalBirth({ppp,region,year},draws([...draw]));assert.equal(out.condition,null);assert.equal(out.polioAt,polioAt);}
});
test('new physical facts roundtrip and malformed latent or observed history is rejected without touching legacy saves',()=>{
 const l=createNewGame({...DEFAULT_SETTINGS,country:'JPN'},41);l.physicalState={version:1,lastCheckedAge:0,condition:{kind:'mobility',since:0,source:'birth',wheelchair:true,noticeAt:1,aid:false}};
 assert.deepEqual(decodeSave(encodeSave(l,[])).life,l);
 for(const change of[(b:any)=>b.physicalState.version=2,(b:any)=>b.physicalState.condition.kind='unknown',(b:any)=>b.physicalState.condition.recognizedAge=0,(b:any)=>b.physicalState.condition.since=1,(b:any)=>b.physicalState.condition.noticeAt=3,(b:any)=>b.physicalState.condition.aid=true,(b:any)=>b.physicalState.condition.childAid={age:0,received:true},(b:any)=>b.physicalState.condition.cerebralPalsy={age:0,kind:'spastic'},(b:any)=>b.physicalState.extra=true]){
  const bad=structuredClone(l);change(bad);assert.throws(()=>decodeSave(encodeSave(bad,[])));
 }
 const old=createLife({...DEFAULT_SETTINGS,country:'JPN'},41);const before=structuredClone(old);assert.deepEqual(decodeSave(encodeSave(old,[])).life,old);assert.deepEqual(old,before);assert.equal((decodeSave(encodeSave(old,[])).life as any).physicalState,undefined);
});
import {advanceYear,makeChoice,addReflection} from '../src/game/engine';
const next=(l:any)=>!l.pendingDecision?advanceYear(l,.2):l.pendingDecision.type==='reflection'?addReflection(l,''):makeChoice(l,l.pendingDecision.choices.find((c:any)=>['intensiveCare','attendFollowup'].includes(c.id))?.id??l.pendingDecision.choices[0].id);
test('a naturally drawn mobility birth is actually recognized at one and its exact year resumes after saving',()=>{
 let l=createNewGame({...DEFAULT_SETTINGS,country:'JPN',gentler:true,dailyThemeDay:'2026-10-26'},1536);
 assert.equal(l.physicalState!.condition!.kind,'mobility');assert.equal(l.physicalState!.condition!.wheelchair,true);assert.equal(l.physicalState!.condition!.recognizedAge,undefined);
 for(let i=0;i<100&&l.age<1;i++)l=next(l);assert.equal(l.age,1);assert.equal(l.physicalState!.condition!.recognizedAge,1);assert.equal(l.events.filter(e=>e.key==='event.physical.recognized.mobility.wheelchair').length,1);
 const restored=decodeSave(encodeSave(l,[])).life!;assert.deepEqual(restored,l);assert.deepEqual(next(restored),next(l));
 for(let i=0;i<200&&l.age<4;i++)l=next(l);assert.equal(l.events.filter(e=>e.key==='event.physical.recognized.mobility.wheelchair').length,1);assert.ok(l.physicalState!.condition!.childAid);assert.ok(l.physicalState!.condition!.cerebralPalsy);assert.deepEqual(decodeSave(encodeSave(l,[])).life,l);
});
import {observePhysicalYear,physicalAccess} from '../src/game/physical-runtime';
import {physicalFacts} from '../src/game/physical-state';
function child(age:number){const l=createNewGame({...DEFAULT_SETTINGS,country:'JPN'},1536);l.age=age;l.year=l.birthYear+age;l.stats.happiness=50;l.stats.health=95;l.physicalState!.lastCheckedAge=age-1;l.physicalState!.condition!.recognizedAge=1;return l;}
test('physical access follows purchasing power, era and region rather than a universal aid probability',()=>{
 assert.equal(physicalAccess({ppp:1500,region:'hi',year:2026}),.03);assert.equal(physicalAccess({ppp:60000,region:'hi',year:1979}),.9);
 assert.equal(physicalAccess({ppp:60000,region:'eca',year:1979}),.45);assert.equal(physicalAccess({ppp:60000,region:'eca',year:1980}),.9);
});
test('unknown legacy facts remain unknown while latent and disclosed conditions produce distinct current facts',()=>{
 const old=createLife({...DEFAULT_SETTINGS,country:'JPN'},41);assert.equal(physicalFacts(old),null);
 const l=createNewGame({...DEFAULT_SETTINGS,country:'JPN'},1536);assert.deepEqual(physicalFacts(l),{kind:null,aid:false,wheelchair:false,since:null,source:null});
 l.age=1;l.physicalState!.condition!.recognizedAge=1;assert.deepEqual(physicalFacts(l),{kind:'mobility',aid:false,wheelchair:true,since:0,source:'birth'});
 const before=structuredClone(old);assert.equal(observePhysicalYear(old,()=>assert.fail('no legacy reroll')),null);assert.deepEqual(old,before);
});
test('child aid uses the exact capped access boundary, records both outcomes once and never charges the family',()=>{
 for(const value of [.94999,.95]){
  const l=child(2);l.country={...l.country,ppp:60000};l.era='today';l.stats.incomeQuintile=5;const cash=l.stats.savings;const out=observePhysicalYear(l,draws([value]));
  assert.equal(out,value<.95?'event.physical.childAid.mobility.wheelchair':'event.physical.childAidUnavailable');assert.deepEqual(l.physicalState!.condition!.childAid,{age:2,received:value<.95});assert.equal(l.physicalState!.condition!.aid,value<.95);assert.equal(l.stats.happiness,value<.95?53:50);assert.equal(l.stats.savings,cash);
  assert.equal(observePhysicalYear(l,()=>assert.fail('year must not rerun')),null);
 }
});
test('subtype has audited weights, no extra rewards and priority over a delayed child-aid attempt',()=>{
 for(const [value,kind]of[[.79999,'spastic'],[.8,'spastic'],[.80001,'dyskinetic'],[.9,'dyskinetic'],[.90001,'ataxic'],[.95,'ataxic'],[.95001,'mixed']]as const){
  const l=child(3);assert.equal(observePhysicalYear(l,draws([value])),`event.physical.cerebralPalsy.${kind}`);assert.deepEqual(l.physicalState!.condition!.cerebralPalsy,{age:3,kind});assert.equal(l.physicalState!.condition!.childAid,undefined);assert.equal(l.stats.happiness,50);
  l.age=4;l.year++;assert.ok(observePhysicalYear(l,draws([0]))!.startsWith('event.physical.childAid.'));
 }
});
test('a failed child-aid attempt stays observed rather than being silently rerolled every later year',()=>{
 const l=child(2);observePhysicalYear(l,draws([1]));assert.equal(l.physicalState!.condition!.childAid!.received,false);
 l.age=3;l.year++;observePhysicalYear(l,draws([0]));l.age=4;l.year++;assert.equal(observePhysicalYear(l,()=>assert.fail('no second child attempt')),null);assert.equal(l.physicalState!.condition!.aid,false);
});
test('scheduled polio produces an actual observed onset once with literal health and happiness effects',()=>{
 const l=createNewGame({...DEFAULT_SETTINGS,country:'JPN'},41);l.age=1;l.year++;l.stats.happiness=50;l.physicalState={version:1,lastCheckedAge:0,condition:null,polioAt:1};
 assert.equal(observePhysicalYear(l,draws([.29999])),'event.physical.acquired.polio');assert.equal(l.physicalState.polioAt,undefined);assert.equal(l.physicalState.condition!.source,'polio');assert.equal(l.physicalState.condition!.recognizedAge,1);assert.equal(l.physicalState.condition!.wheelchair,true);assert.equal(l.stats.health,87);assert.equal(l.stats.happiness,44);assert.equal(observePhysicalYear(l,()=>assert.fail('once')),null);
});
