import test from 'node:test';import assert from 'node:assert/strict';
import {childTravelPractice} from '../src/game/child-travel-practice';
const c={age:14,alive:true,away:false,level:2};
test('independent travel practice requires level two and ages14 through20, once',()=>{
 assert.equal(childTravelPractice(undefined,c,()=>.249),14);
 assert.equal(childTravelPractice(undefined,c,()=>.25),null);
 for(const patch of [{age:13},{age:21},{level:1},{level:3},{alive:false},{away:true}])assert.equal(childTravelPractice(undefined,{...c,...patch},()=>{throw Error('ineligible draw');}),null);
 assert.equal(childTravelPractice(14,{...c,age:15},()=>{throw Error('repeat');}),null);
});
test('natural child travel milestone survives reload and rejects invalid saved ages',async()=>{
 const {naturalFamily}=await import('./helpers/adult-family-simulation');
 const {encodeSave,decodeSave}=await import('../src/game/storage');let seen=false;
 for(const life of naturalFamily(135,6,'NGA')){
  assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
  const state=life.descendants.children.find(s=>s.travelPracticeAge!==undefined);if(!state)continue;
  assert.ok(life.events.some(e=>e.key==='event.childDevelopment.travelPractice'));
  const {childDevelopmentYear}=await import('../src/game/child-development-observation');
  const replay=structuredClone(life),before=replay.stats.happiness,events:string[]=[];
  childDevelopmentYear(replay,(key)=>events.push(key),()=>.99);
  assert.equal(replay.stats.happiness,before);assert.ok(!events.includes('travelPractice'));
  assert.deepEqual(replay.descendants.children.find(s=>s.childId===state.childId),state);
  const forged=structuredClone(life);forged.descendants.children.find(s=>s.childId===state.childId)!.travelPracticeAge=13;
  assert.throws(()=>decodeSave(encodeSave(forged,[])));seen=true;break;
 }
 assert.ok(seen,'normal family must reach travel practice');
});
