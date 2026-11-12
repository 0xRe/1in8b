import test from 'node:test';import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {academicContinuationDecision} from '../src/game/academic-continuation';
import {makeChoice} from '../src/game/engine';
import {encodeSave,decodeSave} from '../src/game/storage';
function fixture(){
 const life=structuredClone([...naturalFamily(1)].find(l=>l.age>=30&&!l.pendingDecision&&(!l.timeline||l.timeline.complete))!);
 life.academics={version:1,qualification:4,doctorate:false,medicine:false,studyCountry:null,enrollment:null,lastGraduation:{stage:'university',age:life.age,country:life.country.id}};
 life.schooling.enrolled=false;life.stats.employment='student';life.stats.job='student';life.stats.annualIncome=0;
 life.pendingDecision=academicContinuationDecision(life);return life;
}
test('bachelor continuation is one current-year choice and a persisted offer remains actionable',()=>{
 const life=fixture();assert.ok(life.pendingDecision);
 assert.deepEqual(life.pendingDecision!.choices.map(c=>c.id),['academicWork','academicGraduate']);
 const done=makeChoice(decodeSave(encodeSave(life,[])).life!,'academicWork');
 assert.equal(done.stats.employment,'unemployed');assert.equal(done.stats.job,'none');
 assert.equal(academicContinuationDecision(done),null);assert.equal(done.rng,life.rng);
 assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);
 const later=structuredClone(life);later.age++;later.year++;later.pendingDecision=null;
 assert.equal(academicContinuationDecision(later),null);
});
test('master admission consumes one draw, enrolling on acceptance and seeking work on rejection',()=>{
 for(const [seed,accepted] of [[7,true],[1,false]] as const){
  const life=fixture();life.rng=seed;
  const done=makeChoice(life,'academicGraduate');
  assert.equal(done.rng,(seed+0x6d2b79f5)>>>0);
  assert.equal(done.academics!.qualification,4);
  if(accepted){assert.equal(done.academics!.enrollment!.stage,'graduate');assert.equal(done.academics!.enrollment!.completedYears,0);assert.equal(done.academics!.enrollment!.lastSettledAge,life.age-1);assert.equal(done.stats.employment,'student');}
  else{assert.equal(done.academics!.enrollment,null);assert.equal(done.stats.employment,'unemployed');}
  assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);assert.equal(life.academics!.enrollment,null);
 }
});
test('working graduates may keep their job, while stale offers cannot apply after custody or relocation',()=>{
 const life=fixture();life.stats.employment='employed';life.stats.job='engineer';life.stats.annualIncome=50000;
 life.pendingDecision=academicContinuationDecision(life);
 assert.equal(life.pendingDecision!.choices[0].id,'academicKeep');
 const kept=makeChoice(life,'academicKeep');assert.equal(kept.stats.annualIncome,50000);assert.equal(kept.rng,life.rng);
 for(const stale of ['custody','country']){
  const changed=structuredClone(life);
  if(stale==='custody')changed.justice.prisonUntil=changed.age+2;else changed.pendingDecision!.params.country='USA';
  const dismissed=makeChoice(changed,'academicGraduate');
  assert.equal(dismissed.pendingDecision,null);assert.equal(dismissed.rng,changed.rng);assert.equal(dismissed.academics!.enrollment,null);
 }
});

test('real graduation schedules the continuation, which survives a queued save and starts credited graduate study',async()=>{
 const {advanceYear,advanceTimeline,addReflection}=await import('../src/game/engine');
 let life=fixture();life.pendingDecision=null;delete life.academics!.lastGraduation;
 life.academics!.qualification=3;life.academics!.enrollment={stage:'university',completedYears:4,lastSettledAge:life.age,paused:false,graduationPending:true};
 life.schooling.enrolled=true;const priorAge=life.age;
 for(let step=0;step<40&&life.age===priorAge;step++){
  if(life.pendingDecision)life=life.pendingDecision.type==='reflection'?addReflection(life,''):makeChoice(life,life.pendingDecision.choices[0].id);
  else life=advanceYear(life,.000001);
 }
 assert.equal(life.age,priorAge+1);
 assert.equal(life.timeline!.scheduledDecisions![0].id,`academicAfterUniversity-${life.age}`);
 life=advanceTimeline(decodeSave(encodeSave(life,[])).life!,1);
 assert.equal(life.pendingDecision!.id,`academicAfterUniversity-${life.age}`);
 life.rng=7;life=makeChoice(life,'academicGraduate');
 assert.equal(life.academics!.enrollment!.stage,'graduate');
 assert.equal(life.academics!.enrollment!.completedYears,0);
 for(let step=0;step<20&&!life.timeline!.complete;step++){
  if(life.pendingDecision)life=life.pendingDecision.type==='reflection'?addReflection(life,''):makeChoice(life,life.pendingDecision.choices[0].id);
  else life=advanceTimeline(life,1);
 }
 assert.equal(life.timeline!.complete,true);
 if(life.academics!.enrollment){
  assert.equal(life.academics!.enrollment.stage,'graduate');assert.equal(life.academics!.enrollment.completedYears,1);
 }else{
  assert.equal(life.academics!.lastWithdrawal!.stage,'graduate');assert.equal(life.academics!.lastWithdrawal!.completedYears,1);
  assert.equal(life.academics!.qualification,4);assert.equal(life.stats.employment,'unemployed');
 }
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
});

test('commissioned academy graduates cannot receive ordinary same-year postgraduate choices',()=>{
 const life=fixture();life.academics!.college={age:18,country:life.country.id,kind:'ordinary',status:'enrolled',closureYear:null,choices:['apply','work','army','navy','air'],academyOffer:'threeBranches'};
 life.academics!.academy={branch:'army',startedAge:18,commissionedAge:life.age,major:'mil'};life.pendingDecision=null;
 life.stats.job='soldier';life.stats.employment='employed';life.stats.annualIncome=50000;
 const restored=decodeSave(encodeSave(life,[])).life!;assert.equal(restored.stats.job,'soldier');assert.equal(academicContinuationDecision(restored),null);
});
test('military employment survives current and retired companion records without becoming another occupation',()=>{
 const life=fixture();life.stats.job='soldier';life.care.previousJob='soldier';life.training.previousJob='soldier';life.companions[0].lastJob='soldier';life.companions[0].job='retired';
 const restored=decodeSave(encodeSave(life,[])).life!;assert.equal(restored.stats.job,'soldier');assert.equal(restored.care.previousJob,'soldier');assert.equal(restored.training.previousJob,'soldier');assert.equal(restored.companions[0].lastJob,'soldier');
});
