import test from 'node:test';
import assert from 'node:assert/strict';
import {findFamilyCheckpoint} from './helpers/adult-family-simulation';
import {yearlyDescendants} from '../src/game/descendants';
const hooks={event:()=>{},name:()=> 'Test',mortality:()=>0};
test('annual support starts at parent60 or retirement and settles only once per year',()=>{
 const base=findFamilyCheckpoint(l=>l.family.children.some(c=>c.alive&&c.age>=25&&c.age<50));
 // Independent residence excludes the separate household-board mechanic; first-pay gifts are resolved.
 for(const c of base.family.children){const s=base.descendants.children.find(s=>s.childId===c.id)!;s.residence='independent';s.employment='retired';s.income=1000;s.firstPayStatus='received';c.job='retired';}
 const run=(age:number,retired:boolean)=>{const l=structuredClone(base);l.age=age;l.year++;l.stats.employment=retired?'retired':'employed';yearlyDescendants(l,hooks);return l;};
 assert.equal(run(59,false).descendants.annualTransfers,0);
 for(const l of [run(60,false),run(59,true)]){
  assert.ok(l.descendants.annualTransfers>0,'eligible retired children should still support an older/retired parent');
  assert.ok(Math.abs(l.descendants.totalTransfers-base.descendants.totalTransfers-l.descendants.annualTransfers)<.001);
  const before=structuredClone(l.descendants);yearlyDescendants(l,hooks);assert.deepEqual(l.descendants,before);
 }
});
test('independently living employed children do not make recurring transfers before parent60',()=>{
 const life=findFamilyCheckpoint(l=>l.descendants.children.some(s=>s.employment==='employed'&&l.family.children.some(c=>c.id===s.childId&&c.alive&&c.age>=25)));
 life.age=59;life.year++;life.stats.employment='employed';
 for(const s of life.descendants.children){s.firstPayStatus='received';s.residence='independent';}
 yearlyDescendants(life,hooks);
 assert.equal(life.descendants.annualTransfers,0);
});
