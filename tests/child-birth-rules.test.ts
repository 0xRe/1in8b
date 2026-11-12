import test from 'node:test';
import assert from 'node:assert/strict';
import {getCountryById} from '../src/game/countries';
import {childBirthOutcome} from '../src/game/child-birth';
const base=()=>({age:32,sex:'F' as const,alive:true,university:false,existingChildren:0,target:2,married:true,cohabiting:false,sameSexPartner:false,imprisoned:false,cutOff:false,separatedStepfamily:false,playerCountry:getCountryById('USA')!,residenceCountry:getCountryById('USA')!,year:2050,past:false});
const draws=(...v:number[])=>()=>{assert.ok(v.length,'unexpected RNG consumption');return v.shift()!;};
test('married and cohabiting births use annual .4 chance without spouse age or spacing gates',()=>{
 assert.equal(childBirthOutcome(base(),draws(.399))?.union,'married');assert.equal(childBirthOutcome(base(),draws(.4)),null);
 assert.equal(childBirthOutcome({...base(),married:false,cohabiting:true},draws(.1))?.union,'cohabiting');
});
test('solo births require additional regional probability and male-parent custody',()=>{
 const c={...base(),married:false};assert.equal(childBirthOutcome(c,draws(.1,.039))?.household,'parent');assert.equal(childBirthOutcome(c,draws(.1,.4*.1)),null);
 assert.equal(childBirthOutcome({...c,sex:'M',age:35},draws(.1,.001))?.household,'otherParent');
 assert.equal(childBirthOutcome({...c,playerCountry:getCountryById('JPN')!},draws(.1,.003)),null);
});
test('dead, imprisoned, cutoff, separated and target-complete parents consume no birth RNG',()=>{
 for(const patch of [{alive:false},{imprisoned:true},{cutOff:true},{separatedStepfamily:true},{target:0},{existingChildren:2}])assert.equal(childBirthOutcome({...base(),...patch},draws()),null);
});
test('sex and university birth windows differ from the old universal20..48 window',()=>{
 assert.ok(childBirthOutcome({...base(),age:44},draws(.1)));assert.equal(childBirthOutcome({...base(),age:45},draws()),null);
 assert.ok(childBirthOutcome({...base(),sex:'M',age:50},draws(.1)));assert.equal(childBirthOutcome({...base(),sex:'M',age:51},draws()),null);
 const country={...getCountryById('NGA')!,cm:100,tfr:6};
 assert.ok(childBirthOutcome({...base(),age:18,playerCountry:country},draws(.1)));
 assert.equal(childBirthOutcome({...base(),age:24,university:true,playerCountry:country},draws()),null);
 assert.ok(childBirthOutcome({...base(),age:25,university:true,playerCountry:country},draws(.1)));
});
test('same-sex routes use residence country rather than player fertility context',()=>{
 assert.equal(childBirthOutcome({...base(),sameSexPartner:true,residenceCountry:getCountryById('JPN')!},draws()),null);
 assert.equal(childBirthOutcome({...base(),sameSexPartner:true,playerCountry:getCountryById('JPN')!},draws(.1,.69))?.method,'donor');
 assert.equal(childBirthOutcome({...base(),sameSexPartner:true},draws(.1,.7))?.method,'adoption');
 assert.equal(childBirthOutcome({...base(),sameSexPartner:true,sex:'M',age:35},draws(.1,.34))?.method,'surrogacy');
});
