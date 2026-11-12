import test from 'node:test';import assert from 'node:assert/strict';
import {prepareCollege,commitCollege} from '../src/game/college-state';
import type {AcademicState} from '../src/game/school-model';
import {naturalFamily} from './helpers/adult-family-simulation';
import {encodeSave,decodeSave} from '../src/game/storage';
const c={country:'USA',birthCountry:'USA',year:2044,age:18,historical:false,imprisoned:false,rohingyaCamp:false,rohingyaRakhine:false,job:'seeking' as const,kind:'ordinary' as const,retaking:false,vocationalTrack:false,conditionalTertiary:.5,knowledgeZ:0,eraMultiplier:1,neurodevelopmentMultiplier:1,unsupportedAutism:false};
const academic=():AcademicState=>({version:1,qualification:3,doctorate:false,medicine:false,studyCountry:'USA',enrollment:null,lastGraduation:{stage:'upperSecondary',age:18,country:'USA'}});
function roundtrip(a:AcademicState){const l=structuredClone([...naturalFamily(1)].find(l=>l.age>=18)!);l.academics=a;return decodeSave(encodeSave(l,[])).life!.academics!;}
const noDraw=()=>{throw Error('unexpected draw');};
test('college offer and enrollment survive saves without manufacturing a completed degree or repeated effects',()=>{
 const a=prepareCollege(academic(),c).academic;assert.equal(a.college!.status,'pending');
 const r=commitCollege(roundtrip(a),c,'apply',()=>0);assert.equal(r.effects!.status,'enrolled');assert.equal(r.academic.qualification,3);assert.equal(r.academic.enrollment!.completedYears,0);
 assert.deepEqual(roundtrip(r.academic),r.academic);assert.equal(commitCollege(r.academic,c,'apply',noDraw).effects,null);
});
test('closure and camp effects are recorded once, prison and missing graduation do not create offers',()=>{
 const closed={...c,country:'CHN',historical:true,year:1968};const r=prepareCollege(academic(),closed);assert.equal(r.gate!.reason,'closed');assert.equal(r.academic.college!.closureYear,1968);
 assert.equal(prepareCollege(roundtrip(r.academic),closed).gate,null);
 assert.equal(prepareCollege(academic(),{...c,imprisoned:true}).academic.college,undefined);
 const missing=academic();delete missing.lastGraduation;assert.equal(prepareCollege(missing,c).academic.college,undefined);
});
test('GED offer consumes its pending marker and stale age, country or prison choices consume no RNG',()=>{
 const a=academic();delete a.lastGraduation;a.equivalency={examAt:null,target:3,highSchoolPassAge:18,collegePending:true};
 const eq={...c,kind:'equivalency' as const};const ready=prepareCollege(a,eq).academic;assert.equal(ready.equivalency!.collegePending,false);
 for(const stale of [{...eq,age:19},{...eq,country:'FRA'},{...eq,imprisoned:true}])assert.equal(commitCollege(roundtrip(ready),stale,'apply',noDraw).effects,null);
 const corrupt=structuredClone(ready);corrupt.college!.status='invalid' as never;assert.throws(()=>roundtrip(corrupt));
});

test('domestic resolution rejects omitted and foreign choice ids without RNG or state writes',()=>{
 for(const [choices,choice] of [[['work'],'apply'],[['apply'],'work'],[['apply','work'],'abroad'],[['apply','work'],'unknown']] as const){
  const ready=prepareCollege(academic(),c,{choices:[...choices],abroad:'hidden',academy:null}).academic;
  const before=structuredClone(ready);
  const result=commitCollege(ready,c,choice as 'apply'|'work',noDraw);
  assert.equal(result.effects,null);
  assert.equal(result.academic,ready);
  assert.deepEqual(ready,before);
 }
});
