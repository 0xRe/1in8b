import test from 'node:test';import assert from 'node:assert/strict';
import {createNewGame} from '../src/game/new-game';import {DEFAULT_SETTINGS,makeChoice,advanceTimeline} from '../src/game/engine';
import {familyChoice} from './helpers/adult-family-simulation';import {decodeSave,encodeSave} from '../src/game/storage';
import {prepareUniversityMajor,universityMajorDecision,universityInternet} from '../src/game/university-major-runtime';
import {getCountryById} from '../src/game/countries';import {translator} from '../src/lib/i18n';
function applicant(){let life=createNewGame({...DEFAULT_SETTINGS,country:'JPN',gentler:true,dailyThemeDay:'2026-10-20'},1);for(let i=0;i<200&&life.pendingDecision?.id!=='college-18'&&life.alive;i++)life=familyChoice(life);assert.equal(life.pendingDecision?.id,'college-18');return life;}
function admitted(){let life=makeChoice(applicant(),'collegeApply');assert.equal(life.academics!.enrollment?.stage,'university');for(let i=0;i<30&&!life.pendingDecision;i++)life=advanceTimeline(life,1);assert.ok(life.pendingDecision?.id.startsWith('universityMajor-'));return life;}
test('natural domestic admission queues a persistent major offer resolved through public gameplay',()=>{
 const life=admitted(),restored=decodeSave(encodeSave(life,[])).life!;assert.deepEqual(restored,life);
 assert.equal(prepareUniversityMajor(restored,()=>{throw Error('rerolled');}),false);
 const choice=life.pendingDecision!.choices[0];const done=makeChoice(restored,choice.id);
 assert.equal(done.academics!.majorRecord!.status,'resolved');assert.ok(done.academics!.major);assert.equal(done.academics!.medicine,done.academics!.major==='med');
 assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);assert.deepEqual(makeChoice(done,choice.id),done);
 const event=done.events.find(e=>e.key.startsWith('event.major.'))!;assert.ok(event);assert.ok(translator('en')(event.key,event.params).includes(translator('en')(`major.${done.academics!.major}`)));
});
test('a queued major cannot act in custody or after school withdrawal and forged offers are rejected',()=>{
 const life=admitted();const jailed=structuredClone(life);jailed.justice.prisonUntil=jailed.age+1;
 const done=makeChoice(jailed,life.pendingDecision!.choices[0].id);assert.equal(done.rng,jailed.rng);assert.equal(done.academics!.major,undefined);
 const left=structuredClone(life);left.academics!.enrollment=null;assert.equal(universityMajorDecision(left),null);
 const bad=structuredClone(life);bad.pendingDecision!.choices[0].key='choice.fake';assert.throws(()=>decodeSave(encodeSave(bad,[])));
});
test('US and Canadian entry defers selection to annual scheduling while academies never offer it',()=>{
 for(const country of ['USA','CAN']){const life=admitted();life.country=structuredClone(getCountryById(country)!);delete life.academics!.majorRecord;life.pendingDecision=null;
  assert.equal(prepareUniversityMajor(life,()=>{throw Error('early draw');},true),false);assert.equal(prepareUniversityMajor(life,()=>.1),true);
 }
 const life=admitted();delete life.academics!.majorRecord;life.academics!.academy={branch:'army',startedAge:life.age,major:'mil'};
 assert.equal(prepareUniversityMajor(life,()=>{throw Error('academy draw');}),false);
});
test('internet eligibility follows observed historical diffusion and future saturation',()=>{
 const japan=getCountryById('JPN')!;assert.equal(universityInternet(japan,'past',1990),0);assert.equal(universityInternet(japan,'today',2026),japan.net);
 assert.ok(universityInternet(japan,'past',1995)<40);assert.ok(universityInternet(japan,'future',2080)>=90);
 const korea=getCountryById('PRK')!;assert.equal(universityInternet(korea,'future',2080),korea.net);
});

test('medicine selection drives the existing longer course duration and survives reload',async()=>{
 const {schoolDuration}=await import('../src/game/school-model');
 const life=admitted();delete life.academics!.majorRecord;life.stats.knowledge=100;
 assert.equal(prepareUniversityMajor(life,()=>0),true);life.pendingDecision=universityMajorDecision(life);
 assert.ok(life.pendingDecision!.choices.some(c=>c.id==='major_med'));
 const done=makeChoice(life,'major_med');assert.equal(done.academics!.medicine,true);
 assert.equal(schoolDuration(done.academics!.enrollment!.stage,done.country.id,done.academics!.medicine),6);
 assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);
});
test('major receipts reject forged choices, unknown majors and inconsistent effects',()=>{
 const done=makeChoice(admitted(),'major_eng');
 // Use the actual offered choice when engineering is not in this seed's offer.
 const life=done.academics!.major?done:makeChoice(done,done.pendingDecision!.choices[0].id);
 for(const mutation of [
  (l:typeof life)=>{l.academics!.majorRecord!.choice='mil';},
  (l:typeof life)=>{l.academics!.majorRecord!.result!.happiness=99;},
  (l:typeof life)=>{l.academics!.majorRecord!.offer.options[1]=l.academics!.majorRecord!.offer.options[0];},
  (l:typeof life)=>{l.academics!.medicine=!l.academics!.medicine;},
 ]){const bad=structuredClone(life);mutation(bad);assert.throws(()=>decodeSave(encodeSave(bad,[])));}
});

test('competitive rejection receipts cannot turn an open major into medicine',()=>{
 const life=makeChoice(admitted(),'major_hosp');assert.equal(life.academics!.major,'hosp');
 life.academics!.majorRecord!.result={major:'med',outcome:'competitiveRejected',knowledge:2,happiness:-3};
 life.academics!.major='med';life.academics!.medicine=true;
 assert.throws(()=>decodeSave(encodeSave(life,[])));
});
