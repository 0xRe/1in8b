import test from 'node:test';import assert from 'node:assert/strict';
import {overseasQuote,selectStudyDestinations} from '../src/game/overseas-offer';
test('quotes use origin purchasing power and charge preparation exactly once',()=>{
 assert.equal(overseasQuote({originPPP:1000,destination:'USA',destinationPPP:60000,graduate:false,languageMatches:true}),30000/.22*1.5);
 assert.equal(overseasQuote({originPPP:200000,destination:'DEU',destinationPPP:60000,graduate:true,languageMatches:false}),40000/1.25*.45*1.15);
 assert.equal(overseasQuote({originPPP:200000,destination:'XXX',destinationPPP:6000,graduate:false,languageMatches:true}),6000);
});
test('destinations include the highest-weight country and never repeat selected countries',()=>{
 const weights={USA:80,JPN:10,FRA:9,CAN:1};let calls=0;
 const offered=selectStudyDestinations(weights,()=>[.999,0][calls++]!);
 assert.deepEqual(offered,['CAN','USA','JPN']);assert.equal(calls,2);assert.deepEqual(weights,{USA:80,JPN:10,FRA:9,CAN:1});
});
test('a first draw of the most popular destination still fills three distinct options',()=>{
 let calls=0;assert.deepEqual(selectStudyDestinations({USA:80,JPN:10,FRA:10},()=>{calls++;return 0;}),['USA','JPN','FRA']);assert.equal(calls,3);
});
test('no eligible destinations consumes no randomness and small catalogs terminate',()=>{
 assert.deepEqual(selectStudyDestinations({},()=>{throw Error('unexpected draw');}),[]);
 assert.deepEqual(selectStudyDestinations({JPN:1},()=>0),['JPN']);
});
