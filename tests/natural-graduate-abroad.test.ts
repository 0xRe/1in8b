import test from 'node:test';import assert from 'node:assert/strict';
import {createNewGame} from '../src/game/new-game';import {DEFAULT_SETTINGS,makeChoice,advanceTimeline} from '../src/game/engine';
import {familyChoice} from './helpers/adult-family-simulation';import {decodeSave,encodeSave} from '../src/game/storage';
function graduate(seed=1){let life=createNewGame({...DEFAULT_SETTINGS,country:'JPN',gentler:true,dailyThemeDay:'2026-10-20'},seed);for(let i=0;i<600&&life.alive&&life.age<35&&!life.pendingDecision?.id.startsWith('academicAfterUniversity-');i++)life=familyChoice(life);assert.ok(life.pendingDecision?.id.startsWith('academicAfterUniversity-'));return life;}
test('a natural domestic bachelor graduate can queue an overseas graduate application',()=>{
 const life=graduate();assert.ok(life.pendingDecision!.choices.some(c=>c.id==='academicGraduateAbroad'));
 let next=makeChoice(decodeSave(encodeSave(life,[])).life!,'academicGraduateAbroad');
 assert.equal(next.academics!.overseasApplication!.level,'graduate');assert.equal(next.academics!.overseasApplication!.status,'pending');
 next=decodeSave(encodeSave(next,[])).life!;
 for(let i=0;i<30&&!next.pendingDecision;i++)next=advanceTimeline(next,1);
 assert.equal(next.pendingDecision?.id,`studyDestination-${life.age}`);
 next=makeChoice(next,'studyHome');assert.equal(next.academics!.overseasApplication!.status,'cancelled');assert.ok(['enrolled','rejected'].includes(next.academics!.overseasApplication!.domesticFallback!));
 assert.deepEqual(decodeSave(encodeSave(next,[])).life,next);
});

test('older domestic-only graduation menus gain the overseas option on load',()=>{
 const life=graduate();
 life.pendingDecision!.choices=life.pendingDecision!.choices.filter(c=>c.id!=='academicGraduateAbroad');
 const restored=decodeSave(encodeSave(life,[])).life!;
 assert.ok(restored);
 assert.equal(restored.pendingDecision!.choices.filter(c=>c.id==='academicGraduateAbroad').length,1);
 assert.deepEqual(decodeSave(encodeSave(restored,[])).life,restored);
});

test('natural graduate destination decisions resolve once and survive a save round trip',()=>{
 const life=graduate(2);
 let offered=makeChoice(life,'academicGraduateAbroad');
 for(let i=0;i<30&&!offered.pendingDecision;i++)offered=advanceTimeline(offered,1);
 assert.ok(offered.pendingDecision?.id.startsWith('studyDestination-'));
 let admitted=0;
 for(const choice of offered.pendingDecision!.choices.filter(c=>c.id.startsWith('studyDestination'))){
  const next=makeChoice(decodeSave(encodeSave(offered,[])).life!,choice.id);
  const record=next.academics!.overseasApplication!;
  assert.equal(record.status,'resolved');
  assert.ok(record.receipt);
  if(record.receipt.result.outcome==='overseas'){
   admitted++;
   assert.equal(next.academics!.enrollment!.stage,'graduate');
   assert.equal(next.academics!.overseasResidence!.country,record.receipt.country);
   assert.equal(next.country.id,'JPN');
  }
  assert.deepEqual(decodeSave(encodeSave(next,[])).life,next);
  assert.deepEqual(makeChoice(next,choice.id),next);
 }
 assert.ok(admitted>0,'natural checkpoint should exercise overseas graduate admission');
});
