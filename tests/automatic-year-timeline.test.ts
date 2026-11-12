import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,DEFAULT_SETTINGS,advanceYear,makeChoice} from '../src/game/engine';
import {encodeSave,decodeSave} from '../src/game/storage';
test('ordinary childhood creates a resumable decision timeline before later stories fire',()=>{
 let life=createLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true},1);
 for(let steps=0;steps<20&&!life.pendingDecision;steps++)life=advanceYear(life);
 assert.equal(life.pendingDecision?.id,'temperament');assert.equal(life.age,2);
 assert.ok(life.timeline&&!life.timeline.complete);assert.ok(life.feed!.plan!.queue.length>0);
 const count=life.events.length,age=life.age;
 const restored=decodeSave(encodeSave(life,[])).life!;
 const chosen=makeChoice(restored,'curious');
 const completed=advanceYear(chosen);
 assert.equal(completed.age,age);assert.ok(completed.events.length>count);
 assert.equal(completed.timeline!.complete,true);
 assert.deepEqual(decodeSave(encodeSave(completed,[])).life,completed);
 const next=advanceYear(completed);assert.ok(next.age>=age);
 assert.ok(!next.timeline||next.timeline.age===next.age);
});

test('automatic childhood choices keep one history row per age and never overwrite birth',()=>{
 let life=createLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true,autoChoices:true},1);
 for(let step=0;step<100&&life.alive&&life.age<8;step++){
  life=advanceYear(life);
  assert.equal(life.pendingDecision,null);
  assert.deepEqual(life.history.map(row=>row.age),Array.from({length:life.age+1},(_,age)=>age));
  assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 }
 assert.equal(life.age,8);
});
