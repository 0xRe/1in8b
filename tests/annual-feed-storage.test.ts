import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,DEFAULT_SETTINGS} from '../src/game/engine';
import {encodeSave,decodeSave} from '../src/game/storage';
import {newFeedState,planAnnualFeed,fireNextFeed} from '../src/game/annual-feed';
const list=['play','family','discovery'].map(id=>({id,minAge:0,maxAge:110,weight:1,eligible:()=>true,run:()=>{}}));
function fixture(){const life=createLife(DEFAULT_SETTINGS,42);const feed=newFeedState();planAnnualFeed(feed,life.year,life.age,list,()=>.2);return Object.assign(life,{feed});}
test('queued and partly consumed feed survive actual backup import without rerolling',()=>{
 const life=fixture();
 const restored=decodeSave(encodeSave(life,[])).life! as typeof life;
 assert.deepEqual(restored,life);
 const expected=fireNextFeed(life.feed,life.year,life.age,list,()=>.1);
 assert.equal(fireNextFeed(restored.feed,restored.year,restored.age,list,()=>.1),expected);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 const old=createLife(DEFAULT_SETTINGS,42);assert.ok(!Object.hasOwn(decodeSave(encodeSave(old,[])).life!,'feed'));
});
test('feed backups reject contradictory years, queue order, duplicate IDs and gate types',()=>{
 const mutations=[
  (x:ReturnType<typeof fixture>)=>x.feed.plan!.year++,
  (x:ReturnType<typeof fixture>)=>x.feed.plan!.age++,
  (x:ReturnType<typeof fixture>)=>x.feed.plan!.queue.reverse(),
  (x:ReturnType<typeof fixture>)=>x.feed.plan!.queue.push({...x.feed.plan!.queue[0],at:.9}),
  (x:ReturnType<typeof fixture>)=>x.feed.plan!.queue[0].at=NaN,
  (x:ReturnType<typeof fixture>)=>(x.feed.plan!.gates as any).play='yes',
  (x:ReturnType<typeof fixture>)=>x.feed.lastYears.play=x.year+1,
  (x:ReturnType<typeof fixture>)=>x.feed.recent.push('unrecorded'),
  (x:ReturnType<typeof fixture>)=>x.feed.plan!.queue[0].id='__proto__',
  (x:ReturnType<typeof fixture>)=>x.feed.plan!.gates[x.feed.plan!.queue[0].id]=false,
 ];
 for(const mutate of mutations){const life=fixture();mutate(life);assert.throws(()=>encodeSave(life,[]));}
});
