import test from 'node:test';
import assert from 'node:assert/strict';
import {findFamilyCheckpoint,naturalFamily} from './helpers/adult-family-simulation';
import {decodeSave,encodeSave} from '../src/game/storage';
import {yearlyDescendants} from '../src/game/descendants';
test('natural children acquire departure plans in adolescence, save them and never invent plans on legacy import',()=>{
 const life=findFamilyCheckpoint(l=>l.family.children.some(c=>c.alive&&c.age===15));
 const child=life.family.children.find(c=>c.alive&&c.age===15)!;
 const state=life.descendants.children.find(s=>s.childId===child.id)!;
 assert.ok((state as any).homePlan,'missing departure plan at15');
 assert.equal((state as any).homePlan.observedYear,life.year);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 delete (state as any).homePlan;assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
});
test('planned departure occurs at its saved age and does not repeat within a year',()=>{
 const life=findFamilyCheckpoint(l=>l.family.children.some(c=>c.alive&&c.age>=20&&c.age<=23&&l.descendants.children.some(s=>s.childId===c.id&&s.residence==='home'&&!s.spouse)),'USA');
 const child=life.family.children.find(c=>c.alive&&c.age>=20&&c.age<=23&&life.descendants.children.some(s=>s.childId===c.id&&s.residence==='home'&&!s.spouse))!;
 const state=life.descendants.children.find(s=>s.childId===child.id)!;
 (state as any).homePlan={version:1,observedYear:life.year,country:life.country.id,leaveAge:child.age+1,staying:false,left:false};
 life.year++;life.age++;for(const c of life.family.children)if(c.alive)c.age++;
 const events:string[]=[];const hooks={event:(_l:any,key:string)=>{events.push(key);},name:()=> 'Test',mortality:()=>0};
 const held=structuredClone(life);(held.descendants.children.find(s=>s.childId===child.id) as any).homePlan.staying=true;
 yearlyDescendants(held,{...hooks,event:()=>{}});
 yearlyDescendants(life,hooks);
 assert.equal(life.stats.happiness-held.stats.happiness,1);
 assert.equal(state.residence,'independent');assert.equal((state as any).homePlan.decision.outcome,'leave');
 assert.equal((state as any).homePlan.decision.year,life.year);
 const saved=structuredClone(life.descendants),count=events.length;
 yearlyDescendants(life,hooks);assert.deepEqual(life.descendants,saved);assert.equal(events.length,count);
});
test('save validation rejects impossible home plans and decision histories',()=>{
 const life=findFamilyCheckpoint(l=>l.family.children.some(c=>c.alive&&c.age===15));
 const child=life.family.children.find(c=>c.alive&&c.age===15)!;
 const valid={version:1,observedYear:life.year,country:life.country.id,leaveAge:27,staying:false,left:false};
 for(const changes of [{version:2},{observedYear:life.year+1},{country:'XXX'},{leaveAge:18},{leaveAge:99},{staying:'yes'},{decision:{year:life.year-1,outcome:'leave',reason:'own'}}]){
  const bad=structuredClone(life);(bad.descendants.children.find(s=>s.childId===child.id) as any).homePlan={...valid,...changes};assert.throws(()=>decodeSave(encodeSave(bad,[])));
 }
});
test('cohabitation actually leaves home and the saved departure prevents another automatic move after returning',()=>{
 const life=[...naturalFamily(39,6,'FRA')].find(l=>l.descendants.children.some(s=>s.homePlan?.decision?.reason==='cohabitation'&&s.residence==='independent'&&l.family.children.some(c=>c.id===s.childId&&c.alive&&c.country===l.country.id)))!;
 assert.ok(life,'natural FRA seed39 must reach cohabitation departure');
 const state=life.descendants.children.find(s=>s.homePlan?.decision?.reason==='cohabitation'&&s.residence==='independent'&&life.family.children.some(c=>c.id===s.childId&&c.alive&&c.country===life.country.id))!;
 assert.equal(state.homePlan!.left,true);assert.equal(state.homePlan!.decision!.year,state.unionPlan!.cohabitationYear);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 const history=structuredClone(state.homePlan);state.residence='home';
 life.year++;life.age++;for(const c of life.family.children)if(c.alive)c.age++;
 yearlyDescendants(life,{event:()=>{},name:()=> 'Test',mortality:()=>0});
 assert.equal(state.residence,'home');assert.deepEqual(state.homePlan,history);
});
