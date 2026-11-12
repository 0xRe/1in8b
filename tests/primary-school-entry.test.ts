import test from 'node:test';import assert from 'node:assert/strict';
import {homeSchoolProbability,resolvePrimaryEntry} from '../src/game/primary-school-entry';
const base={completion:.3,region:'ssa',war:0,year:2026,quintile:3,rich:false,privateShare:0,placement:'public' as const,country:'UGA',refugee:false,irregular:false,learningCentreOnly:false,educatedParentPresent:false};
function stream(values:number[]){let count=0;return {draw:()=>{assert.ok(count<values.length,'unexpected draw');return values[count++];},count:()=>count};}
test('homeschool calibration follows historical breakpoints and applies only to the USA',()=>{
 for(const [year,rate] of [[1984,0],[1985,0],[1999,.017],[2007,.029],[2012,.034],[2026,.034]])assert.equal(homeSchoolProbability('USA',year),rate);
 assert.equal(homeSchoolProbability('CAN',2026),null);
 assert.ok(Math.abs(homeSchoolProbability('USA',1992)!-.0085)<1e-12);
});
test('ordinary entry uses public cohort access while peaceful private placement guarantees a place',()=>{
 const rejected=stream([.5]);assert.equal(resolvePrimaryEntry(base,rejected.draw),'outOfSchool');assert.equal(rejected.count(),1);
 const accepted=stream([.4]);assert.equal(resolvePrimaryEntry(base,accepted.draw),'school');
 const privateDraw=stream([.9999]);assert.equal(resolvePrimaryEntry({...base,placement:'private'},privateDraw.draw),'school');
 assert.equal(resolvePrimaryEntry({...base,placement:'private',war:1},()=>.99),'outOfSchool');
});
test('a qualifying present parent raises peaceful admission to .998 but does not remove the draw',()=>{
 const input={...base,educatedParentPresent:true};
 assert.equal(resolvePrimaryEntry(input,()=>.997),'school');assert.equal(resolvePrimaryEntry(input,()=>.998),'outOfSchool');
 assert.equal(resolvePrimaryEntry({...input,war:1},()=>.5),'outOfSchool');
});
test('USA homeschool success ends entry immediately; failure draws ordinary admission afterwards',()=>{
 const input={...base,country:'USA',region:'hi'};
 const home=stream([.01]);assert.equal(resolvePrimaryEntry(input,home.draw),'homeSchool');assert.equal(home.count(),1);
 const school=stream([.05,.999]);assert.equal(resolvePrimaryEntry(input,school.draw),'school');assert.equal(school.count(),2);
 const historical=stream([0,.1]);assert.equal(resolvePrimaryEntry({...input,year:1980},historical.draw),'school');assert.equal(historical.count(),2);
});
test('private placement, refugee status, irregular status and war suppress the homeschool draw',()=>{
 for(const patch of [{placement:'private' as const},{refugee:true},{irregular:true},{war:1}]){
  const random=stream([.01]);assert.equal(resolvePrimaryEntry({...base,country:'USA',region:'hi',...patch},random.draw),'school');assert.equal(random.count(),1);
 }
});
test('restricted camp learning centres use one .72 draw before ordinary school and household checks',()=>{
 const input={...base,country:'USA',learningCentreOnly:true,placement:'private' as const,educatedParentPresent:true};
 const yes=stream([.719]);assert.equal(resolvePrimaryEntry(input,yes.draw),'learningCentre');assert.equal(yes.count(),1);
 const no=stream([.72]);assert.equal(resolvePrimaryEntry(input,no.draw),'outOfSchool');assert.equal(no.count(),1);
});
