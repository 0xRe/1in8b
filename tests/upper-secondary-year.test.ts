import test from 'node:test';import assert from 'node:assert/strict';
import {settleUpperSecondaryRisk,resolveSchoolWithdrawal,settleEquivalencyExam} from '../src/game/upper-secondary-year';
const base={age:16,country:'USA',stage:'upperSecondary' as const,completedYears:1,duration:3,retention:.25,persistent:false,developmentalProtection:false,homeSchool:false,quintile:4,war:0,withdrawalAnswered:false,committedToStay:false,militaryAcademy:false,studyAbroad:false,student:true,married:false,refugee:false,bullyingCount:0,knowledge:50};
const noDraw=()=>{throw Error('unexpected draw');};
function draws(...values:number[]){let i=0;return ()=>{assert.ok(i<values.length,'unexpected extra draw');return values[i++];};}
test('cohort risk offers eligible students a choice but forces disadvantaged pupils out',()=>{
 assert.deepEqual(settleUpperSecondaryRisk(base,draws(.49)),{kind:'choice',reason:'marks',mandatory:true,clearRetention:true});
 assert.deepEqual(settleUpperSecondaryRisk({...base,quintile:3},draws(.49)),{kind:'withdraw',clearRetention:true,happiness:-4,job:'seeking'});
 assert.equal(settleUpperSecondaryRisk({...base,age:14},draws(.49)).job,'childwork');
 assert.equal(settleUpperSecondaryRisk({...base,homeSchool:true},draws(.49)).kind,'withdraw');
 assert.equal(settleUpperSecondaryRisk({...base,country:'PRK'},draws(.49)).kind,'withdraw');
});
test('risk clears after prior commitment without forcing another choice; final year and protected students skip draws',()=>{
 assert.deepEqual(settleUpperSecondaryRisk({...base,committedToStay:true},draws(0)),{kind:'continue',clearRetention:true});
 assert.deepEqual(settleUpperSecondaryRisk({...base,withdrawalAnswered:true},draws(0)),{kind:'continue',clearRetention:true});
 assert.deepEqual(settleUpperSecondaryRisk({...base,completedYears:3},noDraw),{kind:'continue',clearRetention:true});
 assert.deepEqual(settleUpperSecondaryRisk({...base,developmentalProtection:true},noDraw),{kind:'continue',clearRetention:false});
 assert.equal(settleUpperSecondaryRisk({...base,persistent:true},draws(.45)).kind,'continue');
});
test('voluntary withdrawal selects a reason before its seven-percent occurrence draw',()=>{
 const c={...base,retention:undefined,bullyingCount:1,knowledge:30,quintile:2};
 assert.deepEqual(settleUpperSecondaryRisk(c,draws(.4,.06)),{kind:'choice',reason:'marks',mandatory:false,clearRetention:false});
 assert.equal(settleUpperSecondaryRisk(c,draws(.9,.07)).kind,'continue');
 assert.equal(settleUpperSecondaryRisk({...c,country:'KOR',knowledge:80,quintile:4,bullyingCount:0},draws(0,.01)).reason,'exam');
 assert.equal(settleUpperSecondaryRisk({...base,retention:undefined},noDraw).kind,'continue');
});
test('voluntary-choice gates suppress all reason and occurrence draws',()=>{
 for(const patch of [{age:18},{age:14},{married:true},{refugee:true},{war:1},{studyAbroad:true},{militaryAcademy:true},{student:false},{homeSchool:true},{withdrawalAnswered:true},{committedToStay:true},{developmentalProtection:true},{country:'PRK'}]){
 assert.equal(settleUpperSecondaryRisk({...base,retention:undefined,bullyingCount:1,...patch},noDraw).kind,'continue');
 }
});
test('withdrawal choices preserve exam motivation and relief from bullying; GED does not grant a diploma immediately',()=>{
 assert.deepEqual(resolveSchoolWithdrawal('stay','exam',16),{leave:false,committedToStay:true,happiness:0,knowledge:1,examAt:null});
 assert.equal(resolveSchoolWithdrawal('stay','marks',16).happiness,-1);
 assert.deepEqual(resolveSchoolWithdrawal('ged','bullying',16),{leave:true,committedToStay:false,happiness:2,knowledge:0,examAt:17});
 assert.deepEqual(resolveSchoolWithdrawal('work','money',16),{leave:true,committedToStay:false,happiness:-2,knowledge:0,examAt:null});
});
const exam={age:17,examAt:18,target:3 as const,qualification:2,knowledge:40,learnWeight:0,studyWeight:0,country:'USA',collegeCompleted:false};
test('equivalency settles at the end-year boundary, preserves qualifications on failure, and uses strict success threshold',()=>{
 assert.equal(settleEquivalencyExam({...exam,examAt:19},noDraw),null);
 assert.equal(settleEquivalencyExam({...exam,examAt:null},noDraw),null);
 assert.deepEqual(settleEquivalencyExam(exam,draws(.72)),{passed:false,qualification:2,happiness:-3,knowledge:0,queueCollege:false,highSchoolPassAge:null});
 assert.deepEqual(settleEquivalencyExam(exam,draws(.719)),{passed:true,qualification:3,happiness:6,knowledge:2,queueCollege:true,highSchoolPassAge:17});
});
test('equivalency grades include observed study shares and retain college age and PRK limits',()=>{
 assert.equal(settleEquivalencyExam({...exam,learnWeight:.5,studyWeight:.5},draws(.8))!.passed,true);
 assert.equal(settleEquivalencyExam({...exam,knowledge:100},draws(.92))!.passed,false);
 for(const patch of [{age:26},{country:'PRK'},{collegeCompleted:true},{target:2 as const}])assert.equal(settleEquivalencyExam({...exam,...patch},draws(0))!.queueCollege,false);
 assert.equal(settleEquivalencyExam({...exam,age:25},draws(0))!.queueCollege,true);
 assert.equal(settleEquivalencyExam({...exam,target:1,qualification:2},draws(0))!.qualification,2);
});
