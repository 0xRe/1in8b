import test from 'node:test';import assert from 'node:assert/strict';
import {universityDropoutProbability} from '../src/game/school-retention';
import {naturalFamily} from './helpers/adult-family-simulation';
import {advanceTimeline} from '../src/game/engine';
import {encodeSave,decodeSave} from '../src/game/storage';
function fixture(years=0){
 const life=structuredClone([...naturalFamily(1)].find(l=>l.age>=30&&!l.pendingDecision&&(!l.timeline||l.timeline.complete))!);
 life.academics={version:1,qualification:3,doctorate:false,medicine:false,studyCountry:'FRA',enrollment:{stage:'university',completedYears:years,lastSettledAge:life.age-1,paused:false,graduationPending:false,retention:.05}};
 life.stats.health=50;life.stats.happiness=50;life.stats.knowledge=50;life.stats.employment='student';life.stats.job='student';life.stats.annualIncome=0;life.schooling.enrolled=true;
 life.feed!.plan={year:life.year,age:life.age,queue:[],gates:{}};
 life.timeline={year:life.year,age:life.age,position:0,complete:false,queue:[],scheduledDecisions:[],focusTime:{}};life.rng=7;
 return life;
}
test('university retention uses four knowledge bands, course length and persistence',()=>{
 for(const [knowledge,k] of [[49,1.68],[50,1.12],[69,1.12],[70,.78],[84,.78],[85,.45]])for(const duration of [4,5,6]){
  assert.ok(Math.abs(universityDropoutProbability(.5,1,duration,knowledge,false)!-(1-.5**(k/(duration-1))))<1e-12);
  assert.ok(Math.abs(universityDropoutProbability(.5,1,duration,knowledge,true)!-.8*(1-.5**(k/(duration-1))))<1e-12);
 }
 assert.equal(universityDropoutProbability(undefined,1,4,50,false),null);
 assert.equal(universityDropoutProbability(.5,4,4,50,false),null);
});
test('observed university withdrawal preserves qualification and is not replayed on reload',()=>{
 const life=fixture();const half=advanceTimeline(life,.5);assert.equal(half.rng,7);
 const done=advanceTimeline(decodeSave(encodeSave(half,[])).life!,.5);
 assert.equal(done.academics!.enrollment,null);assert.equal(done.academics!.qualification,3);
 assert.equal(done.academics!.lastWithdrawal!.stage,'university');assert.equal(done.stats.employment,'unemployed');assert.equal(done.stats.happiness,46);
 assert.equal(done.rng,(7+0x6d2b79f5)>>>0);
 const restored=decodeSave(encodeSave(done,[])).life!;assert.deepEqual(advanceTimeline(restored,1),restored);
});
test('university completion, paused years and missing cohort retention consume no draw',()=>{
 const final=fixture(3);const done=advanceTimeline(final,1);assert.equal(done.rng,7);assert.equal(done.academics!.enrollment!.graduationPending,true);
 const paused=fixture();paused.academics!.enrollment!.paused=true;assert.equal(advanceTimeline(paused,1).rng,7);
 const legacy=fixture();delete legacy.academics!.enrollment!.retention;assert.equal(advanceTimeline(legacy,1).rng,7);
});
test('retention imports reject invalid probabilities and retention on unrelated stages',()=>{
 for(const retention of [-.01,1.01,NaN]){const life=fixture();life.academics!.enrollment!.retention=retention;assert.throws(()=>decodeSave(encodeSave(life,[])));}
 const life=fixture();life.academics!.enrollment!.stage='primary';assert.throws(()=>decodeSave(encodeSave(life,[])));
});

test('withdrawal narratives distinguish part-time pressure, academic difficulty and a changed direction',()=>{
 for(const [knowledge,parttime,reason] of [[70,true,'parttime'],[50,false,'academic'],[90,false,'direction']] as const){
  const life=fixture();life.stats.knowledge=knowledge;
  if(parttime)life.timeline!.stageFocusTime={parttime:1};
  const done=advanceTimeline(life,1);
  assert.equal(done.events.at(-1)!.key,`event.academicWithdrawal.university.${reason}`);
 }
});
test('medical course dropout uses its study country and persists a fifth-year withdrawal',()=>{
 const life=fixture(4);life.academics!.medicine=true;life.academics!.studyCountry='FRA';
 const done=advanceTimeline(life,1);assert.equal(done.academics!.lastWithdrawal!.completedYears,5);
 // Historical receipts must not depend on a subsequent course's medicine flag.
 done.academics!.medicine=false;
 assert.equal(decodeSave(encodeSave(done,[])).life!.academics!.lastWithdrawal!.completedYears,5);
});

function academyFixture(years=0){
 const life=fixture(years);delete life.academics!.enrollment!.retention;
 life.academics!.college={age:18,country:'USA',kind:'ordinary',status:'enrolled',closureYear:null,choices:['apply','work','army','navy','air'],academyOffer:'threeBranches'};
 life.academics!.academy={branch:'navy',startedAge:18,major:'mil'};
 return life;
}
test('academy observed-year withdrawal runs without civilian retention and clears military identity exactly once',()=>{
 const life=academyFixture();const done=advanceTimeline(decodeSave(encodeSave(life,[])).life!,1);
 assert.equal(done.academics!.enrollment,null);assert.equal(done.academics!.academy,undefined);assert.equal(done.academics!.qualification,3);
 assert.equal(done.stats.happiness,46);assert.equal(done.stats.employment,'unemployed');assert.equal(done.events.at(-1)!.key,'event.academicWithdrawal.academy');
 assert.equal(done.rng,(7+0x6d2b79f5)>>>0);const saved=decodeSave(encodeSave(done,[])).life!;assert.deepEqual(advanceTimeline(saved,1),saved);
});
test('academy final and paused years have no dropout draw; completed years remain observed rather than elapsed',()=>{
 const final=academyFixture(3),done=advanceTimeline(final,1);assert.equal(done.rng,7);assert.equal(done.academics!.enrollment!.graduationPending,true);assert.ok(done.academics!.academy);
 const paused=academyFixture();paused.academics!.enrollment!.paused=true;assert.equal(advanceTimeline(paused,1).rng,7);
});
