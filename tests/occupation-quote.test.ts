import test from 'node:test';import assert from 'node:assert/strict';
import {createLife,DEFAULT_SETTINGS,makeChoice,requestJobOffers,advanceTimeline} from '../src/game/engine';
import {familyChoice} from './helpers/adult-family-simulation';
import {installOccupationQuotes} from '../src/game/occupation-quote';
import type {OccupationalOffer} from '../src/game/occupation-offer-pay';
import {planYearTimeline} from '../src/game/year-timeline';
import {decodeSave,encodeSave} from '../src/game/storage';
function seeker(){let l=createLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true},124);for(let i=0;i<300&&l.age<24&&l.alive;i++)l=familyChoice(l);assert.equal(l.age,24);l.pendingDecision=null;l.schooling.enrolled=false;l.training.kind=null;l.training.endsAt=null;l.care.who=null;l.decisions=l.decisions.filter(id=>id!==`job-${l.age}`);return l;}
const terms:OccupationalOffer={id:'dev',formal:true,percentile:.7,experience:2,relatedExperience:false,lateCareer:false};
test('zero to three quoted jobs preserve their exact menus and terms through reload',()=>{
 for(let count=0;count<=3;count++){
  const life=seeker();installOccupationQuotes(life,(['dev','engineer','clerk'] as const).slice(0,count).map(id=>({offer:{...terms,id},income:32000})));
  assert.equal(life.pendingDecision!.choices.length,count+1);const restored=decodeSave(encodeSave(life,[])).life!;assert.deepEqual(restored,life);
  const done=makeChoice(restored,count?'offer0':'wait');assert.equal(done.pendingDecision,null);
  if(count){assert.equal(done.stats.job,'dev');assert.equal(done.stats.annualIncome,32000);assert.deepEqual(done.career.at(-1)!.offer?.terms,life.jobOffers[0].terms);assert.equal(done.career.at(-1)!.offer?.country,'JPN');}
  assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);
 }
});
test('quoted employment rejects stale country and malformed terms before acceptance',()=>{
 const life=seeker();installOccupationQuotes(life,[{offer:terms,income:32000}]);
 for(const mutate of [(l:typeof life)=>l.jobOfferBatch!.country='USA',(l:typeof life)=>l.jobOffers[0].terms!.percentile=2,(l:typeof life)=>l.jobOffers[0].terms!.occupation='doctor',(l:typeof life)=>l.jobOffers[0].terms!.experience=.5]){
  const bad=structuredClone(life);mutate(bad);assert.throws(()=>decodeSave(encodeSave(bad,[])));const before=structuredClone(bad);before.pendingDecision=null;assert.deepEqual(makeChoice(bad,'offer0'),before);
 }
});
test('legacy offers keep their three-choice contract and do not gain invented metadata',()=>{
 const life=requestJobOffers(seeker());assert.equal(life.jobOffers.length,3);assert.equal(life.jobOfferBatch,undefined);assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 life.jobOffers.pop();life.pendingDecision!.choices.splice(2,1);assert.throws(()=>decodeSave(encodeSave(life,[])));
});
test('invalid quote construction is atomic and accepted metadata is validated independently',()=>{
 const life=seeker(),before=structuredClone(life);assert.throws(()=>installOccupationQuotes(life,[{offer:{...terms,id:'prison'},income:32000}]));assert.deepEqual(life,before);
 installOccupationQuotes(life,[{offer:terms,income:32000}]);const done=makeChoice(life,'offer0');done.career.at(-1)!.offer!.terms.formal='yes' as any;assert.throws(()=>decodeSave(encodeSave(done,[])));
});

test('an active quoted menu cannot be silently replaced and accepted terms are copied',()=>{
 const life=seeker();installOccupationQuotes(life,[{offer:terms,income:32000}]);const before=structuredClone(life);
 assert.throws(()=>installOccupationQuotes(life,[]));assert.deepEqual(life,before);
 const done=makeChoice(life,'offer0');life.jobOffers[0].terms!.formal=false;assert.equal(done.career.at(-1)!.offer!.terms.formal,true);
 assert.throws(()=>installOccupationQuotes(done,[]));
});

test('a queued occupational menu cannot be replaced before its timeline slot',()=>{
 const life=seeker();installOccupationQuotes(life,[{offer:terms,income:32000}]);
 const decision=life.pendingDecision!;life.pendingDecision=null;
 life.timeline={year:life.year,age:life.age,...planYearTimeline([],[decision],()=>0),scheduledDecisions:[decision]};
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 const before=structuredClone(life);assert.throws(()=>installOccupationQuotes(life,[]));assert.deepEqual(life,before);
});

for(const quoted of [false,true])test(`public job search preserves a queued ${quoted?'quoted':'legacy'} menu and its later acceptance`,()=>{
 let life=seeker();
 if(quoted)installOccupationQuotes(life,[{offer:terms,income:32000}]);else life=requestJobOffers(life);
 const decision=life.pendingDecision!,offers=structuredClone(life.jobOffers);life.pendingDecision=null;
 life.timeline={year:life.year,age:life.age,...planYearTimeline([],[decision],()=>0),scheduledDecisions:[decision]};
 life=decodeSave(encodeSave(life,[])).life!;
 const before=structuredClone(life),searched=requestJobOffers(life);
 assert.deepEqual(searched,before);
 const open=advanceTimeline(decodeSave(encodeSave(searched,[])).life!,1);
 assert.deepEqual(open.pendingDecision,decision);
 const accepted=makeChoice(open,'offer0');
 assert.equal(accepted.stats.job,offers[0].job);assert.equal(accepted.stats.annualIncome,offers[0].income);
 assert.deepEqual(decodeSave(encodeSave(accepted,[])).life,accepted);
});
