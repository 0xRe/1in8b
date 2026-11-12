import test from 'node:test';
import assert from 'node:assert/strict';
import {drawTalents,createLearningState,learningZ,applyLearningGain} from '../src/game/learning-state';
import {createLife,DEFAULT_SETTINGS} from '../src/game/engine';
import {decodeSave,encodeSave} from '../src/game/storage';
test('six correlated talents consume seven ordered draws and clamp tails',()=>{
 const values=[.5,.1,.2,.3,.4,.8,.9];let count=0;
 assert.deepEqual(drawTalents(()=>values[count++]),{study:-1.24,body:-.81,art:-.51,music:-.25,hands:.81,words:1.24});
 assert.equal(count,7);
 assert.deepEqual(drawTalents(()=>0),drawTalents(()=>.0001));
 assert.deepEqual(drawTalents(()=>1),drawTalents(()=>.9999));
});
test('learning initialization and one-off gains preserve talent and cap effort',()=>{
 const talents={study:1,body:0,art:0,music:0,hands:0,words:0};
 const child=createLearningState(3,talents,99);assert.equal(child.effort,0);
 assert.equal(learningZ(child,3),.315);
 const adult=createLearningState(18,talents,72);assert.equal(adult.effort,-.9);
 const changed=applyLearningGain(adult,18,1000);assert.equal(changed.state.effort,1.6);
 assert.equal(adult.effort,-.9);assert.deepEqual(changed.state.talents,talents);
 assert.equal(applyLearningGain(adult,18,-1000).state.effort,-1.4);
});
test('optional learning state round trips without inventing values in legacy saves',()=>{
 const life=createLife({...DEFAULT_SETTINGS,country:'JPN'},1);
 assert.equal(decodeSave(encodeSave(life,[])).life!.learning,undefined);
 life.learning=createLearningState(0,drawTalents(()=>.5),40);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life!.learning,life.learning);
 for(const learning of [null,{}, {...life.learning,version:2},{...life.learning,effort:1.61},{...life.learning,effort:-1.41},{...life.learning,talents:{...life.learning.talents,study:5}},{...life.learning,talents:{study:0}}]){
  assert.throws(()=>decodeSave(JSON.stringify({version:1,life:{...life,learning},past:[]})));
 }
});

test('legacy initialization uses stable birth identity without consuming event RNG or rewriting displayed knowledge',async()=>{
 const {initializeLegacyLearning}=await import('../src/game/learning-state');
 const life=createLife({...DEFAULT_SETTINGS,country:'JPN'},18);
 life.age=18;life.stats.knowledge=72;
 const before=structuredClone(life),first=initializeLegacyLearning(life);
 assert.equal(first.rng,life.rng);assert.equal(first.stats.knowledge,72);
 assert.deepEqual(life,before);
 assert.ok(first.learning);
 assert.equal(initializeLegacyLearning(first),first);
 const moved={...life,country:{...life.country,id:'USA'}};
 assert.deepEqual(initializeLegacyLearning(moved).learning,first.learning);
 assert.deepEqual(initializeLegacyLearning(structuredClone(life)).learning,first.learning);
});

test('annual learning settles observed focus once and does not backfill skipped ages',async()=>{
 const {settleLearningYear}=await import('../src/game/learning-state');
 const context={age:18,enrolled:true,higherEducation:true,ged:false,adultCourse:false,curious:false,goodTeacher:false,health:70,hobbies:[]};
 const before=createLearningState(18,drawTalents(()=>.5),72);
 const result=settleLearningYear(before,context,{study:1});
 assert.ok(Math.abs(result.state.effort-.07625)<1e-12);
 assert.equal(result.state.lastSettledAge,18);
 assert.equal(before.lastSettledAge,undefined);
 const replay=settleLearningYear(result.state,context,{rest:1});
 assert.equal(replay.state,result.state);assert.equal(replay.knowledge,null);
 const later=settleLearningYear(result.state,{...context,age:21},{study:1});
 assert.ok(Math.abs(later.state.effort-(.07625*.97+.07625))<1e-12);
 const backwards=settleLearningYear(later.state,context,{study:1});
 assert.equal(backwards.state,later.state);assert.equal(backwards.knowledge,null);
});

test('saved annual learning markers survive reload and reject future or fractional completion',()=>{
 const life=createLife({...DEFAULT_SETTINGS,country:'JPN'},19);
 life.learning={...createLearningState(0,drawTalents(()=>.5),5),lastSettledAge:0};
 assert.equal(decodeSave(encodeSave(life,[])).life!.learning!.lastSettledAge,0);
 for(const lastSettledAge of [-1,.5,1,null,'0'])assert.throws(()=>decodeSave(JSON.stringify({version:1,life:{...life,learning:{...life.learning,lastSettledAge}},past:[]})));
});
