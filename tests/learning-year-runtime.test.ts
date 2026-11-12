import test from 'node:test';import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {advanceTimeline,advanceYear,makeChoice,addReflection} from '../src/game/engine';
import {createLearningState,drawTalents} from '../src/game/learning-state';
import {encodeSave,decodeSave} from '../src/game/storage';
function fixture(age=18){
 const life=structuredClone([...naturalFamily(1)].find(l=>l.age>=age&&!l.pendingDecision&&(!l.timeline||l.timeline.complete))!);
 life.learning=createLearningState(life.age,drawTalents(()=>.5),72);
 life.stageFocus={version:1,selection:{current:'study',picked:'study',returnTo:null,automaticFallback:null}};
 life.academics={version:1,qualification:3,doctorate:false,medicine:false,studyCountry:null,enrollment:{stage:'university',completedYears:0,lastSettledAge:life.age,paused:false,graduationPending:false}};
 life.temperament.kind='careful';life.hobbies=[];
 life.feed!.plan={year:life.year,age:life.age,queue:[],gates:{}};
 life.timeline={year:life.year,age:life.age,position:0,complete:false,queue:[],scheduledDecisions:[],focusTime:{},stageFocusTime:{}};
 return life;
}
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('annual learning settles observed activity once after a save/reload and records the settled age',()=>{
 const life=fixture(),half=advanceTimeline(life,.25);
 assert.equal(half.learning!.effort,0);assert.equal(half.learning!.lastSettledAge,undefined);
 const loaded=decodeSave(encodeSave(half,[])).life!;loaded.stageFocus!.selection.current='parttime';
 const done=advanceTimeline(loaded,.75);
 close(done.learning!.effort,.014375);assert.equal(done.learning!.lastSettledAge,life.age);
 assert.ok(done.stats.knowledge>50&&done.stats.knowledge<51);
 const restored=decodeSave(encodeSave(done,[])).life!;
 assert.deepEqual(advanceTimeline(restored,1),restored);assert.equal(life.learning!.effort,0);
});
test('learning uses active enrollment and hobby definitions, not a completed degree',()=>{
 const life=fixture();life.academics!.enrollment=null;life.academics!.qualification=4;
 life.schooling.enrolled=true;life.stats.employment='student';
 life.hobbies=[{id:'reading',skill:5,trainedAt:-1},{id:'music',skill:5,trainedAt:-1},{id:'art',skill:5,trainedAt:-1}];
 life.temperament.kind='curious';
 const done=advanceTimeline(life,1);
 close(done.learning!.effort,.09625); // .075*(study1 - baseline.25) + hobbies.035 + curiosity.005
});
test('a paused or incarcerated student receives no higher-education bonus',()=>{
 for(const kind of ['paused','prison']){
  const life=fixture();
  if(kind==='paused')life.academics!.enrollment!.paused=true;else life.justice.prisonUntil=life.age+2;
  close(advanceTimeline(life,1).learning!.effort,.05625);
 }
});


test('new annual learning does not also receive old school, curious or reading point bonuses at year start',()=>{
 for(const age of [18,30]){
 let life=fixture(age);life.timeline!.complete=true;life.timeline!.position=1;
 life.temperament.kind='curious';life.hobbies=[{id:'reading',skill:5,trainedAt:-1}];
 life.dailyTheme.id='freshAir';life.schooling.enrolled=true;
 life.stats.employment='student';life.stats.job='student';life.stats.annualIncome=0;
 let advanced=false;
 for(let attempt=0;attempt<30;attempt++){
  if(life.pendingDecision){life=life.pendingDecision.type==='reflection'?addReflection(life,''):makeChoice(life,life.pendingDecision.choices[0].id);continue;}
  const before=life,after=advanceYear(before,.000001);
  if(after.age>before.age){
   assert.equal(after.learning!.effort,before.learning!.effort);
   assert.equal(after.learning!.lastSettledAge,before.learning!.lastSettledAge);
   assert.equal(after.timeline!.complete,false);advanced=true;break;
  }
  life=after;
 }
 assert.ok(advanced,'fixture never advanced a year');
 }
});

test('explicit course and current-year teacher support survives saves and rejects future markers',()=>{
 const life=fixture();life.learning!.support={ged:true,adultCourse:true,goodTeacherAge:life.age};
 const loaded=decodeSave(encodeSave(life,[])).life!;
 close(advanceTimeline(loaded,1).learning!.effort,.18625);
 for(const support of [{ged:'yes',adultCourse:false,goodTeacherAge:null},{ged:false,adultCourse:false,goodTeacherAge:life.age+1}]){
  const invalid=structuredClone(life);invalid.learning!.support=support as any;
  assert.throws(()=>decodeSave(encodeSave(invalid,[])));
 }
 life.learning!.support={ged:false,adultCourse:true,goodTeacherAge:life.age-1};
 close(advanceTimeline(life,1).learning!.effort,.09625);
});
test('pending equivalency preparation earns its learning bonus before the year-end exam and clears after completion',()=>{
 const life=fixture();life.academics!.enrollment=null;life.academics!.qualification=2;life.academics!.equivalency={examAt:life.age+1,target:3};life.rng=7;
 const loaded=decodeSave(encodeSave(life,[])).life!,done=advanceTimeline(loaded,1);
 close(done.learning!.effort,.13425); // Study .05625 + GED .06 + successful-exam knowledge2*.009.
 assert.equal(done.academics!.equivalency!.lastResult!.passed,true);assert.equal(done.academics!.equivalency!.examAt,null);
 assert.equal(done.academics!.qualification,3);assert.deepEqual(advanceTimeline(decodeSave(encodeSave(done,[])).life!,1),done);
});
test('a consumed explicit exam overrides stale legacy GED support instead of granting a permanent preparation bonus',()=>{
 const life=fixture();life.academics!.enrollment=null;life.academics!.equivalency={examAt:null,target:3};
 life.learning!.support={ged:true,adultCourse:false,goodTeacherAge:null};
 close(advanceTimeline(life,1).learning!.effort,.05625);
});
