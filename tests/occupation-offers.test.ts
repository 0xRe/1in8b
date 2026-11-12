import test from 'node:test';import assert from 'node:assert/strict';
import {occupationOfferPay,type OfferPayFacts} from '../src/game/occupation-offer-pay';
const pay:OfferPayFacts={country:{id:'JPN',region:'hi',ppp:40000,gi:.33},range:[.5,.8],informality:.2,criminalWeight:0,disabled:false,familyEdge:0,knowledgeZ:0,sameExperience:0,familyExperience:0,previousPercentile:null,changingJobs:false,learnShare:0,effectiveWork:1,preparationYears:0,lateCareer:false,irregular:false,papersValid:true,minimumPercentile:()=>0};
test('initial pay, state formality and legal refusal have exact RNG consumption',()=>{
 let calls=0;const draw=()=>{calls++;return .5;};
 const nurse=occupationOfferPay('nurse',pay,draw);assert.ok(Math.abs(nurse.percentile-.614)<1e-12);assert.equal(nurse.formal,true);assert.equal(calls,2);
 calls=0;assert.equal(occupationOfferPay('civil',pay,draw).formal,true);assert.equal(calls,1);
 calls=0;assert.equal(occupationOfferPay('nurse',{...pay,irregular:true},draw).formal,false);assert.equal(calls,2);
});
test('experience preserves previous salary, related experience and formal minimum wage',()=>{
 const experienced=occupationOfferPay('nurse',{...pay,sameExperience:3,previousPercentile:.75,changingJobs:true},()=>0);
 assert.ok(experienced.percentile>.75);assert.equal(experienced.experience,3);assert.equal(experienced.relatedExperience,false);
 const related=occupationOfferPay('nurse',{...pay,familyExperience:2},()=>0);assert.equal(related.relatedExperience,true);
 const floor=occupationOfferPay('nurse',{...pay,minimumPercentile:(_,formal)=>formal?.8:0},()=>0);assert.equal(floor.percentile,.8);
 const ordinary=occupationOfferPay('nurse',pay,()=>0),late=occupationOfferPay('nurse',{...pay,lateCareer:true},()=>0);assert.ok(late.percentile<ordinary.percentile);
});
