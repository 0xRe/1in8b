import test from 'node:test';
import assert from 'node:assert/strict';
import {findFamilyCheckpoint} from './helpers/adult-family-simulation';
import {canResolveDescendantChoice,descendantDecision,resolveDescendantDecision,yearlyDescendants,type DescendantHooks} from '../src/game/descendants';
import {decodeSave,encodeSave} from '../src/game/storage';
import {makeChoice} from '../src/game/engine';
const fixture=()=>{
 const life=findFamilyCheckpoint(l=>!l.pendingDecision&&l.family.children.some(c=>c.alive&&c.age===18&&!l.descendants.children.find(s=>s.childId===c.id)?.universityResolved));
 const child=life.family.children.find(c=>c.alive&&c.age===18&&!life.descendants.children.find(s=>s.childId===c.id)?.universityResolved)!;
 const state=life.descendants.children.find(c=>c.childId===child.id)!;
 state.admission={attemptedAge:18,path:'pending'};state.weddingAt=26;
 life.pendingDecision=descendantDecision(life,child,'university');
 return {life,child,state};
};
const hooks:DescendantHooks={event:()=>{},name:()=> 'Test',mortality:()=>0};
test('observed age18 admission funds through23 without redoing marriage deferral and survives codec',()=>{
 const initial=fixture();const rng=initial.life.descendants.rng;
 assert.ok(canResolveDescendantChoice(initial.child,initial.state,'university',initial.life.year));
 assert.deepEqual(decodeSave(encodeSave(initial.life,[])).life,initial.life);
 const life=makeChoice(initial.life,'fundUniversity');
 const child=life.family.children.find(c=>c.id===initial.child.id)!;
 const state=life.descendants.children.find(c=>c.childId===child.id)!;
 assert.equal(state.admission?.path,'university');assert.equal(state.studyUntil,child.birthYear+23);
 assert.equal(state.weddingAt,26);assert.equal(life.descendants.rng,rng);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 assert.deepEqual(makeChoice(life,'fundUniversity'),life);
});
test('work choice closes observed pending admission and cannot reopen the funding decision',()=>{
 const initial=fixture();
 const life=makeChoice(initial.life,'startChildWork');
 const child=life.family.children.find(c=>c.id===initial.child.id)!;
 const state=life.descendants.children.find(c=>c.childId===child.id)!;
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 assert.equal(state.admission?.path,'work');
 assert.equal(canResolveDescendantChoice(child,state,'university',life.year),false);
});
test('university path admitted at18 survives the nineteenth-year school completion branch',()=>{
 const {life,child,state}=fixture();
 assert.ok(resolveDescendantDecision(life,'fundUniversity',hooks));life.pendingDecision=null;
 life.year++;life.age++;child.age++;
 const events:string[]=[];
 yearlyDescendants(life,{...hooks,event:(_l,key)=>{events.push(key);}});
 assert.equal(state.education,'university');assert.equal(state.employment,'student');
 assert.equal(state.studyUntil,child.birthYear+23);
 assert.equal(events.includes('event.descendantSchoolEnd'),false);
});

test('resolved age18 work path does not repeat school completion at19',()=>{
 const initial=fixture();const life=makeChoice(initial.life,'startChildWork');
 const child=life.family.children.find(c=>c.id===initial.child.id)!;
 life.year++;life.age++;child.age++;const events:string[]=[];
 yearlyDescendants(life,{...hooks,event:(_l,key)=>{events.push(key);}});
 assert.equal(events.includes('event.descendantSchoolEnd'),false);
});
