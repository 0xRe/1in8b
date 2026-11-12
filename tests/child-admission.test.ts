import test from 'node:test';
import assert from 'node:assert/strict';
import {childAdmissionProbability,childHomeQuintile,advanceChildAdmission,type ChildAdmissionContext} from '../src/game/child-admission';
const context:ChildAdmissionContext={age:18,alive:true,imprisoned:false,companion:false,outsideCare:false,severeDisability:false,closed:false,probability:.4};
test('child household quintile uses continuous region centers and co-resident parental support',()=>{
 assert.equal(childHomeQuintile(.67,'hi',null),3);
 assert.equal(childHomeQuintile(.67,'hi',5),5);
 assert.equal(childHomeQuintile(0,'hi',null),.5);
 assert.equal(childHomeQuintile(1,'sa',null),5.5);
});
test('admission preserves structural exclusion before the probability floor',()=>{
 const base={transitions:[.8,.75,.5,.5] as const,parentDegree:false,tutoringYears:0,privateMultiplier:1,placementMultiplier:1,aspirationMultiplier:1,disabilityMultiplier:1,closed:false};
 assert.ok(Math.abs(childAdmissionProbability(base)-(1-Math.sqrt(.85)))<1e-12);
 assert.equal(childAdmissionProbability({...base,closed:true}),0);
 assert.equal(childAdmissionProbability({...base,disabilityMultiplier:0}),0);
 assert.equal(childAdmissionProbability({...base,transitions:[0,0,0,0]}),.01);
 const boosted=childAdmissionProbability({...base,parentDegree:true});
 assert.ok(Math.abs(boosted-(1-Math.sqrt(1-.3/1.15)))<1e-12);
 assert.ok(Math.abs(childAdmissionProbability({...base,tutoringYears:100})-(1-Math.sqrt(.05)))<1e-12);
});
test('failed eighteen-year attempt can succeed at nineteen without duplicate age draws',()=>{
 let calls=0;
 const first=advanceChildAdmission(undefined,context,()=>{calls++;return .6;});
 assert.deepEqual(first,{attemptedAge:18,path:null});
 assert.deepEqual(advanceChildAdmission(first,context,()=>{throw Error('duplicate');}),first);
 const next=advanceChildAdmission(first,{...context,age:19},()=>{calls++;return .2;});
 assert.deepEqual(next,{attemptedAge:19,path:'university'});
 assert.equal(calls,2);
});
test('eighteen-year admission queues funding only for children in the player care and cannot reroll',()=>{
 const pending=advanceChildAdmission(undefined,context,()=>0);
 assert.equal(pending?.path,'pending');
 assert.deepEqual(advanceChildAdmission(pending,{...context,age:19},()=>{throw Error('reroll');}),pending);
 assert.equal(advanceChildAdmission(undefined,{...context,outsideCare:true},()=>0)?.path,'university');
 assert.equal(advanceChildAdmission(undefined,{...context,age:19},()=>.9)?.path,'work');
});
test('custody, severe disability, companion and dead children follow distinct source gates',()=>{
 const none=()=>{throw Error('unexpected draw');};
 assert.equal(advanceChildAdmission(undefined,{...context,alive:false},none),undefined);
 assert.equal(advanceChildAdmission(undefined,{...context,imprisoned:true},none),undefined);
 assert.equal(advanceChildAdmission(undefined,{...context,companion:true},none),undefined);
 assert.equal(advanceChildAdmission(undefined,{...context,age:19,imprisoned:true},none)?.path,'work');
 assert.equal(advanceChildAdmission(undefined,{...context,age:19,severeDisability:true},none)?.path,'work');
 assert.equal(advanceChildAdmission(undefined,{...context,age:19,companion:true},()=>0)?.path,'university');
});
test('serialized pending and resolved admission states preserve their path without consuming draws',()=>{
 for(const path of ['pending','university','work'] as const){
  const saved={attemptedAge:18 as const,path};
  const restored=JSON.parse(JSON.stringify(saved));
  const before=JSON.stringify(restored);
  assert.deepEqual(advanceChildAdmission(restored,{...context,age:19},()=>{throw Error('reroll');}),saved);
  assert.equal(JSON.stringify(restored),before);
 }
});
test('closed admission attempts consume the source draw but cannot succeed at either age',()=>{
 let count=0;
 const random=()=>{count++;return 0;};
 const first=advanceChildAdmission(undefined,{...context,closed:true},random);
 assert.deepEqual(first,{attemptedAge:18,path:null});
 assert.deepEqual(advanceChildAdmission(first,{...context,age:19,closed:true},random),{attemptedAge:19,path:'work'});
 assert.equal(count,2);
});
