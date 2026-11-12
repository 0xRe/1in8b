import test from 'node:test';import assert from 'node:assert/strict';
import{createNewGame}from'../src/game/new-game';import{DEFAULT_SETTINGS,makeChoice}from'../src/game/engine';import{familyChoice}from'./helpers/adult-family-simulation';import{encodeSave,decodeSave}from'../src/game/storage';
function officer(){let life=createNewGame({...DEFAULT_SETTINGS,country:'JPN',gentler:true,dailyThemeDay:'2026-10-20'},2);for(let n=0;n<180&&life.alive&&!life.academics?.academy?.commissionedAge;n++)life=life.pendingDecision?.choices.some(c=>c.id==='collegeArmy')?makeChoice(life,'collegeArmy'):familyChoice(life);assert.equal(life.academics?.academy?.commissionedAge,22);return life;}
test('natural commissioning starts observed service counters and completed years settle once',()=>{
 let life=officer();assert.equal(life.academics!.academy!.employment!.career!.experienceYears,1);assert.equal(life.timeline!.complete,true);
 for(let n=0;n<50&&life.alive&&(life.academics!.academy!.employment!.career!.experienceYears<2);n++){life=familyChoice(life);assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);}
 const e=life.academics!.academy!.employment!;assert.equal(e.career!.experienceYears,2);assert.equal(e.career!.formalYears,2);assert.equal(e.lastMilitaryPay!.age,life.age);assert.equal(e.retirementFacts!.formalYears,2);assert.ok(life.stats.annualIncome>0);
});
test('natural service reaches promotion and mandatory retirement without imported military facts',()=>{
 let life=officer(),promoted=false,retired=false;
 for(let n=0;n<550&&life.alive&&!retired;n++){
  assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
  if(life.pendingDecision?.id.startsWith('officerPromotion-')){life=makeChoice(life,'officerAccept');promoted=true;}
  else if(life.pendingDecision?.id.startsWith('militaryRetirement-')){life=makeChoice(life,'militaryRetire');retired=true;}
  else if(life.pendingDecision?.id==='opportunity')life=makeChoice(life,'stability');
  else life=familyChoice(life);
 }
 assert.ok(promoted);assert.ok(retired);assert.equal(life.stats.employment,'retired');assert.ok(life.academics!.academy!.employment!.retiredPension!>0);assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 const retirementAge=life.age;for(let n=0;n<50&&life.alive&&life.age<=retirementAge;n++)life=familyChoice(life);
 for(let n=0;n<50&&life.alive&&!life.timeline?.complete;n++)life=familyChoice(life);
 assert.equal(life.stats.employment,'retired');assert.ok(life.stats.annualIncome>0);assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
});
