import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,DEFAULT_SETTINGS,advanceYear,makeChoice,requestJobOffers} from '../src/game/engine';
import {encodeSave,decodeSave} from '../src/game/storage';
import type {Life} from '../src/game/types';
function step(life:Life){
 if(!life.pendingDecision)return advanceYear(life);
 const decision=life.pendingDecision;
 const preferred=decision.id==='school'?'helpFamily':decision.id==='relocation'?'stay':decision.type==='reflection'?'skip':decision.choices[0].id;
 return makeChoice(life,preferred);
}
function reach(age:number,country='PAK',seed=1){
 let life=createLife({...DEFAULT_SETTINGS,country,gentler:true},seed);
 for(let n=0;n<1000&&life.alive&&life.age<age;n++)life=step(life);
 assert.equal(life.age,age);return life;
}
function applicant(country='PAK',seed=1){
 let life=reach(18,country,seed);
 for(let n=0;n<100&&life.pendingDecision?.id!=='education';n++)life=step(life);
 assert.equal(life.pendingDecision?.id,'education');return life;
}
test('natural child workers stop earning their former salary when enrolling at university',()=>{
 let before:Life|undefined;
 for(let seed=1;seed<=40;seed++){
  const life=applicant('PAK',seed);
  if(life.stats.annualIncome>0){before=life;break;}
 }
 assert.ok(before,'A working applicant must be reached through ordinary choices');
 const after=makeChoice(before,'university');
 assert.equal(after.stats.employment,'student');assert.equal(after.stats.annualIncome,0);
 assert.equal(after.budget.income,after.descendants.annualTransfers);
 assert.equal(after.schooling.childLabor,false);
 const loaded=decodeSave(encodeSave(after,[])).life!;
 assert.equal(loaded.stats.annualIncome,0);assert.equal(loaded.budget.income,after.budget.income);
});
test('turning eighteen in custody does not offer university or vocational enrollment',()=>{
 let life=reach(17,'JPN');life.justice.prisonUntil=21;life.stats.employment='none';life.stats.job='none';life.stats.annualIncome=0;
 for(let n=0;n<100&&life.age<18;n++)life=step(life);
 assert.equal(life.age,18);
 assert.notEqual(life.pendingDecision?.id,'education');
 assert.ok(!life.timeline?.scheduledDecisions?.some(d=>d.id==='education'));
 assert.equal(life.stats.employment,'none');
});
test('a saved university offer invalidated by custody is dismissed without tuition, RNG or enrollment changes',()=>{
 const before=applicant('JPN');before.justice.prisonUntil=22;
 for(const choice of ['university','vocational','work']){
  const after=makeChoice(before,choice);
  assert.equal(after.pendingDecision,null);
  assert.deepEqual(after,{...before,pendingDecision:null});
 }
});

test('a scheduled education slot invalidated by custody is consumed without interrupting playback',()=>{
 const before=applicant('JPN');const decision=before.pendingDecision!;
 before.pendingDecision=null;before.justice.prisonUntil=22;
 const timeline=before.timeline!;
 timeline.scheduledDecisions!.push(decision);
 timeline.queue.push({kind:'decision',id:decision.id,at:timeline.position});
 timeline.queue.sort((a,b)=>a.at-b.at);
 const after=advanceYear(before,0.001);
 assert.equal(after.pendingDecision,null);
 assert.ok(!after.timeline!.queue.some(slot=>slot.id==='education'));
 assert.ok(!after.timeline!.scheduledDecisions!.some(d=>d.id==='education'));
 assert.equal(after.schooling.university,undefined);
 assert.equal(after.stats.savings,before.stats.savings);
});

test('custody suspends school expenses and study credit after a real sentencing choice',()=>{
 let imprisoned:Life|undefined;
 for(let seed=1;seed<=30&&!imprisoned;seed++){
  let life=makeChoice(applicant('JPN',seed),'university');
  life.settings.gentler=false;life.stats.debt=life.country.ppp;life.opportunities.lastRiskAge=0;
  life.pendingDecision=null;delete life.timeline;
  life=advanceYear(life);
  assert.ok(life.pendingDecision?.id.startsWith('risky-'));
  life=makeChoice(life,'acceptRisk');
  if(life.justice.prisonUntil!==null)imprisoned=life;
 }
 assert.ok(imprisoned,'Risk choice must produce a real sentence');
 assert.equal(imprisoned.schooling.enrolled,false);
 assert.equal(imprisoned.schooling.droppedOut,true);
 assert.equal(imprisoned.budget.education,0);
 const years=imprisoned.schooling.years,progress=structuredClone(imprisoned.schooling.university);
 const age=imprisoned.age;
 for(let i=0;i<100&&imprisoned.age===age;i++)imprisoned=step(imprisoned);
 assert.equal(imprisoned.age,age+1);
 assert.equal(imprisoned.schooling.years,years);
 assert.deepEqual(imprisoned.schooling.university,progress);
 assert.equal(imprisoned.budget.education,0);
});

test('an imported student employment flag cannot award a degree during custody',()=>{
 let life=makeChoice(applicant('JPN'),'university');
 for(let i=0;i<500&&life.age<21;i++)life=step(life);
 assert.equal(life.age,21);
 life.pendingDecision=null;delete life.timeline;
 life.justice.prisonUntil=25;
 life=decodeSave(encodeSave(life,[])).life!;
 const years=life.schooling.years;
 for(let i=0;i<100&&life.age===21;i++)life=step(life);
 assert.equal(life.age,22);
 assert.equal(life.schooling.university!.completedYears,3);
 assert.equal(life.schooling.years,years);
 assert.ok(life.stats.education<4);
 assert.equal(life.events.filter(e=>e.key==='event.degree').length,0);
});

 test('a student released from custody can seek work without losing completed coursework',()=>{
 let life=makeChoice(applicant('JPN'),'university');
 for(let i=0;i<500&&life.age<20;i++)life=step(life);
 assert.equal(life.schooling.university!.completedYears,2);
 life.pendingDecision=null;delete life.timeline;
 life.justice.prisonUntil=life.age+1;life.stats.employment='none';life.stats.job='none';
 const progress=structuredClone(life.schooling.university);
 const age=life.age;
 for(let i=0;i<100&&life.age===age;i++)life=step(life);
 assert.equal(life.justice.prisonUntil,null);
 assert.equal(life.schooling.enrolled,false);
 assert.equal(life.schooling.droppedOut,true);
 assert.deepEqual(life.schooling.university,progress);
 life.pendingDecision=null;
 const offered=requestJobOffers(life);
 assert.ok(offered.pendingDecision?.id.startsWith('job-'));
 assert.ok(offered.jobOffers.length>0);
 });
