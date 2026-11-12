import test from 'node:test';import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {academicContinuationDecision,preparePostgraduateContinuation} from '../src/game/academic-continuation';
import {makeChoice} from '../src/game/engine';
import {encodeSave,decodeSave} from '../src/game/storage';
function fixture(){
 const life=structuredClone([...naturalFamily(1)].find(l=>l.age>=30&&!l.pendingDecision&&(!l.timeline||l.timeline.complete))!);
 life.academics={version:1,qualification:5,doctorate:false,medicine:false,studyCountry:null,enrollment:null,lastGraduation:{stage:'graduate',age:life.age,country:life.country.id}};
 life.schooling.enrolled=false;life.stats.job='student';life.stats.employment='student';life.stats.annualIncome=0;life.stats.knowledge=55;
 return life;
}
test('doctoral invitation is drawn once and the result survives reload without rerolling',()=>{
 const life=fixture();let calls=0;
 preparePostgraduateContinuation(life,()=>{calls++;return .149;});
 assert.equal(calls,1);assert.deepEqual(life.academics!.phdInvitation,{age:life.age,offered:true});
 life.pendingDecision=academicContinuationDecision(life);assert.equal(life.pendingDecision!.id,`academicPhd-${life.age}`);
 const restored=decodeSave(encodeSave(life,[])).life!;
 preparePostgraduateContinuation(restored,()=>{throw new Error('reroll');});
 assert.deepEqual(restored,life);
 const rejected=fixture();preparePostgraduateContinuation(rejected,()=>.15);
 assert.equal(rejected.academics!.phdInvitation!.offered,false);
 assert.equal(academicContinuationDecision(rejected),null);
});
test('age, retirement, custody and prior doctoral study block an invitation without consuming RNG',()=>{
 for(const reason of ['age','retired','prison','started','doctorate']){
  const life=fixture();
  if(reason==='age'){life.age=39;life.year=life.birthYear+39;life.academics!.lastGraduation!.age=39;}
  if(reason==='retired')life.stats.employment='retired';
  if(reason==='prison')life.justice.prisonUntil=35;
  if(reason==='started')life.academics!.phdStartedAge=29;
  if(reason==='doctorate')life.academics!.doctorate=true;
  preparePostgraduateContinuation(life,()=>{throw new Error('ineligible draw');});
  assert.equal(academicContinuationDecision(life),null);
 }
});
test('accepting a persisted invitation starts doctoral study and grants knowledge without another application draw',()=>{
 const life=fixture();preparePostgraduateContinuation(life,()=>0);life.pendingDecision=academicContinuationDecision(life);
 const done=makeChoice(decodeSave(encodeSave(life,[])).life!,'academicPhdAccept');
 assert.equal(done.academics!.enrollment!.stage,'phd');assert.equal(done.academics!.enrollment!.completedYears,0);
 assert.equal(done.academics!.phdStartedAge,life.age);assert.equal(done.stats.knowledge,58);assert.equal(done.rng,life.rng);
 assert.equal(done.stats.employment,'student');assert.equal(academicContinuationDecision(done),null);
 assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);
 assert.equal(makeChoice(done,'academicPhdAccept'),done);
});
test('future invitation and doctoral start dates cannot enter a save',()=>{
 for(const field of ['phdInvitation','phdStartedAge']){
  const life=fixture();(life.academics as any)[field]=field==='phdInvitation'?{age:life.age+1,offered:true}:life.age+1;
  assert.throws(()=>decodeSave(encodeSave(life,[])));
 }
});

test('declining the invitation opens actionable job offers and cannot reopen the invitation',()=>{
 const life=fixture();preparePostgraduateContinuation(life,()=>0);life.pendingDecision=academicContinuationDecision(life);
 const done=makeChoice(life,'academicPhdWork');
 assert.equal(done.academics!.enrollment,null);assert.equal(done.stats.employment,'unemployed');
 assert.equal(done.pendingDecision!.id,`job-${life.age}`);assert.equal(done.jobOffers.length,3);
 assert.equal(academicContinuationDecision(done),null);
 const employed=makeChoice(decodeSave(encodeSave(done,[])).life!,'offer0');
 assert.equal(employed.stats.employment,'employed');assert.ok(employed.stats.annualIncome>0);
});

test('master and doctoral completion schedule jobs when no doctoral invitation is pending',async()=>{
 const {advanceYear,advanceTimeline,addReflection}=await import('../src/game/engine');
 for(const stage of ['graduate','phd'] as const){
  let life=fixture();delete life.academics!.lastGraduation;
  life.academics!.phdStartedAge=29;
  life.academics!.enrollment={stage,completedYears:stage==='graduate'?2:5,lastSettledAge:life.age,paused:false,graduationPending:true};
  life.schooling.enrolled=true;const age=life.age;
  for(let step=0;step<40&&life.age===age;step++){
   if(life.pendingDecision)life=life.pendingDecision.type==='reflection'?addReflection(life,''):makeChoice(life,life.pendingDecision.choices[0].id);
   else life=advanceYear(life,.000001);
  }
  assert.equal(life.age,age+1);assert.equal(life.stats.employment,'unemployed');
  assert.equal(life.timeline!.scheduledDecisions![0].id,`job-${life.age}`);
  life=advanceTimeline(decodeSave(encodeSave(life,[])).life!,1);
  assert.equal(life.pendingDecision!.id,`job-${life.age}`);
  life=makeChoice(life,'offer0');assert.equal(life.stats.employment,'employed');
  assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 }
});
