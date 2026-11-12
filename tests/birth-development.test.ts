import test from 'node:test';import assert from 'node:assert/strict';
import {drawBirthDevelopment,intellectualDevelopmentProbability} from '../src/game/birth-development';
function sequence(values:number[]){let count=0;return {draw:()=>{assert.ok(count<values.length,'unexpected draw');return values[count++];},count:()=>count};}
test('developmental draw preserves exclusion and draw order including unused autism severity draw',()=>{
 const s=sequence([0,.9,.99,.9,0,.9,0]);
 const result=drawBirthDevelopment('F',45000,s.draw);
 assert.deepEqual(result,{version:1,developmental:{kind:'autism',intellectualDisability:false,supportLevel:1,learningDifficulty:false,noticedAt:18},attentionLearning:null});assert.equal(s.count(),7);
 const severe=sequence([.9,0,.99,0]);
 assert.deepEqual(drawBirthDevelopment('M',2500,severe.draw).developmental,{kind:'intellectual',intellectualDisability:true,supportLevel:3,learningDifficulty:true,noticedAt:1});assert.equal(severe.count(),4);
});
test('absent traits are explicit and ADHD/dyslexia coexist without a premature diagnosis',()=>{
 const none=sequence([.9,.9,.9,.9]);assert.deepEqual(drawBirthDevelopment('M',45000,none.draw),{version:1,developmental:null,attentionLearning:null});assert.equal(none.count(),4);
 const both=sequence([.9,.9,0,0,0,.999]);
 assert.deepEqual(drawBirthDevelopment('F',45000,both.draw).attentionLearning,{adhd:true,dyslexia:true,persistentAdhd:true,noticedAt:12});assert.equal(both.count(),6);
 const dys=sequence([.9,.9,.9,0]);assert.deepEqual(drawBirthDevelopment('M',45000,dys.draw).attentionLearning,{adhd:false,dyslexia:true,persistentAdhd:false,noticedAt:null});assert.equal(dys.count(),4);
});
test('birth calibration clamps its PPP endpoints and interpolates in log space',()=>{
 assert.ok(Math.abs(intellectualDevelopmentProbability(2500)-1.77*.0234)<1e-12);
 assert.ok(Math.abs(intellectualDevelopmentProbability(45000)-1.77*.0033)<1e-12);
 assert.equal(intellectualDevelopmentProbability(100),intellectualDevelopmentProbability(2500));assert.equal(intellectualDevelopmentProbability(100000),intellectualDevelopmentProbability(45000));
 assert.ok(Math.abs(intellectualDevelopmentProbability(Math.sqrt(2500*45000))-1.77*Math.sqrt(.0234*.0033))<1e-12);
});

test('new births persist explicit latent facts while legacy decoding leaves unknown facts absent',async()=>{
 const {createLife,DEFAULT_SETTINGS}=await import('../src/game/engine');const {decodeSave,encodeSave}=await import('../src/game/storage');
 const life=createLife({...DEFAULT_SETTINGS,country:'JPN'},124);
 assert.ok(life.birthDevelopment);assert.deepEqual(createLife({...DEFAULT_SETTINGS,country:'JPN'},124).birthDevelopment,life.birthDevelopment);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life!.birthDevelopment,life.birthDevelopment);
 const legacy=structuredClone(life);delete legacy.birthDevelopment;assert.equal(decodeSave(encodeSave(legacy,[])).life!.birthDevelopment,undefined);
 for(const alter of [(l:typeof life)=>{l.birthDevelopment!.version=2 as never;},(l:typeof life)=>{l.birthDevelopment!.developmental={kind:'autism',intellectualDisability:false,supportLevel:3,learningDifficulty:false,noticedAt:40};},(l:typeof life)=>{l.birthDevelopment!.attentionLearning={adhd:false,dyslexia:false,persistentAdhd:true,noticedAt:8};}]){
  const bad=structuredClone(life);alter(bad);assert.throws(()=>encodeSave(bad,[]));
 }
});
