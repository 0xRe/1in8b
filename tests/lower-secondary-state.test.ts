import test from 'node:test';import assert from 'node:assert/strict';
import {prepareLowerSecondary,commitLowerSecondaryChoice} from '../src/game/lower-secondary-state';
import type {AcademicState} from '../src/game/school-model';
import {naturalFamily} from './helpers/adult-family-simulation';
import {encodeSave,decodeSave} from '../src/game/storage';
const context={country:'UGA',birthRegion:'ssa',year:2038,age:12,transition:.6,quintile:2,knowledge:50,knowledgeZ:0,topMarkAge:null,war:0,homeSchool:false,learningCentre:false,banned:false,returning:false};
const graduated=():AcademicState=>({version:1,qualification:1,doctorate:false,medicine:false,studyCountry:'UGA',enrollment:null,lastGraduation:{stage:'primary',age:12,country:'UGA'}});
const noDraw=()=>{throw Error('unexpected draw');};
test('free secondary entry starts zero credit without granting qualification and survives actual save decoding',()=>{
 const c={...context,country:'CHN'},initial=graduated(),result=prepareLowerSecondary(initial,c,false,noDraw);
 assert.equal(result.academic.enrollment!.stage,'lowerSecondary');assert.equal(result.academic.enrollment!.completedYears,0);
 assert.equal(result.academic.enrollment!.lastSettledAge,11);assert.equal(result.academic.qualification,1);
 assert.ok(result.academic.enrollment!.retention);assert.equal(initial.enrollment,null);
 const life=structuredClone([...naturalFamily(1)].find(l=>l.age>=12)!);life.academics=result.academic;
 const loaded=decodeSave(encodeSave(life,[])).life!.academics!;
 assert.deepEqual(loaded,result.academic);assert.equal(prepareLowerSecondary(loaded,c,false,noDraw).plan,null);
});
test('learning-centre refusal is persisted and cannot reroll on redraw or reload',()=>{
 let calls=0;const c={...context,learningCentre:true};const result=prepareLowerSecondary(graduated(),c,false,()=>{calls++;return .9;});
 assert.equal(result.academic.lowerSecondary!.status,'outOfSchool');assert.equal(result.academic.enrollment,null);assert.equal(calls,1);
 const life=structuredClone([...naturalFamily(1)].find(l=>l.age>=12)!);life.academics=result.academic;
 const loaded=decodeSave(encodeSave(life,[])).life!.academics!;
 assert.equal(prepareLowerSecondary(loaded,c,false,noDraw).academic,loaded);
});
test('pending application survives save, settles once and returns effects only on the first commit',()=>{
 const ready=prepareLowerSecondary(graduated(),context,false,noDraw).academic;
 const life=structuredClone([...naturalFamily(1)].find(l=>l.age>=12)!);life.academics=ready;
 const loaded=decodeSave(encodeSave(life,[])).life!.academics!;
 let calls=0;const result=commitLowerSecondaryChoice(loaded,context,'go',()=>{calls++;return .99;});
 assert.equal(calls,1);assert.equal(result.effects!.happiness,-6);assert.equal(result.academic.lowerSecondary!.retry,true);
 assert.equal(result.academic.lowerSecondary!.status,'outOfSchool');assert.equal(result.academic.qualification,1);
 assert.equal(commitLowerSecondaryChoice(result.academic,context,'go',noDraw).effects,null);
 const admitted=commitLowerSecondaryChoice(ready,context,'go',()=>0);assert.equal(admitted.academic.enrollment!.stage,'lowerSecondary');assert.equal(admitted.academic.qualification,1);
});
test('missing graduation, late replay, separate schooling and relocation cannot enter or consume admission draws',()=>{
 const a=graduated();delete a.lastGraduation;assert.equal(prepareLowerSecondary(a,context,false,noDraw).academic,a);
 assert.equal(prepareLowerSecondary(graduated(),{...context,age:13},false,noDraw).plan,null);
 assert.equal(prepareLowerSecondary(graduated(),context,true,noDraw).plan,null);
 const ready=prepareLowerSecondary(graduated(),context,false,noDraw).academic;
 assert.equal(commitLowerSecondaryChoice(ready,{...context,country:'USA'},'go',noDraw).effects,null);
 assert.equal(commitLowerSecondaryChoice(ready,{...context,age:13},'go',noDraw).effects,null);
});
test('malformed or future admission receipts cannot be imported',()=>{
 const life=structuredClone([...naturalFamily(1)].find(l=>l.age>=12)!);life.academics=graduated();
 for(const receipt of [{age:111,country:'UGA',route:'application',status:'pending'},{age:12,country:'ZZZ',route:'application',status:'pending'},{age:12,country:'UGA',route:'bad',status:'pending'},{age:12,country:'UGA',route:'automatic',status:'pending'}]){
  (life.academics as any).lowerSecondary=receipt;assert.throws(()=>encodeSave(life,[]));
 }
});
