import test from 'node:test';
import assert from 'node:assert/strict';
import {settleOfficerCareer,type OfficerCareer} from '../src/game/officer-career';
import {naturalFamily} from './helpers/adult-family-simulation';
import {encodeSave,decodeSave} from '../src/game/storage';
const career:OfficerCareer={rank:0,jobYears:0,experienceYears:3,formalYears:5,lastSettledAge:21};
const context={age:22,percentile:.7,rangeLow:.6,rangeHigh:.9,minimumPercentile:0,ppp:50000,knowledge:50,workShare:0,learnShare:0,familyShare:0,effortUsed:0,migrated:false,migrationPenalty:0,raisedThisYear:false};
test('observed officer year increments actual counters once and leaves inputs untouched',()=>{
 const before=structuredClone(career);let draws=0;
 const r=settleOfficerCareer(career,context,()=>{draws++;return .5})!;
 assert.deepEqual(r.career,{...career,jobYears:1,experienceYears:4,formalYears:6,lastSettledAge:22});
 assert.equal(draws,1);assert.deepEqual(career,before);
 assert.equal(settleOfficerCareer(r.career,context,()=>{throw Error('duplicate draw')}),null);
 assert.equal(settleOfficerCareer(r.career,{...context,age:21},()=>{throw Error('stale draw')}),null);
 assert.equal(settleOfficerCareer(career,{...context,age:30},()=>.5)!.career.jobYears,1);
});
const base=[...naturalFamily(1)].find(l=>l.age>=30)!;
function saved(c:OfficerCareer){
 const l=structuredClone(base);l.academics={version:1,qualification:4,doctorate:false,medicine:false,studyCountry:'USA',enrollment:null,college:{age:18,country:'USA',kind:'ordinary',status:'enrolled',closureYear:null,choices:['apply','work','army','navy','air'],academyOffer:'threeBranches'},academy:{branch:'army',startedAge:18,commissionedAge:22,major:'mil',employment:{formal:true,percentile:.7,party:null,career:c}}};
 return decodeSave(encodeSave(l,[])).life!.academics!.academy!.employment!.career!;
}
test('officer counters and settlement age survive real save import and reject malformed counters',()=>{
 const c=settleOfficerCareer(career,context,()=>.5)!.career;
 assert.deepEqual(saved(c),c);
 assert.equal(settleOfficerCareer(saved(c),context,()=>{throw Error('replay draw')}),null);
 for(const invalid of [{...c,rank:3},{...c,jobYears:-1},{...c,experienceYears:.5},{...c,formalYears:1000},{...c,lastSettledAge:0},{...c,lastSettledAge:200}])assert.throws(()=>saved(invalid as OfficerCareer));
});

test('promotion receipts and cooldown survive import without manufacturing a fresh lottery',()=>{
 const c={...career,lastStepAge:25,promotion:{age:29,rank:0 as const,job:'soldier' as const,status:'offered' as const}};
 assert.deepEqual(saved(c),c);
 assert.throws(()=>saved({...c,lastStepAge:200}));
 assert.throws(()=>saved({...c,promotion:{...c.promotion,rank:2}}));
});
