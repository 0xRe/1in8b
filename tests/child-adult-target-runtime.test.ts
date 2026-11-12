import test from 'node:test';
import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {encodeSave,decodeSave} from '../src/game/storage';
test('new children draw an adult target once and retain it throughout their saved life',()=>{
 const targets=new Map<string,number>();let minors=0,adults=0;
 for(const life of naturalFamily()){
  for(const child of life.family.children){
   const plan=life.descendants.children.find(s=>s.childId===child.id)!.unionPlan!;
   if(child.age<18){assert.equal(plan.fertilityTarget,null);minors++;continue;}
   if(!child.alive&&!targets.has(child.id))continue;
   assert.notEqual(plan.fertilityTarget,null,'an observed adult must receive a target');adults++;
   if(targets.has(child.id))assert.equal(plan.fertilityTarget,targets.get(child.id));else targets.set(child.id,plan.fertilityTarget!);
   assert.ok(life.descendants.grandchildren.filter(g=>g.parentId===child.id).length<=plan.fertilityTarget!);
  }
  assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 }
 assert.ok(minors>0&&adults>0&&targets.size>=2);
});
