import test from 'node:test';
import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {advanceTimeline,setFocus} from '../src/game/engine';
import {encodeSave,decodeSave} from '../src/game/storage';
import {lifeInsights} from '../src/lib/life-insights';
import {recordRows} from '../src/lib/record-export';
import {translator} from '../src/lib/i18n';
function fixture(){
 const life=structuredClone([...naturalFamily(1)].find(l=>l.age>=18&&!l.pendingDecision&&(!l.timeline||l.timeline.complete))!);
 life.feed!.plan={year:life.year,age:life.age,queue:[],gates:{}};
 life.timeline={year:life.year,age:life.age,position:0,complete:false,queue:[],scheduledDecisions:[],focusTime:{}};
 life.focus='health';return life;
}
test('completed mixed-focus history persists proportions and exports both focuses',()=>{
 const half=advanceTimeline(fixture(),.5);
 assert.equal(half.history.at(-1)!.annual!.completed,false);
 assert.equal(half.history.at(-1)!.annual!.focusWeights,null);
 const done=advanceTimeline(setFocus(half,'knowledge'),.5);
 assert.deepEqual(done.history.at(-1)!.annual!.focusWeights,{health:.5,knowledge:.5});
 assert.equal(done.history.at(-1)!.annual!.completed,true);
 const restored=decodeSave(encodeSave(done,[])).life!;
 assert.deepEqual(restored,done);
 const label=String(recordRows(restored,translator('en')).at(-1)![10]);
 assert.match(label,/50%/);assert.match(label,/Health/);assert.match(label,/Learning/);
 const before=lifeInsights(half),after=lifeInsights(done);
 assert.equal(after.adultFocusYears.health-before.adultFocusYears.health,.5);
 assert.equal(after.adultFocusYears.knowledge-before.adultFocusYears.knowledge,.5);
 assert.equal(after.recordedAdultYears-before.recordedAdultYears,1);
});

test('closed-year proportions survive removal of the transient timeline',()=>{
 const done=advanceTimeline(setFocus(advanceTimeline(fixture(),.5),'knowledge'),.5);
 // Annual opportunity checks remove the completed scheduler before opening a new choice.
 delete done.timeline;
 const changed=setFocus(done,'health');
 assert.deepEqual(changed.history.at(-1)!.annual!.focusWeights,{health:.5,knowledge:.5});
 assert.equal(changed.history.at(-1)!.annual!.completed,true);
});

test('imports reject forged focus proportions and inconsistent completion flags',()=>{
 const done=advanceTimeline(fixture(),1);
 for(const weights of [{health:2},{health:.2},{unknown:1},{health:-1},{health:'1'},null]){
  const bad=structuredClone(done) as any;bad.history.at(-1).annual.focusWeights=weights;
  assert.throws(()=>decodeSave(JSON.stringify({version:1,life:bad,past:[]})));
 }
 const bad=structuredClone(done);bad.history.at(-1)!.annual!.completed=false;
 assert.throws(()=>decodeSave(JSON.stringify({version:1,life:bad,past:[]})));
});
