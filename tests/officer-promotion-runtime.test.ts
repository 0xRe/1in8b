import test from 'node:test';import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {advanceYear,makeChoice,addReflection} from '../src/game/engine';
import {encodeSave,decodeSave} from '../src/game/storage';
import {settleOfficerRuntime} from '../src/game/officer-runtime';
import {officerAnnualIncome,officerAgeIncomeFactor} from '../src/game/officer-pay';
import {payEraCountry} from '../src/game/pay-era';
const base=[...naturalFamily(1)].find(l=>l.age>=30&&!l.pendingDecision&&l.timeline?.complete)!;
function fixture(){
 const l=structuredClone(base);l.stats.job='soldier';l.stats.employment='employed';l.stats.annualIncome=123;
 l.care.who=null;l.training.kind=null;l.justice.prisonUntil=null;
 Object.assign(l.timeline!,{complete:false,position:.99,queue:[],financePending:true,focusPending:false});
 l.academics={version:1,qualification:4,doctorate:false,medicine:false,studyCountry:'USA',enrollment:null,college:{age:18,country:'USA',kind:'ordinary',status:'enrolled',closureYear:null,choices:['apply','work','army','navy','air'],academyOffer:'threeBranches'},academy:{branch:'army',startedAge:18,commissionedAge:22,major:'mil',employment:{formal:true,percentile:.7,party:null,career:{rank:0,jobYears:0,experienceYears:0,formalYears:0,lastSettledAge:l.age-1},annualFacts:{age:l.age,country:l.country.id,workShare:0,learnShare:0,familyShare:0,effortUsed:0,migrationPenalty:0,migrated:false,raisedThisYear:false,apprentice:false,rehired:false,reducedHours:false,reducedWork:false,eraIncomeFactor:1,frontPayPercentile:null}}}};
 return l;
}

import {prepareOfficerPromotionRuntime,officerPromotionDecision} from '../src/game/officer-promotion-runtime';
function offered(){const l=fixture(),c=l.academics!.academy!.employment!.career!;c.experienceYears=9;c.formalYears=9;c.promotionFacts={age:l.age,migrationExperienceLoss:0,inOffice:false,nomad:false,mandatoryRetirement:false};prepareOfficerPromotionRuntime(l,0,()=>0);l.pendingDecision=officerPromotionDecision(l);assert.ok(l.pendingDecision);return l;}
test('real promotion buttons accept or decline once across save reload',()=>{
 for(const choice of ['officerAccept','officerDecline']){
  const input=decodeSave(encodeSave(offered(),[])).life!,before=input.academics!.academy!.employment!.percentile;
  const result=makeChoice(input,choice),c=result.academics!.academy!.employment!.career!;
  assert.equal(c.rank,choice==='officerAccept'?1:0);assert.equal(c.lastStepAge,result.age);assert.equal(result.pendingDecision,null);
  assert.equal(c.promotion!.status,'resolved');assert.equal(result.academics!.academy!.employment!.percentile>before,choice==='officerAccept');
  const restored=decodeSave(encodeSave(result,[])).life!;assert.deepEqual(makeChoice(restored,choice),restored);
  // A later lottery receipt must not invalidate a previously resolved decision ID.
  c.promotion={age:result.age,rank:c.rank,job:'soldier',status:'ineligible'};assert.ok(decodeSave(encodeSave(result,[])).life);
 }
});
test('a saved officer decision expires when its subject leaves military employment',()=>{
 const l=offered();l.stats.job='student';l.stats.employment='student';const before=structuredClone(l.academics);
 const result=makeChoice(l,'officerAccept');assert.equal(result.pendingDecision,null);assert.deepEqual(result.academics,before);
});
test('actual next-year scheduler can queue a saved promotion within its two-decision limit',()=>{
 let found=false;
 for(let seed=1;seed<=100&&!found;seed++){
  const l=fixture();l.timeline!.complete=true;l.timeline!.position=1;l.timeline!.financePending=false;l.rng=seed;
  const c=l.academics!.academy!.employment!.career!;c.experienceYears=12;c.formalYears=12;c.promotionFacts={age:l.age+1,migrationExperienceLoss:0,inOffice:false,nomad:false,mandatoryRetirement:false};
  let next=l;for(let step=0;step<50&&next.age===l.age;step++)next=next.pendingDecision?next.pendingDecision.type==='reflection'?addReflection(next,''):makeChoice(next,next.pendingDecision.choices[0].id):advanceYear(next,.000001);
  const decisions=next.timeline?.scheduledDecisions??[];
  if(decisions.some(d=>d.id.startsWith('officerPromotion-'))){found=true;assert.ok(decisions.length<=2);assert.ok(decodeSave(encodeSave(next,[])).life);}
 }
 assert.ok(found,'no officer invitation reached the real scheduler');
});

test('commissioned officers cannot bypass rank retirement ages through promotion facts or stale offers',()=>{
 for(const [rank,age] of [[0,52],[1,56],[2,60]] as const){
  const life=fixture(),career=life.academics!.academy!.employment!.career!;
  life.age=age;career.rank=rank;career.experienceYears=30;
  career.promotionFacts={age,migrationExperienceLoss:0,inOffice:false,nomad:false,mandatoryRetirement:false};
  let draws=0;prepareOfficerPromotionRuntime(life,0,()=>{draws++;return 0});
  assert.equal(draws,0);assert.equal(officerPromotionDecision(life),null);
  career.promotion={age,rank,job:'soldier',status:'offered'};
  assert.equal(officerPromotionDecision(life),null);
 }
});

import {militaryRetirementAge} from '../src/game/military-retirement';
test('military retirement ages distinguish commissioned ranks and ordinary soldiers',()=>{
 assert.deepEqual([0,1,2].map(rank=>militaryRetirementAge(true,rank as 0|1|2)),[52,56,60]);
 assert.equal(militaryRetirementAge(false,0),55);
 for(const [rank,age] of [[0,51],[1,55]] as const){
  const life=fixture(),career=life.academics!.academy!.employment!.career!;
  life.age=age;career.rank=rank;career.experienceYears=30;
  career.promotionFacts={age,migrationExperienceLoss:0,inOffice:false,nomad:false,mandatoryRetirement:false};
  let draws=0;prepareOfficerPromotionRuntime(life,0,()=>{draws++;return 0});
  assert.equal(draws,1);assert.ok(officerPromotionDecision(life));
 }
});
