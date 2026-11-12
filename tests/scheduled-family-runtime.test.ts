import test from 'node:test';
import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {setFocus} from '../src/game/engine';
import {descendantSubject,parseDescendantDecision,descendantDecision} from '../src/game/descendants';
import {planYearTimeline} from '../src/game/year-timeline';
import {encodeSave,decodeSave} from '../src/game/storage';
const observed=[...naturalFamily(1)].find(l=>l.pendingDecision?.key==='decision.descendantUniversity')!;
function fixture(){
 const life=structuredClone(observed),decision=life.pendingDecision!;life.pendingDecision=null;
 life.feed!.plan={year:life.year,age:life.age,queue:[],gates:{}};
 life.timeline={year:life.year,age:life.age,...planYearTimeline([],[decision],()=>0),scheduledDecisions:[decision]};
 return life;
}
test('public mutations refresh queued family names and fees without charging or consuming RNG',()=>{
 const life=fixture(),id=life.timeline!.scheduledDecisions![0].id;
 const parsed=parseDescendantDecision(id)!;const subject=descendantSubject(life,parsed.childId)!;
 subject.person.name='Updated family name';for(const episode of life.healthcare.episodes)if(episode.patientId===subject.person.id)episode.patientName=subject.person.name;life.timeline!.scheduledDecisions![0].choices[0].params.amount=-1;
 const before=structuredClone(life);const next=setFocus(life,life.focus==='health'?'balanced':'health');
 assert.deepEqual(next.timeline!.scheduledDecisions![0],descendantDecision(next,descendantSubject(next,parsed.childId)!.person,parsed.kind));
 assert.equal(next.stats.savings,life.stats.savings);assert.equal(next.rng,life.rng);assert.equal(next.descendants.rng,life.descendants.rng);
 assert.deepEqual(life,before);assert.deepEqual(decodeSave(encodeSave(next,[])).life,next);
});
test('an imprisoned child loses the queued university decision before autosave',()=>{
 const life=fixture(),parsed=parseDescendantDecision(life.timeline!.scheduledDecisions![0].id)!;
 const subject=descendantSubject(life,parsed.childId)!;
 subject.state.prison={startYear:life.year,endYear:life.year+2,releasedYear:null};
 const next=setFocus(life,life.focus==='health'?'balanced':'health');
 assert.deepEqual(next.timeline!.queue,[]);assert.deepEqual(next.timeline!.scheduledDecisions,[]);
 assert.equal(next.stats.savings,life.stats.savings);assert.equal(next.pendingDecision,null);
 assert.deepEqual(decodeSave(encodeSave(next,[])).life,next);
});
