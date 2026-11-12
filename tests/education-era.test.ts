import test from 'node:test';
import assert from 'node:assert/strict';
import {educationEraInputs} from '../src/game/education-era';
import {getCountryById} from '../src/game/countries';
const c=(id:string)=>getCountryById(id)!;
test('today retains baseline regardless of calendar year',()=>{
 const b=c('JPN');
 assert.deepEqual(educationEraInputs(b,'today',2099),{statistics:{ppp:b.ppp,ter:b.ter,eys:b.eys},access:{}});
});
test('past education preserves own-series and modeled country normalization',()=>{
 assert.deepEqual(educationEraInputs(c('JPN'),'past',2010),{statistics:{ppp:38857,ter:58,eys:14.4},access:{year:2010}});
 assert.deepEqual(educationEraInputs(c('PRK'),'past',2010),{statistics:{ppp:2047,ter:19,eys:11.3},access:{year:2010}});
 assert.deepEqual(educationEraInputs(c('PAK'),'past',1952),{statistics:{ppp:792,ter:2,eys:2.7},access:{year:1952,expectedYears:7.314814814814815,historical:{primary:0.26373626373626374,secondary:0.6545454545454545}}});
});
test('future converges and era years round then clamp',()=>{
 assert.deepEqual(educationEraInputs(c('JPN'),'future',2066),{statistics:{ppp:70571,ter:87,eys:16.1},access:{year:2066}});
 assert.deepEqual(educationEraInputs(c('JPN'),'past',1800),educationEraInputs(c('JPN'),'past',1950));
 assert.deepEqual(educationEraInputs(c('JPN'),'future',2200),educationEraInputs(c('JPN'),'future',2100));
 assert.deepEqual(educationEraInputs(c('JPN'),'past',2009.6),educationEraInputs(c('JPN'),'past',2010));
});
