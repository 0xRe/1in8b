import test from 'node:test';import assert from 'node:assert/strict';
import {studyWaitingFamily} from '../src/game/study-family';
import {naturalFamily} from './helpers/adult-family-simulation';
import {prepareStudyGraduation,studyGraduationDecision,resolveStudyGraduation} from '../src/game/study-graduation';
import {makeChoice} from '../src/game/engine';
import {decodeSave,encodeSave} from '../src/game/storage';
import {physicalEquipmentDecision,preparePhysicalEquipment} from '../src/game/physical-decisions';
function graduate(){
 const life=structuredClone([...naturalFamily(1)].find(l=>l.age>=30&&!l.pendingDecision&&l.timeline?.complete)!);
 life.academics={version:1,qualification:4,doctorate:false,medicine:false,studyCountry:'DEU',enrollment:null,lastGraduation:{stage:'university',age:life.age,country:'DEU'},overseasResidence:{country:'DEU',homeCountry:life.country.id,startedAge:life.age,level:'university',waitingFamily:studyWaitingFamily(life)}};
 life.relationship.partnerIncome=0;life.schooling.enrolled=false;life.stats.job='student';life.stats.employment='student';life.stats.annualIncome=0;
 assert.equal(prepareStudyGraduation(life,{freeExit:true,papersValid:true,shortageMajor:false,spouseFallbackEligible:false,warAt:()=>0}),true);
 life.pendingDecision=studyGraduationDecision(life);assert.ok(life.pendingDecision);return life;
}
test('study settlement refreshes queued equipment prices before choices or save restoration',()=>{
 for(const route of ['studyFinishStay','studyFinishThird']){
  const life=graduate();life.rng=7;
  life.physicalState={version:1,lastCheckedAge:life.age,condition:{kind:'hearing',since:0,source:'birth',wheelchair:false,noticeAt:1,recognizedAge:1,aid:false,childAid:{age:2,received:false}}};
  preparePhysicalEquipment(life);const aid=physicalEquipmentDecision(life)!;assert.ok(aid);
  life.timeline!.scheduledDecisions=[aid];life.timeline!.queue=[{kind:'decision',id:aid.id,at:1}];life.timeline!.position=.9;life.timeline!.complete=false;
  const done=makeChoice(life,route),current=physicalEquipmentDecision(done)!;
  assert.notEqual(done.country.id,life.country.id);assert.notEqual(current.choices[0].params.amount,aid.choices[0].params.amount);
  assert.deepEqual(done.timeline!.scheduledDecisions,[current]);
  assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);
  done.timeline!.scheduledDecisions=[];done.timeline!.queue=[];done.pendingDecision=current;
  assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);
  for(const choice of ['physicalAidGet','physicalAidDecline'])assert.notEqual(makeChoice(done,choice),done);
 }
});
test('public home choice resolves the overseas residence once and survives reload',()=>{
 const life=graduate(),before=life.rng;
 assert.ok(life.pendingDecision!.choices.some(c=>c.id==='studyFinishThird'));
 const done=makeChoice(decodeSave(encodeSave(life,[])).life!,'studyFinishHome');
 assert.equal(done.academics!.overseasResidence,undefined);assert.equal(done.academics!.studyGraduation!.outcome,'home');
 assert.equal(done.rng,before);assert.equal(done.stats.employment,'unemployed');
 assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);assert.deepEqual(makeChoice(done,'studyFinishHome'),done);
});
test('host graduate admission preserves the host and rejection attempts host employment immediately',()=>{
 const accepted=graduate();assert.equal(resolveStudyGraduation(accepted,'studyFinishGraduate',()=>0),'enrolled');
 assert.equal(accepted.academics!.studyCountry,'DEU');assert.equal(accepted.academics!.enrollment!.stage,'graduate');
 const rejected=graduate();let calls=0;const draws=[1,0];
 assert.equal(resolveStudyGraduation(rejected,'studyFinishGraduate',()=>draws[calls++]!),'workPermit');
 assert.equal(calls,2);assert.equal(rejected.country.id,'DEU');assert.equal(rejected.academics!.overseasResidence,undefined);
});
test('doctoral invitation takes priority and stale or forged choices consume nothing',()=>{
 const life=graduate();life.academics!.qualification=5;life.academics!.lastGraduation!.stage='graduate';life.academics!.studyGraduation!.stage='graduate';life.academics!.phdInvitation={age:life.age,offered:true};
 assert.equal(studyGraduationDecision(life),null);
 life.decisions.push(`academicPhd-${life.age}`);assert.ok(studyGraduationDecision(life));
 const stale=graduate();stale.justice.prisonUntil=stale.age+2;assert.equal(resolveStudyGraduation(stale,'studyFinishHome',()=>{throw Error('stale draw');}),null);
 const forged=graduate();forged.pendingDecision!.params.country='USA';assert.equal(resolveStudyGraduation(forged,'studyFinishStay',()=>{throw Error('forged draw');}),null);
});

test('public host and third-country choices perform one migration and keep valid receipts',()=>{
 for(const choice of ['studyFinishStay','studyFinishThird']){
  const life=graduate();life.rng=7;const target=choice==='studyFinishStay'?'DEU':life.academics!.studyGraduation!.third!.country;
  const done=makeChoice(decodeSave(encodeSave(life,[])).life!,choice);
  assert.equal(done.country.id,target);assert.equal(done.academics!.studyGraduation!.outcome,'workPermit');
  assert.equal(done.migration.moves.length,life.migration.moves.length+1);assert.equal(done.academics!.overseasResidence,undefined);
  assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);assert.deepEqual(makeChoice(done,choice),done);
 }
});
import {academicContinuationDecision} from '../src/game/academic-continuation';
test('declining a doctorate reveals settlement instead of starting a home-country job offer',()=>{
 const life=graduate();life.academics!.qualification=5;life.academics!.lastGraduation!.stage='graduate';life.academics!.studyGraduation!.stage='graduate';life.academics!.phdInvitation={age:life.age,offered:true};
 life.pendingDecision=academicContinuationDecision(life);assert.ok(life.pendingDecision);
 const done=makeChoice(decodeSave(encodeSave(life,[])).life!,'academicPhdWork');
 assert.equal(done.pendingDecision?.id,`studyGraduation-${life.age}`);
 assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);
 const home=makeChoice(done,'studyFinishHome');assert.equal(home.academics!.overseasResidence,undefined);
});
test('graduation snapshots reject invalid probabilities and fabricated settlement outcomes',()=>{
 for(const edit of ['probability','outcome','destination']){
  const life=graduate(),r=life.academics!.studyGraduation!;
  if(edit==='probability')r.hostProbability=2;
  if(edit==='outcome'){life.pendingDecision=null;r.outcome='workPermit';}
  if(edit==='destination')r.third!.country=r.homeCountry;
  assert.throws(()=>decodeSave(encodeSave(life,[])));
 }
});

test('spouse fallback rechecks the current partner after the graduation offer is saved',()=>{
 for(const change of ['none','citizenship','away','death','separated']){
  const life=graduate(),partner=life.family.partner!;
  assert.ok(partner?.alive);partner.citizenship='DEU';partner.country='DEU';life.family.married=true;
  life.academics!.studyGraduation!.spousePartnerId=partner.id;
  if(change==='citizenship')partner.citizenship='JPN';
  if(change==='away')partner.country=life.country.id;
  if(change==='death')partner.alive=false;
  if(change==='separated')life.family.married=false;
  let draws=0;
  const result=resolveStudyGraduation(life,'studyFinishStay',()=>++draws===1?.999:0);
  assert.equal(result,change==='none'?'spousePermit':'denied',change);
  assert.equal(draws,change==='none'?2:1,change);
 }
});
