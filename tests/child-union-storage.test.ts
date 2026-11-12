import test from 'node:test';
import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {decodeSave,encodeSave} from '../src/game/storage';
const observed=[...naturalFamily()].find(l=>l.family.children.some(c=>c.alive&&c.age>=30))!;
function fixture(){
 const life=structuredClone(observed);const child=life.family.children.find(c=>c.alive&&c.age>=30)!;
 const state=life.descendants.children.find(c=>c.childId===child.id)!;
 Object.assign(state,{unionPlan:{version:1,observedYear:life.year,orientation:'unknown',sameSexPartner:state.spouse?state.spouse.sex===child.sex:null,cohabitationAge:null,cohabitationYear:null,fertilityTarget:9}});
 return {life,child,state};
}
test('explicit child union plans round trip without changing RNG or inferred legacy facts',()=>{
 const {life}=fixture();const restored=decodeSave(encodeSave(life,[])).life!;assert.deepEqual(restored,life);
 assert.equal(restored.descendants.rng,life.descendants.rng);
 const legacy=structuredClone(observed);for(const state of legacy.descendants.children)delete state.unionPlan;assert.deepEqual(decodeSave(encodeSave(legacy,[])).life,legacy);
 assert.ok(legacy.descendants.children.every(s=>!('unionPlan' in s)));
});
test('union plan rejects impossible orientation, chronology, birth target and spouse identity',()=>{
 const changes=[
  (p:any)=>p.version=2,(p:any)=>p.orientation='invalid',
  (p:any)=>{p.orientation='sameSex';p.sameSexPartner=false;},
  (p:any)=>{p.orientation='oppositeSex';p.sameSexPartner=true;},
  (p:any)=>p.observedYear=3000,(p:any)=>p.observedYear=1900,
  (p:any)=>p.cohabitationAge=17,(p:any)=>p.cohabitationAge=30.5,
  (p:any)=>p.cohabitationYear=3000,(p:any)=>p.cohabitationYear=1900,
  (p:any)=>p.fertilityTarget=10,(p:any)=>p.fertilityTarget=-1,
 ];
 for(const change of changes){const {life,state}=fixture();change((state as any).unionPlan);assert.throws(()=>decodeSave(JSON.stringify({version:1,life,past:[]})),String(change));}
});
test('observed marriages and births constrain plans without retroactive rewriting',()=>{
 const life=[...naturalFamily()].find(l=>l.descendants.grandchildren.length>0)!;
 const baby=life.descendants.grandchildren[0];const child=life.family.children.find(c=>c.id===baby.parentId)!;
 const state=life.descendants.children.find(c=>c.childId===child.id)!;
 const plan={version:1,observedYear:life.year,orientation:'unknown',sameSexPartner:state.spouse!.sex===child.sex,cohabitationAge:null,cohabitationYear:null,fertilityTarget:9};
 Object.assign(state,{unionPlan:plan});assert.doesNotThrow(()=>encodeSave(life,[]));
 plan.sameSexPartner=!plan.sameSexPartner;assert.throws(()=>encodeSave(life,[]));plan.sameSexPartner=!plan.sameSexPartner;
 plan.fertilityTarget=0;assert.throws(()=>encodeSave(life,[]));
});
test('cohabitation timing and a zero target are preserved when no birth contradicts them',()=>{
 const {life,child,state}=fixture();const plan=(state as any).unionPlan;
 life.descendants.grandchildren=life.descendants.grandchildren.filter(g=>g.parentId!==child.id);
 life.descendants.greatGrandchildren=[];life.descendants.greatGreatGrandchildren=[];
 plan.cohabitationAge=18;plan.cohabitationYear=life.year;plan.fertilityTarget=0;
 life.history.at(-1)!.annual=null;
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 plan.cohabitationAge=child.age+1;assert.throws(()=>encodeSave(life,[]));
});
