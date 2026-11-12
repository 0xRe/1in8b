import test from 'node:test';
import assert from 'node:assert/strict';
import {childLeaveAge,childDeparture} from '../src/game/child-home';
const noDraw=()=>{throw Error('unexpected draw');};
test('planned departure age uses country sex and two draws, with no ordinary plan in patriarchal or eap families',()=>{
 assert.equal(childLeaveAge({id:'CHN',region:'eap'},'M',noDraw),0);
 assert.equal(childLeaveAge({id:'IND',region:'sa'},'F',noDraw),0);
 assert.equal(childLeaveAge({id:'THA',region:'eap'},'F',noDraw),0);
 assert.equal(childLeaveAge({id:'USA',region:'hi'},'F',()=>.5),23);
 assert.equal(childLeaveAge({id:'HRV',region:'eca'},'M',()=>.5),34);
 assert.equal(childLeaveAge({id:'FIN',region:'hi'},'F',()=>0),19);
 assert.equal(childLeaveAge({id:'BRA',region:'lac'},'M',()=>.5),28);
 let draws=0;childLeaveAge({id:'USA',region:'hi'},'M',()=>{draws++;return .5;});assert.equal(draws,2);
});
const context={country:'USA',region:'hi',age:23,plannedAge:23,annual:true,home:true,left:false,staying:false,married:false,parentImprisoned:false,childImprisoned:false,withdrawn:false,rural:false,university:false,lastChild:false};
test('planned departures stop during custody, preserve decided homes, and let the last child stay once',()=>{
 assert.deepEqual(childDeparture(context,noDraw),{outcome:'leave',reason:'own'});
 assert.deepEqual(childDeparture({...context,university:true},noDraw),{outcome:'leave',reason:'university'});
 assert.deepEqual(childDeparture({...context,age:24,university:true},noDraw),{outcome:'leave',reason:'own'});
 for(const change of [{annual:false},{home:false},{left:true},{staying:true},{married:true},{parentImprisoned:true},{childImprisoned:true},{withdrawn:true},{age:22}])assert.equal(childDeparture({...context,...change},noDraw),null);
 assert.deepEqual(childDeparture({...context,lastChild:true},()=>.079),{outcome:'stay',reason:'own'});
 assert.deepEqual(childDeparture({...context,lastChild:true},()=>.08),{outcome:'leave',reason:'own'});
});
test('rural city departures require no ordinary plan, ages17 to35, and bypass last-child stay draws',()=>{
 let draws=0;const random=()=>{draws++;return .024;};
 assert.deepEqual(childDeparture({...context,plannedAge:0,rural:true,lastChild:true,age:17},random),{outcome:'leave',reason:'city'});assert.equal(draws,1);
 assert.equal(childDeparture({...context,plannedAge:0,rural:true,age:35},()=>.025),null);
 for(const change of [{age:16},{age:36},{rural:false}])assert.equal(childDeparture({...context,plannedAge:0,rural:true,...change},noDraw),null);
});
