import test from 'node:test';import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {advanceYear,advanceTimeline,makeChoice,addReflection} from '../src/game/engine';
import {encodeSave,decodeSave} from '../src/game/storage';
import {schoolDuration,type SchoolStage} from '../src/game/school-model';
function fixture(stage:SchoolStage='university',age=30){
 const life=structuredClone([...naturalFamily(1)].find(l=>l.age>=age&&!l.pendingDecision&&(!l.timeline||l.timeline.complete))!);
 life.academics={version:1,qualification:stage==='phd'?5:stage==='graduate'?4:3,doctorate:false,medicine:false,studyCountry:'GBR',enrollment:{stage,completedYears:schoolDuration(stage,'GBR',false),lastSettledAge:life.age,paused:false,graduationPending:true}};
 life.schooling.enrolled=true;life.stats.employment='student';life.stats.job='student';life.stats.annualIncome=0;
 life.stats.education=4;life.stats.happiness=50;life.stats.knowledge=50;
 return life;
}
function nextYear(input:ReturnType<typeof fixture>){
 let life=input;
 for(let step=0;step<40;step++){
  if(life.pendingDecision){life=life.pendingDecision.type==='reflection'?addReflection(life,''):makeChoice(life,life.pendingDecision.choices[0].id);continue;}
  if(life.timeline&&!life.timeline.complete){life=advanceTimeline(life,1);continue;}
  const result=advanceYear(life,.000001);if(result.age>input.age)return result;life=result;
 }
 throw new Error('Year did not advance');
}
test('pending graduation commits at the next year boundary once, preserving the prior academic record',()=>{
 const before=fixture(),history=structuredClone(before.history);
 const done=nextYear(decodeSave(encodeSave(before,[])).life!);
 assert.equal(done.academics!.enrollment,null);assert.equal(done.academics!.qualification,4);
 assert.deepEqual(done.academics!.lastGraduation,{stage:'university',age:done.age,country:'GBR'});
 assert.equal(done.schooling.enrolled,false);
 assert.equal(done.events.filter(e=>e.key==='event.academicGraduation.university').length,1);
 assert.deepEqual(done.history.filter(row=>row.age<before.age),history.filter(row=>row.age<before.age));
 assert.equal(done.history.find(row=>row.age===before.age)!.annual!.academic!.qualification,3);
 assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);
 const after=nextYear(done);
 assert.equal(after.events.filter(e=>e.key==='event.academicGraduation.university').length,1);
 assert.equal(before.academics!.enrollment!.graduationPending,true);
});
test('doctoral completion preserves master qualification and applies its distinct celebration and knowledge gain',()=>{
 const master=nextYear(fixture('graduate')),doctor=nextYear(fixture('phd'));
 assert.equal(doctor.academics!.qualification,5);assert.equal(doctor.academics!.doctorate,true);
 assert.equal(master.academics!.doctorate,false);
 assert.ok(Math.abs(doctor.stats.knowledge-master.stats.knowledge-4)<.011);
 assert.ok(Math.abs(doctor.stats.happiness-master.stats.happiness-8)<.011);
 assert.equal(doctor.events.filter(e=>e.key==='event.academicGraduation.phd').length,1);
});
test('graduation receipt rejects invented future ages and unknown stage or country',()=>{
 const life=fixture();
 for(const receipt of [{stage:'university',age:life.age+1,country:'GBR'},{stage:'fake',age:life.age,country:'GBR'},{stage:'university',age:life.age,country:'FAKE'}]){
  life.academics!.lastGraduation=receipt as any;
  assert.throws(()=>decodeSave(encodeSave(life,[])));
 }
});


test('explicit unfinished courses do not receive legacy age-based school qualifications or graduation offers',()=>{
 for(const [age,stage,qualification] of [[11,'primary',0],[17,'upperSecondary',2]] as const){
  const life=fixture(stage,age);life.academics!.qualification=qualification;life.stats.education=qualification;
  life.academics!.enrollment!.completedYears=0;life.academics!.enrollment!.graduationPending=false;
  const after=nextYear(life);
  assert.equal(after.stats.education,qualification);
  assert.equal(after.academics!.qualification,qualification);
  assert.equal(after.events.some(e=>e.age===after.age&&e.key==='event.graduate'),false);
  assert.equal(after.timeline?.scheduledDecisions?.some(d=>d.id==='education'),false);
 }
});
