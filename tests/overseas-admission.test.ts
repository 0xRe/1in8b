import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveOverseasAdmission,type OverseasApplication} from '../src/game/overseas-admission';
const base:OverseasApplication={level:'university',knowledge:60,admissionFactor:1,policyFactor:1,languageMatches:true,graduateProbability:.5,scholarshipProbability:.3,fullScholarship:false,selfFunded:false,quintile:3,quotedCost:10000,savings:1000,debt:200};
function draws(...values:number[]){let count=0;return {draw:()=>{assert.ok(count<values.length,'unexpected random draw');return values[count++]!;},count:()=>count};}
test('rejection preserves money and does not draw a scholarship',()=>{
 const rng=draws(.9);const r=resolveOverseasAdmission(base,rng.draw);
 assert.equal(r.outcome,'domesticApplication');assert.equal(r.savings,1000);assert.equal(r.debt,200);assert.equal(r.personalCost,0);assert.equal(rng.count(),1);
});
test('scholarship precedes family contribution and preserves existing debt',()=>{
 const rng=draws(.1,.1);const r=resolveOverseasAdmission(base,rng.draw);
 assert.equal(r.outcome,'overseas');assert.equal(r.governmentScholarship,true);assert.equal(r.familyContribution,1000);assert.equal(r.personalCost,1500);assert.equal(r.savings,0);assert.equal(r.debt,700);assert.equal(r.preparationYears,0);assert.equal(r.happiness,4);assert.equal(rng.count(),2);
});
test('language preparation adds a year without changing a quote already including its surcharge',()=>{
 const r=resolveOverseasAdmission({...base,languageMatches:false,selfFunded:true,quotedCost:11500},draws(.1,.9).draw);
 assert.equal(r.preparationYears,1);assert.equal(r.personalCost,11500);assert.equal(r.debt,10700);assert.equal(r.happiness,2);
});
test('graduate rejection attempts domestic admission independently without tuition',()=>{
 const rng=draws(.9,.39);const r=resolveOverseasAdmission({...base,level:'graduate'},rng.draw);
 assert.equal(r.outcome,'domesticGraduate');assert.equal(r.happiness,-2);assert.equal(r.savings,1000);assert.equal(r.debt,200);assert.equal(rng.count(),2);
});
test('full scholarship neither charges nor makes an ordinary scholarship draw',()=>{
 const rng=draws(.01);const r=resolveOverseasAdmission({...base,fullScholarship:true,languageMatches:false},rng.draw);
 assert.equal(r.outcome,'overseas');assert.equal(r.personalCost,0);assert.equal(r.familyContribution,0);assert.equal(r.savings,1000);assert.equal(r.debt,200);assert.equal(r.preparationYears,1);assert.equal(r.happiness,8);assert.equal(rng.count(),1);
});
test('ordinary admission uses a strict probability boundary and language penalty',()=>{
 const admitted=resolveOverseasAdmission({...base,knowledge:40},draws(.59,.9).draw);
 const rejected=resolveOverseasAdmission({...base,knowledge:40},draws(.6).draw);
 const languageRejected=resolveOverseasAdmission({...base,knowledge:40,languageMatches:false},draws(.55).draw);
 assert.equal(admitted.outcome,'overseas');assert.equal(rejected.outcome,'domesticApplication');assert.equal(languageRejected.outcome,'domesticApplication');
});
test('graduate family support differs by quintile and self-funding overrides it',()=>{
 for(const [quintile,personalCost] of [[2,10000],[3,8000],[4,6000],[5,4000]]){
  const r=resolveOverseasAdmission({...base,level:'graduate',quintile,savings:20000},draws(.01,.9).draw);
  assert.equal(r.personalCost,personalCost);assert.equal(r.savings,20000-personalCost);assert.equal(r.debt,200);
 }
 const own=resolveOverseasAdmission({...base,level:'graduate',quintile:5,selfFunded:true},draws(.01,.9).draw);
 assert.equal(own.personalCost,10000);assert.equal(own.familyContribution,0);
});
test('two graduate rejections leave a job seeker and preserve debt',()=>{
 const rng=draws(.99,.99);const r=resolveOverseasAdmission({...base,level:'graduate'},rng.draw);
 assert.equal(r.outcome,'work');assert.equal(r.happiness,-5);assert.equal(r.debt,200);assert.equal(rng.count(),2);
});

test('unrepresentable tuition debt cannot grant enrollment or silently discard charges',()=>{
 const r=resolveOverseasAdmission({...base,selfFunded:true,savings:0,debt:1e12},draws(.01,.99).draw);
 assert.equal(r.outcome,'fundingUnavailable');assert.equal(r.debt,1e12);assert.equal(r.savings,0);
 assert.equal(r.personalCost,0);assert.equal(r.familyContribution,0);assert.equal(r.knowledge,0);assert.equal(r.preparationYears,0);
 const exact=resolveOverseasAdmission({...base,selfFunded:true,savings:0,debt:1e12-10000},draws(.01,.99).draw);
 assert.equal(exact.outcome,'overseas');assert.equal(exact.debt,1e12);
 const funded=resolveOverseasAdmission({...base,fullScholarship:true,debt:1e12},draws(.01).draw);
 assert.equal(funded.outcome,'overseas');assert.equal(funded.debt,1e12);
});
