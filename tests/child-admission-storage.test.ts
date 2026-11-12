import {descendantDecision} from '../src/game/descendants';
import test from 'node:test';
import assert from 'node:assert/strict';
import {findFamilyCheckpoint} from './helpers/adult-family-simulation';
import {decodeSave,encodeSave} from '../src/game/storage';
import {makeChoice} from '../src/game/engine';
const checkpoint=()=>findFamilyCheckpoint(l=>!!l.pendingDecision?.id.startsWith('descendant-university-child-'));
const subject=(life:any)=>life.descendants.children.find((c:any)=>life.pendingDecision.id.endsWith(c.childId));
test('admission imports reject impossible attempted ages, unknown paths and contradictory funding state',()=>{
 const base=checkpoint();
 for(const record of [{attemptedAge:17,path:null},{attemptedAge:20,path:'pending'},{attemptedAge:18,path:'fake'},{attemptedAge:19,path:null},{attemptedAge:19,path:'pending'},{attemptedAge:18,path:'university'},{attemptedAge:18,path:'work'}]){
  const life=structuredClone(base);subject(life).admission=record;
  assert.throws(()=>decodeSave(encodeSave(life,[])),JSON.stringify(record));
 }
});
test('legacy university checkpoint remains unchanged and draws no family randomness during decode',()=>{
 const life=checkpoint();const state=subject(life);const child=life.family.children.find(c=>c.id===state.childId)!;
 delete state.admission;delete state.universityFunding;child.age=19;child.birthYear=life.year-19;for(const episode of life.healthcare.episodes)if(episode.patientId===child.id)episode.patientAge=life.birthYear+episode.startedAge-child.birthYear;state.education='secondary';state.employment='none';child.job='none';life.pendingDecision=descendantDecision(life,child,'university');
 const before=JSON.stringify(life);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 assert.equal(JSON.stringify(life),before);
 assert.equal(subject(life).admission,undefined);
});
test('observed admitted university path survives actual save codec after funding',()=>{
 const before=checkpoint();const id=subject(before).childId;
 const life=makeChoice(before,'fundUniversity');
 const state=life.descendants.children.find(c=>c.childId===id)!;
 assert.equal(state.admission?.path,'university');
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
});
