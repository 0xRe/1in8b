import test from 'node:test';import assert from 'node:assert/strict';
import {chooseSupportedAdult} from '../src/game/supported-adult';
const rich={level:2 as const,rich:true,urban:true};
test('adult support preserves source conditional draws and full supported role selection',()=>{
 let calls=0;assert.equal(chooseSupportedAdult({...rich,level:3},()=>{calls++;return 0;}).kind,'dayActivities');assert.equal(calls,0);
 assert.equal(chooseSupportedAdult(rich,()=>0).kind,'shelteredWork');
 const draws=[.9,.1,.99];assert.deepEqual(chooseSupportedAdult(rich,()=>draws.shift()!),{kind:'supportedJob',role:'factory',formal:true});assert.equal(draws.length,0);
 assert.deepEqual(chooseSupportedAdult({...rich,rich:false,urban:false},()=>.26),{kind:'familyFarm',role:'farm',formal:false});
 assert.deepEqual(chooseSupportedAdult({...rich,rich:false},()=>.26),{kind:'familyShop',role:'vendor',formal:false});
 assert.equal(chooseSupportedAdult({...rich,rich:false},()=>.27).kind,'home');
});

test('supported adult outcomes survive entire public-action lives without repeated selection or ordinary retraining',async()=>{
 const {createNewGame}=await import('../src/game/new-game');const {DEFAULT_SETTINGS,requestJobOffers}=await import('../src/game/engine');
 const {familyChoice}=await import('./helpers/adult-family-simulation');const {decodeSave,encodeSave}=await import('../src/game/storage');
 for(const [country,seed,kind] of [['DEU',1704261362,'supportedJob'],['DEU',1634668176,'dayActivities'],['NGA',292,'home']] as const){
  let life=createNewGame({...DEFAULT_SETTINGS,country,gentler:true,dailyThemeDay:'2026-10-20'},seed);
  let receipt:unknown=null;
  for(let step=0;step<500&&life.alive;step++){
   const restored=decodeSave(encodeSave(life,[])).life!;
   const next=familyChoice(life);assert.deepEqual(next,familyChoice(restored));life=next;
   if(life.academics?.supportedAdult){
    receipt??=structuredClone(life.academics.supportedAdult);assert.deepEqual(life.academics.supportedAdult,receipt);
    assert.equal(life.academics.supportedAdult.kind,kind);
    assert.deepEqual(requestJobOffers(life),life);
   }
   assert.ok(!/^job-|^nightSchool-|^apprenticeship-/.test(life.pendingDecision?.id??''));
  }
  assert.ok(receipt);assert.equal(life.alive,false);assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
  assert.equal(life.events.filter(e=>e.key===`event.supportedAdult.${kind}`).length,1);
  const bad=structuredClone(life);bad.academics!.supportedAdult!.age=10;assert.throws(()=>encodeSave(bad,[]));
 }
});
