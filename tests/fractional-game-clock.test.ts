import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,DEFAULT_SETTINGS,advanceYear} from '../src/game/engine';
import {encodeSave,decodeSave} from '../src/game/storage';

test('normal year planning advances only the requested fraction and retains later events',()=>{
 const birth=createLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true},1);
 const started=advanceYear(birth,.01);
 assert.equal(started.age,1);
 assert.equal(started.timeline?.position,.01);
 assert.equal(started.timeline?.financePending,true);
 assert.equal(started.feed!.plan!.queue.length,2);
 assert.equal(started.stats.savings,birth.stats.savings);
 const restored=decodeSave(encodeSave(started,[])).life!;
 const later=advanceYear(restored,.1);
 assert.equal(later.age,1);assert.ok(Math.abs(later.timeline!.position-.11)<1e-10);
 assert.deepEqual(later,advanceYear(started,.1));
 const completed=advanceYear(later,1);
 assert.equal(completed.age,1);assert.equal(completed.timeline!.complete,true);
 assert.ok(completed.stats.savings>birth.stats.savings);
});

test('zero and invalid clock intervals never create a year or mutate the prior save',()=>{
 const birth=createLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true},1);
 assert.deepEqual(advanceYear(birth,0),birth);
 for(const elapsed of [-1,NaN,Infinity])assert.throws(()=>advanceYear(birth,elapsed));
 assert.equal(birth.age,0);assert.equal(birth.timeline,undefined);
});
