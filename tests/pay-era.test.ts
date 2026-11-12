import test from 'node:test';import assert from 'node:assert/strict';
import {payEraCountry} from '../src/game/pay-era';import {getCountryById} from '../src/game/countries';import {educationEraInputs} from '../src/game/education-era';import data from '../src/data/education-era.json';
test('historical pay inputs use unrounded GDP for agricultural shift then round source statistics',()=>{
 const c=getCountryById('JPN'),before=structuredClone(c),raw=c.ppp*data.JPN.g[0]/1000,fit=(p:number)=>80/(1+Math.exp(Math.log(Math.max(200,p))-8.5));
 const result=payEraCountry(c,'past',1950);
 assert.equal(result.ppp,Math.round(Math.max(250,raw)));assert.equal(result.agr,Math.round(Math.max(.5,Math.min(90,c.agr+fit(Math.max(250,raw))-fit(c.ppp)))));
 assert.equal(result.ter,educationEraInputs(c,'past',1950).statistics.ter);assert.equal(result.gi,c.gi);assert.deepEqual(c,before);
});
test('today uses unchanged statistics while future and clamped dates share the education projection',()=>{
 const c=getCountryById('IND');assert.deepEqual(payEraCountry(c,'today',1950),c);
 const future=payEraCountry(c,'future',2080);assert.ok(future.ppp>c.ppp);assert.ok(future.agr<c.agr);
 assert.deepEqual(payEraCountry(c,'past',1900),payEraCountry(c,'past',1950));assert.deepEqual(payEraCountry(c,'future',2200),payEraCountry(c,'future',2100));
});
