import test from 'node:test';
import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {advanceTimeline,makeChoice,addReflection} from '../src/game/engine';
import {planYearTimeline} from '../src/game/year-timeline';
import {encodeSave,decodeSave} from '../src/game/storage';
const lives=[...naturalFamily(1)];
for(const id of ['temperament','education','reflection-5'])test(`queued ${id} opens at its timestamp and resumes through backup`,()=>{
 const life=structuredClone(lives.find(l=>l.pendingDecision?.id===id)!);assert.ok(life);
 const decision=life.pendingDecision!;life.pendingDecision=null;
 life.feed!.plan={year:life.year,age:life.age,queue:[],gates:{}};
 life.timeline={year:life.year,age:life.age,...planYearTimeline([],[decision],()=>0),scheduledDecisions:[decision]};
 const early=advanceTimeline(life,.2);assert.equal(early.pendingDecision,null);
 const open=advanceTimeline(decodeSave(encodeSave(early,[])).life!,.2);
 assert.deepEqual(open.pendingDecision,decision);assert.equal(open.age,life.age);assert.equal(open.timeline!.position,.3);
 const chosen=decision.type==='reflection'?addReflection(open,'A remembered year'):makeChoice(open,decision.choices[0].id);
 const next=advanceTimeline(decodeSave(encodeSave(chosen,[])).life!,1);
 assert.equal(next.timeline!.complete,true);assert.equal(next.age,life.age);assert.equal(next.pendingDecision,null);
 assert.deepEqual(decodeSave(encodeSave(next,[])).life,next);
 const alreadyResolved=structuredClone(life);
 if(decision.type==='reflection')alreadyResolved.reflections[String(life.age)]='Already recorded';
 else alreadyResolved.decisions.push(decision.id);
 const skipped=advanceTimeline(alreadyResolved,1);
 assert.equal(skipped.pendingDecision,null);assert.equal(skipped.timeline!.complete,true);
 assert.deepEqual(skipped.timeline!.scheduledDecisions,[]);

});
