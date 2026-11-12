import test from 'node:test';import assert from 'node:assert/strict';
import {officerPromotionProbability,resolveOfficerPromotion} from '../src/game/officer-promotion';
const c={age:32,rank:0 as const,effectiveExperience:9,knowledge:50,lastStepAge:null,working:true,inOffice:false,nomad:false,enrolled:false,mandatoryRetirement:false};
test('officer promotion uses military experience gates rather than civilian percentile gates',()=>{
 assert.equal(officerPromotionProbability(c),.22);
 assert.equal(officerPromotionProbability({...c,effectiveExperience:8}),null);
 assert.equal(officerPromotionProbability({...c,rank:1,age:44,effectiveExperience:18}),null);
 assert.equal(officerPromotionProbability({...c,rank:1,age:45,effectiveExperience:18}),.002*1.3);
 assert.equal(officerPromotionProbability({...c,rank:1,age:45,effectiveExperience:18,knowledge:100}),.002*1.6);
 assert.equal(officerPromotionProbability({...c,rank:2}),null);
});
test('career interruptions and cooldown block promotion before any lottery',()=>{
 for(const patch of [{age:21},{age:63},{working:false},{inOffice:true},{nomad:true},{enrolled:true},{mandatoryRetirement:true},{lastStepAge:30}])assert.equal(officerPromotionProbability({...c,...patch}),null);
 assert.equal(officerPromotionProbability({...c,lastStepAge:29}),.22);
 assert.equal(officerPromotionProbability({...c,rank:1,age:45,effectiveExperience:18,lastStepAge:42}),null);
});
test('accepting uses the new rank ceiling; declining still starts cooldown and stale rank cannot resolve',()=>{
 const r=resolveOfficerPromotion({age:32,rank:0,offeredRank:0,percentile:.7,newRankCeiling:.95,lastStepAge:null},'accept')!;
 assert.deepEqual(r,{rank:1,percentile:.825,lastStepAge:32,happiness:5,health:-1});
 assert.deepEqual(resolveOfficerPromotion({age:32,rank:0,offeredRank:0,percentile:.94,newRankCeiling:.95,lastStepAge:null},'decline'),{rank:0,percentile:.94,lastStepAge:32,happiness:0,health:0});
 assert.equal(resolveOfficerPromotion({age:32,rank:1,offeredRank:0,percentile:.7,newRankCeiling:.95,lastStepAge:null},'accept'),null);
 assert.equal(resolveOfficerPromotion({age:32,rank:0,offeredRank:0,percentile:.7,newRankCeiling:.95,lastStepAge:32},'accept'),null);
});
