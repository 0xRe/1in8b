import test from 'node:test';
import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {descendantSubject,resolveDescendantDecision} from '../src/game/descendants';
import {makeChoice} from '../src/game/engine';
const hooks={event:()=>{throw new Error('Invalid decision emitted an event');},name:()=>{throw new Error('Invalid decision generated a spouse');},mortality:()=>0};
for(const kind of ['university','wedding','migration'] as const){
 test(`${kind}: stale resolved decisions cannot charge or mutate a family`,()=>{
  const before=[...naturalFamily()].find(l=>l.pendingDecision?.id.startsWith(`descendant-${kind}-`))!;
  assert.ok(before);
  const decision=structuredClone(before.pendingDecision!);
  const life=makeChoice(before,decision.choices[0].id);
  life.pendingDecision=decision;
  const saved=structuredClone(life);
  assert.equal(resolveDescendantDecision(life,decision.choices[0].id,hooks),false);
  assert.deepEqual(life,saved);
 });
 test(`${kind}: premature decisions are inert`,()=>{
  const life=[...naturalFamily()].find(l=>l.pendingDecision?.id.startsWith(`descendant-${kind}-`))!;
  const decision=life.pendingDecision!;
  const childId=decision.id.slice(`descendant-${kind}-`.length);
  descendantSubject(life,childId)!.person.age=17;
  const saved=structuredClone(life);
  assert.equal(resolveDescendantDecision(life,decision.choices[0].id,hooks),false);
  assert.deepEqual(life,saved);
 });
}
for(const kind of ['university','wedding','migration'] as const){
 test(`${kind}: imprisonment invalidates an already offered decision without charging`,()=>{
  const life=[...naturalFamily()].find(l=>l.pendingDecision?.id.startsWith(`descendant-${kind}-`))!;
  assert.ok(life);
  const decision=life.pendingDecision!;
  const subject=descendantSubject(life,decision.id.slice(`descendant-${kind}-`.length))!;
  subject.state.prison={startYear:life.year,endYear:life.year+2,releasedYear:null};
  const saved=structuredClone(life);
  assert.equal(resolveDescendantDecision(life,decision.choices[0].id,hooks),false);
  assert.deepEqual(life,saved);
 });
}
