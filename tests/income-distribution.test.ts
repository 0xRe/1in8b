import test from 'node:test';
import assert from 'node:assert/strict';
import {incomeAtPercentile,childWorkIncome,percentileOfIncome} from '../src/game/income-distribution';
const country={id:'USA',region:'hi',ppp:10000,gi:.4};
const close=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<.0001,`${actual} != ${expected}`);
test('national fifth-percentile income follows independently calculated lognormal quantiles',()=>{
 close(incomeAtPercentile(country,.05),2018.5545383309968);
 close(incomeAtPercentile({...country,region:'ssa'},.05),1407.7343492374798);
 close(incomeAtPercentile({...country,region:'sa'},.05),1407.7343492374798);
 close(incomeAtPercentile({...country,region:'mena'},.05),1407.7343492374798);
 close(incomeAtPercentile({...country,id:'CHN',region:'eap'},.05),2018.5545383309968);
 close(incomeAtPercentile({...country,id:'VNM',region:'eap'},.05),1407.7343492374798);
});
test('inequality and percentile bounds produce finite, ordered incomes',()=>{
 close(incomeAtPercentile({...country,gi:0},.05),4346.890199811669);
 close(incomeAtPercentile({...country,gi:1},.05),331.209464063172);
 assert.equal(incomeAtPercentile(country,0),incomeAtPercentile(country,.003));
 assert.equal(incomeAtPercentile(country,1),incomeAtPercentile(country,.997));
 const amounts=[0,.05,.5,.95,1].map(p=>incomeAtPercentile(country,p));
 assert.ok(amounts.every((v,i)=>Number.isFinite(v)&&v>0&&(i===0||v>amounts[i-1])));
});
test('child work earns fifteen percent of the national fifth percentile only when paid',()=>{
 close(childWorkIncome(country,true),302.7831807496495);
 assert.equal(childWorkIncome(country,false),0);
 close(childWorkIncome({...country,ppp:20000},true),605.566361499299);
});

test('income inversion uses the same regional distribution without a household discount',()=>{
 for(const c of [country,{...country,region:'ssa'},{...country,id:'CHN',region:'eap'}])for(const p of [.004,.05,.5,.95,.996])
  assert.ok(Math.abs(percentileOfIncome(c,incomeAtPercentile(c,p))-p)<2e-7);
 assert.ok(percentileOfIncome(country,0)>=0);
 assert.equal(percentileOfIncome(country,0),percentileOfIncome(country,1));
});
