import test from 'node:test';
import assert from 'node:assert/strict';
import {naturalFamily,familyChoice} from './helpers/adult-family-simulation';
import {decodeSave,encodeSave} from '../src/game/storage';
test('ordinary lives can sentence and release a child with deterministic save continuity',()=>{
 let found=false,released=false;
 for(let seed=1;seed<=80&&!released;seed++)for(const life of naturalFamily(seed,6,'USA')){
  const sentenced=life.descendants.children.filter(c=>c.prison);
  if(!sentenced.length)continue;
  found=true;
  assert.ok(sentenced.length<=2);
  const restored=decodeSave(encodeSave(life,[])).life!;
  assert.deepEqual(restored,life);
  assert.deepEqual(familyChoice(restored),familyChoice(life));
  for(const state of sentenced){
   const child=life.family.children.find(c=>c.id===state.childId)!;
   assert.ok(state.prison!.startYear-child.birthYear>=18);
   if(state.prison!.releasedYear!==null){released=true;assert.equal(state.prison!.releasedYear,state.prison!.endYear)}
  }
 }
 assert.ok(found,'natural annual trigger must occur without injected prison records');
 assert.ok(released,'at least one naturally sentenced child must reach release');
});
