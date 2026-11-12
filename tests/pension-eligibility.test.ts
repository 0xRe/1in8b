import test from 'node:test';import assert from 'node:assert/strict';
import {sourceRetirementAge,selectPensionIncomeBranch} from '../src/game/pension-eligibility';
const c={country:'USA',region:'hi',year:2026,era:false,age:64,formalYears:0,serviceRemaining:0,working:false,childwork:false,seeking:false,returningJobSearch:false,retired:false};
test('source retirement age follows regional baseline and decade-stepped future adjustment',()=>{
 assert.equal(sourceRetirementAge(c),65);
 assert.equal(sourceRetirementAge({...c,region:'eca'}),62);
 assert.equal(sourceRetirementAge({...c,region:'lac'}),62);
 assert.equal(sourceRetirementAge({...c,region:'eap',country:'JPN'}),60);
 assert.equal(sourceRetirementAge({...c,era:true,year:2030}),66);
 assert.equal(sourceRetirementAge({...c,era:true,year:2040}),67);
 assert.equal(sourceRetirementAge({...c,era:true,year:2100}),70);
 assert.equal(sourceRetirementAge({...c,region:'eap',country:'CHN',era:true,year:2030}),61);
 assert.equal(sourceRetirementAge({...c,region:'eap',country:'JPN',era:true,year:2030}),60);
 assert.equal(sourceRetirementAge({...c,year:2100}),65);
});
test('ordinary pension supplement needs both retirement age and source regional or formal-service eligibility',()=>{
 assert.equal(selectPensionIncomeBranch({...c,working:true}).ordinaryEligible,false);
 assert.equal(selectPensionIncomeBranch({...c,age:65,working:true}).ordinaryEligible,true);
 assert.equal(selectPensionIncomeBranch({...c,region:'sa',age:60,working:true,formalYears:9}).ordinaryEligible,false);
 assert.equal(selectPensionIncomeBranch({...c,region:'sa',age:60,working:true,formalYears:10}).ordinaryEligible,true);
});
test('income branch ordering preserves service, seeking return, child work and age65 fallback',()=>{
 assert.equal(selectPensionIncomeBranch({...c,serviceRemaining:1,working:true}).branch,'service');
 assert.equal(selectPensionIncomeBranch({...c,working:true,retired:true}).branch,'working');
 assert.equal(selectPensionIncomeBranch({...c,childwork:true}).branch,'childwork');
 assert.equal(selectPensionIncomeBranch({...c,age:40,seeking:true,returningJobSearch:true}).branch,'seekingPension');
 assert.equal(selectPensionIncomeBranch({...c,age:65,seeking:true}).branch,'seekingPension');
 assert.equal(selectPensionIncomeBranch({...c,age:65,era:true,year:2100}).branch,'retired');
 assert.equal(selectPensionIncomeBranch({...c,age:40}).branch,'inactive');
});
