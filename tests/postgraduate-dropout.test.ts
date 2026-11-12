import test from 'node:test';import assert from 'node:assert/strict';
import {postgraduateDropoutProbability} from '../src/game/school-retention';
import {naturalFamily} from './helpers/adult-family-simulation';
import {advanceTimeline} from '../src/game/engine';
import {encodeSave,decodeSave} from '../src/game/storage';
const close=(a:number|null,b:number)=>assert.ok(a!==null&&Math.abs(a-b)<1e-12);
test('master dropout includes the final year, ill health and explicit persistence',()=>{
 close(postgraduateDropoutProbability('graduate',1,2,70,40,false),.17);
 close(postgraduateDropoutProbability('graduate',2,2,70,39,false),.072*1.8);
 close(postgraduateDropoutProbability('graduate',1,2,70,39,true),.17*1.8*.8);
});
test('doctoral dropout depends on knowledge and stops before the completion year',()=>{
 close(postgraduateDropoutProbability('phd',1,5,0,10,false),.21);
 close(postgraduateDropoutProbability('phd',4,5,100,100,true),.14*.7*.8);
 assert.equal(postgraduateDropoutProbability('phd',5,5,50,10,false),null);
 assert.equal(postgraduateDropoutProbability('university',1,4,50,50,false),null);
});
function fixture(stage:'graduate'|'phd',years:number){
 const life=structuredClone([...naturalFamily(1)].find(l=>l.age>=30&&!l.pendingDecision&&(!l.timeline||l.timeline.complete))!);
 life.academics={version:1,qualification:stage==='graduate'?4:5,doctorate:false,medicine:false,studyCountry:'JPN',enrollment:{stage,completedYears:years,lastSettledAge:life.age-1,paused:false,graduationPending:false}};
 life.stats.health=50;life.stats.happiness=50;life.stats.knowledge=50;life.stats.employment='student';life.stats.job='student';life.stats.annualIncome=0;
 life.schooling.enrolled=true;
 life.feed!.plan={year:life.year,age:life.age,queue:[],gates:{}};
 life.timeline={year:life.year,age:life.age,position:0,complete:false,queue:[],scheduledDecisions:[],focusTime:{}};
 return life;
}
test('a year-end withdrawal preserves earned qualifications and cannot replay after reload',()=>{
 for(const stage of ['graduate','phd'] as const){
  const life=fixture(stage,0);life.rng=7;
  const half=advanceTimeline(life,.5);assert.equal(half.rng,7);
  const done=advanceTimeline(decodeSave(encodeSave(half,[])).life!,.5);
  assert.equal(done.rng,(7+0x6d2b79f5)>>>0);
  assert.equal(done.academics!.enrollment,null);assert.equal(done.academics!.qualification,life.academics!.qualification);
  assert.deepEqual(done.academics!.lastWithdrawal,{stage,age:life.age,completedYears:1,country:'JPN'});
  assert.equal(done.stats.employment,'unemployed');assert.equal(done.schooling.enrolled,false);
  assert.equal(done.stats.happiness,46);assert.equal(done.events.at(-1)!.key,`event.academicWithdrawal.${stage}`);
  const restored=decodeSave(encodeSave(done,[])).life!;assert.deepEqual(advanceTimeline(restored,1),restored);
 }
});
test('master final-year failure prevents graduation, doctoral completion skips the dropout draw, and paused years never draw',()=>{
 const master=fixture('graduate',1);master.rng=7;
 assert.equal(advanceTimeline(master,1).academics!.enrollment,null);
 const doctor=fixture('phd',4);doctor.rng=7;
 const done=advanceTimeline(doctor,1);assert.equal(done.academics!.enrollment!.graduationPending,true);assert.equal(done.rng,7);
 const paused=fixture('graduate',0);paused.academics!.enrollment!.paused=true;paused.rng=7;
 assert.equal(advanceTimeline(paused,1).rng,7);
 const retained=fixture('graduate',0);retained.rng=1;
 assert.equal(advanceTimeline(retained,1).academics!.enrollment!.completedYears,1);
});

test('persistent temperament survives imports and is distinct from legacy careful temperament',()=>{
 for(const kind of ['careful','persistent'] as const){
  const life=fixture('graduate',0);life.temperament.kind=kind;life.stats.health=39;life.rng=0;
  const loaded=decodeSave(encodeSave(life,[])).life!;assert.equal(loaded.temperament.kind,kind);
  const done=advanceTimeline(loaded,1);
  if(kind==='careful')assert.equal(done.academics!.enrollment,null);
  else assert.equal(done.academics!.enrollment!.completedYears,1);
 }
});
test('withdrawal receipts reject future ages, unsupported stages and impossible completed years',()=>{
 const life=fixture('graduate',0);
 for(const receipt of [{stage:'graduate',age:life.age+1,completedYears:1,country:'JPN'},{stage:'graduate',age:life.age,completedYears:3,country:'JPN'},{stage:'phd',age:life.age,completedYears:5,country:'JPN'},{stage:'unknown',age:life.age,completedYears:1,country:'JPN'}]){
  life.academics!.lastWithdrawal=receipt as any;
  assert.throws(()=>decodeSave(encodeSave(life,[])));
 }
});
