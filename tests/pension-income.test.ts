import test from 'node:test';import assert from 'node:assert/strict';
import {composePensionIncome} from '../src/game/pension-income';
const c={branch:'working' as const,earnedIncome:10000,militaryPension:3000,ordinaryPension:2000,retiredPension:1500,ordinaryEligible:false,soldier:false,prison:false};
test('working military pension supplements wages only outside military work and ordinary pension takes precedence',()=>{
 assert.equal(composePensionIncome(c),13000);
 assert.equal(composePensionIncome({...c,soldier:true}),10000);
 assert.equal(composePensionIncome({...c,ordinaryEligible:true}),12000);
 assert.equal(composePensionIncome({...c,ordinaryEligible:true,ordinaryPension:0}),10000);
});
test('seeking and retired incomes replace stale wages and take the larger pension instead of summing them',()=>{
 assert.equal(composePensionIncome({...c,branch:'seekingPension'}),3000);
 assert.equal(composePensionIncome({...c,branch:'seekingPension',ordinaryPension:4000}),4000);
 assert.equal(composePensionIncome({...c,branch:'retired'}),3000);
 assert.equal(composePensionIncome({...c,branch:'retired',retiredPension:5000}),5000);
 assert.equal(composePensionIncome({...c,branch:'inactive',militaryPension:0}),0);
});
test('service and child-work earnings exclude military supplements; non-retired prison income excludes pension',()=>{
 assert.equal(composePensionIncome({...c,branch:'service'}),10000);
 assert.equal(composePensionIncome({...c,branch:'childwork'}),10000);
 assert.equal(composePensionIncome({...c,branch:'inactive',prison:true}),0);
 assert.equal(composePensionIncome({...c,branch:'inactive'}),3000);
});
