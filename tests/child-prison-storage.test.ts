import test from 'node:test';
import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {encodeSave,decodeSave} from '../src/game/storage';
const fixture = [...naturalFamily(1)].find(l=>!l.pendingDecision && l.family.children.some(c=>c.alive && c.age===25))!;
assert.ok(fixture);
const childIndex=fixture.family.children.findIndex(c=>c.alive&&c.age===25);
function withSentence() {
 const life=structuredClone(fixture);
 const child=life.family.children[childIndex];
 const state=life.descendants.children.find(s=>s.childId===child.id)!;
 Object.assign(state,{prison:{startYear:life.year-2,endYear:life.year+1,releasedYear:null}});
 return {life,child,state:state as typeof state & {prison:{startYear:number;endYear:number;releasedYear:number|null}}};
}
test('child sentence history roundtrips without inventing legacy state',()=>{
 const {life}=withSentence();
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 assert.deepEqual(decodeSave(encodeSave(fixture,[])).life,fixture);
});
test('child prison import rejects impossible sentencing and release chronology',()=>{
 for(const mutate of [
  (x:ReturnType<typeof withSentence>)=>{x.state.prison.startYear=x.life.year+1},
  (x:ReturnType<typeof withSentence>)=>{x.state.prison.startYear=x.child.birthYear+17;x.state.prison.endYear=x.state.prison.startYear+1},
  (x:ReturnType<typeof withSentence>)=>{x.state.prison.endYear=x.state.prison.startYear+5},
  (x:ReturnType<typeof withSentence>)=>{x.state.prison.releasedYear=x.state.prison.endYear},
  (x:ReturnType<typeof withSentence>)=>{x.state.prison.releasedYear=x.life.year},
  (x:ReturnType<typeof withSentence>)=>{x.state.prison.startYear=NaN},
 ]) {const x=withSentence();mutate(x);assert.throws(()=>encodeSave(x.life,[]));}
});
test('released history stays valid after release but not before the sentence ended',()=>{
 const {life,state}=withSentence();
 state.prison.endYear=life.year;state.prison.releasedYear=life.year;
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 state.prison.releasedYear=life.year-1;
 assert.throws(()=>encodeSave(life,[]));
});
test('sentence history rejects release after death',()=>{
 const x=withSentence();
 x.child.alive=false;x.child.deathAge=x.child.age-1;x.child.age=x.child.deathAge;
 x.state.prison.endYear=x.life.year;x.state.prison.releasedYear=x.life.year;
 assert.throws(()=>encodeSave(x.life,[]));
});
test('custody-adjusted university completion survives save beyond the ordinary four-year bound',()=>{
 const life=[...naturalFamily(1)].find(l=>!l.pendingDecision&&l.family.children.some(c=>c.alive&&c.age===19))!;
 assert.ok(life);
 const child=life.family.children.find(c=>c.alive&&c.age===19)!;
 const state=life.descendants.children.find(c=>c.childId===child.id)!;
 state.prison={startYear:life.year,endYear:life.year+2,releasedYear:null};
 state.education='university';state.studyFunding='parent';state.studyUntil=child.birthYear+25;
 state.employment='student';state.income=0;child.job='student';
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 state.studyUntil++;
 assert.throws(()=>encodeSave(life,[]));
});
