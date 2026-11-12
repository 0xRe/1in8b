import test from 'node:test';import assert from 'node:assert/strict';
import {officerPayCalibration,officerEntryIncome,officerPayRange,officerAnnualIncome,officerMinimumPercentile,officerAgeIncomeFactor} from '../src/game/officer-pay';
import {getCountryById} from '../src/game/countries';import {incomeAtPercentile} from '../src/game/income-distribution';
const modifiers={workShare:0,reducedHours:false,reducedWork:false,migrationPenalty:0};
test('officer calibration uses national percentile exponent and historical sector/income adjustment',()=>{
 const usa=getCountryById('USA');assert.equal(officerPayCalibration(usa,usa,false),1.623);
 const past={...usa,ter:usa.ter-20,agr:usa.agr+10,ppp:usa.ppp/2};
 assert.equal(officerPayCalibration(past,usa,true),1.623*Math.exp(.739*(-20)/100-.048*10/100+.168*Math.log(.5)));
 assert.equal(officerPayCalibration({...usa,id:'ZZZ'},usa,false),1);
});
test('formal officer entry uses calibrated percentile and observed work modifiers without random wages',()=>{
 const c=getCountryById('USA');const income=incomeAtPercentile(c,.68**1.623+.03);
 assert.equal(officerEntryIncome(c,c,2026,false,modifiers),income);
 assert.equal(officerEntryIncome(c,c,2026,false,{...modifiers,workShare:.5,reducedHours:true,reducedWork:true}),income*1.05*.6*.55);
});
test('formal minimum applies from 2015 and final pay percentile stays bounded',()=>{
 const c=getCountryById('COL');const low={...modifiers,migrationPenalty:1};
 assert.equal(officerEntryIncome(c,c,2014,false,low),incomeAtPercentile(c,.004));
 assert.ok(Math.abs(officerEntryIncome(c,c,2015,false,low)-incomeAtPercentile(c,.5)*.92*1.15)<1e-8);
});

test('officer rank ceiling is calibrated before applying source rank headroom',()=>{
 const c=getCountryById('USA'),base=.9**1.623;
 assert.deepEqual(officerPayRange(c,c,false,0),[.68**1.623,base]);
 assert.deepEqual(officerPayRange(c,c,false,1),[.68**1.623,base+(.985-base)*.8]);
 assert.deepEqual(officerPayRange(c,c,false,2),[.68**1.623,base+(.985-base)*.95]);
});
test('annual officer income uses the settled percentile and applies front pay after reductions',()=>{
 const c=getCountryById('USA');
 const annual={...modifiers,ageIncomeFactor:.8,eraIncomeFactor:.9,rehired:true,apprentice:false,frontPayPercentile:null};
 const wage=incomeAtPercentile(c,.8)*.65*.8*.9;
 assert.equal(officerAnnualIncome(c,2026,.8,annual),wage);
 assert.equal(officerAnnualIncome(c,2026,.8,{...annual,frontPayPercentile:.9}),incomeAtPercentile(c,.9));
 assert.equal(officerAnnualIncome(c,2026,.8,{...annual,apprentice:true}),wage*.5);
});

test('formal officer minimum is a saved percentile from 2015, not a wage amount',()=>{
 const c=getCountryById('COL');
 assert.equal(officerMinimumPercentile(c,2014),0);
 assert.equal(officerMinimumPercentile({...c,id:'ZZZ'},2026),0);
 const p=officerMinimumPercentile(c,2015);
 assert.ok(p>0&&p<1);
 assert.ok(Math.abs(incomeAtPercentile(c,p)/(incomeAtPercentile(c,.5)*.92*1.15)-1)<1e-6);
});
test('military old-age earnings retain source age70 discontinuity and35 percent floor',()=>{
 assert.equal(officerAgeIncomeFactor(69),1);
 assert.equal(officerAgeIncomeFactor(70),.9);
 assert.equal(officerAgeIncomeFactor(80),1-.05*12);
 assert.equal(officerAgeIncomeFactor(100),.35);
});
