import test from 'node:test';
import assert from 'node:assert/strict';
import {naturalFamily,familyChoice} from './helpers/adult-family-simulation';
import {decodeSave,encodeSave} from '../src/game/storage';
test('legacy children enter forward-only plans on annual progress, never during import',()=>{
 const observed=[...naturalFamily(1)].find(l=>l.age===60&&!l.pendingDecision&&(!l.timeline||l.timeline.complete))!;
 assert.ok(observed);
 for(const state of observed.descendants.children)delete state.unionPlan;
 // This fixture has no cohabiting births requiring an already observed union plan.
 assert.ok(observed.descendants.grandchildren.every(g=>g.origin?.union!=='cohabiting'));
 const restored=decodeSave(encodeSave(observed,[])).life!;
 assert.deepEqual(restored,observed);
 assert.ok(restored.descendants.children.every(c=>!c.unionPlan));
 const births=structuredClone(restored.descendants.grandchildren);
 let life=familyChoice(restored);
 for(let step=0;step<30&&life.year===restored.year;step++)life=familyChoice(life);
 assert.ok(life.year>restored.year);
 const plans=new Map<string,unknown>();
 for(const state of life.descendants.children){
  const child=life.family.children.find(c=>c.id===state.childId)!;
  if(!child.alive){assert.equal(state.unionPlan,undefined);continue;}
  assert.ok(state.unionPlan,'living legacy child gains a forward plan');
  assert.equal(state.unionPlan.observedYear,life.year);
  assert.equal(state.unionPlan.orientation,'unknown');
  assert.equal(state.unionPlan.sameSexPartner,state.spouse?state.spouse.sex===child.sex:null);
  assert.equal(state.unionPlan.cohabitationYear,null);
  assert.equal(state.unionPlan.cohabitationAge,null);
  if(child.age>=18)assert.ok(state.unionPlan.fertilityTarget!>=births.filter(g=>g.parentId===child.id).length);
  plans.set(child.id,structuredClone(state.unionPlan));
 }
 assert.ok(plans.size>0);
 for(const baby of births){
  const current=life.descendants.grandchildren.find(g=>g.id===baby.id)!;
  assert.deepEqual(current.origin,baby.origin);
  assert.equal(current.birthYear,baby.birthYear);
 }
 life=decodeSave(encodeSave(life,[])).life!;
 const reloaded=structuredClone(life);
 const run=(start:typeof life)=>{let l=start;for(let i=0;i<40&&l.alive&&l.age<65;i++)l=decodeSave(encodeSave(familyChoice(l),[])).life!;return l;};
 const after=run(life);
 assert.deepEqual(after,run(reloaded));
 for(const [id,plan] of plans)assert.deepEqual(after.descendants.children.find(c=>c.childId===id)!.unionPlan,plan);
});
