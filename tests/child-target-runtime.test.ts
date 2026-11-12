import test from 'node:test';
import assert from 'node:assert/strict';
import {naturalFamily,familyChoice} from './helpers/adult-family-simulation';
import {decodeSave,encodeSave} from '../src/game/storage';
const base=[...naturalFamily(1)].find(l=>l.age===60&&!l.pendingDecision)!;
test('persisted completed child targets prevent further births and keep annual saves valid',()=>{
 let life=structuredClone(base); assert.ok(life);
 const counts=new Map(life.family.children.map(c=>[c.id,life.descendants.grandchildren.filter(g=>g.parentId===c.id).length]));
 for(const state of life.descendants.children){
  const child=life.family.children.find(c=>c.id===state.childId)!;
  if(child.age<18)continue;
  state.unionPlan={version:1,observedYear:life.year,orientation:'unknown',sameSexPartner:state.spouse?state.spouse.sex===child.sex:null,cohabitationAge:null,cohabitationYear:null,fertilityTarget:counts.get(child.id)!};
 }
 const guarded=life.descendants.children.filter(s=>s.unionPlan).map(s=>s.childId);
 assert.ok(guarded.length>=2);
 life=decodeSave(encodeSave(life,[])).life!;
 for(let step=0;step<200&&life.alive&&life.age<80;step++){
  life=familyChoice(life);
  for(const id of guarded)assert.equal(life.descendants.grandchildren.filter(g=>g.parentId===id).length,counts.get(id),'saved fertility target must be honored');
  life=decodeSave(encodeSave(life,[])).life!;
 }
 assert.ok(!life.alive||life.age>=80);
});
