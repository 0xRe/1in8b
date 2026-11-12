import test from 'node:test';
import assert from 'node:assert/strict';
import {householdIncomePercentile} from '../src/game/household-percentile';
const country={id:'USA',region:'hi',gi:0.5204998778130465,ppp:10000};
test('current household income maps through the country lognormal distribution',()=>{
 // Gini=2*Phi(1/sqrt(2))-1 gives sigma1. Household income is scaled by0.75.
 const median=9000*Math.exp(-0.5)/0.75;
 assert.ok(Math.abs(householdIncomePercentile(country,median,0)-0.5)<1e-6);
 assert.ok(Math.abs(householdIncomePercentile(country,median*Math.E,0)-0.841344746)<1e-6);
 assert.ok(Math.abs(householdIncomePercentile(country,median/Math.E,0)-0.158655254)<1e-6);
 assert.ok(Math.abs(householdIncomePercentile(country,median/2,median/2)-0.5)<1e-6);
 assert.equal(householdIncomePercentile(country,-100,0),householdIncomePercentile(country,0,0));
});
test('regional inequality adjustment excludes China and respects clamps',()=>{
 const income=2000;
 assert.equal(householdIncomePercentile({...country,region:'eap',id:'CHN'},income,0),householdIncomePercentile(country,income,0));
 assert.equal(householdIncomePercentile({...country,region:'sa',gi:.3},income,0),householdIncomePercentile({...country,gi:.37},income,0));
 assert.equal(householdIncomePercentile({...country,gi:.1},income,0),householdIncomePercentile({...country,gi:.22},income,0));
 assert.equal(householdIncomePercentile({...country,gi:.9},income,0),householdIncomePercentile({...country,gi:.68},income,0));
});
