import test from 'node:test';import assert from 'node:assert/strict';
import {resolveChildWork,resolveSchoolReturn} from '../src/game/child-school-work';
test('paid child work is decided once, preserves unpaid outcomes and supports forced paid work without a draw',()=>{
 let draws=0;const draw=()=>{draws++;return .9;};
 const unpaid=resolveChildWork(undefined,{region:'hi',quintile:3,war:0},false,draw);
 assert.equal(unpaid,false);assert.equal(draws,1);
 assert.equal(resolveChildWork(unpaid,{region:'ssa',quintile:1,war:2},false,draw),false);assert.equal(draws,1);
 assert.equal(resolveChildWork(unpaid,{region:'hi',quintile:5,war:0},true,draw),true);assert.equal(draws,1);
 assert.equal(resolveChildWork(true,{region:'hi',quintile:5,war:0},false,draw),true);assert.equal(draws,1);
});
test('paid work uses region, household means, conflict and original probability caps',()=>{
 assert.equal(resolveChildWork(undefined,{region:'hi',quintile:3,war:0},false,()=>.079),true);
 assert.equal(resolveChildWork(undefined,{region:'hi',quintile:3,war:0},false,()=>.08),false);
 assert.equal(resolveChildWork(undefined,{region:'hi',quintile:3,war:.1},false,()=>.1),true);
 assert.equal(resolveChildWork(undefined,{region:'hi',quintile:5,war:0},false,()=>.029),true);
 assert.equal(resolveChildWork(undefined,{region:'ssa',quintile:1,war:2},false,()=>.85),false);
});
test('helping family grants social benefit without an admission draw or knowledge penalty',()=>{
 assert.deepEqual(resolveSchoolReturn('help',1,0,()=>{throw Error('unexpected draw');}),{outcome:'help',happiness:0,social:4});
});
test('school-return admission responds to social ties and means, and failure affects happiness only',()=>{
 let draws=0;const draw=()=>{draws++;return .5;};
 assert.deepEqual(resolveSchoolReturn('ask',1,0,draw),{outcome:'rejected',happiness:-5,social:0});
 assert.deepEqual(resolveSchoolReturn('ask',1,100,draw),{outcome:'enrolled',happiness:0,social:0});
 assert.deepEqual(resolveSchoolReturn('ask',5,0,draw),{outcome:'enrolled',happiness:0,social:0});
 assert.equal(draws,3);
});
test('certain school-return admission still consumes its single draw',()=>{
 let draws=0;assert.equal(resolveSchoolReturn('ask',5,100,()=>{draws++;return .99999;}).outcome,'enrolled');assert.equal(draws,1);
});
