import test from 'node:test';import assert from 'node:assert/strict';
import {prepareOfficerPromotion,commitOfficerPromotion} from '../src/game/officer-promotion-state';
const context={age:32,rank:0 as const,effectiveExperience:9,knowledge:50,lastStepAge:null,working:true,inOffice:false,nomad:false,enrolled:false,mandatoryRetirement:false};
test('promotion lottery runs once per year and never runs when decision capacity is exhausted',()=>{
 let draws=0;const draw=()=>{draws++;return .1};
 assert.equal(prepareOfficerPromotion(undefined,context,2,draw),undefined);assert.equal(draws,0);
 const state=prepareOfficerPromotion(undefined,context,1,draw)!;assert.equal(state.status,'offered');assert.equal(draws,1);
 assert.equal(prepareOfficerPromotion(state,context,0,draw),state);assert.equal(draws,1);
 const failed=prepareOfficerPromotion(undefined,context,0,()=>.9)!;assert.equal(failed.status,'missed');
 assert.equal(prepareOfficerPromotion(failed,context,0,draw),failed);assert.equal(draws,1);
});
test('promotion receipt prevents repeated or stale-job/rank/age choices and retains decline cooldown',()=>{
 const state=prepareOfficerPromotion(undefined,context,0,()=>0)!;
 const c={age:32,rank:0 as const,job:'soldier',percentile:.7,newRankCeiling:.95,lastStepAge:null};
 for(const patch of [{age:33},{rank:1 as const},{job:'student'}])assert.equal(commitOfficerPromotion(state,{...c,...patch},'accept'),null);
 const result=commitOfficerPromotion(state,c,'decline')!;assert.equal(result.state.status,'resolved');assert.equal(result.effect.lastStepAge,32);
 assert.equal(commitOfficerPromotion(result.state,c,'accept'),null);
});
