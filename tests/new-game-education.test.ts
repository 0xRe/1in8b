import test from 'node:test';import assert from 'node:assert/strict';
import {createNewGame} from '../src/game/new-game';
import {createLife,DEFAULT_SETTINGS} from '../src/game/engine';
import {decodeSave,encodeSave} from '../src/game/storage';
import {familyChoice} from './helpers/adult-family-simulation';
test('new-game entry creates deterministic learning and education without rewriting legacy births',()=>{
 const settings={...DEFAULT_SETTINGS,country:'DEU',gentler:true,dailyThemeDay:'2026-10-20'};
 const life=createNewGame(settings,43),again=createNewGame(settings,43),legacy=createLife(settings,43);
 assert.deepEqual(life,again);assert.equal(life.id,legacy.id);assert.equal(life.rng,legacy.rng);
 assert.equal(life.academics?.qualification,0);assert.equal(life.academics?.enrollment,null);
 assert.ok(life.learning);assert.equal(legacy.academics,undefined);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 assert.equal(decodeSave(encodeSave(legacy,[])).life!.academics,undefined);
});
test('a new game reaches primary education through public yearly actions and preserves earned credit',()=>{
 let life=createNewGame({...DEFAULT_SETTINGS,country:'DEU',gentler:true,dailyThemeDay:'2026-10-20'},43);
 let entered=false,earned=false;
 for(let i=0;i<100&&life.alive&&life.age<13;i++){
  const restored=decodeSave(encodeSave(life,[])).life!;
  const next=familyChoice(life);assert.deepEqual(next,familyChoice(restored));life=next;
  entered ||= life.academics?.primary?.entry?.kind==='school';
  earned ||= (life.academics?.qualification??0)>=1;
  if(life.academics?.enrollment?.stage==='primary')assert.equal(life.academics.qualification,0);
 }
 assert.ok(entered,'newborn must reach the real primary entry transaction');
 assert.ok(earned,'six observed study years must produce a primary qualification');
});

test('newborn intellectual-development study talent survives strict storage without widening unrelated domains',()=>{
 const life=createNewGame({...DEFAULT_SETTINGS,country:'NGA',gentler:true,dailyThemeDay:'2026-10-20'},1);
 assert.equal(life.birthDevelopment!.developmental!.supportLevel,3);
 assert.ok(life.learning!.talents.study< -4.53);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 const bad=structuredClone(life);bad.learning!.talents.body=-4.94;assert.throws(()=>encodeSave(bad,[]));
 const missing=structuredClone(life);delete missing.birthDevelopment;assert.throws(()=>encodeSave(missing,[]));
 const extreme=structuredClone(life);extreme.learning!.talents.study=-10;assert.throws(()=>encodeSave(extreme,[]));
});
