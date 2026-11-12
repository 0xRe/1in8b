import test from 'node:test';import assert from 'node:assert/strict';
import {commissionAcademy} from '../src/game/academy-commission';
import type {AcademicState} from '../src/game/school-model';
import {naturalFamily} from './helpers/adult-family-simulation';import {encodeSave,decodeSave} from '../src/game/storage';
function graduate():AcademicState{return {version:1,qualification:3,doctorate:false,medicine:false,studyCountry:'USA',enrollment:{stage:'university',completedYears:4,lastSettledAge:21,paused:false,graduationPending:true},college:{age:18,country:'USA',kind:'ordinary',status:'enrolled',closureYear:null,choices:['apply','work','army','navy','air'],academyOffer:'threeBranches'},academy:{branch:'navy',startedAge:18,major:'mil'}};}
function roundtrip(a:AcademicState){const l=structuredClone([...naturalFamily(1)].find(l=>l.age>=30)!);l.academics=a;return decodeSave(encodeSave(l,[])).life!.academics!;}
test('academy graduation awards a degree once and returns formal officer job with source entry percentile',()=>{
 const result=commissionAcademy(roundtrip(graduate()),22,'USA',1);
 assert.equal(result.academic.qualification,4);assert.equal(result.academic.enrollment,null);assert.equal(result.academic.academy!.commissionedAge,22);
 assert.deepEqual(result.effect,{job:'soldier',formal:true,percentile:.68+.03,officerSince:22,branch:'navy',suppressContinuation:true});
 assert.deepEqual(roundtrip(result.academic),result.academic);assert.equal(commissionAcademy(result.academic,22,'USA',1).effect,null);
 assert.equal(commissionAcademy(graduate(),22,'USA',1.4).effect!.percentile,.68**1.4+.03);
});
test('unobserved final years, same-year completion and invalid commission imports cannot create officers',()=>{
 const a=graduate();a.enrollment!.completedYears=3;a.enrollment!.graduationPending=false;assert.equal(commissionAcademy(a,22,'USA',1).effect,null);
 assert.equal(commissionAcademy(graduate(),21,'USA',1).effect,null);
 const invalid=graduate();invalid.academy!.commissionedAge=22;assert.throws(()=>roundtrip(invalid));
});
