import test from 'node:test';import assert from 'node:assert/strict';
import {collegeEntryGate} from '../src/game/college-entry';
const c={country:'USA',year:2026,historical:false,imprisoned:false,job:'student' as const,rohingyaCamp:false,rohingyaRakhine:false};
test('prison blocks before other restrictions and does not change employment or happiness',()=>{
 assert.deepEqual(collegeEntryGate({...c,imprisoned:true,rohingyaCamp:true}),{reason:'prison',job:'keep',happiness:0,closureYear:null});
});
test('Rohingya restrictions preserve source location and inclusive calendar boundaries',()=>{
 assert.equal(collegeEntryGate({...c,country:'BGD',rohingyaCamp:true}).reason,'camp');
 assert.equal(collegeEntryGate({...c,rohingyaCamp:true}).reason,'allowed');
 for(const year of [2012,2021])assert.deepEqual(collegeEntryGate({...c,country:'MMR',year,rohingyaRakhine:true}),{reason:'rakhine',job:'seeking',happiness:-4,closureYear:null});
 for(const year of [2011,2022])assert.equal(collegeEntryGate({...c,country:'MMR',year,rohingyaRakhine:true}).reason,'allowed');
});
test('historical closure uses current country and preserves nonstudent jobs',()=>{
 for(const [country,start,end] of [['CHN',1966,1976],['KHM',1975,1979],['IRN',1980,1983]] as const){
  for(const year of [start,end])assert.deepEqual(collegeEntryGate({...c,country,year,historical:true}),{reason:'closed',job:'seeking',happiness:0,closureYear:year});
  for(const year of [start-1,end+1])assert.equal(collegeEntryGate({...c,country,year,historical:true}).reason,'allowed');
  assert.equal(collegeEntryGate({...c,country,year:start,historical:false}).reason,'allowed');
  assert.equal(collegeEntryGate({...c,country,year:start,historical:true,job:'working'}).job,'keep');
 }
});
