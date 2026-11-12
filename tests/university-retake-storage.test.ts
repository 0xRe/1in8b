import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,DEFAULT_SETTINGS,advanceYear} from '../src/game/engine';
import {encodeSave,decodeSave} from '../src/game/storage';
import {emptyUniversityAdmissions} from '../src/game/university-retakes';
function adult(){let life=createLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true,autoChoices:true},1);for(let n=0;n<1000&&life.age<20;n++)life=advanceYear(life);assert.equal(life.age,20);return life;}
test('retake offers, preparation and overdue service schedules round trip without changing legacy lives',()=>{
 const life=adult(),original=structuredClone(life);
 for(const state of [emptyUniversityAdmissions(),{...emptyUniversityAdmissions(),offer:{country:'JPN',age:20,retakes:0}},{...emptyUniversityAdmissions(),retakes:1,scheduledAge:21},{...emptyUniversityAdmissions(),retakes:2,scheduledAge:19},{...emptyUniversityAdmissions(),retakes:2,declined:true}]){
  life.universityAdmissions=state;
  const loaded=decodeSave(encodeSave(life,[])).life!;
  assert.deepEqual(loaded.universityAdmissions,state);delete loaded.universityAdmissions;
  assert.deepEqual(loaded,original);
 }
 assert.equal(decodeSave(encodeSave(original,[])).life!.universityAdmissions,undefined);
});
test('malformed admissions imports cannot invent future offers, extra attempts or contradictory pending actions',()=>{
 const life=adult(),base=emptyUniversityAdmissions();
 const invalid=[null,{}, {...base,version:2},{...base,retakes:-1},{...base,retakes:4},{...base,retakes:1.5},{...base,declined:1},
  {...base,scheduledAge:21},{...base,retakes:1,scheduledAge:22},{...base,retakes:1,scheduledAge:-1},{...base,retakes:1,scheduledAge:20.5},
  {...base,retakes:1,scheduledAge:21,declined:true},
  ...[{country:'JPN',age:19,retakes:0},{country:'ZZZ',age:20,retakes:0},{country:'JPN',age:21,retakes:0},{country:'JPN',age:20,retakes:1}].map(offer=>({...base,offer})),
  {...base,offer:{country:'JPN',age:20,retakes:0},declined:true},
  {...base,retakes:1,scheduledAge:21,offer:{country:'JPN',age:20,retakes:1}},
 ];
 for(const universityAdmissions of invalid)assert.throws(()=>decodeSave(JSON.stringify({version:1,life:{...life,universityAdmissions},past:[]})),JSON.stringify(universityAdmissions));
});
