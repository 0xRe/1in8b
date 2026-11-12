import {selectNewFocus} from '../src/game/school-focus';
import test from 'node:test';import assert from 'node:assert/strict';
import {createNewGame} from '../src/game/new-game';
import {DEFAULT_SETTINGS,chooseHobby} from '../src/game/engine';
import {familyChoice} from './helpers/adult-family-simulation';
import {decodeSave,encodeSave} from '../src/game/storage';
test('observed childhood hobbies reach specialist school choices without injected admission facts',()=>{
 let life=createNewGame({...DEFAULT_SETTINGS,country:'DEU',gentler:true,dailyThemeDay:'2026-10-20'},43);
 for(let i=0;i<100&&(life.age<7||life.pendingDecision);i++)life=familyChoice(life);
 life=chooseHobby(life,'art');life=selectNewFocus(life,'hobby');assert.equal(life.hobbies.find(h=>h.id==='art')!.progress?.since,7);
 for(let i=0;i<150&&life.alive&&life.pendingDecision?.id!=='upperSecondary-15';i++)life=familyChoice(life);
 assert.equal(life.pendingDecision?.id,'upperSecondary-15');
 assert.ok(life.pendingDecision!.choices.some(c=>c.id==='upperArts'));
 assert.equal(life.academics!.upperFacts!.hobbies.find(h=>h.id==='art')!.since,7);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
});

test('hobby observations settle once and do not backfill missing legacy history',async()=>{
 const {settleEducationHobbies,refreshEducationContext}=await import('../src/game/education-context-lifecycle');
 const life=createNewGame({...DEFAULT_SETTINGS,country:'DEU'},43);life.age=10;life.year=life.birthYear+10;
 life.timeline={year:life.year,age:life.age,position:1,complete:true,queue:[]};
 life.hobbies=[{id:'music',skill:90,trainedAt:9},{id:'art',skill:5,trainedAt:-1,progress:{since:10,level:1}}];
 settleEducationHobbies(life,{hobby:1});const first=structuredClone(life);settleEducationHobbies(life,{hobby:1});assert.deepEqual(life,first);
 assert.equal(life.hobbies[0].progress,undefined);assert.equal(life.academics!.upperFacts!.hobbies.length,1);
 assert.ok(life.hobbies[1].progress!.level>1);
 delete life.academics!.origin;life.academics!.upperFacts!.hobbies=[];refreshEducationContext(life);assert.deepEqual(life.academics!.upperFacts!.hobbies,[]);
});
