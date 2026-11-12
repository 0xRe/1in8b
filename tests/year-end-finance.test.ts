import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,DEFAULT_SETTINGS,advanceYear,advanceTimeline,makeChoice} from '../src/game/engine';
import {encodeSave,decodeSave} from '../src/game/storage';

test('annual interest waits until the year finishes and restored choices cannot pay it twice',()=>{
 let life=createLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true},1);
 life=advanceYear(life);
 assert.equal(life.age,1);
 const priorSavings=life.stats.savings;
 life=advanceYear(life);
 assert.equal(life.pendingDecision?.id,'temperament');
 assert.equal(life.stats.savings,priorSavings,'interest must not be paid before the year-2 choice');
 assert.equal(life.timeline?.financePending,true);
 const saved=decodeSave(encodeSave(life,[])).life!;
 const chosen=makeChoice(saved,'curious');
 const finished=advanceYear(chosen);
 assert.equal(finished.age,2);
 assert.equal(finished.timeline?.financePending,false);
 assert.ok(finished.stats.savings>priorSavings);
 const restored=decodeSave(encodeSave(finished,[])).life!;
 assert.deepEqual(advanceTimeline(restored,1),restored);
 assert.deepEqual(advanceYear(chosen),finished);
});

test('legacy timelines without a pending finance marker do not gain another settlement',()=>{
 let life=createLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true},1);
 life=advanceYear(advanceYear(life));
 delete life.timeline!.financePending;
 const prior=life.stats.savings;
 const finished=advanceYear(makeChoice(decodeSave(encodeSave(life,[])).life!,'curious'));
 assert.equal(finished.stats.savings,prior);
});

test('backup rejects malformed and already-complete pending finance states',()=>{
 let life=createLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true},1);
 life=advanceYear(advanceYear(life));
 for(const badValue of ['true',1,null]) {
  const bad=structuredClone(life) as any;bad.timeline.financePending=badValue;
  assert.throws(()=>decodeSave(JSON.stringify({version:1,life:bad,past:[]})));
 }
 const complete=advanceYear(makeChoice(life,'curious'));
 assert.equal(complete.timeline?.complete,true);
 complete.timeline!.financePending=true;
 assert.throws(()=>decodeSave(JSON.stringify({version:1,life:complete,past:[]})));
});
