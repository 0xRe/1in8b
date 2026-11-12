import test from 'node:test';import assert from 'node:assert/strict';
import {createNewGame} from '../src/game/new-game';
import {DEFAULT_SETTINGS,makeChoice,advanceYear} from '../src/game/engine';
import {familyChoice} from './helpers/adult-family-simulation';
import {decodeSave,encodeSave} from '../src/game/storage';
function rejected(){
 let life=createNewGame({...DEFAULT_SETTINGS,country:'JPN',gentler:true,dailyThemeDay:'2026-10-20'},18);
 for(let step=0;step<150&&life.alive&&life.pendingDecision?.id!=='college-18';step++)life=familyChoice(life);
 assert.equal(life.pendingDecision?.id,'college-18');life=makeChoice(life,'collegeApply');assert.equal(life.academics!.college!.status,'rejected');return life;
}
function offer(){let life=rejected();for(let step=0;step<100&&!life.pendingDecision&&life.age===18;step++)life=advanceYear(life);assert.equal(life.pendingDecision?.id,'universityRetake-18');return life;}
test('failed ordinary admission offers a real preparation choice and resolves next year once',()=>{
 let life=offer();assert.ok(life.universityAdmissions?.offer);
 life=makeChoice(decodeSave(encodeSave(life,[])).life!,'retakePrepare');
 assert.equal(life.universityAdmissions!.scheduledAge,19);assert.equal(life.stats.job,'student');assert.equal(life.academics!.enrollment,null);
 for(let step=0;step<100&&life.alive&&life.age<19;step++)life=familyChoice(life);
 assert.equal(life.universityAdmissions!.scheduledAge,null);assert.equal(life.universityAdmissions!.lastAttempt?.age,19);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
});
test('working instead of another exam declines future invitations and rejects replay',()=>{
 let life=offer();assert.equal(life.pendingDecision?.id,'universityRetake-18');
 life=makeChoice(life,'retakeWork');assert.equal(life.universityAdmissions!.declined,true);assert.equal(life.universityAdmissions!.scheduledAge,null);
 assert.deepEqual(makeChoice(life,'retakePrepare'),life);assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
});
test('repeated examinations survive the entire public life flow without duplicate preparation receipts',()=>{
 let life=offer();
 for(let step=0;step<500&&life.alive;step++){
  assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
  life=life.pendingDecision?.key==='decision.universityRetake'?makeChoice(life,'retakePrepare'):familyChoice(life);
 }
 assert.equal(life.alive,false);
 assert.ok(life.universityAdmissions!.retakes>0);
 assert.equal(new Set(life.universityAdmissions!.choices!.map(c=>c.age)).size,life.universityAdmissions!.choices!.length);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
});
test('an invitation expires across a year even when custody defers examinations',async()=>{
 const {settleUniversityRetake}=await import('../src/game/university-retake-runtime');
 const life=rejected();life.age++;life.year++;life.justice.prisonUntil=life.age+2;
 settleUniversityRetake(life,()=>{throw new Error('custody must not draw an exam');});
 assert.equal(life.universityAdmissions!.offer,null);
});
test('a preparation year offers study activities without awarding university enrollment',async()=>{
 const {newFocusOptions}=await import('../src/game/school-focus');
 const prepared=makeChoice(offer(),'retakePrepare');
 assert.deepEqual(newFocusOptions(prepared),['study','play','parttime','sport','hobby']);
 assert.equal(prepared.academics!.enrollment,null);
 const working=makeChoice(offer(),'retakeWork');assert.ok(!newFocusOptions(working).includes('study'));
});
test('a rejection schedules the retake invitation shortly after the application in the same year',()=>{
 const life=rejected(),timeline=life.timeline!;
 const slot=timeline.queue.find(s=>s.id==='universityRetake-18');assert.ok(slot);
 assert.equal(slot.at,Math.min(.97,timeline.position+.04));
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 const offered=advanceYear(life,.04);assert.equal(offered.age,18);assert.equal(offered.pendingDecision?.id,'universityRetake-18');
 assert.ok(!offered.timeline!.complete);
});
test('automatic timeline choices use the retake policy instead of uniform option selection',()=>{
 // Controlled random boundary: Mulberry32 state 10 draws about .502, between .35 and .6.
 for(const [quintile,choice] of [[5,'prepare'],[2,'work']] as const){
  const life=rejected();life.rng=10;life.stats.incomeQuintile=quintile;life.settings.autoChoices=true;
  assert.equal(life.timeline!.queue[0].id,'universityRetake-18');
  const done=advanceYear(life,.04);
  assert.equal(done.universityAdmissions!.choices!.at(-1)!.choice,choice);
  assert.equal(done.pendingDecision,null);
  assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);
 }
});
