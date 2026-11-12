import test from 'node:test';
import assert from 'node:assert/strict';
import { planYearTimeline, advanceYearTimeline } from '../src/game/year-timeline';

test('year timeline interleaves ordinary slots and only two scheduled decisions', () => {
 const feed=[{id:'first',at:.1},{id:'second',at:.5},{id:'third',at:.8}];
 const timeline=planYearTimeline(feed,[{id:'education'},{id:'partner'},{id:'job'}],()=>0);
 assert.deepEqual(timeline.queue.map(s=>[s.kind,s.id,s.at]),[
  ['feed','first',.1],['decision','education',.3],['feed','second',.5],['decision','partner',.6],['feed','third',.8],
 ]);
 assert.equal(timeline.position,0); assert.equal(timeline.complete,false);
 assert.equal(feed.length,3,'planning must not consume feed state');
});

test('explicit decision timing bypasses random timing and ties retain insertion order', () => {
 let draws=0;
 const state=planYearTimeline([{id:'story',at:.2}],[{id:'override',at:.2},{id:'ordinary'}],()=>{draws++;return .5});
 assert.equal(draws,1);
 assert.deepEqual(state.queue.map(s=>s.id),['story','override','ordinary']);
 assert.ok(Math.abs(state.queue[2].at-.675)<Number.EPSILON);
});

test('interrupting decision consumes its slot but preserves future events across JSON restore', () => {
 const state=planYearTimeline([{id:'a',at:.1},{id:'b',at:.5}],[{id:'choice'}],()=>0);
 const fired:string[]=[];
 advanceYearTimeline(state,1,slot=>{fired.push(slot.id);return slot.kind==='decision'});
 assert.deepEqual(fired,['a','choice']);assert.equal(state.position,.3);assert.equal(state.complete,false);
 const resumed=JSON.parse(JSON.stringify(state));
 advanceYearTimeline(resumed,.2,slot=>{fired.push(slot.id);return false});
 assert.deepEqual(fired,['a','choice','b']);assert.equal(resumed.position,.5);
 advanceYearTimeline(resumed,1,()=>false);
 assert.equal(resumed.complete,true);assert.equal(resumed.position,1);
 advanceYearTimeline(resumed,1,()=>{throw Error('completed years cannot replay')});
 assert.deepEqual(state.queue.map(s=>s.id),['b'],'restored continuation does not mutate its source');
});

test('partial ticks leave later slots queued and a boundary decision delays completion', () => {
 const state=planYearTimeline([],[{id:'late',at:1}],()=>0);
 advanceYearTimeline(state,.5,()=>{throw Error('not due')});
 assert.equal(state.position,.5);
 advanceYearTimeline(state,.5,()=>true);
 assert.equal(state.position,1);assert.equal(state.complete,false);
 advanceYearTimeline(state,0,()=>false);assert.equal(state.complete,true);
});

test('invalid elapsed time cannot silently corrupt a resumable timeline',()=>{
 for(const elapsed of [-1,Infinity,NaN]){
  const state=planYearTimeline([{id:'a',at:.2}],[],()=>0);
  assert.throws(()=>advanceYearTimeline(state,elapsed,()=>false));
  assert.equal(state.position,0);assert.equal(state.queue.length,1);
 }
});

test('adoption and survival milestones precede ordinary stories and decisions',()=>{
 const state=planYearTimeline([{id:'story',at:.1}],[{id:'choice'}],()=>0,{adoptionMove:true,survivalMilestone:true});
 assert.deepEqual(state.queue.map(s=>[s.kind,s.id,s.at]),[
  ['adoption','move',.02],['milestone','survive',.03],['feed','story',.1],['decision','choice',.3],
 ]);
 const fired:string[]=[];
 advanceYearTimeline(state,.025,slot=>{fired.push(slot.id);return false});
 assert.deepEqual(fired,['move']);assert.equal(state.position,.025);
 const restored=JSON.parse(JSON.stringify(state));
 advanceYearTimeline(restored,.01,slot=>{fired.push(slot.id);return false});
 assert.deepEqual(fired,['move','survive']);
 assert.deepEqual(restored.queue.map(s=>s.id),['story','choice']);
});
