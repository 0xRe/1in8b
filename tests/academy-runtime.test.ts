import test from 'node:test';import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';import {advanceYear,makeChoice,addReflection} from '../src/game/engine';import {encodeSave,decodeSave} from '../src/game/storage';
import {commissionAcademyRuntime} from '../src/game/academy-runtime';
import {officerEntryIncome} from '../src/game/officer-pay';import {payEraCountry} from '../src/game/pay-era';
function fixture(){const l=structuredClone([...naturalFamily(1)].find(l=>l.age>=30&&!l.pendingDecision&&(!l.timeline||l.timeline.complete))!);l.academics={version:1,qualification:3,doctorate:false,medicine:false,studyCountry:l.country.id,enrollment:{stage:'university',completedYears:4,lastSettledAge:l.age,paused:false,graduationPending:true},college:{age:18,country:l.country.id,kind:'ordinary',status:'enrolled',closureYear:null,choices:['apply','work','army','navy','air'],academyOffer:'threeBranches'},academy:{branch:'army',startedAge:18,major:'mil'},commissionFacts:{workShare:0,reducedHours:false,reducedWork:false,migrationPenalty:0,familyCanHelp:false,rohingyaCamp:false,partyToJoin:null}};l.stats.job='student';l.stats.employment='student';l.stats.annualIncome=0;l.schooling.enrolled=true;return l;}
test('actual year boundary commissions the academy graduate with a saved job, income and no ordinary continuation',()=>{
 let l=fixture();const age=l.age;
 for(let step=0;step<40&&l.age===age;step++)l=l.pendingDecision?l.pendingDecision.type==='reflection'?addReflection(l,''):makeChoice(l,l.pendingDecision.choices[0].id):advanceYear(l,.000001);
 assert.equal(l.age,age+1);assert.equal(l.stats.job,'soldier');assert.equal(l.stats.employment,'employed');assert.equal(l.academics!.qualification,4);assert.equal(l.academics!.academy!.commissionedAge,l.age);
 const current=payEraCountry(l.country,l.era,l.year);assert.equal(l.stats.annualIncome,Math.round(officerEntryIncome(current,l.country,l.year,l.era!=='today',l.academics!.commissionFacts!)*100)/100);
 assert.ok(!l.timeline!.scheduledDecisions!.some(d=>d.id.startsWith('academicAfterUniversity')));assert.equal(l.career.at(-1)!.job,'soldier');assert.ok(decodeSave(encodeSave(l,[])).life);
 const before=structuredClone(l);assert.equal(commissionAcademyRuntime(l),null);assert.deepEqual(l,before);
});
test('missing source job-entry facts do not invent family help or party membership',()=>{
 const l=fixture();l.age++;delete l.academics!.commissionFacts;const before=structuredClone(l);assert.equal(commissionAcademyRuntime(l),null);assert.deepEqual(l,before);
});
