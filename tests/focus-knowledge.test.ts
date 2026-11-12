import test from 'node:test';
import assert from 'node:assert/strict';
import {knowledgeDelta,settleKnowledge,initialKnowledgeEffort,knowledgePercentile,type KnowledgeContext} from '../src/game/focus-knowledge';
const base:KnowledgeContext={age:12,enrolled:true,higherEducation:false,ged:false,adultCourse:false,curious:false,goodTeacher:false,health:50,hobbies:[]};
const close=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);
test('school study, adult learning and part-time university use distinct effort baselines',()=>{
 close(knowledgeDelta({...base,curious:true,hobbies:[{knowledge:2,social:0}]},{study:1}),.075);
 close(knowledgeDelta({...base,age:20,higherEducation:true},{parttime:1}),-.00625);
 close(settleKnowledge(1,0,{...base,age:20,higherEducation:true},{parttime:1}).effort,.96375);
 close(settleKnowledge(1,0,{...base,age:25,enrolled:false},{learn:1}).effort,1.04125);
 close(knowledgeDelta({...base,enrolled:false},{study:1}),.03);
});
test('older memory protection and adult courses affect retained learning without direct point additions',()=>{
 close(knowledgeDelta({...base,age:73,enrolled:false},{mind:1}),.03725);
 close(knowledgeDelta({...base,age:73,enrolled:false},{}),-.02375);
 close(knowledgeDelta({...base,age:30,enrolled:false,ged:true,adultCourse:true},{}),.05625);
 close(knowledgeDelta({...base,age:30,enrolled:false,adultCourse:true},{}),.01625);
 close(knowledgeDelta({...base,goodTeacher:true},{study:1}),.11);
});
test('knowledge initialization, percentile conversion and effort clamps retain source boundaries',()=>{
 close(initialKnowledgeEffort(5,1,90),0);
 close(initialKnowledgeEffort(20,0,72),0);
 assert.equal(settleKnowledge(1.6,0,base,{study:1}).effort,1.6);
 assert.equal(settleKnowledge(-1.4,0,{...base,enrolled:false},{rest:1}).effort,-1.4);
 assert.ok(Math.abs(knowledgePercentile(20,0,0)-50)<.0001);
 assert.ok(Math.abs(knowledgePercentile(20,0,1)-84.1344746)<.0001);
 assert.equal(knowledgePercentile(20,100,1.6),99.9);
 assert.equal(knowledgePercentile(20,-100,-1.4),.5);
});
