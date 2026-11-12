import test from 'node:test';import assert from 'node:assert/strict';
import {supportedSchoolEntry,supportedSchoolContinuation} from '../src/game/supported-school';
const rich={ppp:45000,region:'hi',year:2026};const poor={ppp:1500,region:'ssa',year:2026};
test('supported school starts with distinct special school, special class and home outcomes',()=>{
 let draws=0;const draw=()=>{draws++;return .5;};
 assert.equal(supportedSchoolEntry(3,rich,draw),'specialSchool');assert.equal(draws,0);
 assert.equal(supportedSchoolEntry(2,rich,draw),'specialClass');assert.equal(draws,1);
 assert.equal(supportedSchoolEntry(2,poor,()=>.5),'home');
 assert.equal(supportedSchoolEntry(2,poor,()=>0),'specialClass');
});
test('supported schooling progresses under its own access gates and hands off after secondary school',()=>{
 assert.equal(supportedSchoolContinuation('primary',12,rich,()=>{throw Error('unneeded draw');}),'lowerSecondary');
 assert.equal(supportedSchoolContinuation('lowerSecondary',15,rich,()=>0),'upperSecondary');
 assert.equal(supportedSchoolContinuation('upperSecondary',18,rich,()=>0),'adult');
 assert.equal(supportedSchoolContinuation('primary',12,poor,()=>.5),'home');
 assert.equal(supportedSchoolContinuation('primary',12,poor,()=>0),'lowerSecondary');
 assert.equal(supportedSchoolContinuation('lowerSecondary',15,poor,()=>{throw Error('unneeded draw');}),'home');
 assert.equal(supportedSchoolContinuation('primary',18,poor,()=>.5),'adult');
});

test('naturally generated higher-support child follows school stages through public actions and save restoration',async()=>{
 const {createNewGame}=await import('../src/game/new-game');const {DEFAULT_SETTINGS}=await import('../src/game/engine');
 const {familyChoice}=await import('./helpers/adult-family-simulation');const {encodeSave,decodeSave}=await import('../src/game/storage');
 // Seed search uses only the actual newborn factory; no injected academic or developmental state.
 let life;
 for(let seed=1;seed<2000;seed++){
  const candidate=createNewGame({...DEFAULT_SETTINGS,country:'DEU',gentler:true,dailyThemeDay:'2026-10-20'},seed);
  if((candidate.birthDevelopment?.developmental?.supportLevel??0)>=2){life=candidate;break;}
 }
 assert.ok(life);const stages=new Set<string>();
 for(let step=0;step<150&&life.alive&&life.age<19;step++){
  const restored=decodeSave(encodeSave(life,[])).life!;
  const next=familyChoice(life);assert.deepEqual(next,familyChoice(restored));life=next;
  if(life.academics?.enrollment)stages.add(life.academics.enrollment.stage);
  assert.ok(!life.pendingDecision?.id.startsWith('college-'));
 }
 assert.deepEqual([...stages],['primary','lowerSecondary','upperSecondary']);
 assert.equal(life.academics!.supportedSchool!.adultReadyAge,18);
 assert.equal(life.academics!.qualification,3);
 const bad=structuredClone(life);bad.academics!.supportedSchool!.adultReadyAge=12;assert.throws(()=>encodeSave(bad,[]));
 const missing=structuredClone(life);delete missing.birthDevelopment;assert.throws(()=>encodeSave(missing,[]));
});

test('unavailable supported schooling keeps home learning distinct from earned qualifications',async()=>{
 const {createNewGame}=await import('../src/game/new-game');const {DEFAULT_SETTINGS}=await import('../src/game/engine');
 const {familyChoice}=await import('./helpers/adult-family-simulation');const {encodeSave,decodeSave}=await import('../src/game/storage');
 let life=createNewGame({...DEFAULT_SETTINGS,country:'NGA',gentler:true,dailyThemeDay:'2026-10-20'},292);
 for(let step=0;step<150&&life.alive&&life.age<19;step++){life=familyChoice(life);assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);}
 assert.equal(life.academics!.supportedSchool!.kind,'home');
 assert.equal(life.academics!.supportedSchool!.adultReadyAge,18);
 assert.equal(life.academics!.qualification,0);assert.equal(life.schooling.years,0);
 assert.equal(life.academics!.enrollment,null);
});
