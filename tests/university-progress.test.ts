import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,DEFAULT_SETTINGS,advanceYear,makeChoice} from '../src/game/engine';
import {encodeSave,decodeSave} from '../src/game/storage';
function applicant(){
 let life=createLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true},1);
 for(let step=0;step<1000&&life.alive;step++){
  if(life.pendingDecision?.id==='education')return life;
  life=life.pendingDecision?makeChoice(life,life.pendingDecision.type==='reflection'?'skip':life.pendingDecision.choices[0].id):advanceYear(life);
 }
 throw new Error('Education decision not reached');
}
test('university admission retains completed education and saves separate course progress',()=>{
 const before=applicant(),life=makeChoice(before,'university');
 assert.equal(life.stats.education,before.stats.education);
 assert.deepEqual(life.schooling.university,{startedAge:18,completedYears:0,lastProgressAge:18});
 assert.deepEqual(decodeSave(encodeSave(life,[])).life!.schooling,life.schooling);
});
test('four completed university years award one degree, even after a late entry',()=>{
 let life=applicant();
 life.age=21;life.year=life.birthYear+21;delete life.timeline;
 life=makeChoice(life,'university');
 for(let steps=0;steps<200&&life.age<25;steps++){
  life=life.pendingDecision?makeChoice(life,life.pendingDecision.type==='reflection'?'skip':life.pendingDecision.choices[0].id):advanceYear(life);
  if(life.age<25)assert.ok(life.stats.education<4);
 }
 assert.equal(life.age,25);assert.equal(life.stats.education,4);
 assert.equal(life.schooling.enrolled,false);
 assert.equal(life.events.filter(e=>e.key==='event.degree').length,1);
});
test('save validation rejects impossible university progress',()=>{
 const life=makeChoice(applicant(),'university');
 for(const university of [{startedAge:19,completedYears:0,lastProgressAge:18},{startedAge:18,completedYears:-1,lastProgressAge:18},{startedAge:18,completedYears:5,lastProgressAge:18}]){
  const changed=structuredClone(life);changed.schooling.university=university;
  assert.throws(()=>decodeSave(encodeSave(changed,[])));
 }
});

test('legacy admission saves recover course progress from recorded enrollment without rewriting history or RNG',()=>{
 const life=makeChoice(applicant(),'university');
 delete life.schooling.university;life.stats.education=4;
 life.history.at(-1)!.annual!.education=4;
 const history=structuredClone(life.history),rng=life.rng;
 const restored=decodeSave(encodeSave(life,[])).life!;
 assert.equal(restored.stats.education,2);
 assert.deepEqual(restored.schooling.university,{startedAge:18,completedYears:0,lastProgressAge:18});
 assert.deepEqual(restored.history,history);assert.equal(restored.rng,rng);
 assert.deepEqual(decodeSave(encodeSave(restored,[])).life,restored);
});
test('legacy education without recorded provenance stays unknown rather than inventing a course',()=>{
 const life=makeChoice(applicant(),'university');
 delete life.schooling.university;life.stats.education=4;
 for(const row of life.history)row.annual=null;
 const restored=decodeSave(encodeSave(life,[])).life!;
 assert.equal(restored.schooling.university,undefined);assert.equal(restored.stats.education,4);
});
test('legacy second-year study restores two completed years and graduates once at the normal boundary',()=>{
 let life=makeChoice(applicant(),'university');
 for(let step=0;step<100&&life.age<20;step++)life=life.pendingDecision?makeChoice(life,life.pendingDecision.type==='reflection'?'skip':life.pendingDecision.choices[0].id):advanceYear(life);
 assert.equal(life.age,20);
 delete life.schooling.university;life.stats.education=4;
 for(const row of life.history)if(row.age>=18)row.annual!.education=4;
 life=decodeSave(encodeSave(life,[])).life!;
 assert.equal(life.schooling.university!.completedYears,2);
 for(let step=0;step<100&&life.age<22;step++)life=life.pendingDecision?makeChoice(life,life.pendingDecision.type==='reflection'?'skip':life.pendingDecision.choices[0].id):advanceYear(life);
 assert.equal(life.stats.education,4);assert.equal(life.events.filter(e=>e.key==='event.degree').length,1);
});
test('interrupted legacy student history is not treated as uninterrupted study',()=>{
 const life=makeChoice(applicant(),'university');
 delete life.schooling.university;life.stats.education=4;
 life.history.at(-1)!.annual!.employment='unemployed';
 const restored=decodeSave(encodeSave(life,[])).life!;
 assert.equal(restored.schooling.university,undefined);assert.equal(restored.stats.education,4);
});
