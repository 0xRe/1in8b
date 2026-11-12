import test from 'node:test';
import assert from 'node:assert/strict';
import {duoCommandPayload,type DuoClientCommand} from '../src/lib/duo-client-command';
import {createFullDuoState,createDuoState,joinDuo,duoSnapshot,applyDuoCommand} from '../src/lib/duo-engine';
const now=Date.UTC(2026,9,28);
test('actual client payloads pass strict server command validation for ready chat pause resume and close',()=>{
 const state=createFullDuoState('wire','A','a','ha','i',now);joinDuo(state,'B','b','hb','i',now);
 let n=0;
 for(const [actor,action] of [['a',{kind:'ready'}],['b',{kind:'ready'}],['a',{kind:'chat',text:'Hello'}],['a',{kind:'pause'}],['a',{kind:'resume'}],['a',{kind:'close'}]] as [string,DuoClientCommand][]){
  const payload=duoCommandPayload(action,duoSnapshot(state,actor,now),`wire-command-${++n}`);
  assert.equal('runIndex' in payload,false);assert.doesNotThrow(()=>applyDuoCommand(state,actor,payload,now));
 }
 assert.equal(state.messages[0].text,'Hello');assert.equal(state.phase,'closed');
});
test('lifetime payload keeps required run guard and executes playback and advancement',()=>{
 const state=createFullDuoState('wire-life','A','a','ha','i',now);joinDuo(state,'B','b','hb','i',now);
 for(const actor of ['a','b'])applyDuoCommand(state,actor,duoCommandPayload({kind:'ready'},duoSnapshot(state,actor,now),`ready-command-${actor}`),now);
 const snap=duoSnapshot(state,'a',now);
 const payload=duoCommandPayload({kind:'life-playback',mode:'auto',clockVersion:snap.lifetime!.clockVersion},snap,'auto-command-a');
 assert.equal('runIndex' in payload&&payload.runIndex,0);assert.doesNotThrow(()=>applyDuoCommand(state,'a',payload,now));
 const next=duoSnapshot(state,'a',now);
 assert.doesNotThrow(()=>applyDuoCommand(state,'a',duoCommandPayload({kind:'life-advance',clockVersion:next.lifetime!.clockVersion},next,'advance-command-a'),now));
});
test('legacy personal payload adds its stage and proposal guards without changing common commands',()=>{
 const state=createDuoState('wire-short','A','a','ha','i',now);joinDuo(state,'B','b','hb','i',now);
 for(const actor of ['a','b'])applyDuoCommand(state,actor,duoCommandPayload({kind:'ready'},duoSnapshot(state,actor,now),`ready-command-${actor}`),now);
 const snap=duoSnapshot(state,'a',now),payload=duoCommandPayload({kind:'personal',choice:'care'},snap,'personal-command-a');
 assert.deepEqual(payload,{id:'personal-command-a',kind:'personal',choice:'care',runIndex:0,stage:0,proposalVersion:0});
 assert.doesNotThrow(()=>applyDuoCommand(state,'a',payload,now));
});
