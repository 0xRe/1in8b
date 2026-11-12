import test from 'node:test';import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {advanceYear,advanceTimeline,makeChoice,addReflection} from '../src/game/engine';
import {getCountryById} from '../src/game/countries';
import {decodeSave,encodeSave} from '../src/game/storage';
import {preparePrimaryRuntime,settlePrimaryRuntime} from '../src/game/primary-school-runtime';
function fixture(country='JPN'){
 const l=structuredClone([...naturalFamily(1)].find(l=>l.age===4&&!l.pendingDecision)!);
 l.country=getCountryById(country);l.migration.birthCountry=getCountryById(country);
 l.academics={version:1,qualification:0,doctorate:false,medicine:false,studyCountry:null,enrollment:null,primaryFacts:{rich:false,refugee:false,irregular:false,learningCentreOnly:false,absentParentIds:[]},circumstances:{homeSchool:false,learningCentre:false,topMarkAge:null,developmentalProtection:false,accessModifiers:{}}};
 return l;
}
function nextAge(l:ReturnType<typeof fixture>){const age=l.age;for(let n=0;n<40&&l.age===age;n++)l=l.pendingDecision?l.pendingDecision.type==='reflection'?addReflection(l,''):makeChoice(l,l.pendingDecision.choices[0].id):l.timeline&&!l.timeline.complete?advanceTimeline(l,1):advanceYear(l,.000001);return l;}
test('engine milestones persist placement then start school with zero qualification and credit',()=>{
 let l=nextAge(fixture());assert.equal(l.age,5);assert.ok(l.academics!.primary!.placement);
 assert.deepEqual(decodeSave(encodeSave(l,[])).life,l);
 const repeat=structuredClone(l);assert.equal(preparePrimaryRuntime(repeat,()=>{throw Error('redraw');},()=>{throw Error('work');}),null);
 l=nextAge(l);assert.equal(l.age,6);assert.equal(l.academics!.enrollment?.stage,'primary');assert.equal(l.academics!.enrollment!.completedYears,0);assert.equal(l.academics!.qualification,0);assert.equal(l.schooling.enrolled,true);assert.equal(l.stats.job,'student');
 assert.ok(l.events.some(e=>e.key==='event.primary.school'));assert.deepEqual(decodeSave(encodeSave(l,[])).life,l);
});
test('private hardship transfers once while public hardship withdraws without an earned degree',()=>{
 let l=nextAge(nextAge(fixture('UGA')));l.stats.incomeQuintile=1;l.stats.knowledge=0;
 l.academics!.primary!.placement={age:5,kind:'private'};l.academics!.enrollment={stage:'primary',completedYears:1,lastSettledAge:6,paused:false,graduationPending:false};
 const before=l.stats.happiness;
 assert.equal(settlePrimaryRuntime(l,6,()=>0,()=>{throw Error('private transfer must retain school');}),'transfer');assert.equal(l.stats.happiness,before-2);assert.equal(l.academics!.primary!.transferredAge,6);
 assert.equal(settlePrimaryRuntime(l,6,()=>{throw Error('duplicate retention draw');},()=>{}),null);
 const publicLife=structuredClone(l);delete publicLife.academics!.primary!.lastRetentionAge;
 let work=0;assert.equal(settlePrimaryRuntime(publicLife,6,()=>0,()=>{work++;}),'withdraw');assert.equal(work,1);assert.equal(publicLife.academics!.enrollment,null);assert.equal(publicLife.academics!.qualification,0);
});
test('failed camp entry commits its outcome and cannot retry admission on replay',()=>{
 const l=nextAge(nextAge(fixture()));l.academics!.enrollment=null;l.academics!.primary!.entry=undefined;l.academics!.primaryFacts!.learningCentreOnly=true;
 let calls=0,work=0;assert.equal(preparePrimaryRuntime(l,()=>{calls++;return .99;},()=>{work++;}),'outOfSchool');
 assert.equal(calls,1);assert.equal(work,1);assert.equal(l.academics!.primary!.entry!.kind,'outOfSchool');
 assert.equal(preparePrimaryRuntime(l,()=>{throw Error('retry');},()=>{throw Error('retry');}),null);
});

test('observed primary school years graduate into secondary school without early credentials',()=>{
 let l=nextAge(nextAge(fixture()));
 for(let age=6;age<12;age++){
  assert.equal(l.age,age);assert.equal(l.academics!.qualification,0);
  l=nextAge(decodeSave(encodeSave(l,[])).life!);
 }
 assert.equal(l.age,12);assert.equal(l.academics!.qualification,1);assert.equal(l.academics!.enrollment!.stage,'lowerSecondary');assert.equal(l.academics!.enrollment!.completedYears,0);
 assert.deepEqual(decodeSave(encodeSave(l,[])).life,l);
});

test('annual engine settlement withdraws public pupils once and rejects forged primary receipts',()=>{
 const l=nextAge(nextAge(fixture('UGA')));l.stats.incomeQuintile=1;l.stats.knowledge=0;
 l.academics!.primary!.placement={age:5,kind:'public'};
 l.academics!.enrollment={stage:'primary',completedYears:0,lastSettledAge:5,paused:false,graduationPending:false};
 l.feed!.plan={year:l.year,age:l.age,queue:[],gates:{}};
 l.timeline={year:l.year,age:l.age,position:0,complete:false,queue:[],scheduledDecisions:[],focusTime:{}};l.rng=7;
 const done=advanceTimeline(l,1);assert.equal(done.academics!.enrollment,null);assert.equal(done.stats.job,'childwork');assert.equal(done.academics!.lastWithdrawal!.stage,'primary');
 assert.ok(done.events.some(e=>e.key==='event.primary.withdraw'));assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);
 assert.deepEqual(advanceTimeline(done,1),done);
 for(const mutate of [(v:typeof l)=>{v.academics!.primaryFacts!.rich='true' as never;},(v:typeof l)=>{v.academics!.primaryFacts!.absentParentIds=['missing'];},(v:typeof l)=>{v.academics!.primary!.transferredAge=6;v.academics!.primary!.lastRetentionAge=6;}]){
  const bad=structuredClone(l);mutate(bad);assert.throws(()=>encodeSave(bad,[]));
 }
});
