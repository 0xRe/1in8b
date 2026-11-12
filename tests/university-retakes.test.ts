import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyUniversityAdmissions,offerUniversityRetake,chooseUniversityRetake,consumeUniversityRetake} from '../src/game/university-retakes';
const context={country:'JPN',age:18,quintile:3,happiness:70,ppp:47000,married:false,refugee:false,irregular:false,imprisoned:false,working:false};
test('failed applications offer preparation, not enrollment; accepting schedules the following year once',()=>{
 const empty=emptyUniversityAdmissions();
 const offered=offerUniversityRetake(empty,context,'ordinary');
 assert.deepEqual(offered.offer,{country:'JPN',age:18,retakes:0});
 assert.equal(offered.scheduledAge,null);assert.equal(offered.retakes,0);
 const accepted=chooseUniversityRetake(offered,'prepare',context);
 assert.equal(accepted.state.retakes,1);assert.equal(accepted.state.scheduledAge,19);assert.equal(accepted.state.offer,null);
 assert.deepEqual(accepted.effect,{happiness:-3,knowledge:2,becomeStudent:true});
 assert.deepEqual(chooseUniversityRetake(accepted.state,'prepare',context),{state:accepted.state,effect:null});
 assert.equal(empty.offer,null);
});
test('work ends future invitations; reopened and employed equivalency rejection do not offer a retake',()=>{
 const offered=offerUniversityRetake(emptyUniversityAdmissions(),context,'ordinary');
 const declined=chooseUniversityRetake(offered,'work',context);
 assert.equal(declined.state.declined,true);assert.equal(declined.state.scheduledAge,null);
 assert.equal(offerUniversityRetake(declined.state,context,'ordinary').offer,null);
 for(const kind of ['reopened','equivalency'] as const)assert.equal(offerUniversityRetake(emptyUniversityAdmissions(),{...context,working:true},kind).offer,null);
});
test('queued retake offer is dismissed after migration, irregular status, imprisonment or a stale year',()=>{
 const offered=offerUniversityRetake(emptyUniversityAdmissions(),context,'ordinary');
 for(const changed of [{country:'USA'},{irregular:true},{imprisoned:true},{age:19}]){
  const result=chooseUniversityRetake(offered,'prepare',{...context,...changed});
  assert.equal(result.effect,null);assert.equal(result.state.offer,null);assert.equal(result.state.scheduledAge,null);assert.equal(result.state.retakes,0);
 }
});
test('service delays an already planned exam; eligibility is rechecked once service ends',()=>{
 const scheduled=chooseUniversityRetake(offerUniversityRetake(emptyUniversityAdmissions(),context,'ordinary'),'prepare',context).state;
 const due={age:19,serving:false,enrolled:false,job:'student' as const,married:false};
 assert.equal(consumeUniversityRetake(scheduled,{...due,age:18}).state,scheduled);
 assert.equal(consumeUniversityRetake(scheduled,{...due,age:24,serving:true}).state,scheduled);
 const released=consumeUniversityRetake(scheduled,{...due,age:25});
 assert.equal(released.apply,true);assert.equal(released.state.scheduledAge,null);
 assert.equal(consumeUniversityRetake(released.state,due).apply,false);
 for(const changed of [{age:26},{enrolled:true},{job:'other' as const},{married:true}]){
  const cancelled=consumeUniversityRetake(scheduled,{...due,...changed});
  assert.equal(cancelled.apply,false);assert.equal(cancelled.state.scheduledAge,null);
 }
});
test('quota and household restrictions stop ordinary rejection from scheduling another invitation',()=>{
 const two={...emptyUniversityAdmissions(),retakes:2};
 assert.equal(offerUniversityRetake(two,context,'ordinary').offer,null);
 assert.notEqual(offerUniversityRetake(two,{...context,quintile:4},'ordinary').offer,null);
 assert.equal(offerUniversityRetake(emptyUniversityAdmissions(),{...context,country:'PAK',ppp:5000,quintile:2},'ordinary').offer,null);
});

test('unemployed equivalency applicants can prepare again when ordinary eligibility permits',()=>{
 const offered=offerUniversityRetake(emptyUniversityAdmissions(),context,'equivalency');
 assert.deepEqual(offered.offer,{country:'JPN',age:18,retakes:0});
 assert.equal(chooseUniversityRetake(offered,'prepare',context).state.scheduledAge,19);
 assert.equal(offerUniversityRetake(emptyUniversityAdmissions(),{...context,country:'PAK',ppp:5000,quintile:2},'equivalency').offer,null);
});
