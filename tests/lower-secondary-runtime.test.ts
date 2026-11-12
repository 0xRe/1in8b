import test from 'node:test';import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {advanceYear,advanceTimeline,makeChoice,addReflection} from '../src/game/engine';
import {getCountryById} from '../src/game/countries';
import {encodeSave,decodeSave} from '../src/game/storage';
function fixture(country='JPN'){
 const life=structuredClone([...naturalFamily(1)].find(l=>l.age===11&&!l.pendingDecision)!);
 life.country=getCountryById(country);life.migration.birthCountry=getCountryById(country);
 life.stats.incomeQuintile=1;life.stats.knowledge=40;life.stats.employment='student';life.stats.job='student';life.stats.annualIncome=0;life.schooling.enrolled=true;life.schooling.childLabor=false;
 life.academics={version:1,qualification:0,doctorate:false,medicine:false,studyCountry:country,enrollment:{stage:'primary',completedYears:6,lastSettledAge:11,paused:false,graduationPending:true},circumstances:{homeSchool:false,learningCentre:false,topMarkAge:null,developmentalProtection:false,accessModifiers:{}}};
 return life;
}
function graduate(life:ReturnType<typeof fixture>){const age=life.age;for(let i=0;i<40&&life.age===age;i++)life=life.pendingDecision?life.pendingDecision.type==='reflection'?addReflection(life,''):makeChoice(life,life.pendingDecision.choices[0].id):advanceYear(life,.000001);return life;}
test('actual primary graduation automatically enrolls eligible secondary students at zero credit',()=>{
 const life=graduate(fixture());assert.equal(life.age,12);assert.equal(life.academics!.qualification,1);
 assert.equal(life.academics!.enrollment?.stage,'lowerSecondary');assert.equal(life.academics!.enrollment?.completedYears,0);
 assert.equal(life.schooling.enrolled,true);assert.equal(life.stats.job,'student');
 assert.deepEqual(decodeSave(encodeSave(life,[])).life!.academics,life.academics);
});
test('graduation queues a real choice, survives save, and work starts paid childhood work once',()=>{
 let life=graduate(fixture('UGA'));
 assert.ok(life.timeline!.scheduledDecisions!.some(d=>d.id==='lowerSecondary-12'));
 life=advanceTimeline(decodeSave(encodeSave(life,[])).life!,1);
 assert.equal(life.pendingDecision?.id,'lowerSecondary-12');
 const done=makeChoice(life,'secondaryWork');assert.equal(done.stats.job,'childwork');assert.equal(done.schooling.childWorkPaid,true);assert.ok(done.stats.annualIncome>0);
 assert.equal(done.academics!.qualification,1);assert.equal(done.academics!.lowerSecondary!.status,'outOfSchool');
 assert.deepEqual(makeChoice(done,'secondaryWork'),done);assert.ok(decodeSave(encodeSave(done,[])).life);
});
test('education bans offer secret study and paid work rather than an impossible admission',()=>{
 const input=fixture('AFG');input.sex='F';let life=graduate(input);life=advanceTimeline(life,1);
 assert.deepEqual(life.pendingDecision?.choices.map(c=>c.id),['secondaryHome','secondaryWork']);
 const before=life.stats.happiness;const done=makeChoice(life,'secondaryHome');assert.equal(done.stats.happiness,before-3);assert.equal(done.stats.job,'childwork');assert.equal(done.academics!.enrollment,null);
 assert.ok(done.events.some(e=>e.key==='event.lowerSecondary.home'));
});
test('queued secondary choices become inert after relocation or custody',()=>{
 let life=graduate(fixture('UGA'));life=advanceTimeline(life,1);assert.equal(life.pendingDecision?.id,'lowerSecondary-12');
 for(const change of [(l:typeof life)=>{l.country=getCountryById('USA');},(l:typeof life)=>{l.justice.prisonUntil=l.age+2;}]){
  const changed=structuredClone(life);change(changed);const result=makeChoice(changed,'secondaryGo');
  assert.equal(result.pendingDecision,null);assert.equal(result.rng,changed.rng);assert.equal(result.academics!.enrollment,null);
 }
});
test('annual secondary retention drops to childhood work once and respects protected and final years',()=>{
 const base=graduate(fixture());base.pendingDecision=null;base.academics!.enrollment!.retention=.05;
 base.feed!.plan={year:base.year,age:base.age,queue:[],gates:{}};
 base.timeline={year:base.year,age:base.age,position:0,complete:false,queue:[],scheduledDecisions:[],focusTime:{}};base.rng=7;
 const withdrawn=advanceTimeline(base,1);assert.equal(withdrawn.academics!.enrollment,null);assert.equal(withdrawn.stats.job,'childwork');assert.equal(withdrawn.academics!.qualification,1);
 assert.equal(withdrawn.academics!.lastWithdrawal!.stage,'lowerSecondary');assert.ok(decodeSave(encodeSave(withdrawn,[])).life);
 const replay=advanceTimeline(withdrawn,1);assert.equal(replay.rng,withdrawn.rng);assert.equal(replay.stats.happiness,withdrawn.stats.happiness);
 const protectedLife=structuredClone(base);protectedLife.academics!.circumstances!.developmentalProtection=true;
 assert.equal(advanceTimeline(protectedLife,1).rng,7);
 const finalYear=structuredClone(base);finalYear.academics!.enrollment!.completedYears=2;
 const finished=advanceTimeline(finalYear,1);assert.equal(finished.rng,7);assert.equal(finished.academics!.enrollment!.graduationPending,true);assert.equal(finished.academics!.qualification,1);
});
