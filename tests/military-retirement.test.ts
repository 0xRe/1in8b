import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareMilitaryRetirement,resolveMilitaryRetirement} from '../src/game/military-retirement';
const context={age:52,rank:0 as const,commissioned:true,working:true,retired:false,handledAge:null,income:10000,percentile:.8,careerIncome:15000,careerPercentile:null};
test('mandatory military retirement offers retirement or other work, with no rehire',()=>{
 let calls=0;const offer=prepareMilitaryRetirement(context,()=>{calls++;return 4000});
 assert.deepEqual(offer,{age:52,rank:0,pensionPreview:4000,choices:['retire','other']});assert.equal(calls,1);
 for(const patch of [{age:51},{working:false},{retired:true},{handledAge:51},{rank:1 as const}])assert.equal(prepareMilitaryRetirement({...context,...patch},()=>{throw Error('ineligible preview')}),null);
});
test('retirement preserves current-year earned pay and recomputes the award at acceptance',()=>{
 let calls=0;const calculate=()=>{calls++;return calls===1?4000:4500};
 const offer=prepareMilitaryRetirement(context,calculate)!;
 const result=resolveMilitaryRetirement(context,offer,'retire',calculate)!;
 assert.equal(calls,2);assert.deepEqual(result,{handledAge:52,careerIncome:15000,careerPercentile:.8,lastJob:'soldier',job:'retired',retired:true,income:10000,pension:4500,happiness:4,health:3});
});
test('other work clears wages, starts job search, preserves career facts and does not calculate a new pension',()=>{
 const offer=prepareMilitaryRetirement(context,()=>4000)!;
 const result=resolveMilitaryRetirement({...context,careerIncome:5000,careerPercentile:.7},offer,'other',()=>{throw Error('no pension calculation on other work')});
 assert.deepEqual(result,{handledAge:52,careerIncome:10000,careerPercentile:.7,lastJob:'soldier',job:'none',retired:false,income:0,oldJob:'soldier',seekingYears:0,oldLookAge:52,happiness:-2,health:0});
 for(const [patch,choice] of [[{},'rehire'],[{working:false},'retire'],[{handledAge:52},'retire'],[{age:53},'retire'],[{rank:1},'retire']] as const)
  assert.equal(resolveMilitaryRetirement({...context,...patch} as typeof context,offer,choice,()=>{throw Error('invalid choice draw')}),null);
});

test('accepted retirement pension sees career income captured before calculation',()=>{
 const c={...context,careerIncome:0};const offer=prepareMilitaryRetirement(c,()=>0)!;
 resolveMilitaryRetirement(c,offer,'retire',updated=>{
  assert.equal(updated.careerIncome,10000);assert.equal(updated.careerPercentile,.8);assert.equal(updated.handledAge,52);return 4000;
 });
 assert.equal(c.careerIncome,0);
});
