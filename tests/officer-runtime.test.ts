import test from 'node:test';import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {advanceYear} from '../src/game/engine';
import {encodeSave,decodeSave} from '../src/game/storage';
import {settleOfficerRuntime,officerHealthExitProbability,settleOfficerRecovery} from '../src/game/officer-runtime';
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
test('actual annual finance settles officer income and stores one observed service year',()=>{
 const l=advanceYear(fixture(),.01),e=l.academics!.academy!.employment!;
 assert.equal(e.career!.jobYears,1);assert.equal(e.career!.lastSettledAge,l.age);assert.equal(l.stats.job,'soldier');
 const c=payEraCountry(l.country,l.era,l.year);
 const expected=officerAnnualIncome(c,l.year,e.percentile,{...e.annualFacts!,ageIncomeFactor:officerAgeIncomeFactor(l.age)});
 assert.equal(l.stats.annualIncome,Math.round(expected*100)/100);
 const restored=decodeSave(encodeSave(l,[])).life!;const before=structuredClone(restored);
 assert.equal(settleOfficerRuntime(restored,()=>{throw Error('replay')}),true);assert.deepEqual(restored,before);
});
test('unfinished, stale, wrong-country and interrupted officer years do not settle or draw',()=>{
 for(const change of [(l:ReturnType<typeof fixture>)=>{},(l:ReturnType<typeof fixture>)=>{l.timeline!.complete=true;l.academics!.academy!.employment!.annualFacts!.age--;},(l:ReturnType<typeof fixture>)=>{l.timeline!.complete=true;l.academics!.academy!.employment!.annualFacts!.country='ZZZ';},(l:ReturnType<typeof fixture>)=>{l.timeline!.complete=true;l.stats.job='student';}]){
 const l=fixture();change(l);const before=structuredClone(l);
 assert.equal(settleOfficerRuntime(l,()=>{throw Error('ineligible draw')}),false);assert.deepEqual(l,before);
 }
});
test('health-related military exit preserves earned annual income and consumes the source health draw once',()=>{
 const l=fixture();Object.assign(l.timeline!,{complete:true,position:1,financePending:false});l.stats.health=20;const happiness=l.stats.happiness;let draws=0;
 assert.equal(settleOfficerRuntime(l,()=>{draws++;return draws===1?.5:0}),true);
 assert.equal(draws,2);assert.equal(l.stats.job,'none');assert.equal(l.stats.employment,'unemployed');assert.ok(l.stats.annualIncome>0);assert.equal(l.stats.happiness,happiness-6);
 assert.deepEqual(l.academics!.academy!.employment!.lastMilitaryPay,{income:l.stats.annualIncome,country:l.country.id,age:l.age});assert.deepEqual(l.academics!.academy!.employment!.healthExit,{age:l.age,previousJob:'soldier'});assert.equal(l.academics!.academy!.employment!.sickOutAge,l.age);
 const restored=decodeSave(encodeSave(l,[])).life!;assert.equal(settleOfficerRuntime(restored,()=>{throw Error('duplicate health draw')}),false);
});

test('military health-exit probability follows source age and health boundaries',()=>{
 assert.equal(officerHealthExitProbability(29,0),null);assert.equal(officerHealthExitProbability(65,0),null);
 assert.equal(officerHealthExitProbability(30,24),.14);assert.equal(officerHealthExitProbability(40,25),.06);
 assert.equal(officerHealthExitProbability(40,35),.012);assert.equal(officerHealthExitProbability(64,45),.002);
});
test('actual timeline records military health exit and preserves that year of earnings',()=>{
 let found=false;
 for(let seed=1;seed<=100&&!found;seed++){
  const l=fixture();l.rng=seed;l.stats.health=20;
  const result=advanceYear(l,.01);
  if(result.academics!.academy!.employment!.healthExit){
   found=true;assert.equal(result.stats.employment,'unemployed');assert.ok(result.stats.annualIncome>0);
   assert.ok(result.events.some(e=>e.key==='event.officerHealthExit'));
   assert.ok(decodeSave(encodeSave(result,[])).life);
  }
 }
 assert.ok(found);
});
test('military recovery marker expires on recovered health, new employment or six elapsed years',()=>{
 for(const [age,health,job,expected] of [[35,49,'none',true],[35,50,'none',false],[35,20,'teacher',false],[36,20,'none',false]] as const){
  const l=fixture();l.age=age;l.stats.health=health;l.stats.job=job;l.academics!.academy!.employment!.sickOutAge=30;
  settleOfficerRecovery(l);assert.equal(l.academics!.academy!.employment!.sickOutAge!==undefined,expected);
 }
});
test('actual annual timeline clears recovery status while retaining the saved military exit history',()=>{
 const l=fixture(),e=l.academics!.academy!.employment!;e.healthExit={age:l.age,previousJob:'soldier'};e.sickOutAge=l.age;
 l.stats.job='none';l.stats.employment='unemployed';l.stats.health=50;
 const result=advanceYear(l,.01),saved=decodeSave(encodeSave(result,[])).life!;
 assert.equal(saved.academics!.academy!.employment!.sickOutAge,undefined);
 assert.deepEqual(saved.academics!.academy!.employment!.healthExit,e.healthExit);
});
