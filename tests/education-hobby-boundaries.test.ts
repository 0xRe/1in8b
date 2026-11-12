import test from 'node:test';import assert from 'node:assert/strict';
import {createNewGame} from '../src/game/new-game';
import {DEFAULT_SETTINGS,advanceYear,makeChoice,addReflection} from '../src/game/engine';
import {settleEducationHobbies} from '../src/game/education-context-lifecycle';
function startHobby(){
 for(let seed=1;seed<=50;seed++){
  let life=createNewGame({...DEFAULT_SETTINGS,country:'JPN',gentler:true,dailyThemeDay:'2026-10-26'},seed);
  for(let i=0;i<100&&life.pendingDecision?.id!=='hobby';i++){const d=life.pendingDecision;life=!d?advanceYear(life):d.type==='reflection'?addReflection(life,''):makeChoice(life,d.choices[0].id);}
  if(life.pendingDecision?.id==='hobby'&&life.pendingDecision.choices.some(c=>c.id==='reading'))return makeChoice(life,'reading');
 }
 throw Error('An eligible reading menu must be naturally reachable');
}
test('a newly chosen hobby begins at zero on the source scale, independently of legacy displayed skill',()=>{
 const life=startHobby(),h=life.hobbies.find(h=>h.id==='reading')!;
 assert.equal(h.progress!.level,0);assert.equal(h.progress!.since,7);assert.ok(h.skill>0);
});
test('reading annual practice uses study talent rather than the neutral fallback',()=>{
 const life=startHobby(),h=life.hobbies.find(h=>h.id==='reading')!;
 life.timeline!.complete=true;life.timeline!.position=1;life.timeline!.queue=[];
 const before=h.progress!.level;
 settleEducationHobbies(life,{});
 const multiplier=Math.max(.4,Math.min(1.9,1+.35*life.learning!.talents.study));
 assert.ok(Math.abs(h.progress!.level-before-.35*multiplier)<1e-10);
});
