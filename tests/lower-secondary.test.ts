import test from 'node:test';import assert from 'node:assert/strict';
import {planLowerSecondary,resolveLowerSecondaryChoice,lowerSecondaryAdmission,lowerSecondaryDropoutProbability} from '../src/game/lower-secondary';
const base={country:'UGA',birthRegion:'ssa',year:2026,age:12,transition:.6,quintile:2,knowledge:50,knowledgeZ:0,topMarkAge:null,war:0,homeSchool:false,learningCentre:false,banned:false,returning:false};
const noDraw=()=>{throw Error('unexpected random draw');};
test('homeschool precedes special-centre access, which draws only from 2021 onward',()=>{
 assert.equal(planLowerSecondary({...base,homeSchool:true,learningCentre:true},noDraw).route,'homeSchool');
 assert.equal(planLowerSecondary({...base,learningCentre:true,year:2020},noDraw).kind,'childwork');
 assert.equal(planLowerSecondary({...base,learningCentre:true},()=>.49).route,'learningCentre');
 assert.equal(planLowerSecondary({...base,learningCentre:true},()=>.5).kind,'childwork');
});
test('automatic access uses birth region and strict transition thresholds unless banned',()=>{
 assert.equal(planLowerSecondary({...base,birthRegion:'hi'},noDraw).kind,'enrolled');
 assert.equal(planLowerSecondary({...base,transition:.985,quintile:1},noDraw).kind,'choice');
 assert.equal(planLowerSecondary({...base,transition:.986,quintile:1},noDraw).kind,'enrolled');
 assert.equal(planLowerSecondary({...base,transition:.97},noDraw).kind,'choice');
 assert.equal(planLowerSecondary({...base,transition:.971},noDraw).kind,'enrolled');
 assert.deepEqual(planLowerSecondary({...base,birthRegion:'hi',banned:true},noDraw).choices,['home','work']);
});
test('free-school reform admits without a draw and retains completion likelihood separately',()=>{
 assert.equal(planLowerSecondary({...base,country:'CHN',year:2007},noDraw).kind,'choice');
 const admitted=planLowerSecondary({...base,country:'CHN',year:2008},noDraw);
 assert.equal(admitted.kind,'enrolled');assert.equal(admitted.route,'freeSchool');
 assert.ok(admitted.retention!>0&&admitted.retention!<1);
 assert.equal(planLowerSecondary({...base,country:'VNM',year:2010},noDraw).kind,'enrolled');
 assert.equal(planLowerSecondary({...base,country:'MYS',year:2011},noDraw).kind,'choice');
 assert.equal(planLowerSecondary({...base,country:'MYS',year:2012},noDraw).kind,'enrolled');
 assert.equal(planLowerSecondary({...base,country:'PRK',year:1974},noDraw).kind,'choice');
 assert.equal(planLowerSecondary({...base,country:'PRK',year:1975},noDraw).kind,'enrolled');
});
test('choosing work forces paid work unless returning to an existing job; secret study has its own effects',()=>{
 assert.deepEqual(resolveLowerSecondaryChoice(base,'work',noDraw),{kind:'childwork',forcePaid:true,knowledge:0,happiness:0,social:3,retry:false});
 assert.equal(resolveLowerSecondaryChoice({...base,returning:true},'work',noDraw)?.kind,'keepWork');
 assert.deepEqual(resolveLowerSecondaryChoice({...base,banned:true},'home',noDraw),{kind:'childwork',forcePaid:false,knowledge:5,happiness:-3,social:0,retry:false});
 assert.equal(resolveLowerSecondaryChoice({...base,banned:true},'go',noDraw),null);
});
test('failed application permits recent top marks only for higher-income students, after one draw',()=>{
 let draws=0;const draw=()=>{draws++;return .99999;};
 assert.equal(resolveLowerSecondaryChoice({...base,quintile:4,knowledge:90},'go',draw)?.kind,'enrolled');
 assert.equal(draws,1);
 assert.equal(resolveLowerSecondaryChoice({...base,quintile:4,topMarkAge:10},'go',draw)?.kind,'enrolled');
 assert.equal(resolveLowerSecondaryChoice({...base,quintile:4,topMarkAge:9},'go',draw)?.kind,'childwork');
 const failed=resolveLowerSecondaryChoice(base,'go',draw)!;assert.equal(failed.happiness,-6);assert.equal(failed.retry,true);
 assert.equal(resolveLowerSecondaryChoice({...base,war:1},'go',draw)?.retry,false);
});

test('admission odds use age-specific learning strength and bound extreme latent knowledge',()=>{
 const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-12);
 close(lowerSecondaryAdmission(base),.6714179633700118);
 close(lowerSecondaryAdmission({...base,age:14}),.7113227214067718);
 close(lowerSecondaryAdmission({...base,knowledgeZ:-10,transition:0}),.011680509898308086);
 close(lowerSecondaryAdmission({...base,knowledgeZ:10}),.9631944017183776);
 assert.equal(resolveLowerSecondaryChoice(base,'go',()=>.67)?.kind,'enrolled');
 assert.equal(resolveLowerSecondaryChoice(base,'go',()=>.68)?.kind,'childwork');
});
test('secondary retention skips final years and developmental protection before any dropout draw',()=>{
 assert.ok(Math.abs(lowerSecondaryDropoutProbability(.64,1,3,false,false)!-.2)<1e-12);
 assert.ok(Math.abs(lowerSecondaryDropoutProbability(.64,1,3,true,false)!-.16)<1e-12);
 assert.equal(lowerSecondaryDropoutProbability(.64,3,3,false,false),null);
 assert.equal(lowerSecondaryDropoutProbability(.64,1,3,false,true),null);
 assert.equal(lowerSecondaryDropoutProbability(undefined,1,3,false,false),null);
});
