import test from 'node:test';
import assert from 'node:assert/strict';
import {educationAccess} from '../src/game/education-access';
import {getCountryById} from '../src/game/countries';
const country=(id:string)=>getCountryById(id)!;
const context={sex:'M' as const,quintile:3,urban:true};
test('completion calibration yields conditional transitions rather than raw national enrollment',()=>{
 const access=educationAccess(country('USA'),context);
 assert.ok(Math.abs(access.completion[0]-.995)<1e-12);
 assert.ok(Math.abs(access.completion[1]-.99)<1e-12);
 assert.ok(Math.abs(access.completion[2]-.92)<1e-12);
 assert.ok(Math.abs(access.transitions[1]-.9949748743718593)<1e-12);
 assert.notEqual(access.transitions[3],country('USA').ter/100);
});
test('household and rural disadvantage changes access while PRK school stages ignore household wealth',()=>{
 const poor=educationAccess(country('PAK'),{...context,quintile:1,urban:false});
 const rich=educationAccess(country('PAK'),{...context,quintile:5});
 assert.ok(poor.transitions.every((value,i)=>value<rich.transitions[i]));
 const female=educationAccess(country('PAK'),{...context,sex:'F',quintile:1,urban:false});
 assert.ok(female.transitions.every((value,i)=>value<poor.transitions[i]));
 const nkPoor=educationAccess(country('PRK'),{...context,quintile:1});
 const nkRich=educationAccess(country('PRK'),{...context,quintile:5});
 assert.deepEqual(nkPoor.transitions.slice(0,3),nkRich.transitions.slice(0,3));
 assert.ok(nkPoor.transitions[3]<nkRich.transitions[3]);
});
test('upper secondary override applies to modern cohorts and only after tertiary denominator calculation',()=>{
 const modern=educationAccess(country('KOR'),context);
 const historical=educationAccess(country('KOR'),{...context,year:1999});
 assert.equal(modern.completion[2],.995);
 assert.equal(modern.transitions[2],.989);
 assert.ok(historical.completion[2]<modern.completion[2]);
 assert.equal(historical.transitions[3],modern.transitions[3]);
});
test('historical closures and female education bans apply after positive personal modifiers',()=>{
 for(const [id,year] of [['CHN',1966],['CHN',1976],['KHM',1975],['IRN',1983]] as const){
  assert.equal(educationAccess(country(id),{...context,year}).universityClosed,true);
 }
 assert.equal(educationAccess(country('CHN'),{...context,year:1969}).transitions[3],0);
 assert.ok(educationAccess(country('CHN'),{...context,year:1970}).transitions[3]>0);
 for(const year of [1996,2001,2021,undefined]){
  const banned=educationAccess(country('AFG'),{...context,year,sex:'F',wealthBoost:10});
  assert.deepEqual(banned.transitions.slice(1),[0,0,0]);
  assert.equal(banned.secondaryBanned,true);
 }
 assert.equal(educationAccess(country('AFG'),{...context,year:2002,sex:'F'}).secondaryBanned,false);
 assert.deepEqual(educationAccess(country('KHM'),{...context,year:1979}).transitions,[0,0,0,0]);
 assert.equal(educationAccess(country('IRN'),{...context,year:1984}).universityClosed,false);
});
test('historical school scaling preserves qualification ordering and PRK 1975 exemption',()=>{
 const historical={primary:.5,secondary:.4};
 const scaled=educationAccess(country('USA'),{...context,year:1950,historical});
 assert.ok(Math.abs(scaled.completion[0]-.4975)<1e-12);
 assert.ok(scaled.completion[3]<=scaled.completion[2]*.95);
 const before=educationAccess(country('PRK'),{...context,year:1974,historical});
 const after=educationAccess(country('PRK'),{...context,year:1975,historical});
 assert.ok(before.completion[0]<after.completion[0]);
 assert.equal(after.completion[0],.99);
});

test('multiline country calibration entries remain present for UK school completion',()=>{
 const access=educationAccess(country('GBR'),context);
 assert.ok(Math.abs(access.completion[2]-.84)<1e-12);
 assert.ok(Math.abs(access.completion[0]-.9987635112972937)<1e-12);
});
