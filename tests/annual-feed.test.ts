import test from 'node:test';
import assert from 'node:assert/strict';
import {newFeedState,planAnnualFeed,fireNextFeed,type FeedCandidate} from '../src/game/annual-feed';
const candidates=(count:number):FeedCandidate[]=>Array.from({length:count},(_,i)=>({id:`e${i}`,minAge:0,maxAge:110,weight:1,eligible:()=>true,run:()=>{}}));
test('two slots before six and three afterwards, unique and chronological',()=>{
 for(const age of [0,5,6,60]){
  const state=newFeedState();planAnnualFeed(state,2026+age,age,candidates(5),()=>.5);
  assert.equal(state.plan!.queue.length,age<6?2:3);
  assert.equal(new Set(state.plan!.queue.map(e=>e.id)).size,state.plan!.queue.length);
  assert.ok(state.plan!.queue.every((e,i,q)=>e.at>=.08&&e.at<.94&&(i===0||e.at>q[i-1].at)));
  assert.deepEqual(state.recent,[]);assert.deepEqual(state.lastYears,{});
 }
});
test('planning and firing reuse annual eligibility without rerolling after reload',()=>{
 let draws=0,runs=0;
 const list:FeedCandidate[]=[{id:'visit',minAge:36,maxAge:110,weight:30,eligible:gate=>gate(.6),run:()=>{runs++}}];
 const state=newFeedState();planAnnualFeed(state,2070,44,list,()=>{draws++;return .5});
 const restored=JSON.parse(JSON.stringify(state));const prior=draws;
 planAnnualFeed(restored,2070,44,list,()=>{throw Error('replanning must be inert')});
 assert.equal(fireNextFeed(restored,2070,44,list,()=>{throw Error('cached gate must not reroll')}),'visit');
 assert.equal(runs,1);assert.equal(draws,prior);assert.deepEqual(restored.recent,['visit']);
 assert.equal(fireNextFeed(restored,2070,44,list,()=>0),null);
});
test('recent repeatable events retain half weight and other recent events eight percent',()=>{
 for(const [repeatable,draw,expected] of [[true,.3,'e0'],[false,.3,'e1']] as const){
  const state=newFeedState();state.recent=['e0'];const list=candidates(2);list[0].repeatable=repeatable;
  let n=0;planAnnualFeed(state,2070,44,list,()=>n++<3?.1:draw);
  assert.equal(state.plan!.queue[0].id,expected);
 }
});
test('release between scheduling and firing invalidates a visit without history or effects',()=>{
 let imprisoned=true,runs=0;const state=newFeedState();
 const list:FeedCandidate[]=[{id:'visit',minAge:36,maxAge:110,weight:30,gap:1,eligible:()=>imprisoned,run:()=>{runs++}}];
 planAnnualFeed(state,2070,44,list,()=>.1);imprisoned=false;
 assert.equal(fireNextFeed(state,2070,44,list,()=>.1),null);
 assert.equal(runs,0);assert.deepEqual(state.recent,[]);assert.deepEqual(state.lastYears,{});
});
test('gap/age exclusions do not consume eligibility draws and recent history is bounded',()=>{
 const state=newFeedState();state.lastYears.e0=2069;state.recent=Array.from({length:14},(_,i)=>`old${i}`);
 const list=candidates(3);list[0].gap=2;list[0].eligible=()=>{throw Error('gap exclusion')};list[1].maxAge=40;list[1].eligible=()=>{throw Error('age exclusion')};
 planAnnualFeed(state,2070,44,list,()=>.1);
 assert.deepEqual(state.plan!.queue.map(e=>e.id),['e2']);fireNextFeed(state,2070,44,list,()=>.1);
 assert.equal(state.recent.length,14);assert.equal(state.recent[0],'old1');assert.equal(state.recent.at(-1),'e2');
});
