import test from 'node:test';import assert from 'node:assert/strict';
import {publicOnlySchoolEra,historicalPrivateSchoolShare} from '../src/game/school-era';
const east={eastGermanOrigin:true,leftEastGermany:false,currentCountry:'DEU'};
test('private-school era boundaries follow the source country-specific reopening years',()=>{
 for(const [country,year] of [['CHN',1993],['VNM',1989],['RUS',1991],['LTU',1990],['POL',1989]] as const){
  assert.equal(publicOnlySchoolEra(country,year-1),true);assert.equal(publicOnlySchoolEra(country,year),false);
 }
 assert.equal(publicOnlySchoolEra('USA',1960),false);
 assert.equal(publicOnlySchoolEra('CUB',2026),true);assert.equal(publicOnlySchoolEra('PRK',2026),true);
});
test('Cambodia restriction is a bounded period, not every year before reopening',()=>{
 assert.equal(publicOnlySchoolEra('KHM',1978),false);assert.equal(publicOnlySchoolEra('KHM',1979),true);
 assert.equal(publicOnlySchoolEra('KHM',1988),true);assert.equal(publicOnlySchoolEra('KHM',1989),false);
});
test('German school access depends on documented eastern residence, not nationality alone',()=>{
 assert.equal(publicOnlySchoolEra('DEU',1989),false);
 assert.equal(publicOnlySchoolEra('DEU',1989,east),true);assert.equal(publicOnlySchoolEra('DEU',1990,east),false);
 assert.equal(publicOnlySchoolEra('DEU',1989,{...east,leftEastGermany:true}),false);
 assert.equal(publicOnlySchoolEra('DEU',1989,{...east,currentCountry:'FRA'}),false);
 assert.equal(publicOnlySchoolEra('DEU',1989,{...east,eastGermanOrigin:false}),false);
});
test('historical share adapter applies restriction before country data and retains post-reopening data',()=>{
 assert.equal(historicalPrivateSchoolShare('CHN','eap',1992),0);
 assert.equal(historicalPrivateSchoolShare('CHN','eap',1993),.09);
 assert.equal(historicalPrivateSchoolShare('DEU','hi',1989,east),0);
 assert.equal(historicalPrivateSchoolShare('DEU','hi',1989),.04);
 assert.equal(historicalPrivateSchoolShare('KHM','eap',1978),.06);
});
