import test from 'node:test';import assert from 'node:assert/strict';
import {planPrimaryPlacement,commitPrimaryEntry} from '../src/game/primary-school-state';
import type {AcademicState} from '../src/game/school-model';
import {naturalFamily} from './helpers/adult-family-simulation';
import {encodeSave,decodeSave} from '../src/game/storage';
const empty=():AcademicState=>({version:1,qualification:0,doctorate:false,medicine:false,studyCountry:null,enrollment:null});
const context={completion:.7,region:'ssa',war:0,year:2026,quintile:3,rich:false,privateShare:.2,country:'UGA',refugee:false,irregular:false,learningCentreOnly:false,educatedParentPresent:false};
test('age-five placement persists public outcomes as well as private plans and cannot redraw',()=>{
 for(const [draw,kind,gain] of [[0,'private',.05],[.99,'public',0]] as const){
  let calls=0;const start=empty();const planned=planPrimaryPlacement(start,5,context,false,()=>{calls++;return draw;});
  assert.deepEqual(planned.academic.primary!.placement,{age:5,kind});assert.equal(planned.effortGain,gain);assert.equal(calls,1);
  assert.equal(start.primary,undefined);
  const repeat=planPrimaryPlacement(planned.academic,5,context,false,()=>{throw Error('redraw');});
  assert.equal(repeat.academic,planned.academic);assert.equal(repeat.effortGain,0);
 }
});
test('placement excludes unsupported ages and the separate developmental school pathway without RNG',()=>{
 for(const age of [4,6])assert.equal(planPrimaryPlacement(empty(),age,context,false,()=>{throw Error('draw');}).effortGain,0);
 assert.equal(planPrimaryPlacement(empty(),5,context,true,()=>{throw Error('draw');}).academic.primary,undefined);
});
test('actual entry honors stored placement, starts zero credit and survives a real save round trip',()=>{
 const planned=planPrimaryPlacement(empty(),5,context,false,()=>0).academic;
 const admitted=commitPrimaryEntry(planned,6,context,false,()=>.99);
 assert.equal(admitted.enrollment!.stage,'primary');assert.equal(admitted.enrollment!.completedYears,0);assert.equal(admitted.enrollment!.lastSettledAge,5);
 assert.equal(admitted.studyCountry,'UGA');assert.deepEqual(admitted.primary!.entry,{age:6,kind:'school',country:'UGA'});
 const life=structuredClone([...naturalFamily(1)].find(l=>l.age>=6)!);life.academics=admitted;
 const loaded=decodeSave(encodeSave(life,[])).life!;
 assert.deepEqual(loaded.academics,admitted);
 assert.equal(commitPrimaryEntry(loaded.academics!,6,context,false,()=>{throw Error('repeat entry');}),loaded.academics);
});
test('failed entry is persisted and special pathways retain their distinct receipt',()=>{
 const failed=commitPrimaryEntry(empty(),6,context,false,()=>.99);
 assert.equal(failed.enrollment,null);assert.equal(failed.primary!.entry!.kind,'outOfSchool');
 assert.equal(commitPrimaryEntry(failed,6,context,false,()=>{throw Error('redraw');}),failed);
 assert.equal(commitPrimaryEntry(empty(),6,{...context,country:'USA'},false,()=>0).primary!.entry!.kind,'homeSchool');
 assert.equal(commitPrimaryEntry(empty(),6,{...context,learningCentreOnly:true},false,()=>0).primary!.entry!.kind,'learningCentre');
});
test('saved primary receipts reject future and incorrect milestone ages, invalid kinds and unknown countries',()=>{
 const life=structuredClone([...naturalFamily(1)].find(l=>l.age>=6)!);life.academics=empty();
 for(const primary of [{placement:{age:6,kind:'private'}},{placement:{age:5,kind:'unknown'}},{entry:{age:7,kind:'school',country:'UGA'}},{entry:{age:6,kind:'unknown',country:'UGA'}},{entry:{age:6,kind:'school',country:'ZZZ'}}]){
  life.academics.primary=primary as any;assert.throws(()=>decodeSave(encodeSave(life,[])));
 }
});

test('entry cannot be invented on later birthdays, before its age or over an existing course',()=>{
 const noDraw=()=>{throw Error('unexpected admission draw');};
 for(const age of [5,7,18]){const state=empty();assert.equal(commitPrimaryEntry(state,age,context,false,noDraw),state);}
 const state=empty();assert.equal(commitPrimaryEntry(state,6,context,true,noDraw),state);
 state.qualification=1;assert.equal(commitPrimaryEntry(state,6,context,false,noDraw),state);
 const young=structuredClone([...naturalFamily(1)].find(l=>l.age===5)!);assert.ok(young);
 young.academics={...empty(),primary:{entry:{age:6,kind:'school',country:'UGA'}}};
 assert.throws(()=>decodeSave(encodeSave(young,[])));
});
