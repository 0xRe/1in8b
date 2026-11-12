import test from 'node:test';
import assert from 'node:assert/strict';
import {schoolDuration,settleSchoolYear,graduateSchool,schoolFocusStage,type SchoolState} from '../src/game/school-model';
const school=(stage:SchoolState['stage'],years=0):SchoolState=>({stage,completedYears:years,lastSettledAge:18,paused:false,graduationPending:false});
test('school durations distinguish every stage and medical study location',()=>{
 const cases=[['primary',6],['lowerSecondary',3],['upperSecondary',3],['vocational',3],['university',4],['graduate',2],['phd',5]] as const;
 for(const [stage,years] of cases)assert.equal(schoolDuration(stage,'JPN',false),years);
 for(const country of ['CHN','GBR','IND','PAK','BGD','NPL','LKA'])assert.equal(schoolDuration('university',country,true),5);
 for(const country of ['USA','CAN'])assert.equal(schoolDuration('university',country,true),4);
 assert.equal(schoolDuration('university','JPN',true),6);
 assert.equal(schoolDuration('university','JPN',true,'GBR'),5);
 assert.equal(schoolDuration('graduate','GBR',true),2);
});
test('study settlement is resumable and graduation is a separate boundary',()=>{
 const initial=school('university',3);
 const due=settleSchoolYear(initial,19,4);
 assert.equal(due.completedYears,4);assert.equal(due.graduationPending,true);
 assert.deepEqual(settleSchoolYear(due,19,4),due);
 assert.deepEqual(initial,school('university',3));
 assert.deepEqual(graduateSchool(due,3,false),{school:null,education:4,doctorate:false,graduated:'university'});
 assert.deepEqual(graduateSchool(initial,3,false),{school:initial,education:3,doctorate:false,graduated:null});
});
test('interrupted study does not accrue years and resumption does not backfill missed years',()=>{
 const paused={...school('graduate'),paused:true};
 assert.equal(settleSchoolYear(paused,25,2).completedYears,0);
 const resumed=settleSchoolYear({...paused,paused:false},26,2);
 assert.equal(resumed.completedYears,1);assert.equal(resumed.graduationPending,false);
 assert.equal(settleSchoolYear(resumed,27,2).graduationPending,true);
});
test('graduation preserves higher qualifications and records doctorate separately',()=>{
 assert.equal(graduateSchool({...school('vocational',3),graduationPending:true},4,false).education,4);
 assert.deepEqual(graduateSchool({...school('phd',5),graduationPending:true},5,false),{school:null,education:5,doctorate:true,graduated:'phd'});
 assert.equal(graduateSchool({...school('graduate',2),graduationPending:true},4,false).education,5);
});
test('focus stages follow actual enrollment rather than age or completed qualification',()=>{
 assert.equal(schoolFocusStage(school('upperSecondary')),'basic');
 assert.equal(schoolFocusStage(school('university')),'university');
 assert.equal(schoolFocusStage(school('graduate')),'graduate');
 assert.equal(schoolFocusStage(school('phd')),'phd');
 assert.equal(schoolFocusStage({...school('university'),paused:true}),null);
 assert.equal(schoolFocusStage(null),null);
});
test('language preparation settles once without awarding a degree year',()=>{
 const initial={...school('university'),preparationYears:1 as const};
 const prepared=settleSchoolYear(initial,19,4);
 assert.equal(prepared.completedYears,0);assert.equal(prepared.graduationPending,false);
 assert.equal(prepared.lastSettledAge,19);assert.equal((prepared as typeof initial).preparationYears,0);
 assert.equal(settleSchoolYear(prepared,19,4),prepared);
 assert.equal(settleSchoolYear(prepared,20,4).completedYears,1);
 assert.equal(graduateSchool(prepared,3,false).graduated,null);
});
test('a paused preparation year waits for an observed resumed year',()=>{
 const paused={...school('graduate'),preparationYears:1 as const,paused:true};
 assert.equal(settleSchoolYear(paused,24,2),paused);
 const resumed=settleSchoolYear({...paused,paused:false},25,2);
 assert.equal(resumed.completedYears,0);
 assert.equal(settleSchoolYear(resumed,26,2).graduationPending,false);
 assert.equal(settleSchoolYear(settleSchoolYear(resumed,26,2),27,2).graduationPending,true);
});
