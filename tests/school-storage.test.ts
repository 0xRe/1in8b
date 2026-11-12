import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,DEFAULT_SETTINGS,advanceYear} from '../src/game/engine';
import {encodeSave,decodeSave} from '../src/game/storage';
function adult(){let life=createLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true,autoChoices:true},1);for(let n=0;n<1000&&life.age<30&&life.alive;n++)life=advanceYear(life);assert.equal(life.age,30);return life;}
test('versioned academic state round trips without changing legacy education or records',()=>{
 const life=adult(),education=life.stats.education,history=structuredClone(life.history);
 life.academics={version:1,qualification:4,doctorate:false,medicine:false,studyCountry:'GBR',enrollment:{stage:'graduate',completedYears:1,lastSettledAge:29,paused:false,graduationPending:false}};
 const restored=decodeSave(encodeSave(life,[])).life!;
 assert.deepEqual(restored.academics,life.academics);assert.equal(restored.stats.education,education);assert.deepEqual(restored.history,history);
 const old=adult();assert.equal(decodeSave(encodeSave(old,[])).life!.academics,undefined);
});
test('academic imports reject invalid versions, qualifications, country and enrollment chronology',()=>{
 const life=adult();const base={version:1,qualification:4,doctorate:false,medicine:false,studyCountry:null,enrollment:null};
 const course={stage:'graduate',completedYears:1,lastSettledAge:29,paused:false,graduationPending:false};
 const bad=[null,{}, {...base,version:2},{...base,qualification:6},{...base,qualification:2.5},{...base,doctorate:true},{...base,studyCountry:'ZZZ'},{...base,medicine:1},
 ...[{stage:'unknown'},{completedYears:-1},{completedYears:3},{lastSettledAge:31},{paused:'yes'},{graduationPending:true},{completedYears:2},{stage:'phd'}].map(patch=>({...base,enrollment:{...course,...patch}}))];
 for(const academics of bad)assert.throws(()=>decodeSave(JSON.stringify({version:1,life:{...life,academics},past:[]})),JSON.stringify(academics));
});
test('medical duration and pending graduation survive save validation',()=>{
 const life=adult();life.academics={version:1,qualification:3,doctorate:false,medicine:true,studyCountry:'GBR',enrollment:{stage:'university',completedYears:5,lastSettledAge:29,paused:false,graduationPending:true}};
 assert.deepEqual(decodeSave(encodeSave(life,[])).life!.academics,life.academics);
 life.academics.studyCountry='USA';assert.throws(()=>decodeSave(encodeSave(life,[])));
});
