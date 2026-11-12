import test from 'node:test';
import assert from 'node:assert/strict';
import {findFamilyCheckpoint} from './helpers/adult-family-simulation';
import {makeChoice} from '../src/game/engine';
import {decodeSave,encodeSave} from '../src/game/storage';
const checkpoint=()=>findFamilyCheckpoint(l=>!!l.pendingDecision?.id.startsWith('descendant-university-child-'));
test('natural funding offers full, half and self, settles half once and saves its receipt',()=>{
 const life=checkpoint();const id=life.pendingDecision!.id.slice('descendant-university-'.length);
 assert.deepEqual(life.pendingDecision!.choices.map(c=>c.id),['fundUniversity','shareUniversity','scholarshipWork']);
 const full=Number(life.pendingDecision!.choices[0].params.amount),half=Number(life.pendingDecision!.choices[1].params.amount);
 assert.ok(full>0);assert.ok(Math.abs(half-full/2)<=.01);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 const after=makeChoice(life,'shareUniversity');const state=after.descendants.children.find(c=>c.childId===id)!;
 assert.equal(state.studyFunding,'shared');assert.equal(state.education,'university');
 assert.equal((state as any).universityFunding.result.outcome,'shared');
 assert.ok(Math.abs(life.stats.savings-life.stats.debt-after.stats.savings+after.stats.debt-half)<=.02);
 const restored=decodeSave(encodeSave(after,[])).life!;
 assert.deepEqual(restored,after);assert.deepEqual(makeChoice(restored,'shareUniversity'),restored);
});
test('funding receipt imports reject forged costs, outcomes and repeated pending state',()=>{
 const life=checkpoint();const id=life.pendingDecision!.id.slice('descendant-university-'.length);
 const funded=makeChoice(life,'shareUniversity');
 for(const mutate of [
  (s:any)=>s.universityFunding.packageCost=-1,
  (s:any)=>s.universityFunding.result.cost+=1,
  (s:any)=>s.universityFunding.result.outcome='hacked',
  (s:any)=>s.universityFunding.result.happiness=100,
  (s:any)=>delete s.universityFunding.result,
 ]){const bad=structuredClone(funded);mutate(bad.descendants.children.find(c=>c.childId===id));assert.throws(()=>decodeSave(encodeSave(bad,[])));}
});

import {yearlyDescendants} from '../src/game/descendants';
test('settled self funding is not rerolled as an annual fee dropout',()=>{
 const before=checkpoint();before.descendants.rng=1;
 const id=before.pendingDecision!.id.slice('descendant-university-'.length);
 const life=makeChoice(before,'scholarshipWork');
 const state=life.descendants.children.find(c=>c.childId===id)!;
 assert.equal(state.universityFunding?.result?.outcome,'self');
 const child=life.family.children.find(c=>c.id===id)!;
 const receipt=structuredClone(state.universityFunding);
 const events:string[]=[];
 while(child.age<22){
  life.year++;life.age++;for(const person of life.family.children)if(person.alive)person.age++;
  yearlyDescendants(life,{event:(_l,key)=>events.push(key),name:()=> 'Test',mortality:()=>0});
 }
 assert.deepEqual(state.universityFunding,receipt);
 assert.equal(events.includes('event.descendantDropout'),false);
 assert.equal(state.education,'university');
});
