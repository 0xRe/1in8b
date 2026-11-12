import test from 'node:test';
import assert from 'node:assert/strict';
import {descendantSubject,parseDescendantDecision} from '../src/game/descendants';
import {naturalFamily} from './helpers/adult-family-simulation';
import {advanceYear,advanceTimeline,makeChoice} from '../src/game/engine';
import {planYearTimeline} from '../src/game/year-timeline';
import {newFeedState} from '../src/game/annual-feed';
import {decodeSave,encodeSave} from '../src/game/storage';
const observed=[...naturalFamily(1)].find(l=>l.pendingDecision?.key==='decision.descendantUniversity')!;
function fixture(){
 const life=structuredClone(observed),decision=life.pendingDecision!;life.pendingDecision=null;
 life.feed=newFeedState();life.feed.plan={year:life.year,age:life.age,queue:[{id:'legacy_quiet',at:.1},{id:'legacy_travel',at:.8}],gates:{}};
 life.timeline={year:life.year,age:life.age,...planYearTimeline(life.feed.plan.queue,[decision],()=>0),scheduledDecisions:[decision]};
 return life;
}
test('public advancement stops at a queued choice without aging or charging and resumes after reload',()=>{
 const life=fixture(),before=structuredClone(life),count=life.events.length;
 const next=advanceYear(life);
 assert.equal(next.age,life.age);assert.equal(next.stats.savings,life.stats.savings);
 assert.equal(next.events.length,count+1);assert.equal(next.pendingDecision?.id,life.timeline!.scheduledDecisions![0].id);
 assert.equal(next.timeline!.position,.3);assert.equal(next.feed!.plan!.queue.length,1);
 assert.deepEqual(life,before);assert.deepEqual(advanceYear(next),next);
 const restored=decodeSave(encodeSave(next,[])).life!;
 const choice=restored.pendingDecision!.choices[0].id;
 const resumed=advanceYear(makeChoice(restored,choice));
 assert.equal(resumed.age,life.age);assert.equal(resumed.timeline!.complete,true);
 assert.equal(resumed.events.filter(e=>e.key==='event.travel').length,next.events.filter(e=>e.key==='event.travel').length+1);
 assert.deepEqual(decodeSave(encodeSave(resumed,[])).life,resumed);
 assert.deepEqual(advanceTimeline(resumed,1),resumed);
});
test('partial timeline ticks persist without firing future slots or annual income twice',()=>{
 const life=fixture();const next=advanceTimeline(life,.05);
 assert.equal(next.timeline!.position,.05);assert.deepEqual(next.stats,life.stats);
 assert.equal(next.events.length,life.events.length);assert.equal(next.age,life.age);
 assert.deepEqual(decodeSave(encodeSave(next,[])).life,next);
 const story=advanceTimeline(next,.05);assert.equal(story.events.length,next.events.length+1);
});
test('unsupported timeline nodes fail before altering the input',()=>{
 const life=fixture();life.timeline!.queue.unshift({kind:'adoption',id:'move',at:.02});
 const before=structuredClone(life);assert.throws(()=>advanceTimeline(life,1));assert.deepEqual(life,before);
});

test('invalidated family choices are skipped and later stories still execute',()=>{
 const life=fixture(),id=life.timeline!.scheduledDecisions![0].id;
 const subject=descendantSubject(life,parseDescendantDecision(id)!.childId)!;
 subject.state.prison={startYear:life.year,endYear:life.year+2,releasedYear:null};
 const next=advanceYear(life);
 assert.equal(next.pendingDecision,null);assert.equal(next.timeline!.complete,true);
 assert.equal(next.events.length,life.events.length+2);assert.equal(next.stats.savings,life.stats.savings);
 assert.deepEqual(next.timeline!.scheduledDecisions,[]);assert.deepEqual(decodeSave(encodeSave(next,[])).life,next);
});

test('automatic mode resolves a decision reached while resuming a timeline',()=>{
 const life=fixture();life.settings.autoChoices=true;
 const next=advanceYear(life);
 assert.equal(next.pendingDecision,null,'automatic mode must not stall behind a queued choice');
 assert.ok(next.decisions.includes(life.timeline!.scheduledDecisions![0].id));
 assert.equal(next.age,life.age);assert.deepEqual(decodeSave(encodeSave(next,[])).life,next);
});
