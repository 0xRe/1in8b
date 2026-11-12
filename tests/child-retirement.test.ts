import test from 'node:test';
import assert from 'node:assert/strict';
import {childRetirementAge} from '../src/game/child-retirement';
import {naturalFamily} from './helpers/adult-family-simulation';
import {decodeSave,encodeSave} from '../src/game/storage';
test('child retirement applies Chinese sex/year thresholds and keeps self-employment at65',()=>{
 assert.equal(childRetirementAge('CHN','F','nurse',2025),55);
 assert.equal(childRetirementAge('CHN','M','engineer',2030),61);
 assert.equal(childRetirementAge('CHN','F','nurse',2100),58);
 assert.equal(childRetirementAge('CHN','M','engineer',1990),60);
 for(const job of ['farmer','artisan','entrepreneur','none','student'] as const)assert.equal(childRetirementAge('CHN','F',job,2030),65);
 assert.equal(childRetirementAge('JPN','F','nurse',2030),65);
});
test('normal Chinese family progression records retirement before65 and restores it unchanged',()=>{
 let found=false;
 for(let seed=1;seed<=20&&!found;seed++)for(const life of naturalFamily(seed,6,'CHN')){
  const state=life.descendants.children.find(c=>(c as any).retirement?.age<65);
  if(!state)continue;
  const record=(state as any).retirement;
  assert.equal(state.employment,'retired');
  assert.equal(record.age,childRetirementAge(record.country,life.family.children.find(c=>c.id===state.childId)!.sex,record.job,record.year));
  assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);found=true;break;
 }
 assert.ok(found,'no natural early child retirement');
});
test('early retirement receipts reject forged age, year, country, prior job and employment',()=>{
 let sample:ReturnType<typeof decodeSave>['life']=null;
 for(let seed=1;seed<=20&&!sample;seed++)for(const life of naturalFamily(seed,6,'CHN'))if(life.descendants.children.some(c=>(c.retirement?.age??65)<65)){sample=life;break;}
 assert.ok(sample);
 for(const change of [
  (s:any)=>s.retirement.age=17,
  (s:any)=>s.retirement.year++,
  (s:any)=>s.retirement.country='XXX',
  (s:any)=>s.retirement.job='retired',
  (s:any)=>s.employment='unemployed',
  (s:any)=>delete s.retirement,
 ]){const life=structuredClone(sample);const state=life.descendants.children.find(c=>(c.retirement?.age??65)<65)!;change(state);assert.throws(()=>decodeSave(encodeSave(life,[])));}
});

import {findFamilyCheckpoint} from './helpers/adult-family-simulation';
import {yearlyDescendants} from '../src/game/descendants';
test('an early-retired child remains retired after moving to a country with a later threshold',()=>{
 const life=findFamilyCheckpoint(l=>l.descendants.children.some(s=>!!s.retirement&&s.retirement.age<65&&!!l.family.children.find(c=>c.id===s.childId&&c.alive&&c.age<64)),'CHN',20);
 const state=life.descendants.children.find(s=>!!s.retirement&&s.retirement.age<65&&!!life.family.children.find(c=>c.id===s.childId&&c.alive&&c.age<64))!;
 const child=life.family.children.find(c=>c.id===state.childId)!;
 const receipt=structuredClone(state.retirement),income=state.income;
 child.country='USA';if(state.spouse?.alive)state.spouse.country='USA';
 life.year++;life.age++;for(const c of life.family.children)if(c.alive)c.age++;
 const events:string[]=[];yearlyDescendants(life,{event:(_l,key)=>events.push(key),name:()=> 'Test',mortality:()=>0});
 assert.equal(state.employment,'retired');assert.equal(child.job,'retired');
 assert.equal(state.income,income);assert.deepEqual(state.retirement,receipt);
});
