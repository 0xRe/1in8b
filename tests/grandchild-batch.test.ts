import assert from 'node:assert/strict';
import test from 'node:test';
import {naturalFamily,findFamilyCheckpoint} from './helpers/adult-family-simulation';
import {yearlyDescendants} from '../src/game/descendants';
import type {EventParams} from '../src/game/types';
test('one year of grandchild births grants one batch reward then deducts each early loss',()=>{
 const base=[...naturalFamily(1)].find(l=>l.age===70&&!l.pendingDecision)!;assert.ok(base);
 const checked=new Set<number>();let checkedLoss=false;
 for(let seed=1;seed<=500&&!(checked.size>=3&&checkedLoss);seed++){
  const life=structuredClone(base);
  // Batch accounting fixture: keep eligible parents below their explicit target.
  for(const state of life.descendants.children)if(state.unionPlan)state.unionPlan.fertilityTarget=9;
  life.year++;life.age++;life.descendants.rng=seed;
  for(const g of life.descendants.grandchildren)g.fertilityTarget=0;
  for(const g of life.descendants.greatGrandchildren??[])g.fertilityTarget=0;
  const before=life.descendants.grandchildren.length;life.stats.happiness=30;life.stats.social=30;
  const events:{key:string,params:EventParams}[]=[];
  yearlyDescendants(life,{mortality:()=>0,name:()=> 'Batch baby',event:(_l,key,_kind,_icon,params)=>events.push({key,params})});
  const babies=life.descendants.grandchildren.slice(before);if(!babies.length)continue;
  checked.add(babies.length);const losses=babies.filter(g=>g.earlyLoss).length;
  assert.equal(life.stats.happiness,36-losses*4);assert.equal(life.stats.social,34-losses);
  checkedLoss ||= losses>0;
  const births=events.filter(e=>['event.descendantBirth','event.descendantCohabitingBirth','event.descendantSoloBirth','event.descendantBirthBatch'].includes(e.key));
  assert.equal(births.length,1);if(babies.length>1)assert.equal(births[0].params.count,babies.length);
  const lossEvents=events.filter(e=>e.key==='event.descendantEarlyLoss');assert.equal(lossEvents.length,losses);
  for(const e of lossEvents)assert.ok(events.indexOf(e)>events.indexOf(births[0]));
  const state=structuredClone(life);yearlyDescendants(life,{mortality:()=>0,name:()=>'',event:()=>{throw Error('duplicate year')}});assert.deepEqual(life,state);
 }
 assert.ok(checked.has(1)&&checked.has(2)&&checked.has(3),'actually exercise single, double and triple births');assert.ok(checkedLoss,'actually exercise a mixed birth/loss batch');
});
test('natural multiple-birth events survive backup and render their counts',async()=>{
 const {encodeSave,decodeSave}=await import('../src/game/storage');const {translator}=await import('../src/lib/i18n');
 const life=findFamilyCheckpoint(l=>l.events.some(e=>e.key==='event.descendantBirthBatch'));assert.ok(life);
 const restored=decodeSave(encodeSave(life,[])).life!;
 const event=restored.events.find(e=>e.key==='event.descendantBirthBatch')!;
 assert.ok(Number(event.params.count)>=2);
 assert.equal(translator('en')(event.key,event.params),`Your children welcomed ${event.params.count} babies this year. You now have ${event.params.total} grandchildren.`);
});
