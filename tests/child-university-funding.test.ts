import test from 'node:test';
import assert from 'node:assert/strict';
import {childUniversityCost,resolveChildUniversityFunding} from '../src/game/child-university-funding';
import {getCountryById} from '../src/game/countries';
import {incomeAtPercentile} from '../src/game/income-distribution';
const draws=(...values:number[])=>()=>{assert.ok(values.length,'unexpected random draw');return values.shift()!;};
test('four-year child cost uses regional median-income factors and tuition-free or Korean support reductions',()=>{
 for(const [id,factor] of [['USA',1.6],['DEU',.8],['POL',.8],['IND',1]] as const){const c=getCountryById(id)!;assert.equal(childUniversityCost(c,false),incomeAtPercentile(c,.5)*factor);}
 const eca={...getCountryById('POL')!,region:'eca'};assert.equal(childUniversityCost(eca,false),incomeAtPercentile(eca,.5)*.8*.5);
 const korea=getCountryById('KOR')!;assert.equal(childUniversityCost(korea,true),incomeAtPercentile(korea,.5)*1.6*.4);
});
test('full and half funding have exact costs and no random outcome',()=>{
 assert.deepEqual(resolveChildUniversityFunding('full',1000,0,draws()),{outcome:'funded',cost:1000,happiness:6,social:4,bond:4});
 assert.deepEqual(resolveChildUniversityFunding('half',1000,0,draws()),{outcome:'shared',cost:500,happiness:4,social:3,bond:2});
});
test('self funding has a single initial shortfall gate, not a recurring annual dropout roll',()=>{
 assert.deepEqual(resolveChildUniversityFunding('self',1000,0,draws(.25)),{outcome:'self',cost:0,happiness:2,social:0,bond:0});
 assert.deepEqual(resolveChildUniversityFunding('self',1000,399,draws(.24)),{outcome:'withdrawn',cost:0,happiness:-6,social:-2,bond:0});
});
test('affordable shortfall consumes a second draw scaled by savings and contributes forty percent',()=>{
 assert.deepEqual(resolveChildUniversityFunding('self',1000,400,draws(0,.39)),{outcome:'assisted',cost:400,happiness:1,social:0,bond:1});
 assert.equal(resolveChildUniversityFunding('self',1000,400,draws(0,.4)).outcome,'withdrawn');
 assert.equal(resolveChildUniversityFunding('self',1000,2000,draws(0,.999)).outcome,'assisted');
});
