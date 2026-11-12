import test from 'node:test';import assert from 'node:assert/strict';
import {commitUpperSecondaryYear,commitSchoolWithdrawal,commitEquivalencyExam} from '../src/game/upper-secondary-year-state';
import type {AcademicState} from '../src/game/school-model';
import {naturalFamily} from './helpers/adult-family-simulation';
import {encodeSave,decodeSave} from '../src/game/storage';
const environment={age:16,country:'USA',persistent:false,developmentalProtection:false,homeSchool:false,quintile:4,war:0,militaryAcademy:false,studyAbroad:false,student:true,married:false,refugee:false,bullyingCount:0,knowledge:50};
const studying=():AcademicState=>({version:1,qualification:2,doctorate:false,medicine:false,studyCountry:'USA',enrollment:{stage:'upperSecondary',completedYears:1,lastSettledAge:16,paused:false,graduationPending:false,retention:.25}});
const noDraw=()=>{throw Error('unexpected draw');};
function roundtrip(a:AcademicState,age=17){const l=structuredClone([...naturalFamily(1)].find(l=>l.age>=age)!);l.academics=a;return decodeSave(encodeSave(l,[])).life!.academics!;}
test('risk settles once per observed year and queues a next-year withdrawal choice across reload',()=>{
 const start=studying();const result=commitUpperSecondaryYear(start,environment,()=>0);
 assert.equal(result.effects!.kind,'choice');assert.equal(start.enrollment!.retention,.25);
 const saved=roundtrip(result.academic);assert.equal(saved.enrollment!.retention,undefined);assert.equal(saved.secondaryProgress!.pending!.age,16);
 assert.equal(commitUpperSecondaryYear(saved,environment,noDraw).effects,null);
 assert.equal(commitSchoolWithdrawal(saved,{age:16,country:'USA',homeSchool:false},'stay').effects,null);
 const kept=commitSchoolWithdrawal(saved,{age:17,country:'USA',homeSchool:false},'stay');
 assert.equal(kept.effects!.happiness,-1);assert.equal(kept.academic.secondaryProgress!.committedToStay,true);
 assert.equal(kept.academic.secondaryProgress!.pending,null);assert.equal(kept.academic.enrollment!.completedYears,1);
 assert.equal(commitSchoolWithdrawal(roundtrip(kept.academic),{age:17,country:'USA',homeSchool:false},'stay').effects,null);
});
test('forced withdrawal preserves qualification and records actual course and study years',()=>{
 const result=commitUpperSecondaryYear(studying(),{...environment,quintile:2},()=>0);
 assert.equal(result.academic.enrollment,null);assert.equal(result.academic.qualification,2);
 assert.deepEqual(result.academic.lastWithdrawal,{stage:'upperSecondary',age:16,completedYears:1,country:'USA'});
 assert.deepEqual(roundtrip(result.academic),result.academic);
 assert.equal(commitUpperSecondaryYear(result.academic,environment,noDraw).effects,null);
 const unobserved=studying();unobserved.enrollment!.lastSettledAge=15;assert.equal(commitUpperSecondaryYear(unobserved,environment,noDraw).effects,null);
});
test('GED choice persists pending exam and failure consumes it without replay or qualification loss',()=>{
 const queued=commitUpperSecondaryYear(studying(),environment,()=>0).academic;
 const left=commitSchoolWithdrawal(queued,{age:17,country:'USA',homeSchool:false},'ged').academic;
 assert.equal(left.enrollment,null);assert.equal(left.qualification,2);assert.equal(left.equivalency!.examAt,18);
 const context={age:17,country:'USA',knowledge:40,learnWeight:0,studyWeight:0,collegeCompleted:false};
 const failed=commitEquivalencyExam(roundtrip(left),context,()=>.99);
 assert.equal(failed.effects!.passed,false);assert.equal(failed.academic.equivalency!.examAt,null);assert.equal(failed.academic.qualification,2);
 assert.equal(commitEquivalencyExam(roundtrip(failed.academic),context,noDraw).effects,null);
 const passed=commitEquivalencyExam(left,context,()=>0);
 assert.equal(passed.academic.qualification,3);assert.equal(passed.academic.equivalency!.collegePending,true);
 assert.equal(passed.academic.equivalency!.highSchoolPassAge,17);assert.deepEqual(roundtrip(passed.academic),passed.academic);
});
test('stale withdrawal choices and invalid progress/exam records cannot alter state or import',()=>{
 const queued=commitUpperSecondaryYear(studying(),environment,()=>0).academic;
 for(const c of [{age:18,country:'USA',homeSchool:false},{age:17,country:'UGA',homeSchool:false},{age:17,country:'USA',homeSchool:true}])assert.equal(commitSchoolWithdrawal(queued,c,'ged').effects,null);
 for(const patch of [{secondaryProgress:{settledAge:120,pending:null,answered:false,committedToStay:false}},{equivalency:{examAt:120,target:3}},{equivalency:{examAt:18,target:7}}])assert.throws(()=>roundtrip({...studying(),...patch} as AcademicState));
});
