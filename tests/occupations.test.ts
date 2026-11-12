import test from 'node:test';import assert from 'node:assert/strict';
import {OCCUPATIONS,OCCUPATION_IDS,occupationFromLegacyJob} from '../src/game/occupations';
test('occupational data retains distinct professional requirements and dedicated special entry routes',()=>{
 assert.equal(OCCUPATIONS.doctor.education,5);assert.equal(OCCUPATIONS.nurse.education,4);
 assert.equal(OCCUPATIONS.dev.minimumInternet,50);assert.equal(OCCUPATIONS.delivery.minimumInternet,45);
 assert.equal(OCCUPATIONS.care.highIncomeOnly,true);assert.deepEqual(OCCUPATIONS.haenyeo.regions,['KOR']);
 assert.equal(OCCUPATIONS.athlete.specialEntry,true);assert.equal(OCCUPATIONS.owner.specialEntry,true);
 assert.equal(OCCUPATIONS.engineer.specialEntry,undefined);
 assert.deepEqual(OCCUPATIONS.fisher.risks,{drown:3});assert.equal(OCCUPATIONS.nurse.femaleWeight,2);
});
test('every occupational row has a bounded income interval and classified entry data',()=>{
 for(const id of OCCUPATION_IDS){const row=OCCUPATIONS[id];assert.ok(['agr','ind','ser','home','none'].includes(row.sector),id);
  assert.ok(Number.isInteger(row.education)&&row.education>=0&&row.education<=5,id);
  assert.equal(row.percentile.length,2,id);
  assert.ok(row.percentile[0]>=0&&row.percentile[0]<=row.percentile[1]&&row.percentile[1]<=1,id);
  assert.ok([-1,0,1].includes(row.urban),id);
 }
});
test('legacy mappings never reinterpret generic service as military service or infer a business',()=>{
 assert.equal(occupationFromLegacyJob('service'),null);assert.equal(occupationFromLegacyJob('entrepreneur'),null);assert.equal(occupationFromLegacyJob('none'),null);
 assert.equal(occupationFromLegacyJob('farmer'),'farm');assert.equal(occupationFromLegacyJob('hairdresser'),'hair');
 assert.equal(occupationFromLegacyJob('shelteredWork'),'shelter');assert.equal(occupationFromLegacyJob('dayActivities'),'dayc');
 assert.equal(occupationFromLegacyJob('soldier'),'soldier');assert.equal(occupationFromLegacyJob('engineer'),'engineer');
});
