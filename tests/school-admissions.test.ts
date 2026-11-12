import test from 'node:test';
import assert from 'node:assert/strict';
import {retakeEligibility, universityAdmissionProbability, graduateAdmissionProbability} from '../src/game/school-admissions';
const candidate={country:'JPN',age:22,attempts:1,quintile:3,happiness:35,ppp:15000,married:false,refugee:false,irregular:false,imprisoned:false};
test('retakes respect country quota, household support and exact age/money boundaries',()=>{
 assert.equal(retakeEligibility(candidate),'eligible');
 assert.equal(retakeEligibility({...candidate,attempts:2}),'ineligible');
 assert.equal(retakeEligibility({...candidate,attempts:2,quintile:4}),'eligible');
 assert.equal(retakeEligibility({...candidate,attempts:2,quintile:4,happiness:34}),'ineligible');
 assert.equal(retakeEligibility({...candidate,country:'USA'}),'ineligible');
 assert.equal(retakeEligibility({...candidate,age:23}),'ineligible');
 assert.equal(retakeEligibility({...candidate,quintile:2,ppp:14999}),'money');
 assert.equal(retakeEligibility({...candidate,quintile:2}),'eligible');
 for(const flag of ['married','refugee','irregular','imprisoned'])assert.equal(retakeEligibility({...candidate,[flag]:true}),'ineligible');
 assert.equal(retakeEligibility({...candidate,country:'PRK',imprisoned:true}),'restricted');
});
test('university odds distinguish first attempt, exam retakes and strong knowledge threshold',()=>{
 const input={conditionalTertiary:.3,knowledgeZ:0,age:18,country:'JPN',retaking:false};
 const first=universityAdmissionProbability(input);
 assert.ok(Math.abs(first-0.3878623562599821)<1e-12);
 assert.ok(universityAdmissionProbability({...input,retaking:true})<first);
 assert.ok(universityAdmissionProbability({...input,retaking:true,country:'USA'})<universityAdmissionProbability({...input,retaking:true}));
 assert.ok(universityAdmissionProbability({...input,knowledgeZ:1.75})>universityAdmissionProbability({...input,knowledgeZ:1.749})+.1);
 assert.equal(universityAdmissionProbability({...input,knowledgeZ:10}),universityAdmissionProbability({...input,knowledgeZ:3}));
});
test('graduate odds clamp extreme applicants and preserve household contribution',()=>{
 assert.equal(graduateAdmissionProbability(0,-100,1),.05);
 assert.equal(graduateAdmissionProbability(100,100,5),.45);
 assert.ok(Math.abs(graduateAdmissionProbability(40,40,3)-.2)<1e-12);
});

test('open enrollment does not draw admission luck and retains its own dropout threshold',async()=>{
 const {resolveUniversityApplication}=await import('../src/game/school-admissions');
 const input={conditionalTertiary:.3,knowledgeZ:0,age:18,country:'ARG',retaking:false,birthCountry:'ARG',vocationalTrack:false,eraMultiplier:0,neurodevelopmentMultiplier:1,unsupportedAutism:true};
 const outcome=resolveUniversityApplication(input,()=>{throw new Error('Open entry must not consume admission RNG');});
 assert.equal(outcome.status,'enrolled');
 assert.equal(outcome.mode,'open');
 assert.ok(Math.abs(outcome.retention!-.17453806031699195)<1e-12);
});
test('migration and vocational routes can require examination; every competitive outcome consumes one draw',async()=>{
 const {resolveUniversityApplication}=await import('../src/game/school-admissions');
 const input={conditionalTertiary:.3,knowledgeZ:0,age:18,country:'DEU',retaking:false,birthCountry:'DEU',vocationalTrack:true,eraMultiplier:0,neurodevelopmentMultiplier:1,unsupportedAutism:false};
 let draws=0;
 const denied=resolveUniversityApplication(input,()=>{draws++;return .2;});
 assert.equal(denied.status,'rejected');assert.equal(denied.mode,'competitive');assert.equal(draws,1);
 const immigrant=resolveUniversityApplication({...input,country:'FRA',birthCountry:'USA',vocationalTrack:false,eraMultiplier:10},()=>{draws++;return .99;});
 assert.equal(immigrant.status,'enrolled');assert.equal(draws,2);assert.equal(immigrant.retention,null);
});
