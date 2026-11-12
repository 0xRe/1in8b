import test from 'node:test';
import assert from 'node:assert/strict';
import {findFamilyCheckpoint,naturalFamily} from './helpers/adult-family-simulation';
import {yearlyDescendants} from '../src/game/descendants';
import {decodeSave,encodeSave} from '../src/game/storage';
test('natural family years observe board willingness and preserve it on save and same-year replay',()=>{
 let found=false;
 for(let seed=1;seed<=8&&!found;seed++)for(const life of naturalFamily(seed)){
  const state=life.descendants.children.find(s=>(s as any).board);
  if(!state)continue;
  assert.ok(life.age<60);assert.notEqual(life.stats.employment,'retired');
  const restored=decodeSave(encodeSave(life,[])).life!;assert.deepEqual(restored,life);
  const before=structuredClone(restored.descendants);
  yearlyDescendants(restored,{event:()=>{throw Error('duplicate event');},name:()=> 'Test',mortality:()=>0});
  assert.deepEqual(restored.descendants,before);found=true;break;
 }
 assert.ok(found,'no board decision was observed');
});
test('save imports reject invalid board receipts without inventing them for old saves',()=>{
 const base=findFamilyCheckpoint(l=>l.descendants.children.some(s=>s.employment==='employed'&&l.family.children.some(c=>c.id===s.childId&&c.alive&&c.age>=20)));
 const state=base.descendants.children.find(s=>s.employment==='employed'&&base.family.children.some(c=>c.id===s.childId&&c.alive&&c.age>=20))!;
 const child=base.family.children.find(c=>c.id===state.childId)!;
 for(const board of [{year:base.year,willing:'yes'},{year:base.year+1,willing:true},{year:child.birthYear+19,willing:true}]){
  const bad=structuredClone(base);(bad.descendants.children.find(s=>s.childId===child.id) as any).board=board;
  assert.throws(()=>decodeSave(encodeSave(bad,[])));
 }
 for(const s of base.descendants.children)delete (s as any).board;
 assert.deepEqual(decodeSave(encodeSave(base,[])).life,base);
});
