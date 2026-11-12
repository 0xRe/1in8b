import test from 'node:test';import assert from 'node:assert/strict';
import {militaryPensionValue,startMilitaryPension,combinedMilitaryPension} from '../src/game/military-pension';
const c={years:20,lastIncome:10000,lastCountry:'USA',currentCountry:'USA',existing:null};
test('military pension uses twenty observed years, last military pay and the source Japan exclusion',()=>{
 assert.equal(militaryPensionValue({...c,years:19}),0);assert.equal(militaryPensionValue(c),3200);
 assert.equal(militaryPensionValue({...c,years:25}),10000*(.32+.018*5));assert.equal(militaryPensionValue({...c,years:40}),5000);
 assert.equal(militaryPensionValue({...c,lastCountry:'JPN'}),0);
 assert.equal(militaryPensionValue({...c,currentCountry:'JPN'}),3200);
 assert.equal(militaryPensionValue({...c,lastIncome:0}),0);
 assert.equal(militaryPensionValue({...c,years:0,existing:{value:900,startedAge:45}}),900);
});
test('pension begins after departure, not while serving, and an existing award is preserved',()=>{
 assert.equal(startMilitaryPension(c,40,true,0),null);assert.equal(startMilitaryPension(c,40,false,1),null);
 const award=startMilitaryPension(c,40,false,0)!;assert.deepEqual(award,{value:3200,startedAge:40});
 assert.equal(startMilitaryPension({...c,existing:award},41,false,0),award);
});
test('combined pension counts civilian formal years without double counting military service',()=>{
 assert.equal(combinedMilitaryPension(2000,0,30,20),2000);
 assert.equal(combinedMilitaryPension(2000,3200,20,20),3200);
 assert.equal(combinedMilitaryPension(2000,3200,40,20),4200);
 assert.equal(combinedMilitaryPension(5000,3200,20,20),5000);
});
