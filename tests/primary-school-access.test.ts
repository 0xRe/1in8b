import test from 'node:test';import assert from 'node:assert/strict';
import {primarySchoolAccess,resolvePrimaryRetention} from '../src/game/primary-school-access';
const context={completion:.6,region:'ssa',war:0,year:2026,quintile:3,rich:false,privateShare:.2,placement:'public' as const};
test('public and private cohorts preserve the contextual completion target after late entry',()=>{
 const access=primarySchoolAccess(context);
 assert.equal(access.privatePlacement,.2);
 assert.ok(Math.abs(access.publicStart-.65)<1e-12);
 assert.ok(Math.abs(access.privatePlacement+(1-access.privatePlacement)*access.publicLateEntry*access.retention-.6)<1e-12);
 const unassigned=primarySchoolAccess({...context,placement:'unassigned'});
 assert.ok(Math.abs(unassigned.retention*unassigned.lateEntry-.6)<1e-12);
 assert.notEqual(access.retention,unassigned.retention);
});
test('modern peaceful high-income and ECA school entry is guaranteed, but the year and war boundaries matter',()=>{
 for(const region of ['hi','eca']){
  assert.equal(primarySchoolAccess({...context,region,year:1980}).start,1);
  assert.equal(primarySchoolAccess({...context,region,year:1979}).start,.72);
  assert.equal(primarySchoolAccess({...context,region,war:1}).start,.72);
 }
 assert.equal(primarySchoolAccess({...context,war:1.5}).start,.72*.8);
 assert.equal(primarySchoolAccess({...context,war:1}).privatePlacement,0);
});
test('private placement depends on household means and is capped by access',()=>{
 assert.equal(primarySchoolAccess({...context,quintile:1}).privatePlacement,.06);
 assert.equal(primarySchoolAccess({...context,quintile:5,rich:true}).privatePlacement,.51);
 assert.equal(primarySchoolAccess({...context,quintile:5,rich:true,region:'hi'}).privatePlacement,.9);
});
test('private hardship transfers to public school instead of withdrawing',()=>{
 let draws=0;
 const result=resolvePrimaryRetention({...context,placement:'private'},1,6,50,false,false,()=>{draws++;return 0;});
 assert.equal(result,'transfer');assert.equal(draws,1);
 assert.equal(resolvePrimaryRetention(context,1,6,50,false,false,()=>0),'withdraw');
});
test('final years and guaranteed entry skip RNG; developmental protection is checked after the primary draw',()=>{
 let draws=0;const draw=()=>{draws++;return 0;};
 assert.equal(resolvePrimaryRetention(context,6,6,0,false,false,draw),'stay');
 assert.equal(resolvePrimaryRetention({...context,region:'hi'},1,6,0,false,false,draw),'stay');
 assert.equal(draws,0);
 assert.equal(resolvePrimaryRetention(context,1,6,0,false,true,draw),'stay');assert.equal(draws,1);
});
test('low knowledge and persistence affect withdrawal thresholds without adding extra draws',()=>{
 const access=primarySchoolAccess(context),base=1-access.retention**.2;
 assert.equal(resolvePrimaryRetention(context,1,6,8,false,false,()=>base+.01),'stay');
 assert.equal(resolvePrimaryRetention(context,1,6,7,false,false,()=>base+.01),'withdraw');
 assert.equal(resolvePrimaryRetention(context,1,6,8,true,false,()=>base*.9),'stay');
 assert.equal(resolvePrimaryRetention(context,1,6,8,false,false,()=>base*.9),'withdraw');
});

test('private shares distinguish explicit zero data, regional fallback and historical public-only systems',async()=>{
 const {privateSchoolShare}=await import('../src/game/primary-school-access');
 assert.equal(privateSchoolShare('IND','sa',false),.45);
 assert.equal(privateSchoolShare('SWE','hi',false),0);
 assert.equal(privateSchoolShare('CUB','lac',false),0);
 assert.equal(privateSchoolShare('RUS','eca',false),.01);
 assert.equal(privateSchoolShare('IND','sa',true),0);
 assert.equal(privateSchoolShare('XXX','unknown',false),.05);
});
