import test from 'node:test';
import assert from 'node:assert/strict';
import { childPrisonChance, drawChildSentence, childImprisoned, childUniversityEndAge } from '../src/game/child-prison';
const eligible = { playerAge: 40, playerImprisoned: false, householdPercentile: 0.5, playerPrisonHistory: false, country: 'JPN', childAge: 20, sex: 'M' as const, alive: true, priorSentence: false, placement: false, abroad: false, weddingThisYear: false, sentencedChildren: 0 };
test('child sentencing uses present household quintile and domestic eligibility', () => {
 assert.equal(childPrisonChance(eligible), 0.00015);
 assert.ok(Math.abs(childPrisonChance({...eligible, sex: 'F'}) - 0.000012) < 1e-15);
 assert.equal(childPrisonChance({...eligible, country: 'GBR'}), 0.0006);
 assert.equal(childPrisonChance({...eligible, householdPercentile: 1}), 0.00015 * 0.55);
 assert.equal(childPrisonChance({...eligible, householdPercentile: 0, playerPrisonHistory: true}), 0.00015 * 1.6 * 1.3);
 for (const patch of [{playerAge:35},{playerImprisoned:true},{childAge:17},{childAge:46},{alive:false},{priorSentence:true},{placement:true},{abroad:true},{weddingThisYear:true},{sentencedChildren:2}]) assert.equal(childPrisonChance({...eligible,...patch}),0,JSON.stringify(patch));
 assert.ok(childPrisonChance({...eligible,childAge:45,sentencedChildren:1})>0);
});
test('sentence draw preserves weighted duration boundaries', () => {
 const cases = [[0,1],[0.34999,1],[0.35,2],[0.64999,2],[0.65,3],[0.79999,3],[0.8,4],[0.89999,4],[0.9,6],[0.99999,6]];
 for (const [draw,years] of cases) assert.equal(drawChildSentence(()=>draw),years);
});
test('release year remains imprisoned until release is processed; death is not release', () => {
 const sentence={startYear:2050,endYear:2053,releasedYear:null};
 assert.equal(childImprisoned(true,sentence,2052),true);
 assert.equal(childImprisoned(true,sentence,2053),true);
 assert.equal(childImprisoned(true,{...sentence,releasedYear:2053},2053),false);
 assert.equal(childImprisoned(false,sentence,2052),false);
 assert.equal(childImprisoned(true,undefined,2052),false);
 assert.equal(childImprisoned(true,sentence,2054),false);
});
test('university delay uses child age at sentence start, not player age', () => {
 assert.equal(childUniversityEndAge(2030,{startYear:2052,endYear:2056,releasedYear:null}),27);
 assert.equal(childUniversityEndAge(2030,{startYear:2053,endYear:2057,releasedYear:null}),23);
 assert.equal(childUniversityEndAge(2030,undefined),23);
});
