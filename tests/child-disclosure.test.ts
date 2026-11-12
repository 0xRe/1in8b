import test from 'node:test';
import assert from 'node:assert/strict';
import {drawChildDisclosure,advanceChildDisclosure} from '../src/game/child-union';
const draws=(...v:number[])=>()=>{assert.ok(v.length);return v.shift()!};
test('disclosure scheduling respects context, bisexual factor and future-only age',()=>{
 assert.deepEqual(drawChildDisclosure('sameSex','marriage',0,draws(.79,0)),{age:17,year:null});
 assert.deepEqual(drawChildDisclosure('sameSex','neither',30,draws(.44,.99)),{age:31,year:null});
 assert.deepEqual(drawChildDisclosure('bisexual','partnership',0,draws(.441)),{age:null,year:null});
 assert.deepEqual(drawChildDisclosure('unknown','marriage',30,draws()),{age:null,year:null});
});
test('disclosure occurs once, never for a dead child or before its scheduled age',()=>{
 const plan={age:20,year:null as number|null};
 assert.equal(advanceChildDisclosure(plan,{age:19,year:2040,alive:true}),false);
 assert.equal(advanceChildDisclosure(plan,{age:20,year:2041,alive:false}),false);
 assert.equal(advanceChildDisclosure(plan,{age:20,year:2041,alive:true}),true);
 assert.equal(plan.year,2041);
 assert.equal(advanceChildDisclosure(plan,{age:21,year:2042,alive:true}),false);
});
test('new identity plans persist disclosure scheduling while legacy plans leave it unknown',async()=>{
 const {initializeChildUnionPlan}=await import('../src/game/child-union');
 const {getCountryById}=await import('../src/game/countries');
 const context={age:0,year:2026,sex:'F' as const,country:getCountryById('USA')!,weddingAge:28,spouseSex:null,legacy:false,marriageBaseline:30.5};
 const plan=initializeChildUnionPlan(context,draws(0,.79,0));
 assert.equal(plan.orientation,'sameSex');
 assert.deepEqual(plan.disclosure,{age:17,year:null});
 assert.equal(initializeChildUnionPlan({...context,legacy:true},draws()).disclosure,undefined);
});
