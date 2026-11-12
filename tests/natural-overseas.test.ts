import {ENGINE_MESSAGES} from '../src/game/messages';
import test from 'node:test';import assert from 'node:assert/strict';
import {createNewGame} from '../src/game/new-game';
import {DEFAULT_SETTINGS,makeChoice,advanceTimeline} from '../src/game/engine';
import {familyChoice} from './helpers/adult-family-simulation';
import {decodeSave,encodeSave} from '../src/game/storage';
function applicant(){let life=createNewGame({...DEFAULT_SETTINGS,country:'JPN',gentler:true,dailyThemeDay:'2026-10-20'},1);for(let i=0;i<200&&life.alive&&life.pendingDecision?.id!=='college-18';i++)life=familyChoice(life);assert.equal(life.pendingDecision?.id,'college-18');return life;}
test('normal new-game graduation offers overseas study and queues persistent destinations',()=>{
 const life=applicant();for(const c of life.pendingDecision!.choices)assert.ok(ENGINE_MESSAGES[c.key as keyof typeof ENGINE_MESSAGES],`missing English label: ${c.key}`);assert.ok(life.pendingDecision!.choices.some(c=>c.id==='collegeAbroad'));
 let next=makeChoice(decodeSave(encodeSave(life,[])).life!,'collegeAbroad');
 assert.equal(next.academics!.college!.status,'abroad');assert.equal(next.academics!.overseasApplication!.status,'pending');
 next=decodeSave(encodeSave(next,[])).life!;
 for(let i=0;i<25&&!next.pendingDecision;i++)next=advanceTimeline(next,1);
 assert.equal(next.pendingDecision?.id,'studyDestination-18');
 const home=makeChoice(next,'studyHome');assert.equal(home.academics!.overseasApplication!.domesticFallback,'pending');
 assert.deepEqual(decodeSave(encodeSave(home,[])).life,home);
});

function overseasGraduate(seed:number){
 let life=createNewGame({...DEFAULT_SETTINGS,country:'JPN',gentler:true,dailyThemeDay:'2026-10-20'},seed);
 for(let step=0;step<900&&life.alive&&life.age<35;step++){
  const d=life.pendingDecision;
  if(d?.id.startsWith('studyGraduation-'))return life;
  if(d?.choices.some(c=>c.id==='collegeAbroad'))life=makeChoice(life,'collegeAbroad');
  else if(d?.id.startsWith('studyDestination-'))life=makeChoice(life,'studyDestination0');
  else life=familyChoice(life);
  if(life.pendingDecision)life=decodeSave(encodeSave(life,[])).life!;
 }
 assert.fail(`seed ${seed} did not reach overseas graduation`);
}
test('a naturally admitted overseas student completes the course and receives all applicable graduation choices',()=>{
 const life=overseasGraduate(9);
 assert.equal(life.academics!.overseasApplication!.receipt!.result.outcome,'overseas');
 assert.equal(life.academics!.lastGraduation!.stage,'university');assert.equal(life.academics!.lastGraduation!.country,life.academics!.overseasResidence!.country);
 assert.deepEqual(life.pendingDecision!.choices.map(c=>c.id),['studyFinishStay','studyFinishHome','studyFinishGraduate','studyFinishThird']);
 for(const choice of life.pendingDecision!.choices){
  const done=makeChoice(life,choice.id);assert.ok(done.decisions.includes(life.pendingDecision!.id));assert.equal(done.pendingDecision,null);
  assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);
  if(done.academics!.enrollment)assert.equal(done.academics!.studyCountry,life.academics!.studyCountry);
  else assert.equal(done.academics!.overseasResidence,undefined);
 }
});

test('a natural postgraduate withdrawal returns home and remains readable',()=>{
 let life=createNewGame({...DEFAULT_SETTINGS,country:'JPN',gentler:true,dailyThemeDay:'2026-10-20'},32); // Verified after combining named-sport discovery with major selection.
 for(let i=0;i<900&&life.alive&&life.age<30&&!life.events.some(e=>e.key==='event.studyWithdrawalReturn');i++){
  const d=life.pendingDecision;
  if(d?.choices.some(c=>c.id==='collegeAbroad'))life=makeChoice(life,'collegeAbroad');
  else if(d?.id.startsWith('studyDestination-'))life=makeChoice(life,'studyDestination0');
  else if(d?.choices.some(c=>c.id==='studyFinishGraduate'))life=makeChoice(life,'studyFinishGraduate');
  else life=familyChoice(life);
 }
 assert.equal(life.academics!.overseasApplication!.receipt!.result.outcome,'overseas');
 assert.ok(life.academics!.lastWithdrawal);assert.equal(life.academics!.lastWithdrawal!.stage,'graduate');assert.equal(life.academics!.overseasResidence,undefined);
 assert.equal(life.country.id,'JPN');assert.equal(life.events.filter(e=>e.key==='event.studyWithdrawalReturn').length,1);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
});
