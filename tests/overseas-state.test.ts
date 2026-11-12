import test from 'node:test';import assert from 'node:assert/strict';
import {commitOverseasApplication} from '../src/game/overseas-state';
import {naturalFamily} from './helpers/adult-family-simulation';
function fixture(){
 const life=structuredClone([...naturalFamily(1)].find(l=>l.age>=30&&!l.pendingDecision&&(!l.timeline||l.timeline.complete))!);
 life.academics={version:1,qualification:3,doctorate:false,medicine:false,studyCountry:null,enrollment:null};
 Object.assign(life.academics,{overseasApplication:{age:life.age,year:life.year,homeCountry:life.country.id,level:'university',fullScholarship:false,selfFunded:false,options:[{country:'DEU',quotedCost:10000,languageMatches:false,admissionFactor:1,policyFactor:1,scholarshipProbability:0}],status:'pending'}});
 life.stats.knowledge=60;life.stats.incomeQuintile=3;life.stats.savings=1000;life.stats.debt=200;life.stats.netAssets=life.stats.savings+life.stats.investments+life.belongings.housingValue-life.stats.debt;return life;
}
test('accepted application atomically starts temporary study and charges once',()=>{
 const life=fixture();const origin=life.country.id,moves=structuredClone(life.migration.moves);let calls=0;
 const result=commitOverseasApplication(life,'DEU',()=>{calls++;return .01;});
 assert.equal(result?.outcome,'overseas');assert.equal(life.stats.savings,0);assert.equal(life.stats.debt,5200);
 assert.equal(life.academics!.enrollment!.completedYears,0);assert.equal(life.academics!.enrollment!.preparationYears,1);
 assert.equal(life.stats.employment,'student');assert.equal(life.country.id,origin);assert.deepEqual(life.migration.moves,moves);
 const before=structuredClone(life);assert.equal(commitOverseasApplication(life,'DEU',()=>{throw Error('repeated draw');}),null);assert.deepEqual(life,before);assert.equal(calls,2);
});
test('unoffered destination and stale application cannot spend money or draw',()=>{
 for(const stale of ['destination','age','prison']){
  const life=fixture();if(stale==='age')life.age++;if(stale==='prison')life.justice.prisonUntil=life.age+2;
  const before=structuredClone(life);assert.equal(commitOverseasApplication(life,stale==='destination'?'USA':'DEU',()=>{throw Error('stale draw');}),null);assert.deepEqual(life,before);
 }
});
import {encodeSave,decodeSave} from '../src/game/storage';
test('pending and resolved applications round-trip and malformed receipts are rejected',()=>{
 const pending=fixture();assert.deepEqual(decodeSave(encodeSave(pending,[])).life,pending);
 const life=fixture();commitOverseasApplication(life,'DEU',()=>.01);assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 for(const mutation of [(l:typeof life)=>{l.academics!.overseasApplication!.status='pending';},(l:typeof life)=>{l.academics!.overseasApplication!.receipt!.country='USA';},(l:typeof life)=>{l.academics!.overseasResidence!.country='BAD';},(l:typeof life)=>{l.academics!.overseasApplication!.options[0].quotedCost=-1;}]){
  const bad=structuredClone(life);mutation(bad);assert.throws(()=>decodeSave(encodeSave(bad,[])));
 }
});
test('legacy applicants near the knowledge ceiling remain exportable after admission',()=>{
 const life=fixture();delete life.learning;life.stats.knowledge=99;
 commitOverseasApplication(life,'DEU',()=>.01);
 assert.equal(life.stats.knowledge,100);assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
});
import {prepareOverseasApplication} from '../src/game/overseas-state';
test('preparation persists destinations and language-aware quotes without rerolling on resume',()=>{
 const life=fixture();delete life.academics!.overseasApplication;let calls=0;
 const eligible=[{country:'DEU',weight:10,admissionFactor:.85,policyFactor:1,scholarshipProbability:.06},{country:'USA',weight:20,admissionFactor:.85,policyFactor:.85,scholarshipProbability:0}];
 assert.equal(prepareOverseasApplication(life,eligible,{fullScholarship:false,selfFunded:false},()=>{calls++;return .01;}),true);
 const offered=structuredClone(life.academics!.overseasApplication!);assert.equal(offered.options.length,2);
 assert.equal(offered.options.find(o=>o.country==='DEU')!.languageMatches,false);
 assert.ok(offered.options.every(o=>o.quotedCost>0));assert.equal(calls,1);
 const restored=decodeSave(encodeSave(life,[])).life!;
 assert.equal(prepareOverseasApplication(restored,eligible,{fullScholarship:false,selfFunded:false},()=>{throw Error('rerolled');}),false);
 assert.deepEqual(restored.academics!.overseasApplication,offered);
});
import {eligibleStudyDestinations} from '../src/game/study-destinations';
import {getCountryById} from '../src/game/countries';
test('eligible destination rules flow into a resumable application and admission',()=>{
 const life=fixture();delete life.academics!.overseasApplication;
 const options=eligibleStudyDestinations({origin:life.migration.birthCountry.id,birthCountry:life.migration.birthCountry.id,year:life.year,muslim:false,warAt:id=>getCountryById(id)!.war});
 assert.equal(prepareOverseasApplication(life,options,{fullScholarship:false,selfFunded:false},()=>0),true);
 const restored=decodeSave(encodeSave(life,[])).life!;const choice=restored.academics!.overseasApplication!.options[0];
 assert.notEqual(choice.country,restored.country.id);assert.ok(choice.quotedCost>0);
 assert.equal(commitOverseasApplication(restored,choice.country,()=>0)?.outcome,'overseas');
 assert.equal(restored.academics!.studyCountry,choice.country);assert.deepEqual(decodeSave(encodeSave(restored,[])).life,restored);
});
import {returnFromOverseasStudy} from '../src/game/study-family';
test('departure records only the married partner and co-resident minor children',()=>{
 const life=fixture();assert.ok(life.family.partner?.alive);assert.equal(life.family.married,true);
 const expected=life.family.children.filter(c=>c.alive&&c.age<18&&life.descendants.children.find(s=>s.childId===c.id)?.residence==='home').map(c=>c.id);
 commitOverseasApplication(life,'DEU',()=>0);
 assert.deepEqual(life.academics!.overseasResidence!.waitingFamily,{partnerId:life.family.partner!.id,childIds:expected});
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 const independent=fixture();independent.descendants.children[0].residence='independent';
 commitOverseasApplication(independent,'DEU',()=>0);
 assert.ok(!independent.academics!.overseasResidence!.waitingFamily!.childIds.includes(independent.family.children[0].id));
});
test('return home clears temporary separation without overwriting changed family lives',()=>{
 const life=fixture();commitOverseasApplication(life,'DEU',()=>0);
 assert.equal(returnFromOverseasStudy(life),false);
 life.academics!.enrollment=null;life.schooling.enrolled=false;
 life.family.children[0].country='CAN';life.descendants.children[0].residence='independent';
 const family=structuredClone(life.family),moves=structuredClone(life.migration.moves);
 assert.equal(returnFromOverseasStudy(life),true);assert.equal(life.academics!.overseasResidence,undefined);
 assert.deepEqual(life.family,family);assert.deepEqual(life.migration.moves,moves);
 assert.equal(life.stats.employment,'unemployed');assert.equal(returnFromOverseasStudy(life),false);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
});
test('waiting-family saves reject duplicate and unrelated child identities',()=>{
 const life=fixture();commitOverseasApplication(life,'DEU',()=>0);
 for(const ids of [['unknown-child'],[life.family.children[0].id,life.family.children[0].id]]){
  const bad=structuredClone(life);bad.academics!.overseasResidence!.waitingFamily!.childIds=ids;
  assert.throws(()=>decodeSave(encodeSave(bad,[])));
 }
});
import {commitStudySettlement,resumeStudyPartnerWork} from '../src/game/study-settlement-runtime';
test('successful study settlement moves waiting dependents once and pauses partner earnings',()=>{
 const life=fixture();commitOverseasApplication(life,'DEU',()=>0);life.academics!.enrollment=null;life.academics!.qualification=4;life.academics!.lastGraduation={stage:'university',age:life.age,country:'DEU'};
 const moves=life.migration.moves.length;life.relationship.partnerIncome=10000;
 const result=commitStudySettlement(life,{choice:'stay',probability:1,spouseFallbackEligible:false},()=>0);
 assert.equal(result,'workPermit');assert.equal(life.country.id,'DEU');assert.equal(life.migration.moves.length,moves+1);assert.equal(life.relationship.partnerIncome,0);
 assert.equal(life.family.partner!.country,'DEU');assert.ok(life.family.children.every(c=>c.country==='DEU'));
 assert.equal(life.academics!.overseasResidence,undefined);assert.equal(life.academics!.studySettlement!.migrationPenalty,.05);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 assert.equal(commitStudySettlement(life,{choice:'stay',probability:1,spouseFallbackEligible:false},()=>{throw Error('repeat');}),null);
 const restored=decodeSave(encodeSave(life,[])).life!;assert.equal(resumeStudyPartnerWork(restored),false);
 restored.age++;assert.equal(resumeStudyPartnerWork(restored),true);assert.ok(restored.relationship.partnerIncome>0);assert.equal(resumeStudyPartnerWork(restored),false);
});
test('denied settlement returns home without a permanent move',()=>{
 const life=fixture();commitOverseasApplication(life,'DEU',()=>0);life.academics!.enrollment=null;life.academics!.qualification=4;life.academics!.lastGraduation={stage:'university',age:life.age,country:'DEU'};
 const home=life.country.id,moves=structuredClone(life.migration.moves);
 assert.equal(commitStudySettlement(life,{choice:'stay',probability:0,spouseFallbackEligible:false},()=>.9),'denied');
 assert.equal(life.country.id,home);assert.deepEqual(life.migration.moves,moves);assert.equal(life.academics!.overseasResidence,undefined);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
});
test('settlement save validation rejects fabricated success without a move and invalid wage suspension',()=>{
 const life=fixture();commitOverseasApplication(life,'DEU',()=>0);life.academics!.enrollment=null;life.academics!.qualification=4;life.academics!.lastGraduation={stage:'university',age:life.age,country:'DEU'};life.relationship.partnerIncome=10000;
 commitStudySettlement(life,{choice:'stay',probability:1,spouseFallbackEligible:false},()=>0);
 for(const mutate of [(l:typeof life)=>{l.migration.moves=[];},(l:typeof life)=>{l.academics!.studySettlement!.partnerLeave!.untilAge=l.age;},(l:typeof life)=>{l.academics!.studySettlement!.outcome='denied';}]){
  const bad=structuredClone(life);mutate(bad);assert.throws(()=>decodeSave(encodeSave(bad,[])));
 }
});
test('third-country settlement records its distinct penalty and excludes the origin destination',()=>{
 const life=fixture();commitOverseasApplication(life,'DEU',()=>0);life.academics!.enrollment=null;life.academics!.qualification=4;life.academics!.lastGraduation={stage:'university',age:life.age,country:'DEU'};
 const before=structuredClone(life);assert.equal(commitStudySettlement(life,{choice:'third',thirdCountry:life.country.id,probability:1,spouseFallbackEligible:false},()=>{throw Error('invalid route draw');}),null);assert.deepEqual(life,before);
 assert.equal(commitStudySettlement(life,{choice:'third',thirdCountry:'CAN',probability:1,spouseFallbackEligible:false},()=>0),'workPermit');
 assert.equal(life.country.id,'CAN');assert.equal(life.academics!.studySettlement!.migrationPenalty,.08);assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
});
test('a departed or deceased partner does not regain wages from the settlement timer',()=>{
 const life=fixture();commitOverseasApplication(life,'DEU',()=>0);life.academics!.enrollment=null;life.academics!.qualification=4;life.academics!.lastGraduation={stage:'university',age:life.age,country:'DEU'};life.relationship.partnerIncome=10000;
 commitStudySettlement(life,{choice:'stay',probability:1,spouseFallbackEligible:false},()=>0);life.age++;life.family.partner!.alive=false;
 assert.equal(resumeStudyPartnerWork(life),false);assert.equal(life.relationship.partnerIncome,0);assert.equal(life.academics!.studySettlement!.partnerLeave!.finished,true);
});

import {academicContinuationDecision,resolveAcademicContinuation} from '../src/game/academic-continuation';
test('continuing a host-country bachelor degree into graduate study keeps the study location',()=>{
 const life=fixture();commitOverseasApplication(life,'DEU',()=>0);
 life.academics!.enrollment=null;life.academics!.qualification=4;
 life.academics!.lastGraduation={stage:'university',age:life.age,country:'DEU'};
 life.pendingDecision=academicContinuationDecision(life);
 assert.equal(resolveAcademicContinuation(life,'academicGraduate',()=>0),'enrolled');
 assert.equal(life.academics!.studyCountry,'DEU');
 assert.equal(life.academics!.overseasResidence!.country,'DEU');
 assert.equal(life.academics!.enrollment!.stage,'graduate');
 assert.equal(decodeSave(encodeSave(life,[])).life!.academics!.studyCountry,'DEU');
});
test('a completed overseas doctorate can return home without a migration or another draw',()=>{
 const life=fixture();commitOverseasApplication(life,'DEU',()=>0);
 life.academics!.enrollment=null;life.academics!.qualification=5;life.academics!.doctorate=true;
 life.academics!.lastGraduation={stage:'phd',age:life.age,country:'DEU'};
 const home=life.country.id,moves=structuredClone(life.migration.moves);
 assert.equal(commitStudySettlement(life,{choice:'home',probability:0,spouseFallbackEligible:false},()=>{throw Error('home must not draw');}),'home');
 assert.equal(life.academics!.overseasResidence,undefined);assert.equal(life.country.id,home);
 assert.deepEqual(life.migration.moves,moves);assert.equal(life.stats.employment,'unemployed');
 assert.equal(decodeSave(encodeSave(life,[])).life!.academics!.studySettlement!.outcome,'home');
});

test('tuition debt overflow resolves safely and remains a readable save',()=>{
 const life=fixture();life.stats.debt=1e12;life.stats.savings=0;
 const result=commitOverseasApplication(life,'DEU',()=>.01);
 assert.equal(result?.outcome,'fundingUnavailable');assert.equal(life.academics!.enrollment,null);
 assert.equal(life.academics!.overseasResidence,undefined);assert.equal(life.stats.debt,1e12);
 assert.equal(life.stats.employment,'unemployed');
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 const before=structuredClone(life);assert.equal(commitOverseasApplication(life,'DEU',()=>{throw Error('duplicate draw');}),null);assert.deepEqual(life,before);
});
