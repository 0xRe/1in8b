import test from 'node:test';
import assert from 'node:assert/strict';
import {getCountryById} from '../src/game/countries';
import {updateChildFertilityTarget,advanceChildCohabitation} from '../src/game/child-union';
import type {ChildUnionPlan} from '../src/game/types';
const plan=():ChildUnionPlan=>({version:1,observedYear:2040,orientation:'oppositeSex',sameSexPartner:false,cohabitationAge:25,cohabitationYear:null,fertilityTarget:null});
const noDraw=()=>{throw Error('must not reroll');};
test('targets wait for adulthood and zero stays fixed across migration',()=>{
 const p=plan();updateChildFertilityTarget(p,{age:17,existingChildren:0,country:getCountryById('JPN')!,year:2040},noDraw);assert.equal(p.fertilityTarget,null);
 updateChildFertilityTarget(p,{age:18,existingChildren:0,country:getCountryById('JPN')!,year:2041},()=>0);assert.equal(p.fertilityTarget,0);
 updateChildFertilityTarget(p,{age:19,existingChildren:0,country:getCountryById('NGA')!,year:2042},noDraw);assert.equal(p.fertilityTarget,0);
});
test('legacy births cannot be erased by a new zero fertility draw',()=>{
 const p=plan();updateChildFertilityTarget(p,{age:40,existingChildren:3,country:getCountryById('JPN')!,year:2060},()=>0);assert.equal(p.fertilityTarget,3);
});
test('same-sex fertility gate uses player country context and preserves known births',()=>{
 const p=plan();p.sameSexPartner=true;p.orientation='sameSex';
 let values=[.9,.01,.34];updateChildFertilityTarget(p,{age:18,existingChildren:0,country:getCountryById('USA')!,year:2041},()=>values.shift()!);assert.equal(p.fertilityTarget,1);
 const q=plan();q.sameSexPartner=true;q.orientation='sameSex';values=[.9,.01,.1];updateChildFertilityTarget(q,{age:18,existingChildren:0,country:getCountryById('JPN')!,year:2041},()=>values.shift()!);assert.equal(q.fertilityTarget,0);
});
test('cohabitation starts once at observed year without backdating or overriding marriage',()=>{
 const p=plan();assert.equal(advanceChildCohabitation(p,{age:24,year:2040,alive:true,married:false}),false);
 assert.equal(advanceChildCohabitation(p,{age:30,year:2046,alive:true,married:false}),true);assert.equal(p.cohabitationYear,2046);
 assert.equal(advanceChildCohabitation(p,{age:31,year:2047,alive:true,married:false}),false);assert.equal(p.cohabitationYear,2046);
 for(const flags of [{alive:false,married:false},{alive:true,married:true}]){const q=plan();assert.equal(advanceChildCohabitation(q,{age:30,year:2046,...flags}),false);assert.equal(q.cohabitationYear,null);}
});

test('initialization preserves known legacy spouse pairing without inventing orientation',async()=>{
 const {initializeChildUnionPlan}=await import('../src/game/child-union');
 const p=initializeChildUnionPlan({age:35,year:2060,sex:'F',country:getCountryById('USA')!,weddingAge:25,spouseSex:'F',legacy:true,marriageBaseline:30.5},noDraw);
 assert.equal(p.orientation,'unknown');assert.equal(p.sameSexPartner,true);assert.equal(p.cohabitationAge,null);assert.equal(p.fertilityTarget,null);
});
test('unavailable same-sex wedding obtains its own cohabitation plan',async()=>{
 const {initializeChildUnionPlan}=await import('../src/game/child-union');let values=[0,.9,.5,.5,.5];
 const p=initializeChildUnionPlan({age:18,year:2040,sex:'F',country:getCountryById('JPN')!,weddingAge:25,spouseSex:null,legacy:false,marriageBaseline:29.7},()=>values.shift()!);
 assert.equal(p.orientation,'sameSex');assert.equal(p.sameSexPartner,true);assert.equal(p.cohabitationAge,30);assert.equal(p.cohabitationYear,null);
});
