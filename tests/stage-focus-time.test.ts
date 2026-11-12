import test from 'node:test';import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {advanceTimeline} from '../src/game/engine';
import {encodeSave,decodeSave} from '../src/game/storage';
function fixture(){
 const life=structuredClone([...naturalFamily(1)].find(l=>l.age>=18&&!l.pendingDecision&&(!l.timeline||l.timeline.complete))!);
 life.stageFocus={version:1,selection:{current:'study',picked:'study',returnTo:null,automaticFallback:null}};
 life.feed!.plan={year:life.year,age:life.age,queue:[],gates:{}};
 life.timeline={year:life.year,age:life.age,position:0,complete:false,queue:[],scheduledDecisions:[],focusTime:{},stageFocusTime:{}};
 return life;
}
test('stage activities record mixed observed time across reload without overwriting legacy focus records',()=>{
 const half=advanceTimeline(fixture(),.25);
 assert.deepEqual(half.timeline!.stageFocusTime,{study:.25});
 assert.equal(half.history.at(-1)!.annual!.stageFocusWeights,null);
 const loaded=decodeSave(encodeSave(half,[])).life!;
 loaded.stageFocus!.selection.current='parttime';
 const done=advanceTimeline(loaded,.75);
 assert.deepEqual(done.timeline!.stageFocusTime,{study:.25,parttime:.75});
 assert.deepEqual(done.history.at(-1)!.annual!.stageFocusWeights,{study:.25,parttime:.75});
 assert.ok(done.history.at(-1)!.annual!.focusWeights);
 assert.deepEqual(advanceTimeline(done,1),done);
 assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);
});
test('absent stage time remains unknown and invalid stage keys or weights are rejected',()=>{
 const life=fixture();delete life.timeline!.stageFocusTime;
 const done=advanceTimeline(life,1);
 assert.equal(done.history.at(-1)!.annual!.stageFocusWeights,undefined);
 for(const ledger of [{study:-1},{knowledge:1},{study:'1'}]){
  const invalid=fixture();invalid.timeline!.stageFocusTime=ledger as any;
  assert.throws(()=>decodeSave(encodeSave(invalid,[])));
 }
 const valid=advanceTimeline(fixture(),1);
 for(const weights of [{study:.4},{study:-1,parttime:2},{career:1}]){
  const invalid=structuredClone(valid);invalid.history.at(-1)!.annual!.stageFocusWeights=weights as any;
  assert.throws(()=>decodeSave(encodeSave(invalid,[])));
 }
});

test('stage activity effects settle once from observed shares, without legacy bonuses',()=>{
 const life=fixture();life.focus='health';
 life.stats.health=50;life.stats.happiness=50;life.stats.social=50;life.stats.knowledge=50;
 const part=advanceTimeline(life,.25);
 assert.equal(part.stats.health,50);assert.equal(part.stats.happiness,50);assert.equal(part.stats.social,50);
 const loaded=decodeSave(encodeSave(part,[])).life!;
 loaded.stageFocus!.selection.current='sport';
 const done=advanceTimeline(loaded,.75);
 assert.equal(done.stats.health,53);
 assert.equal(done.stats.happiness,51.25);
 assert.equal(done.stats.social,50.5);
 assert.equal(done.stats.knowledge,50);
 assert.deepEqual(done.history.at(-1)!.annual!.stageFocusWeights,{study:.25,sport:.75});
 const restored=decodeSave(encodeSave(done,[])).life!;
 assert.deepEqual(advanceTimeline(restored,1),restored);
});

test('stage years with no selected activity receive no hidden legacy bonus',()=>{
 const life=fixture();life.stageFocus!.selection.current=null;life.focus='health';
 life.stats.health=50;life.stats.happiness=50;
 const done=advanceTimeline(life,1);
 assert.equal(done.stats.health,50);assert.equal(done.stats.happiness,50);
 assert.deepEqual(done.history.at(-1)!.annual!.stageFocusWeights,{});
});

test('stage-only timelines expose their own completion state through a save round trip',()=>{
 const life=fixture();delete life.timeline!.focusTime;
 delete life.history.at(-1)!.annual!.focusWeights;delete life.history.at(-1)!.annual!.completed;
 const half=advanceTimeline(life,.5);
 assert.equal(half.history.at(-1)!.annual!.completed,false);
 const restored=decodeSave(encodeSave(half,[])).life!;
 const done=advanceTimeline(restored,.5);
 assert.equal(done.history.at(-1)!.annual!.completed,true);
 assert.deepEqual(done.history.at(-1)!.annual!.stageFocusWeights,{study:1});
 assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);
});
