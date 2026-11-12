import test from 'node:test';import assert from 'node:assert/strict';
import {prepareUpperSecondary,commitUpperSecondaryChoice} from '../src/game/upper-secondary-state';
import type {AcademicState} from '../src/game/school-model';
import {naturalFamily} from './helpers/adult-family-simulation';
import {encodeSave,decodeSave} from '../src/game/storage';
const context={country:'USA',birthCountry:'USA',year:2041,age:15,transition:.6,quintile:2,knowledgeZ:0,knowledge:50,urban:true,homeSchool:false,refugeeCamp:false,refugee:false,irregular:false,returning:false,specialist:null};
const graduated=():AcademicState=>({version:1,qualification:2,doctorate:false,medicine:false,studyCountry:'USA',enrollment:null,lastGraduation:{stage:'lowerSecondary',age:15,country:'USA'}});
const noDraw=()=>{throw Error('unexpected draw');};
function roundtrip(academic:AcademicState){const life=structuredClone([...naturalFamily(1)].find(l=>l.age>=15)!);life.academics=academic;return decodeSave(encodeSave(life,[])).life!.academics!;}
test('upper-secondary choice survives save and vocational enrollment starts at zero credit exactly once',()=>{
 const original=graduated(),ready=prepareUpperSecondary(original,context,false).academic;
 assert.equal(original.enrollment,null);assert.equal(ready.upperSecondary!.status,'pending');
 const loaded=roundtrip(ready),result=commitUpperSecondaryChoice(loaded,context,'voc',noDraw);
 assert.equal(result.academic.qualification,2);assert.equal(result.academic.enrollment!.stage,'vocational');
 assert.equal(result.academic.enrollment!.completedYears,0);assert.equal(result.academic.enrollment!.lastSettledAge,14);
 assert.ok(result.academic.enrollment!.retention);assert.deepEqual(roundtrip(result.academic),result.academic);
 assert.equal(commitUpperSecondaryChoice(result.academic,context,'voc',noDraw).effects,null);
 assert.equal(prepareUpperSecondary(result.academic,context,false).plan,null);
});
test('automatic home schooling and camp rejection persist without presenting another application',()=>{
 const home=prepareUpperSecondary(graduated(),{...context,homeSchool:true},false).academic;
 assert.equal(home.enrollment!.stage,'upperSecondary');assert.ok(home.enrollment!.retention);assert.deepEqual(roundtrip(home),home);
 const camp=prepareUpperSecondary(graduated(),{...context,refugeeCamp:true},false).academic;
 assert.equal(camp.upperSecondary!.status,'outOfSchool');assert.equal(camp.enrollment,null);
 assert.equal(prepareUpperSecondary(roundtrip(camp),context,false).plan,null);
});
test('rejected application returns effects once and never promotes qualification',()=>{
 const c={...context,country:'UGA',birthCountry:'UGA'},ready=prepareUpperSecondary(graduated(),c,false).academic;
 let draws=0;const result=commitUpperSecondaryChoice(ready,c,'go',()=>{draws++;return .99;});
 assert.equal(draws,1);assert.equal(result.effects!.happiness,-6);assert.equal(result.academic.qualification,2);
 assert.equal(result.academic.upperSecondary!.status,'outOfSchool');assert.equal(result.academic.enrollment,null);
 assert.equal(commitUpperSecondaryChoice(roundtrip(result.academic),c,'go',noDraw).effects,null);
});
test('missing graduation, separate paths and stale age or location never consume admission randomness',()=>{
 const a=graduated();delete a.lastGraduation;assert.equal(prepareUpperSecondary(a,context,false).plan,null);
 assert.equal(prepareUpperSecondary(graduated(),context,true).plan,null);
 assert.equal(prepareUpperSecondary(graduated(),{...context,returning:true},false).plan,null);
 const ready=prepareUpperSecondary(graduated(),context,false).academic;
 for(const c of [{...context,age:16},{...context,country:'UGA'},{...context,returning:true}])assert.equal(commitUpperSecondaryChoice(ready,c,'go',noDraw).effects,null);
});
test('specialist success is retained across reload and malformed receipt imports fail',()=>{
 const c={...context,specialist:{kind:'art' as const,hobby:'music',level:3}},ready=prepareUpperSecondary(graduated(),c,false).academic;
 const result=commitUpperSecondaryChoice(ready,c,'arts',()=>0);
 assert.equal(result.effects!.hobbyGain,2);assert.deepEqual(roundtrip(result.academic).specialistSchool,{kind:'art',hobby:'music'});
 for(const receipt of [{age:120,country:'USA',status:'pending'},{age:15,country:'ZZZ',status:'pending'},{age:15,country:'USA',status:'nonsense'}]){
 const a=graduated();(a as any).upperSecondary=receipt;assert.throws(()=>roundtrip(a));
 }
});
