import test from 'node:test';
import assert from 'node:assert/strict';
import {childSupport,type ChildSupportContext,type SupportingChild} from '../src/game/child-support';
const context:ChildSupportContext={age:60,retired:false,force:false,separatedFromNorthKorea:false,year:2050,country:'USA',region:'hi',medianIncome:10000,householdPercentile:.3,savings:0,social:50};
const child:SupportingChild={id:'a',alive:true,age:25,withParent:false,separatedStepfamily:false,exFamily:false,blockedJob:false,imprisoned:false,lastRequestYear:null,medianIncome:10000,abroad:false,degreeJob:false,agriculture:false,away:false,gives:false,previousRequests:0};
test('regular support requires parent60 or retired unless projecting retirement, and respects North Korea separation',()=>{
 assert.deepEqual(childSupport({...context,age:59},[child]),[]);
 assert.equal(childSupport({...context,age:59,retired:true},[child])[0].amount,40);
 assert.equal(childSupport({...context,age:59,force:true},[child])[0].amount,40);
 assert.deepEqual(childSupport({...context,force:true,separatedFromNorthKorea:true},[child]),[]);
});
test('eligibility excludes young, absent, blocked and recently asked children before the five-person cap',()=>{
 for(const changes of [{age:24},{alive:false},{withParent:true},{separatedStepfamily:true},{exFamily:true},{blockedJob:true},{imprisoned:true},{lastRequestYear:2049}])assert.deepEqual(childSupport(context,[{...child,...changes}]),[]);
 const children=[{...child,alive:false},...Array.from({length:7},(_,i)=>({...child,id:String(i)}))];
 assert.deepEqual(childSupport(context,children).map(c=>c.id),['0','1','2','3','4']);
 assert.equal(childSupport(context,[{...child,lastRequestYear:2048}]).length,1);
});
test('country rates, child occupation and support history multiply the median-income base',()=>{
 assert.equal(childSupport({...context,country:'JPN',region:'eap'},[child])[0].amount,40);
 assert.equal(childSupport({...context,country:'CHN',region:'eap'},[child])[0].amount,500);
 const enhanced={...child,abroad:true,degreeJob:true,away:true,age:65,gives:true,previousRequests:100};
 assert.ok(Math.abs(childSupport(context,[enhanced])[0].amount-40*1.4*1.5*.3*.5*1.2*1.3)<1e-10);
 assert.equal(childSupport(context,[{...child,agriculture:true}])[0].amount,24);
});
test('parent income percentile, wealth and social factors reduce support without mutating facts',()=>{
 const c={...context,householdPercentile:1,savings:100001,social:0};const before=JSON.stringify([c,child]);
 assert.ok(Math.abs(childSupport(c,[child])[0].amount-4)<1e-10);
 assert.equal(JSON.stringify([c,child]),before);
 assert.ok(Math.abs(childSupport({...context,social:100},[child])[0].amount-52)<1e-10);
});
