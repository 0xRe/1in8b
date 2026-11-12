import test from 'node:test';import assert from 'node:assert/strict';
import {createNewGame} from '../src/game/new-game';import {DEFAULT_SETTINGS,makeChoice} from '../src/game/engine';
import {familyChoice} from './helpers/adult-family-simulation';import {encodeSave,decodeSave} from '../src/game/storage';
function applicant(){let life=createNewGame({...DEFAULT_SETTINGS,country:'JPN',gentler:true,dailyThemeDay:'2026-10-20'},1);for(let n=0;n<150&&life.alive&&life.pendingDecision?.id!=='college-18';n++)life=familyChoice(life);assert.equal(life.pendingDecision?.id,'college-18');return life;}
test('new lives can choose a qualifying defense academy through the actual college menu',()=>{
 const life=applicant();assert.ok(life.pendingDecision!.choices.some(c=>c.id==='collegeArmy'));
 assert.equal(life.academics!.college!.academyOffer,'jp');assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
});
test('a saved academy offer resolves acceptance and rejection without fabricating a degree',()=>{
 const life=applicant();let accepted=false,rejected=false;
 for(let rng=1;rng<=30&&(!accepted||!rejected);rng++){
  const controlled=structuredClone(life);controlled.rng=rng;
  const done=makeChoice(controlled,'collegeArmy');assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);
  assert.equal(done.academics!.qualification,3);
  if(done.academics!.academy){accepted=true;assert.equal(done.academics!.academy.branch,'jp');assert.equal(done.academics!.enrollment!.completedYears,0);assert.equal(done.stats.job,'student');}
  else if(done.academics!.college!.status==='rejected'){rejected=true;assert.ok(done.universityAdmissions?.offer);}
 }
 assert.ok(accepted&&rejected);
});

test('a natural new-life academy route reaches commissioned employment and preserves every save',()=>{
 let commissioned=false;
 for(let seed=1;seed<=60&&!commissioned;seed++){
  let life=createNewGame({...DEFAULT_SETTINGS,country:'JPN',gentler:true,dailyThemeDay:'2026-10-20'},seed);
  for(let n=0;n<180&&life.alive&&life.age<=24;n++){
   assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
   if(life.academics?.academy?.commissionedAge!==undefined){
    assert.equal(life.stats.job,'soldier');assert.equal(life.stats.employment,'employed');assert.equal(life.academics.qualification,4);assert.ok(life.stats.annualIncome>0);commissioned=true;break;
   }
   life=life.pendingDecision?.choices.some(c=>c.id==='collegeArmy')?makeChoice(life,'collegeArmy'):familyChoice(life);
  }
 }
 assert.ok(commissioned,'a naturally accepted academy student must reach commission');
});
test('lost academy eligibility cannot consume a draw or enroll through a stale saved offer',()=>{
 for(const change of [(l:ReturnType<typeof applicant>)=>{l.academics!.academyAccess!.criminalRecord=true;},(l:ReturnType<typeof applicant>)=>{l.academics!.academyAccess!.papersValid=false;},(l:ReturnType<typeof applicant>)=>{delete l.academics!.academyAccess;}]){
  const life=applicant();change(life);const rng=life.rng,done=makeChoice(life,'collegeArmy');
  assert.equal(done.rng,rng);assert.equal(done.academics!.enrollment,null);assert.equal(done.academics!.academy,undefined);
 }
});
