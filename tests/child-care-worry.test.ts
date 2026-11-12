import test from 'node:test';import assert from 'node:assert/strict';
import {childCareWorry} from '../src/game/child-care-worry';
const c={parentAge:55,childAge:18,alive:true,level:2,staying:true,away:false,planned:false,year:2081};
test('care worry starts at55 with an adult higher-support child and15 percent chance',()=>{
 assert.equal(childCareWorry(undefined,c,()=>.149),2081);assert.equal(childCareWorry(undefined,c,()=>.15),null);
 for(const patch of [{parentAge:54},{childAge:17},{alive:false},{level:1},{staying:false},{away:true},{planned:true}])assert.equal(childCareWorry(undefined,{...c,...patch},()=>{throw Error('ineligible draw');}),null);
});
test('a recorded worry never repeats even when later planning is lost',()=>{
 assert.equal(childCareWorry(2080,c,()=>{throw Error('repeat');}),null);
});
test('natural care concern is saved once before planning and rejects pre55 history',async()=>{
 const {naturalFamily}=await import('./helpers/adult-family-simulation');const {encodeSave,decodeSave}=await import('../src/game/storage');
 let seen=false;const recorded=new Map<string,number>();
 for(const life of naturalFamily(66,6,'NGA')){
  assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
  const state=life.descendants.children.find(s=>s.careWorryYear!==undefined);if(!state)continue;
  assert.ok(life.events.some(e=>e.key==='event.childDevelopment.careWorry'));
  if(recorded.has(state.childId))assert.equal(state.careWorryYear,recorded.get(state.childId));else recorded.set(state.childId,state.careWorryYear!);
  const {childCarePlanYear}=await import('../src/game/child-care-plan');
  const replay=structuredClone(life),events:string[]=[];childCarePlanYear(replay,key=>events.push(key),()=>.99);
  assert.ok(!events.includes('careWorry'));assert.equal(replay.stats.happiness,life.stats.happiness);

  const bad=structuredClone(life);bad.descendants.children.find(s=>s.childId===state.childId)!.careWorryYear=life.birthYear+54;
  assert.throws(()=>decodeSave(encodeSave(bad,[])));seen=true;
 }
 assert.ok(seen,'natural family must reach concern');
});

test('parent imprisonment blocks care planning but not the independent concern event',async()=>{
 const {naturalFamily}=await import('./helpers/adult-family-simulation');
 const {childCarePlanYear}=await import('../src/game/child-care-plan');
 for(const natural of naturalFamily(66,6,'NGA')){
  const recorded=natural.descendants.children.find(s=>s.careWorryYear!==undefined);if(!recorded)continue;
  // Controlled branch fixture: preserve the natural family, clear only the event receipt,
  // then exercise the source's separate prison guard with deterministic draws.
  const life=structuredClone(natural),state=life.descendants.children.find(s=>s.childId===recorded.childId)!;
  delete state.careWorryYear;delete state.carePlan;life.justice.prisonUntil=life.year+2;
  const happiness=life.stats.happiness,events:string[]=[];
  childCarePlanYear(life,key=>events.push(key),()=>0);
  assert.equal(state.careWorryYear,life.year);assert.equal(state.carePlan,undefined);
  assert.ok(events.includes('careWorry'));assert.ok(!events.some(key=>key.startsWith('carePlan.')));
  assert.equal(life.stats.happiness,happiness);
  events.length=0;childCarePlanYear(life,key=>events.push(key),()=>0);
  assert.ok(!events.includes('careWorry'));return;
 }
 assert.fail('missing natural care-concern fixture');
});
