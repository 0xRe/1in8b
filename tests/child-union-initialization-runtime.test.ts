import test from 'node:test';
import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {addChildProgress} from '../src/game/descendants';
import {encodeSave,decodeSave} from '../src/game/storage';
test('newborn children receive a persistent union plan once through actual gameplay',()=>{
 const life=[...naturalFamily()].find(l=>l.family.children.length===1)!;
 const child=life.family.children[0],state=life.descendants.children[0];
 assert.ok(state.unionPlan,'birth must initialize the plan');
 assert.notEqual(state.unionPlan.orientation,'unknown');
 assert.equal(state.unionPlan.observedYear,child.birthYear);
 const before=structuredClone(life);
 addChildProgress(life,child);assert.deepEqual(life,before);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
});
test('automatic birth plans can reach observed cohabitation through public gameplay',()=>{
 let observed=false;
 for(let seed=1;seed<=80&&!observed;seed++)for(const life of naturalFamily(seed)){
  const state=life.descendants.children.find(c=>c.unionPlan?.cohabitationYear!=null);
  if(!state)continue;
  observed=true;
  const child=life.family.children.find(c=>c.id===state.childId)!;
  assert.ok(life.events.some(e=>e.key==='event.descendantCohabitation'&&e.params.name===child.name));
  assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
  break;
 }
 assert.ok(observed,'exercise a naturally assigned cohabitation plan, not an injected plan');
});
