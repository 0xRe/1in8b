import test from 'node:test';import assert from 'node:assert/strict';
import {academyEligible,resolveAcademy} from '../src/game/college-academy';
const eligibility={country:'USA',birthCountry:'USA',age:18,year:2026,historical:false,sex:'M' as const,knowledge:80,health:80,disability:null,immigrated:false,refugee:false,papersValid:true,married:false,idol:false,criminalRecord:false,religiousBelief:false};
const c={country:'USA',birthCountry:'USA',age:18,conditionalTertiary:.5,knowledgeZ:0,retaking:false,vocationalTrack:false,eraMultiplier:1,neurodevelopmentMultiplier:1,unsupportedAutism:false,kind:'ordinary' as const,job:'seeking' as const,knowledge:80,health:80};
test('academy eligibility applies source health, family, citizenship, disability and service exclusions',()=>{
 assert.equal(academyEligible(eligibility),true);assert.equal(academyEligible({...eligibility,disability:'hear'}),true);
 for(const extra of [{age:23},{knowledge:54},{health:59},{disability:'vision'},{immigrated:true},{refugee:true},{papersValid:false},{married:true},{idol:true},{criminalRecord:true},{country:'CAN'},{country:'CRI',birthCountry:'CRI'},{country:'CHN',birthCountry:'CHN',religiousBelief:true}])assert.equal(academyEligible({...eligibility,...extra}),false,JSON.stringify(extra));
});
test('academy eligibility preserves Japanese closure and female historical restrictions',()=>{
 const jp={...eligibility,country:'JPN',birthCountry:'JPN',historical:true};
 for(const year of [1946,1952])assert.equal(academyEligible({...jp,year}),false);
 assert.equal(academyEligible({...jp,year:1953}),true);
 assert.equal(academyEligible({...eligibility,sex:'F',historical:true,year:1989}),false);
 assert.equal(academyEligible({...eligibility,sex:'F',historical:true,year:1990}),true);
 assert.equal(academyEligible({...eligibility,sex:'F',country:'IRN',birthCountry:'IRN'}),false);
});
test('academy success has original effects and air branch threshold differs by health',()=>{
 const success=resolveAcademy(c,'navy',()=>0);assert.equal(success.academy,true);assert.equal(success.health,2);assert.equal(success.domestic.happiness,6);assert.equal(success.domestic.job,'student');
 assert.equal(resolveAcademy({...c,health:69},'air',()=>.1).academy,false);
 assert.equal(resolveAcademy({...c,health:70},'air',()=>.1).academy,true);
 const failed=resolveAcademy(c,'army',()=>.99);assert.equal(failed.domestic.happiness,-6);assert.equal(failed.domestic.retakeEligible,true);
});
test('Chinese academy rejection consumes a second domestic draw without adding ordinary academy failure effects',()=>{
 let draws=0;const result=resolveAcademy({...c,country:'CHN',birthCountry:'CHN'},'cn',()=>draws++===0?.99:0);
 assert.equal(draws,2);assert.equal(result.fallback,true);assert.equal(result.academy,false);assert.equal(result.domestic.status,'enrolled');assert.equal(result.domestic.happiness,5);assert.equal(result.health,0);
});
