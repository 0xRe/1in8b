import test from 'node:test';
import assert from 'node:assert/strict';
import {naturalFamily,familyChoice} from './helpers/adult-family-simulation';
import {encodeSave,decodeSave} from '../src/game/storage';
import {translator} from '../src/lib/i18n';
test('scheduled disclosure is private until due, emits once and survives yearly saves',()=>{
 let life=[...naturalFamily(1)].find(l=>!l.pendingDecision&&l.family.children.some(c=>c.alive&&c.age===16))!;
 assert.ok(life);
 const child=life.family.children.find(c=>c.alive&&c.age===16)!;
 const state=life.descendants.children.find(c=>c.childId===child.id)!;
 assert.ok(state.unionPlan);
 Object.assign(state.unionPlan,{orientation:'bisexual',sameSexPartner:false,disclosure:{age:17,year:null}});
 assert.ok(!life.events.some(e=>e.key.startsWith('event.descendantDisclosure')&&e.params.name===child.name));
 life=decodeSave(encodeSave(life,[])).life!;
 for(let step=0;step<30&&life.age<child.birthYear-life.birthYear+20;step++)life=decodeSave(encodeSave(familyChoice(life),[])).life!;
 const events=life.events.filter(e=>e.key==='event.descendantDisclosureBi'&&e.params.name===child.name);
 assert.equal(events.length,1);
 assert.equal(events[0].age,child.birthYear-life.birthYear+17);
 assert.equal(life.descendants.children.find(c=>c.childId===child.id)!.unionPlan!.disclosure!.year,child.birthYear+17);
 assert.ok(translator('en')(events[0].key,events[0].params).includes('bisexual'));
 const invalid=structuredClone(life);
 invalid.descendants.children.find(c=>c.childId===child.id)!.unionPlan!.disclosure!.year=child.birthYear+16;
 assert.throws(()=>encodeSave(invalid,[]));
});
test('ordinary gameplay schedules and emits disclosure without injected child state',()=>{
 const announced=new Set<string>();
 const targets=new Map<string,number>();
 let observations=0;
 for(const life of naturalFamily(8,6,'USA')){
  assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
  for(const state of life.descendants.children){
   const child=life.family.children.find(c=>c.id===state.childId)!;
   const disclosure=state.unionPlan?.disclosure;
   if(disclosure?.age==null)continue;
   const prior=targets.get(child.id);
   if(prior===undefined)targets.set(child.id,disclosure.age);
   else assert.equal(disclosure.age,prior,'scheduled age must not reroll');
   const key=state.unionPlan!.orientation==='bisexual'?'event.descendantDisclosureBi':'event.descendantDisclosureSame';
   const events=life.events.filter(e=>e.key===key&&e.params.name===child.name);
   if(disclosure.year===null){assert.equal(events.length,0);continue;}
   assert.equal(events.length,1);
   assert.equal(events[0].year,disclosure.year);
   assert.equal(events[0].year,child.birthYear+disclosure.age);
   announced.add(child.id);observations++;
  }
 }
 assert.ok(announced.size>0,'exercise naturally generated disclosure');
 assert.ok(observations>announced.size,'continue past disclosure and verify no duplicates');
});
