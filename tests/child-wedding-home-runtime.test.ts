import test from 'node:test';
import assert from 'node:assert/strict';
import {findFamilyCheckpoint} from './helpers/adult-family-simulation';
import {makeChoice} from '../src/game/engine';
import {yearlyDescendants} from '../src/game/descendants';
import {decodeSave,encodeSave} from '../src/game/storage';
const wedding=()=>findFamilyCheckpoint(l=>!!l.pendingDecision?.id.startsWith('descendant-wedding-child-'));
test('a wedding records its observed household decision and rejects forged receipts',()=>{
 const before=wedding();const id=before.pendingDecision!.id.slice('descendant-wedding-'.length);
 const life=makeChoice(before,'modestWedding');const state=life.descendants.children.find(s=>s.childId===id)!;
 assert.ok(state.weddingHome,'missing wedding residence receipt');
 assert.equal(state.weddingHome.year,life.year);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 for(const mutate of [(r:any)=>r.year--,(r:any)=>r.outcome='random',(r:any)=>r.resolvedYear=life.year+1]){
  const bad=structuredClone(life);mutate(bad.descendants.children.find(s=>s.childId===id)!.weddingHome);
  assert.throws(()=>decodeSave(encodeSave(bad,[])));
 }
});
test('parent custody postpones new household resolution and release settles it once',()=>{
 const before=wedding();const id=before.pendingDecision!.id.slice('descendant-wedding-'.length);
 before.descendants.children.find(s=>s.childId===id)!.residence='home';
 before.justice.prisonUntil=before.age+2;
 const life=makeChoice(before,'modestWedding');const state=life.descendants.children.find(s=>s.childId===id)!;
 assert.equal(state.weddingHome?.outcome,'pending');assert.equal(state.residence,'home');
 const events:string[]=[];const hooks={event:(_l:any,key:string)=>{events.push(key);},name:()=> 'Test',mortality:()=>0};
 life.year++;life.age++;for(const c of life.family.children)if(c.alive)c.age++;
 yearlyDescendants(life,hooks);assert.equal(state.weddingHome!.outcome,'pending');
 life.justice.prisonUntil=null;
 life.year++;life.age++;for(const c of life.family.children)if(c.alive)c.age++;
 yearlyDescendants(life,hooks);assert.notEqual(state.weddingHome!.outcome,'pending');
 assert.equal(state.weddingHome!.resolvedYear,life.year);
 const receipt=structuredClone(state.weddingHome),count=events.length;
 yearlyDescendants(life,hooks);assert.deepEqual(state.weddingHome,receipt);assert.equal(events.length,count);
});

test('natural family progression still produces saved co-resident marriages under the new rules',()=>{
 const life=findFamilyCheckpoint(l=>l.descendants.children.some(s=>s.weddingHome?.outcome==='stay'&&s.spouse&&s.residence==='home'),'CHN',24);
 assert.ok(life.descendants.children.some(s=>s.weddingHome?.outcome==='stay'));
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
});

test('a child released this year resolves pending wedding residence in that same annual pass',()=>{
 const before=wedding(),id=before.pendingDecision!.id.slice('descendant-wedding-'.length);
 const stateBefore=before.descendants.children.find(s=>s.childId===id)!;
 stateBefore.residence='home';
 if(stateBefore.homePlan){stateBefore.homePlan.left=false;stateBefore.homePlan.staying=false;delete stateBefore.homePlan.decision;}
 before.justice.prisonUntil=before.age+1;
 const life=makeChoice(before,'modestWedding'),state=life.descendants.children.find(s=>s.childId===id)!;
 assert.equal(state.weddingHome?.outcome,'pending');
 // Both custodial restrictions end at this boundary; the marriage was already recorded.
 state.prison={startYear:life.year,endYear:life.year+1,releasedYear:null};
 life.justice.prisonUntil=null;
 life.year++;life.age++;for(const c of life.family.children)if(c.alive)c.age++;
 const events:{key:string;name:unknown}[]=[];
 const hooks={event:(_l:any,key:string,_kind:any,_icon:any,params:any)=>events.push({key,name:params?.name}),name:()=> 'Test',mortality:()=>0};
 yearlyDescendants(life,hooks);
 assert.equal(state.prison!.releasedYear,life.year);
 assert.notEqual(state.weddingHome!.outcome,'pending','release-year wedding residence must not wait another year');
 assert.equal(state.weddingHome!.resolvedYear,life.year);
 const child=life.family.children.find(c=>c.id===id)!;
 const releaseIndex=events.findIndex(e=>e.key==='event.descendantReleased'&&e.name===child.name);
 const homeIndex=events.findIndex(e=>e.key==='event.descendantHome'&&e.name===child.name);
 assert.ok(releaseIndex>=0&&homeIndex>releaseIndex,'release should precede the household event');
 const receipt=structuredClone(state.weddingHome),count=events.length;
 yearlyDescendants(life,hooks);assert.deepEqual(state.weddingHome,receipt);assert.equal(events.length,count);
});
