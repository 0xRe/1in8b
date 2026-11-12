import test from 'node:test';import assert from 'node:assert/strict';
import {prepareCollege,commitCollegeAcademy} from '../src/game/college-state';
import {collegeMenu} from '../src/game/college-menu';
import type {AcademicState} from '../src/game/school-model';
import {naturalFamily} from './helpers/adult-family-simulation';import {encodeSave,decodeSave} from '../src/game/storage';
const c={country:'USA',birthCountry:'USA',year:2044,age:18,historical:false,imprisoned:false,rohingyaCamp:false,rohingyaRakhine:false,job:'seeking' as const,kind:'ordinary' as const,retaking:false,vocationalTrack:false,conditionalTertiary:.5,knowledgeZ:0,eraMultiplier:1,neurodevelopmentMultiplier:1,unsupportedAutism:false,knowledge:80,health:80};
const academic=():AcademicState=>({version:1,qualification:3,doctorate:false,medicine:false,studyCountry:'USA',enrollment:null,lastGraduation:{stage:'upperSecondary',age:18,country:'USA'}});
function ready(country='USA'){return prepareCollege(academic(),{...c,country},collegeMenu({country,kind:'ordinary',working:false,domesticFallback:false,freeExit:false,papersValid:true,familyAbroad:false,recentlyFled:false,money:0,abroadCost:100,academyEligible:true,japaneseDefenseAcademy:false})).academic;}
function roundtrip(a:AcademicState){const l=structuredClone([...naturalFamily(1)].find(l=>l.age>=18)!);l.academics=a;return decodeSave(encodeSave(l,[])).life!.academics!;}
const noDraw=()=>{throw Error('unexpected draw');};
test('naval admission saves offered options, military major and branch without degree credit',()=>{
 const pending=roundtrip(ready());assert.deepEqual(pending.college!.choices,['apply','work','army','navy','air']);
 const r=commitCollegeAcademy(pending,c,'navy',true,()=>0);assert.equal(r.effects!.academy,true);assert.deepEqual(r.academic.academy,{branch:'navy',startedAge:18,major:'mil'});assert.equal(r.academic.qualification,3);assert.equal(r.academic.enrollment!.completedYears,0);
 assert.deepEqual(roundtrip(r.academic),r.academic);assert.equal(commitCollegeAcademy(r.academic,c,'navy',true,noDraw).effects,null);
});
test('unoffered, stale and newly ineligible academy choices never draw',()=>{
 const plain=prepareCollege(academic(),c).academic;assert.equal(commitCollegeAcademy(plain,c,'army',true,noDraw).effects,null);
 for(const changed of [{...c,age:19},{...c,country:'FRA'},{...c,imprisoned:true}])assert.equal(commitCollegeAcademy(ready(),changed,'army',true,noDraw).effects,null);
 assert.equal(commitCollegeAcademy(ready(),c,'army',false,noDraw).effects,null);
 assert.equal(commitCollegeAcademy(ready('CHN'),{...c,country:'CHN'},'navy',true,noDraw).effects,null);
});
test('Chinese fallback enrollment is civilian and malformed branch receipts are rejected',()=>{
 let draws=0;const r=commitCollegeAcademy(ready('CHN'),{...c,country:'CHN',birthCountry:'CHN'},'army',true,()=>draws++===0?.99:0);
 assert.equal(draws,2);assert.equal(r.academic.enrollment!.stage,'university');assert.equal(r.academic.academy,undefined);assert.ok(roundtrip(r.academic));
 const invalid=ready();invalid.college!.choices.push('navy');assert.throws(()=>roundtrip(invalid));
});
