import test from 'node:test';
import assert from 'node:assert/strict';
import {pensionIndexFactor,indexMilitaryPension} from '../src/game/pension-index';
import {createLife,DEFAULT_SETTINGS} from '../src/game/engine';
import {getCountryById} from '../src/game/countries';
import {payEraCountry} from '../src/game/pay-era';
test('national pension index weights preserve transition years and capped positive/negative growth',()=>{
 assert.equal(pensionIndexFactor('USA',2026,100,200),1);
 assert.equal(pensionIndexFactor('GBR',2010,100,110),1);
 assert.ok(Math.abs(pensionIndexFactor('GBR',2011,100,110)-1.1)<1e-12);
 assert.equal(pensionIndexFactor('CHN',2004,100,110),1);
 assert.ok(Math.abs(pensionIndexFactor('CHN',2025,100,110)-1.1**.9)<1e-12);
 assert.ok(Math.abs(pensionIndexFactor('CHN',2026,100,110)-1.1**.4)<1e-12);
 assert.equal(pensionIndexFactor('DEU',2026,100,200),Math.exp(.15));
 assert.equal(pensionIndexFactor('NLD',2026,100,1),Math.exp(-.15));
 assert.equal(pensionIndexFactor('DEU',2026,0,100),1);
});
test('first observation only marks year; later indexing freezes pension country and never repeats',()=>{
 const life=createLife({...DEFAULT_SETTINGS,era:'future',country:'DEU'},1);
 const pension={value:10000,startedAge:0};
 let result=indexMilitaryPension(pension,undefined,life.country,life.era,2050);
 assert.equal(result.value,10000);assert.deepEqual(result.index,{year:2050});
 result=indexMilitaryPension({...pension,value:result.value},result.index,life.country,life.era,2051);
 const deu=getCountryById('DEU');const expected=10000*payEraCountry(deu,'future',2051).ppp/payEraCountry(deu,'future',2050).ppp;
 assert.ok(Math.abs(result.value-expected)<1e-8);assert.deepEqual(result.index,{year:2051,country:'DEU'});
 const repeated=indexMilitaryPension({...pension,value:result.value},result.index,getCountryById('USA'),'future',2051);
 assert.deepEqual(repeated,result);
 const migrated=indexMilitaryPension({...pension,value:result.value},result.index,getCountryById('USA'),'future',2052);
 assert.equal(migrated.index!.country,'DEU');assert.ok(migrated.value>result.value);
 const today=indexMilitaryPension(pension,undefined,deu,'today',2051);
 assert.equal(today.value,10000);assert.equal(today.index,undefined);
});

import {shouldAnnouncePensionIncrease} from '../src/game/pension-index';
test('pension increase notice requires over one percent, age fifty and no prior receipt',()=>{
 assert.equal(shouldAnnouncePensionIncrease(50,100,102,undefined),true);
 assert.equal(shouldAnnouncePensionIncrease(49,100,102,undefined),false);
 assert.equal(shouldAnnouncePensionIncrease(50,100,101,undefined),false);
 assert.equal(shouldAnnouncePensionIncrease(60,100,102,50),false);
 assert.equal(shouldAnnouncePensionIncrease(60,0,100,undefined),false);
 const next=indexMilitaryPension({value:10000,startedAge:40},{year:2050,country:'DEU',increaseAge:50},getCountryById('USA')!,'future',2051);
 assert.equal(next.index!.increaseAge,50);
});
