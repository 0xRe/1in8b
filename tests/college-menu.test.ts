import test from 'node:test';import assert from 'node:assert/strict';
import {collegeMenu} from '../src/game/college-menu';
const c={country:'USA',kind:'ordinary' as const,working:false,domesticFallback:false,freeExit:true,papersValid:true,familyAbroad:false,recentlyFled:false,money:0,abroadCost:100,academyEligible:false,japaneseDefenseAcademy:false};
test('overseas choices distinguish family support, self funding, locked cost and recent flight',()=>{
 assert.deepEqual(collegeMenu(c),{choices:['apply','work'],abroad:'locked',academy:null});
 for(const extra of [{familyAbroad:true},{money:100}])assert.equal(collegeMenu({...c,...extra}).abroad,'study');
 assert.equal(collegeMenu({...c,familyAbroad:true,recentlyFled:true}).abroad,'scholarship');
 assert.equal(collegeMenu({...c,recentlyFled:true}).abroad,'hidden');
 assert.deepEqual(collegeMenu({...c,money:100}).choices,['apply','work','abroad']);
});
test('reopening and employed equivalency suppress extra paths, domestic fallback only suppresses abroad',()=>{
 for(const extra of [{kind:'reopened' as const},{kind:'equivalency' as const,working:true}])assert.deepEqual(collegeMenu({...c,...extra,academyEligible:true,familyAbroad:true}).choices,['apply','work']);
 assert.deepEqual(collegeMenu({...c,kind:'equivalency',academyEligible:true,familyAbroad:true}).choices,['apply','work','abroad','army','navy','air']);
 assert.deepEqual(collegeMenu({...c,domesticFallback:true,academyEligible:true,familyAbroad:true}).choices,['apply','work','army','navy','air']);
 for(const extra of [{freeExit:false},{papersValid:false}])assert.equal(collegeMenu({...c,...extra,familyAbroad:true}).abroad,'hidden');
});
test('military options preserve country branch families and original ordering',()=>{
 assert.deepEqual(collegeMenu({...c,academyEligible:true}).choices,['apply','work','army','navy','air']);
 assert.equal(collegeMenu({...c,country:'JPN',academyEligible:true,japaneseDefenseAcademy:true}).academy,'jp');
 assert.equal(collegeMenu({...c,country:'CHN',academyEligible:true}).academy,'cn');
 assert.deepEqual(collegeMenu({...c,country:'DEU',academyEligible:true}).choices,['apply','work','army']);
});
