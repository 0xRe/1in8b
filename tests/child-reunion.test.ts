import test from 'node:test';
import assert from 'node:assert/strict';
import {naturalFamily,familyChoice} from './helpers/adult-family-simulation';
import {nextDescendantDecision} from '../src/game/descendants';
import {makeChoice} from '../src/game/engine';
import {encodeSave,decodeSave} from '../src/game/storage';
const fixture=[...naturalFamily(1)].find(l=>!l.pendingDecision&&l.family.children.some(c=>c.alive&&c.age===25))!;
for(const choice of ['welcomeChildBack','needTimeWithChild'])test(`${choice}: reunion survives reload, settles once and has no cost`,()=>{
 let life=structuredClone(fixture);
 const child=life.family.children.find(c=>c.alive&&c.age===25)!;
 const state=life.descendants.children.find(c=>c.childId===child.id)!;
 state.prison={startYear:life.year-2,endYear:life.year,releasedYear:life.year};
 life.pendingDecision=nextDescendantDecision(life);
 assert.equal(life.pendingDecision?.id,`descendant-reunion-${child.id}`);
 life=decodeSave(encodeSave(life,[])).life!;
 const money=life.stats.savings;
 const decision=structuredClone(life.pendingDecision!);
 life=makeChoice(life,choice);
 assert.equal(life.stats.savings,money);
 assert.equal(life.pendingDecision,null);
 assert.ok(life.decisions.includes(decision.id));
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 const repeated=structuredClone(life);repeated.pendingDecision=decision;
 assert.deepEqual(makeChoice(repeated,choice),repeated);
 assert.notEqual(nextDescendantDecision(life)?.id,decision.id);
});
test('needing time can reconcile later, never immediately, and does not repeat',()=>{
 let life=structuredClone(fixture);
 const child=life.family.children.find(c=>c.alive&&c.age===25)!;
 const state=life.descendants.children.find(c=>c.childId===child.id)!;
 state.prison={startYear:life.year-2,endYear:life.year,releasedYear:life.year};
 life.pendingDecision=nextDescendantDecision(life);
 life=makeChoice(life,'needTimeWithChild');
 const chosenYear=life.year;
 for(let n=0;n<160&&life.alive&&life.year<chosenYear+15;n++){
  life=familyChoice(life);
  life=decodeSave(encodeSave(life,[])).life!;
  const events=life.events.filter(e=>e.key==='event.descendantReconciled'&&e.params.name===child.name);
  assert.ok(events.every(e=>e.year>=chosenYear+2));
  assert.ok(events.length<=1);
 }
 assert.equal(life.events.filter(e=>e.key==='event.descendantReconciled'&&e.params.name===child.name).length,1);
});
