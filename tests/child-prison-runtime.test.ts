import test from 'node:test';
import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {yearlyDescendants,canResolveDescendantChoice} from '../src/game/descendants';
const fixture=[...naturalFamily(1)].find(l=>!l.pendingDecision&&l.family.children.some(c=>c.alive&&c.age===25))!;
assert.ok(fixture);
test('imprisoned child has no work, first pay, household transfer, move or cohabitation in annual progression',()=>{
 const life=structuredClone(fixture), child=life.family.children.find(c=>c.alive&&c.age===25)!;
 const state=life.descendants.children.find(c=>c.childId===child.id)!;
 state.prison={startYear:life.year-1,endYear:life.year+2,releasedYear:null};
 state.employment='employed';state.income=100000;state.firstPayStatus='pending';state.firstPayYear=null;
 state.residence='home';state.spouse=null;state.marriedYear=null;
 assert.ok(state.unionPlan);
 state.unionPlan.cohabitationAge=25;state.unionPlan.cohabitationYear=null;
 life.descendants.lastYear=life.year-1;
 const events:{key:string;name:unknown}[]=[];
 yearlyDescendants(life,{event:(_life,key,_kind,_icon,params)=>events.push({key,name:params?.name}),name:()=> 'Test newborn',mortality:()=>0});
 assert.equal(state.firstPayStatus,'pending');
 assert.equal(state.contribution,0);
 assert.equal(state.residence,'home');
 assert.equal(state.unionPlan.cohabitationYear,null);
 assert.equal(events.filter(e=>e.name===child.name&&/FirstPay|Contribution|Promotion|JobLoss|Home|Cohabitation|Visit/.test(e.key)).length,0);
});
test('release processing unlocks otherwise eligible family decisions in the release year',()=>{
 const life=structuredClone(fixture),child=life.family.children.find(c=>c.alive&&c.age===25)!;
 const state=life.descendants.children.find(c=>c.childId===child.id)!;
 state.migrationAt=25;state.migrationResolved=false;
 state.prison={startYear:life.year-2,endYear:life.year,releasedYear:null};
 assert.equal(canResolveDescendantChoice(child,state,'migration',life.year),false);
 state.prison.releasedYear=life.year;
 assert.equal(canResolveDescendantChoice(child,state,'migration',life.year),true);
});
test('custody suppresses births across random paths that produce births for the same eligible parent',()=>{
 let controlBirths=0;
 for(let seed=1;seed<=40;seed++) {
  const base=structuredClone(fixture),child=base.family.children.find(c=>c.alive&&c.age===25)!;
  const state=base.descendants.children.find(c=>c.childId===child.id)!;
  child.sex='F';child.age=35;child.birthYear=base.year-35;state.education='secondary';state.marriedYear=base.year-1;
  state.spouse={...child,id:'prison-test-spouse',sex:'M',name:'Spouse'};
  assert.ok(state.unionPlan);state.unionPlan.fertilityTarget=9;state.unionPlan.sameSexPartner=false;
  base.descendants.rng=seed;base.descendants.lastYear=base.year-1;
  const prisoner=structuredClone(base);
  prisoner.descendants.children.find(c=>c.childId===child.id)!.prison={startYear:base.year-1,endYear:base.year+2,releasedYear:null};
  const hooks={event:()=>{},name:()=> 'Baby',mortality:()=>0};
  const before=base.descendants.grandchildren.filter(g=>g.parentId===child.id).length;
  yearlyDescendants(base,hooks);yearlyDescendants(prisoner,hooks);
  controlBirths+=base.descendants.grandchildren.filter(g=>g.parentId===child.id).length-before;
  assert.equal(prisoner.descendants.grandchildren.filter(g=>g.parentId===child.id).length,before);
 }
 assert.ok(controlBirths>0,'control must exercise actual fertility rather than a disabled branch');
});
test('annual release happens once and makes family decisions available again',()=>{
 const life=structuredClone(fixture), child=life.family.children.find(c=>c.alive&&c.age===25)!;
 const state=life.descendants.children.find(c=>c.childId===child.id)!;
 state.prison={startYear:life.year-2,endYear:life.year,releasedYear:null};
 state.migrationAt=25;state.migrationResolved=false;
 life.descendants.lastYear=life.year-1;
 const released:string[]=[];
 const hooks={event:(_life:unknown,key:string)=>{if(key==='event.descendantReleased')released.push(key)},name:()=> 'Baby',mortality:()=>0};
 yearlyDescendants(life,hooks);
 assert.equal(state.prison.releasedYear,life.year);
 assert.equal(canResolveDescendantChoice(child,state,'migration',life.year),true);
 yearlyDescendants(life,hooks);
 assert.equal(released.length,1);
});
test('short custody delays university while long custody ends unfinished study',()=>{
 for(const duration of [2,4]){
  const life=structuredClone(fixture), child=life.family.children.find(c=>c.alive&&c.age===25)!;
  child.age=21;child.birthYear=life.year-21;
  const state=life.descendants.children.find(c=>c.childId===child.id)!;
  state.education='university';state.employment='student';state.income=0;child.job='student';state.studyFunding='parent';state.studyUntil=life.year+2;
  state.prison={startYear:life.year,endYear:life.year+duration,releasedYear:null};life.descendants.lastYear=life.year-1;
  yearlyDescendants(life,{event:()=>{},name:()=> 'Baby',mortality:()=>0});
  if(duration===2){assert.equal(state.education,'university');assert.equal(state.studyUntil,child.birthYear+25)}
  else {assert.equal(state.education,'droppedOut');assert.equal(state.studyUntil,null)}
 }
});
test('dead children are never released and protected professions do not resume on release',()=>{
 for(const alive of [true,false]){
  const life=structuredClone(fixture), child=life.family.children.find(c=>c.alive&&c.age===25)!;
  const state=life.descendants.children.find(c=>c.childId===child.id)!;
  child.alive=alive;child.job='teacher';state.education='graduate';state.employment='employed';state.income=50000;
  state.prison={startYear:life.year-2,endYear:life.year,releasedYear:null};life.descendants.lastYear=life.year-1;
  const events:string[]=[];
  yearlyDescendants(life,{event:(_life,key)=>events.push(key),name:()=> 'Baby',mortality:()=>0});
  if(alive){assert.ok(!['teacher','nurse'].includes(child.job));assert.equal(state.prison.releasedYear,life.year)}
  else {assert.equal(state.prison.releasedYear,null);assert.ok(!events.includes('event.descendantReleased'))}
 }
});
test('child imprisoned at age18 does not remain a schoolchild after secondary school age',()=>{
 const life=structuredClone(fixture),child=life.family.children.find(c=>c.alive&&c.age===25)!;
 child.age=19;child.birthYear=life.year-19;
 const state=life.descendants.children.find(c=>c.childId===child.id)!;
 state.education='school';state.employment='student';state.universityResolved=false;
 state.prison={startYear:life.year-1,endYear:life.year+1,releasedYear:null};life.descendants.lastYear=life.year-1;
 yearlyDescendants(life,{event:()=>{},name:()=> 'Baby',mortality:()=>0});
 assert.equal(state.education,'secondary');assert.equal(state.universityResolved,true);
 assert.equal(state.employment,'none');assert.equal(child.job,'none');
});
