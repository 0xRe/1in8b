import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,DEFAULT_SETTINGS,advanceYear,advanceTimeline,makeChoice,setFocus,addReflection} from '../src/game/engine';
import {encodeSave,decodeSave} from '../src/game/storage';
import {naturalFamily} from './helpers/adult-family-simulation';

test('year focus time survives an interrupted decision without accruing while blocked',()=>{
 let life=createLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true},1);
 for(let step=0;step<30&&life.age<7;step++){
  if(life.pendingDecision)life=life.pendingDecision.type==='reflection'?addReflection(life,''):makeChoice(life,life.pendingDecision.choices[0].id);
  life=advanceYear(life);
 }
 assert.equal(life.pendingDecision?.id,'hobby');
 assert.deepEqual(life.timeline?.focusTime,{balanced:life.timeline!.position});
 assert.deepEqual(advanceTimeline(life,.25),life);
 const restored=decodeSave(encodeSave(life,[])).life!;
 const chosen=makeChoice(restored,'reading');
 const done=advanceTimeline(chosen,1);
 assert.deepEqual(done.timeline?.focusTime,{balanced:1});
 assert.deepEqual(advanceTimeline(done,1),done);
});

test('switching focus halfway through a year splits its effect at settlement',()=>{
 const original=[...naturalFamily(1)].find(l=>l.age>=18&&!l.pendingDecision&&(!l.timeline||l.timeline.complete))!;
 assert.ok(original);
 // Isolate focus settlement from ordinary feed and finance using a valid empty timeline.
 const life=structuredClone(original);life.focus='health';
 life.feed!.plan={year:life.year,age:life.age,queue:[],gates:{}};
 life.timeline={year:life.year,age:life.age,position:0,complete:false,queue:[],scheduledDecisions:[],focusTime:{}};
 life.stats.health=50;life.stats.knowledge=50;
 const half=advanceTimeline(life,.5);
 assert.equal(half.stats.health,50);assert.equal(half.stats.knowledge,50);
 const switched=setFocus(decodeSave(encodeSave(half,[])).life!,'knowledge');
 const done=advanceTimeline(switched,.5);
 assert.deepEqual(done.timeline?.focusTime,{health:.5,knowledge:.5});
 assert.equal(done.stats.health,50.7);assert.equal(done.stats.knowledge,50.75);
 assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);
});

test('legacy focus ledgers remain absent and invalid saved time is rejected',()=>{
 let life=advanceYear(advanceYear(createLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true},1)));
 const legacy=structuredClone(life);delete legacy.timeline!.focusTime;
 assert.equal(decodeSave(encodeSave(legacy,[])).life!.timeline!.focusTime,undefined);
 const chosen=makeChoice(legacy,'curious');
 const done=advanceTimeline(chosen,1);
 assert.equal(done.timeline!.focusTime,undefined);
 for(const bad of [{health:-1},{health:'1'},{unknown:1},{health:null},{health:1e7}]) {
  const forged=structuredClone(life) as any;forged.timeline.focusTime=bad;
  assert.throws(()=>decodeSave(JSON.stringify({version:1,life:forged,past:[]})));
 }
});
