import test from 'node:test';import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {advanceTimeline,advanceYear,makeChoice,addReflection} from '../src/game/engine';
import {encodeSave,decodeSave} from '../src/game/storage';
function fixture(age=18){
 const life=structuredClone([...naturalFamily(1)].find(l=>l.age>=age&&!l.pendingDecision&&(!l.timeline||l.timeline.complete))!);
 life.academics={version:1,qualification:3,doctorate:false,medicine:false,studyCountry:null,enrollment:{stage:'university',completedYears:3,lastSettledAge:life.age-1,paused:false,graduationPending:false}};
 life.schooling.enrolled=true;life.stats.employment='student';life.stats.job='student';life.stats.annualIncome=0;
 delete life.schooling.university;
 life.feed!.plan={year:life.year,age:life.age,queue:[],gates:{}};
 life.timeline={year:life.year,age:life.age,position:0,complete:false,queue:[],scheduledDecisions:[],focusTime:{}};
 return life;
}
test('a completed observed year advances course credit once and defers graduation to its boundary',()=>{
 const life=fixture(),half=advanceTimeline(life,.5);
 assert.equal(half.academics!.enrollment!.completedYears,3);
 assert.equal(half.schooling.years,life.schooling.years);
 const done=advanceTimeline(decodeSave(encodeSave(half,[])).life!,.5);
 assert.equal(done.academics!.enrollment!.completedYears,4);
 assert.equal(done.schooling.years,life.schooling.years+1);
 assert.equal(done.academics!.enrollment!.graduationPending,true);
 assert.equal(done.academics!.qualification,3);
 assert.equal(done.academics!.enrollment!.lastSettledAge,done.age);
 const restored=decodeSave(encodeSave(done,[])).life!;
 assert.deepEqual(advanceTimeline(restored,1),restored);
 assert.equal(life.academics!.enrollment!.completedYears,3);
});
test('paused and custodial courses do not earn credit, while resumed courses do not backfill gaps',()=>{
 for(const paused of [true,false]){
  const life=fixture(30);life.academics!.enrollment!.completedYears=0;life.academics!.enrollment!.lastSettledAge=20;
  if(paused)life.academics!.enrollment!.paused=true;else life.justice.prisonUntil=life.age+2;
  const interrupted=advanceTimeline(life,1);
  assert.equal(interrupted.academics!.enrollment!.completedYears,0);
  assert.equal(interrupted.schooling.years,life.schooling.years);
  life.academics!.enrollment!.paused=false;life.justice.prisonUntil=null;
  const done=advanceTimeline(life,1);
  assert.equal(done.academics!.enrollment!.completedYears,1);
  assert.equal(done.schooling.years,life.schooling.years+1);
  assert.equal(done.academics!.enrollment!.lastSettledAge,life.age);
 }
});
test('medical study duration follows study country instead of the current country',()=>{
 const life=fixture();life.academics!.medicine=true;life.academics!.studyCountry='GBR';
 const done=advanceTimeline(life,1);
 assert.equal(done.academics!.enrollment!.completedYears,4);
 assert.equal(done.academics!.enrollment!.graduationPending,false);
 assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);
});
test('explicit courses cannot be auto-graduated by the legacy age22 schedule',()=>{
 for(const legacyCursor of [false,true]){
 let life=fixture(21);life.academics!.enrollment!.completedYears=0;
 if(legacyCursor)life.schooling.university={startedAge:17,completedYears:3,lastProgressAge:21};
 life.timeline!.complete=true;life.timeline!.position=1;
 let advanced=false;
 for(let attempt=0;attempt<30;attempt++){
  if(life.pendingDecision){life=life.pendingDecision.type==='reflection'?addReflection(life,''):makeChoice(life,life.pendingDecision.choices[0].id);continue;}
  const after=advanceYear(life,.000001);
  if(after.age>life.age){
   assert.equal(after.schooling.years,life.schooling.years);
   assert.equal(after.age,22);assert.equal(after.stats.employment,'student');assert.equal(after.academics!.enrollment!.completedYears,0);
   if(legacyCursor)assert.deepEqual(after.schooling.university,life.schooling.university);
   advanced=true;break;
  }
  life=after;
 }
 assert.ok(advanced,'fixture never advanced');
 }
});

test('mixed saves whose legacy total already includes this calendar year stay importable',()=>{
 const life=fixture();life.schooling.years=life.age-5;
 const restored=decodeSave(encodeSave(life,[])).life!;
 const done=advanceTimeline(restored,1);
 assert.equal(done.academics!.enrollment!.completedYears,4);
 assert.equal(done.schooling.years,life.age-5);
 assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);
});
