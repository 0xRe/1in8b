import {descendantDecision} from '../src/game/descendants';
import test from 'node:test';
import assert from 'node:assert/strict';
import {universityMarriageAge} from '../src/game/child-union';
const draws=(...values:number[])=>()=>{assert.ok(values.length,'unexpected draw');return values.shift()!;};
test('university marriage deferral preserves absent, married and distant plans without draws',()=>{
 assert.equal(universityMarriageAge(null,19,false,draws()),null);
 assert.equal(universityMarriageAge(22,19,true,draws()),22);
 assert.equal(universityMarriageAge(24,19,false,draws()),24);
});
test('near wedding plans retain the ten percent exception and otherwise defer to age23 through27',()=>{
 assert.equal(universityMarriageAge(20,19,false,draws(.09)),20);
 assert.equal(universityMarriageAge(20,19,false,draws(.1,0)),23);
 assert.equal(universityMarriageAge(20,19,false,draws(.9,.99)),27);
 assert.equal(universityMarriageAge(26,23,false,draws(.9,0)),26);
});

import {findFamilyCheckpoint} from './helpers/adult-family-simulation';
import {makeChoice} from '../src/game/engine';
import {encodeSave,decodeSave} from '../src/game/storage';
test('accepted child university defers a near wedding once and keeps the result after restore',()=>{
 const life=findFamilyCheckpoint(l=>!!l.pendingDecision?.id.startsWith('descendant-university-child-'));
 const id=life.pendingDecision!.id.slice('descendant-university-'.length);
 const state=life.descendants.children.find(c=>c.childId===id)!;state.weddingAt=20;
 const child=life.family.children.find(c=>c.id===id)!;
 delete state.admission;delete state.universityFunding;child.age=19;child.birthYear=life.year-19;for(const episode of life.healthcare.episodes)if(episode.patientId===child.id)episode.patientAge=life.birthYear+episode.startedAge-child.birthYear;state.education='secondary';state.employment='none';child.job='none';life.pendingDecision=descendantDecision(life,child,'university');
 // Select a deterministic family RNG whose first draw is outside the ten-percent exception.
 life.descendants.rng=1;
 const result=makeChoice(life,'fundUniversity');
 const after=result.descendants.children.find(c=>c.childId===id)!;
 assert.ok(after.weddingAt!==null&&after.weddingAt>=23);
 assert.equal(after.education,'university');
 const restored=decodeSave(encodeSave(result,[])).life!;
 assert.equal(restored.descendants.children.find(c=>c.childId===id)!.weddingAt,after.weddingAt);
 assert.deepEqual(makeChoice(restored,'fundUniversity'),restored);
});
