import test from 'node:test';
import assert from 'node:assert/strict';
import {settleFocusPractice,settleCareerPreparation} from '../src/game/focus-practice';

test('hobby and sport focus improve first eligible hobbies independently',()=>{
 const hobbies=[{id:'dance',level:2,sport:false,blocked:true,talent:0},{id:'art',level:3,sport:false,blocked:false,talent:0},{id:'running',level:4,sport:true,blocked:false,talent:0}];
 const result=settleFocusPractice(hobbies,{hobby:1,sport:3});
 assert.deepEqual(result.map(h=>h.level),[2,3.3,4.9]);
 assert.deepEqual(hobbies.map(h=>h.level),[2,3,4]);
});
test('both focuses may improve the same sport and talent growth is bounded',()=>{
 const hobby={id:'running',level:4,sport:true,blocked:false,talent:100};
 assert.ok(Math.abs(settleFocusPractice([hobby],{hobby:1,sport:1})[0].level-6.28)<1e-10);
 assert.equal(settleFocusPractice([{...hobby,talent:-100}],{sport:1})[0].level,4.48);
 assert.equal(settleFocusPractice([{...hobby,blocked:true}],{sport:1})[0].level,4);
 assert.deepEqual(settleFocusPractice([],{hobby:1}),[]);
});
test('career preparation caps at two years and clears only when working without preparation',()=>{
 assert.equal(settleCareerPreparation(1.8,{careerPrep:1,study:1},false),2);
 assert.equal(settleCareerPreparation(.5,{careerPrep:1,work:3},true),.75);
 assert.equal(settleCareerPreparation(1,{work:1},true),0);
 assert.equal(settleCareerPreparation(1,{study:1},false),1);
});
