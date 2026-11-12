import test from 'node:test';
import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {encodeSave,decodeSave} from '../src/game/storage';
import {planYearTimeline} from '../src/game/year-timeline';
const observed=[...naturalFamily(1)].find(l=>l.pendingDecision?.key==='decision.descendantUniversity')!;
function fixture(){
 const life=structuredClone(observed);assert.ok(life);
 const decision=life.pendingDecision!;life.pendingDecision=null;
 life.feed!.plan={year:life.year,age:life.age,queue:[],gates:{}};
 return Object.assign(life,{timeline:{year:life.year,age:life.age,...planYearTimeline([],[decision],()=>0),scheduledDecisions:[decision]}});
}
test('scheduled family choices preserve their exact names, options and charges on backup',()=>{
 const life=fixture();assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
});
test('scheduled choices reject forged costs, identity and missing or extra payloads',()=>{
 const changes:((x:ReturnType<typeof fixture>)=>void)[]=[
  x=>x.timeline.scheduledDecisions[0].choices[0].params.amount=0,
  x=>x.timeline.scheduledDecisions[0].params.name='Wrong person',
  x=>x.timeline.scheduledDecisions[0].age++,
  x=>x.timeline.scheduledDecisions[0].choices.pop(),
  x=>x.timeline.scheduledDecisions=[],
  x=>x.timeline.scheduledDecisions.push(structuredClone(x.timeline.scheduledDecisions[0])),
  x=>x.pendingDecision=structuredClone(x.timeline.scheduledDecisions[0]),
 ];
 for(const change of changes){const life=fixture();change(life);assert.throws(()=>encodeSave(life,[]));}
});
