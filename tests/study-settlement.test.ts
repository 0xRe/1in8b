import test from 'node:test';import assert from 'node:assert/strict';
import {postStudyProbability,resolvePostStudy} from '../src/game/study-settlement';
test('host work probability includes degree and shortage-major bonuses but third-country work does not reuse host odds',()=>{
 assert.equal(postStudyProbability({country:'USA',ppp:70000,graduate:false,shortageMajor:false,thirdCountry:false,birthCountry:'JPN',year:2026}),.45);
 assert.equal(postStudyProbability({country:'CAN',ppp:50000,graduate:true,shortageMajor:true,thirdCountry:false,birthCountry:'JPN',year:2026}),.95);
 assert.equal(postStudyProbability({country:'USA',ppp:70000,graduate:true,shortageMajor:false,thirdCountry:true,birthCountry:'JPN',year:2026}),.1575);
 assert.equal(postStudyProbability({country:'DEU',ppp:50000,graduate:false,shortageMajor:false,thirdCountry:true,birthCountry:'FRA',year:2026}),.85);
});
test('home return consumes no RNG and successful work consumes one draw',()=>{
 assert.equal(resolvePostStudy({choice:'home',probability:.5,spouseFallbackEligible:true},()=>{throw Error('unexpected draw');}),'home');
 let calls=0;assert.equal(resolvePostStudy({choice:'stay',probability:.5,spouseFallbackEligible:true},()=>{calls++;return .1;}),'workPermit');assert.equal(calls,1);
});
test('failed host work may use an eligible spouse permit but third-country work may not',()=>{
 let calls=0;const values=[.9,.84];assert.equal(resolvePostStudy({choice:'stay',probability:.5,spouseFallbackEligible:true},()=>values[calls++]!),'spousePermit');assert.equal(calls,2);
 calls=0;assert.equal(resolvePostStudy({choice:'third',probability:.5,spouseFallbackEligible:true},()=>{calls++;return .9;}),'denied');assert.equal(calls,1);
 assert.equal(resolvePostStudy({choice:'stay',probability:.5,spouseFallbackEligible:false},()=>.9),'denied');
});

test('onward odds use birth-country rights in the actual game year',()=>{
 const c={country:'FRA',ppp:50000,graduate:true,shortageMajor:false,thirdCountry:true,birthCountry:'GBR'};
 assert.equal(postStudyProbability({...c,year:2020}),.85);
 assert.equal(postStudyProbability({...c,year:2021}),.55*.35);
 assert.equal(postStudyProbability({...c,country:'IRL',year:2021}),.85);
 assert.equal(postStudyProbability({...c,thirdCountry:false,year:2020}),.55+.05);
});
