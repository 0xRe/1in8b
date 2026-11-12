import test from 'node:test';import assert from 'node:assert/strict';
import {settleOfficerYear} from '../src/game/officer-year';
const c={age:25,percentile:.7,rangeLow:.6,rangeHigh:.9,minimumPercentile:0,ppp:50000,jobYears:0,experienceYears:0,formalYears:0,knowledge:50,workShare:0,learnShare:0,familyShare:0,effortUsed:0,migrated:false,migrationPenalty:0,raisedThisYear:false};
test('officer year records experience and formal service with one source pay draw',()=>{
 let draws=0;const r=settleOfficerYear(c,()=>{draws++;return .5});assert.equal(draws,1);assert.equal(r.jobYears,1);assert.equal(r.experienceYears,1);assert.equal(r.formalYears,1);assert.ok(Math.abs(r.percentile-(.7+(.015*1.2+.003)*.96))<1e-12);
});
test('first employment and raise years cannot lose percentile, but later ordinary years can',()=>{
 const old={...c,age:56,jobYears:2,experienceYears:25,knowledge:0};
 assert.ok(settleOfficerYear(old,()=>0).percentile<c.percentile);
 assert.equal(settleOfficerYear({...old,jobYears:0},()=>0).percentile,c.percentile);
 assert.equal(settleOfficerYear({...old,raisedThisYear:true},()=>0).percentile,c.percentile);
});
test('focus effort uses remaining annual cap, family time reduces growth and migration penalty decays',()=>{
 const plain=settleOfficerYear(c,()=>.5),work=settleOfficerYear({...c,workShare:.5,learnShare:.5,effortUsed:.05,migrated:true,migrationPenalty:.02},()=>.5);
 assert.ok(Math.abs(work.percentile-plain.percentile-.0045*.96)<1e-12);assert.ok(Math.abs(work.effortUsed-.0545)<1e-12);assert.ok(Math.abs(work.migrationPenalty-.005)<1e-12);
 assert.equal(settleOfficerYear({...c,workShare:1,effortUsed:.1},()=>.5).percentile,plain.percentile);
 assert.ok(Math.abs(settleOfficerYear({...c,familyShare:1},()=>.5).percentile-(plain.percentile-.003))<1e-12);
});
test('occupation bounds apply before formal minimum, preserving original order',()=>{
 const r=settleOfficerYear({...c,percentile:.99,minimumPercentile:.98},()=>1);assert.equal(r.percentile,.98);
 assert.equal(settleOfficerYear({...c,migrationPenalty:.02},()=>.5).migrationPenalty,.02);
});
