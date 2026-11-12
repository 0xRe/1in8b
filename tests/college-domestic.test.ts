import test from 'node:test';import assert from 'node:assert/strict';
import {resolveDomesticCollege} from '../src/game/college-domestic';
const c={conditionalTertiary:.5,knowledgeZ:0,age:18,country:'USA',birthCountry:'USA',retaking:false,vocationalTrack:false,eraMultiplier:1,neurodevelopmentMultiplier:1,unsupportedAutism:false,kind:'ordinary' as const,job:'seeking' as const};
const noDraw=()=>{throw Error('unexpected draw');};
test('choosing work preserves reopened and employed equivalency jobs without any application draw',()=>{
 assert.equal(resolveDomesticCollege(c,'work',noDraw).job,'seeking');
 assert.equal(resolveDomesticCollege({...c,kind:'reopened',job:'working'},'work',noDraw).job,'keep');
 assert.equal(resolveDomesticCollege({...c,kind:'equivalency',job:'working'},'work',noDraw).job,'keep');
 assert.equal(resolveDomesticCollege({...c,kind:'equivalency'},'work',noDraw).job,'seeking');
});
test('failed working equivalency and reopening applications preserve employment and have distinct disappointment',()=>{
 for(const kind of ['reopened','equivalency'] as const){const r=resolveDomesticCollege({...c,kind,job:'working'},'apply',()=>.99);assert.equal(r.status,'rejected');assert.equal(r.job,'keep');assert.equal(r.happiness,-4);assert.equal(r.retakeEligible,false);}
 const unemployed=resolveDomesticCollege({...c,kind:'equivalency'},'apply',()=>.99);assert.equal(unemployed.job,'seeking');assert.equal(unemployed.happiness,-8);assert.equal(unemployed.retakeEligible,true);
});
test('open enrollment does not draw admission and remembers a working equivalency entrants prior job',()=>{
 const r=resolveDomesticCollege({...c,country:'FRA',birthCountry:'FRA',kind:'equivalency',job:'working'},'apply',noDraw);
 assert.equal(r.status,'enrolled');assert.equal(r.job,'student');assert.equal(r.rememberJob,true);assert.equal(r.happiness,4);assert.ok(r.retention!>0&&r.retention!<1);
 assert.equal(resolveDomesticCollege({...c,country:'FRA',birthCountry:'FRA',job:'working'},'apply',noDraw).job,'keep');
});
test('competitive success preserves first-attempt versus retry/reopening effects and original job transitions',()=>{
 const initial=resolveDomesticCollege(c,'apply',()=>0);assert.equal(initial.happiness,5);assert.equal(initial.job,'student');assert.equal(initial.retention,null);
 assert.equal(resolveDomesticCollege({...c,retaking:true},'apply',()=>0).happiness,7);
 const reopened=resolveDomesticCollege({...c,kind:'reopened',job:'working'},'apply',()=>0);assert.equal(reopened.happiness,7);assert.equal(reopened.rememberJob,true);assert.equal(reopened.returnFromAssignedWork,true);
 assert.equal(resolveDomesticCollege({...c,kind:'equivalency',job:'working'},'apply',()=>0).returnFromAssignedWork,false);
});
