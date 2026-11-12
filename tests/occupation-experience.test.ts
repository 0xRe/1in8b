import test from 'node:test';import assert from 'node:assert/strict';
import {createLife,DEFAULT_SETTINGS,requestActivity,makeChoice} from '../src/game/engine';
import {familyChoice} from './helpers/adult-family-simulation';
import {settleOccupationExperience,occupationExperienceFor} from '../src/game/occupation-experience';
import {encodeSave,decodeSave} from '../src/game/storage';
test('annual work is counted once and nonworking years do not become tenure',()=>{
 const life=createLife(DEFAULT_SETTINGS,124);life.age=25;life.year=life.birthYear+25;life.stats.job='engineer';life.stats.employment='employed';life.schooling.enrolled=false;
 settleOccupationExperience(life);settleOccupationExperience(life);
 assert.equal(occupationExperienceFor(life,'engineer')!.same,1);
 life.age++;life.year++;life.stats.employment='unemployed';settleOccupationExperience(life);
 assert.equal(occupationExperienceFor(life,'engineer')!.same,1);
 life.age++;life.year++;life.stats.employment='employed';life.stats.job='mechanic';settleOccupationExperience(life);
 assert.equal(occupationExperienceFor(life,'engineer')!.related,1);
 assert.equal(occupationExperienceFor(life,'engineer',{engineer:1})!.same,0);
});
test('missing legacy observations stay unknown and ambiguous legacy work gets no invented identity',()=>{
 const life=createLife(DEFAULT_SETTINGS,124);delete life.occupationExperience;
 settleOccupationExperience(life);assert.equal(occupationExperienceFor(life,'engineer'),null);
 const fresh=createLife(DEFAULT_SETTINGS,124);fresh.stats.job='service';fresh.stats.employment='employed';settleOccupationExperience(fresh);
 assert.equal(occupationExperienceFor(fresh,'clerk')!.same,0);assert.equal(occupationExperienceFor(fresh,'clerk')!.unclassifiedYears,1);
});
test('natural annual settlement records observed careers and survives reload',()=>{
 let life=createLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true},124);
 for(let i=0;i<500&&life.alive&&life.age<35;i++)life=familyChoice(life);
 assert.equal(life.age,35);const state=life.occupationExperience!;assert.ok(Object.values(state.years).some(years=>years>0));
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 const bad=structuredClone(life);bad.occupationExperience!.years.engineer=-1;assert.throws(()=>decodeSave(encodeSave(bad,[])));
});

test('full-time school, prison and self-care cannot add working years',()=>{
 const base=createLife(DEFAULT_SETTINGS,124);base.stats.job='engineer';base.stats.employment='employed';base.schooling.enrolled=false;
 for(const alter of [(l:typeof base)=>l.schooling.enrolled=true,(l:typeof base)=>l.justice.prisonUntil=30,(l:typeof base)=>l.care.who='self']){
  const life=structuredClone(base);alter(life);settleOccupationExperience(life);assert.equal(occupationExperienceFor(life,'engineer')!.same,0);
 }
});

test('imported childwork cannot masquerade as occupational experience',()=>{
 const life=createLife(DEFAULT_SETTINGS,124);life.occupationExperience!.lastSettledYear=life.year;life.occupationExperience!.years.childwork=1;
 assert.throws(()=>decodeSave(encodeSave(life,[])));
});

test('paid apprenticeships and employed night-school years retain work experience',()=>{
 for(const training of ['mechanic','hairdresser','nightSchool'] as const){
  const life=createLife(DEFAULT_SETTINGS,124);life.age=25;life.year=life.birthYear+25;
  life.schooling.enrolled=false;life.stats.employment='employed';life.stats.job=training==='nightSchool'?'engineer':training;
  life.training={kind:training,endsAt:27,previousIncome:20000,previousJob:'engineer'};
  settleOccupationExperience(life);
  assert.equal(occupationExperienceFor(life,training==='hairdresser'?'hair':training==='nightSchool'?'engineer':'mechanic')!.same,1);
 }
});

test('migration discounts local credentials but preserves transferable experience',()=>{
 let life=createLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true},124);
 for(let i=0;i<500&&life.alive&&life.age<35;i++)life=familyChoice(life);
 life.pendingDecision=null;life.schooling.enrolled=false;life.training.kind=null;life.training.endsAt=null;life.care.who=null;life.care.until=null;life.stats.savings=1000000;
 life.occupationExperience!.years={lawyer:3,engineer:4};life.occupationExperience!.lastSettledYear=life.year;life.occupationExperience!.unclassifiedYears=0;
 const offered=requestActivity(life,'migration');assert.equal(offered.pendingDecision?.key,'decision.migration');
 const moved=makeChoice(offered,'migrateAlone');assert.notEqual(moved.country.id,life.country.id);
 assert.equal(occupationExperienceFor(moved,'lawyer')!.same,0);assert.equal(occupationExperienceFor(moved,'engineer')!.same,4);
 assert.deepEqual(decodeSave(encodeSave(moved,[])).life,moved);
 const bad=structuredClone(moved);bad.occupationExperience!.migration!.discounts.lawyer=4;assert.throws(()=>decodeSave(encodeSave(bad,[])));
 moved.age++;moved.year++;moved.stats.employment='employed';moved.stats.job='lawyer';settleOccupationExperience(moved);
 assert.equal(occupationExperienceFor(moved,'lawyer')!.same,1);
});
