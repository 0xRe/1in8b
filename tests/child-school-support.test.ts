import test from 'node:test';import assert from 'node:assert/strict';
import {childSchoolSupport} from '../src/game/child-school-support';
const context={age:6,alive:true,away:false,level:2 as const,recognized:true,diagnosed:true,ppp:50000,region:'hi',year:2026};
test('special school settles exactly at six; rich access does not draw luck',()=>{
 const r=childSchoolSupport(undefined,context,()=>{throw Error('rich access');});assert.deepEqual(r,{age:6,kind:'special'});
 assert.equal(childSchoolSupport(r,{...context,age:7},()=>{throw Error('repeat');}),null);
 assert.equal(childSchoolSupport(undefined,{...context,age:7},()=>0),null);
});
test('mild support waits for recognition and uses ages seven to nine',()=>{
 const c={...context,age:7,level:1 as const};assert.deepEqual(childSchoolSupport(undefined,c,()=>{throw Error('rich');}),{age:7,kind:'supported'});
 assert.deepEqual(childSchoolSupport(undefined,{...c,diagnosed:false},()=>{throw Error('unrecognized');}),{age:7,kind:'unsupported'});
 assert.equal(childSchoolSupport(undefined,{...c,recognized:false},()=>0),null);
});
test('low resource access can leave a child without a local school; dead/away are inert',()=>{
 assert.deepEqual(childSchoolSupport(undefined,{...context,ppp:1500,region:'ssa'},()=>.99),{age:6,kind:'home'});
 for(const overrides of [{alive:false},{away:true}])assert.equal(childSchoolSupport(undefined,{...context,...overrides},()=>{throw Error('excluded');}),null);
});

test('school receipts cannot be changed into ordinary school during childhood',async()=>{
 const {naturalFamily}=await import('./helpers/adult-family-simulation');
 const {encodeSave,decodeSave}=await import('../src/game/storage');
 let checked=false;
 for(const life of naturalFamily(66,6,'NGA')){
  const state=life.descendants.children.find(s=>s.schoolSupport?.kind==='home'||s.schoolSupport?.kind==='special');
  if(!state)continue;
  const child=life.family.children.find(c=>c.id===state.childId)!;
  if(child.age<6||child.age>=18)continue;
  assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
  const React=await import('react');
  const {renderToStaticMarkup}=await import('react-dom/server');
  const {FamilyDescendants}=await import('../src/components/FamilyDescendants');
  const {translator}=await import('../src/lib/i18n');
  const html=renderToStaticMarkup(React.createElement(FamilyDescendants,{life,locale:'en',t:translator('en')}));
  assert.ok(html.includes(state.schoolSupport?.kind==='home'?'No accessible school':'At a special school'));

  const forged=structuredClone(life),changed=forged.descendants.children.find(s=>s.childId===state.childId)!;
  changed.education='school';changed.employment='student';
  forged.family.children.find(c=>c.id===state.childId)!.job='student';
  assert.throws(()=>decodeSave(encodeSave(forged,[])));
  checked=true;break;
 }
 assert.ok(checked,'a natural severe child school checkpoint must be found');
});
