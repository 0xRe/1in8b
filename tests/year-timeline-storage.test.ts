import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,DEFAULT_SETTINGS,advanceYear} from '../src/game/engine';
import {encodeSave,decodeSave} from '../src/game/storage';
import {newFeedState,planAnnualFeed,fireNextFeed} from '../src/game/annual-feed';
import {planYearTimeline,advanceYearTimeline} from '../src/game/year-timeline';
const candidates=['play','family','discovery'].map(id=>({id,minAge:0,maxAge:110,weight:1,eligible:()=>true,run:()=>{}}));
function fixture(){
 const life=createLife(DEFAULT_SETTINGS,42);
 const feed=newFeedState();planAnnualFeed(feed,life.year,life.age,candidates,()=>.2);
 return Object.assign(life,{feed,timeline:{year:life.year,age:life.age,...planYearTimeline(feed.plan!.queue,[{id:'example-decision'}],()=>0)}});
}
test('partially consumed timelines round trip with the exact remaining feed',()=>{
 const life=fixture();
 advanceYearTimeline(life.timeline,.2,slot=>{if(slot.kind==='feed')fireNextFeed(life.feed,life.year,life.age,candidates,()=>0);return false});
 const restored=decodeSave(encodeSave(life,[])).life! as typeof life;
 assert.deepEqual(restored,life);
 for(const state of [life,restored])advanceYearTimeline(state.timeline,1,slot=>{if(slot.kind==='feed')fireNextFeed(state.feed,state.year,state.age,candidates,()=>0);return slot.kind==='decision'});
 assert.deepEqual(restored,life);assert.equal(life.timeline.position,.3);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
});
test('timeline import rejects chronology, capacity and feed divergence',()=>{
 const mutations:((x:ReturnType<typeof fixture>)=>void)[]=[
  x=>x.timeline.year++,x=>x.timeline.age++,x=>x.timeline.position=-1,
  x=>x.timeline.position=2,x=>(x.timeline as any).complete='yes',
  x=>x.timeline.complete=true,x=>x.timeline.queue.reverse(),
  x=>x.timeline.queue[0].at=-.1,x=>x.timeline.queue[0].at=1.1,
  x=>x.timeline.position=.9,x=>x.timeline.queue[0].id='different',
  x=>x.timeline.queue[0].kind='decision',x=>x.timeline.queue.push({...x.timeline.queue[1]}),
  x=>x.feed.plan!.queue.pop(),x=>(x as any).feed=undefined,
  x=>x.decisions.push('example-decision'),
 ];
 for(const mutate of mutations){const life=fixture();mutate(life);assert.throws(()=>encodeSave(life,[]));}
});
test('legacy backups do not acquire or reroll a timeline on decoding',()=>{
 const life=createLife(DEFAULT_SETTINGS,42);const restored=decodeSave(encodeSave(life,[])).life!;
 assert.deepEqual(restored,life);assert.ok(!Object.hasOwn(restored,'timeline'));
});

test('early timeline nodes retain fixed order and reject forged milestone ages',()=>{
 const life=advanceYear(createLife(DEFAULT_SETTINGS,42));
 life.feed=newFeedState();planAnnualFeed(life.feed,life.year,life.age,candidates,()=>.2);
 life.timeline={year:life.year,age:life.age,...planYearTimeline(life.feed.plan!.queue,[],()=>0,{survivalMilestone:true,adoptionMove:true})};
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 for(const change of [(x:any)=>x.timeline.queue[0].at=.01,(x:any)=>x.timeline.queue[1].id='invented',(x:any)=>x.timeline.queue.push({...x.timeline.queue[0]})]){
  const invalid=structuredClone(life);change(invalid);assert.throws(()=>encodeSave(invalid,[]));
 }
 const infant=fixture();infant.timeline.queue.unshift({kind:'milestone',id:'survive',at:.03});
 assert.throws(()=>encodeSave(infant,[]),'birth is not a survival milestone');
});
