import assert from 'node:assert/strict';
import test from 'node:test';
import {createLife,DEFAULT_SETTINGS,advanceYear,makeChoice,addReflection,requestActivity} from '../src/game/engine';
import {decodeSave,encodeSave} from '../src/game/storage';
import {emptyDescendants,addChildProgress} from '../src/game/descendants';
import type {Life} from '../src/game/types';
function resolve(l:Life):Life {for(let i=0;i<30&&(l.pendingDecision||l.timeline&&!l.timeline.complete);i++)l=l.pendingDecision?(l.pendingDecision.type==='reflection'?addReflection(l,''):makeChoice(l,l.pendingDecision.choices[0].id)):advanceYear(l);return l;}
function fixture(){let l=createLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true,autoChoices:true},124);for(let i=0;i<400&&l.age<40&&l.alive;i++)l=advanceYear(l);l=resolve(l);assert.equal(l.age,40);l.family.partner={id:'finance-partner',name:'Partner',country:'JPN',sex:'F',age:38,birthYear:l.year-38,alive:true,deathAge:null,job:'service'};l.family.married=true;l.family.marriageAge=30;l.relationship.status='married';l.relationship.partnerIncome=0;l.care.who='partner';l.care.until=l.age+1;l.care.previousPartnerIncome=12345;l.stats.savings=1e6;l.stats.netAssets=l.stats.savings+l.stats.investments+l.belongings.housingValue-l.stats.debt;return l;}
function nextYear(l:Life){const age=l.age;for(let i=0;i<40&&l.age===age&&l.alive;i++)l=advanceYear(resolve(l));assert.equal(l.age,age+1);return l;}
test('partner childcare cannot restore household income after moving abroad alone',()=>{
 const l=fixture();const moved=makeChoice(requestActivity(l,'migration'),'migrateAlone');assert.notEqual(moved.country.id,'JPN');
 assert.equal(moved.care.who,null);assert.equal(moved.care.until,null);
 const after=nextYear(moved);assert.equal(after.relationship.partnerIncome,0);
 assert.equal(after.budget.income,Math.round((after.stats.annualIncome+after.descendants.annualTransfers)*100)/100);
});
test('a deceased caregiver never returns to work or restores income',()=>{
 const l=fixture();l.family.partner!.alive=false;l.family.partner!.deathAge=l.family.partner!.age;
 const after=nextYear(l);assert.equal(after.relationship.partnerIncome,0);assert.equal(after.care.who,null);
 assert.ok(!after.events.slice(l.events.length).some(e=>e.key==='event.careReturn'));
});

test('a living co-resident caregiver still returns to work with the saved income',()=>{
 const l=fixture();const after=nextYear(l);
 assert.equal(after.family.partner!.alive,true);assert.equal(after.relationship.partnerIncome,12345);
 assert.equal(after.care.who,null);assert.ok(after.events.slice(l.events.length).some(e=>e.key==='event.careReturn'));
});

test('moving together scales deferred caregiver income before it resumes',()=>{
 const l=fixture();const moved=makeChoice(requestActivity(l,'migration'),'migrateTogether');
 const expected=Math.round(12345*moved.country.ppp/l.country.ppp*100)/100;
 assert.equal(moved.care.previousPartnerIncome,expected);
 const restored=decodeSave(encodeSave(moved,[])).life!;
 assert.equal(restored.care.previousPartnerIncome,expected);
 const after=nextYear(restored);assert.equal(after.relationship.partnerIncome,expected);
});

function careFixture(){
 const l=fixture();l.settings.autoChoices=false;l.care.who=null;l.care.until=null;l.care.handledChildren=[];
 l.family.children=[{id:'care-child',name:'Child',country:'JPN',sex:'F',age:1,birthYear:l.year-1,alive:true,deathAge:null,job:'none'}];
 l.descendants=emptyDescendants(124,l.year);l.descendants.observedSince=l.birthYear;addChildProgress(l,l.family.children[0]);l.family.parents.forEach(p=>{p.alive=true;p.deathAge=null;p.country='FRA'});
 return l;
}
test('local infants of single parents still receive childcare choices',()=>{
 const l=careFixture();l.family.partner=null;l.family.married=false;l.relationship.status='single';
 const offered=advanceYear(l);assert.equal(offered.pendingDecision?.key,'decision.care');
 assert.deepEqual(offered.pendingDecision?.choices.map(c=>c.id),['selfCare','daycare']);
 assert.ok(decodeSave(encodeSave(offered,[])).life);
});
test('overseas relatives cannot provide local childcare',()=>{
 const l=careFixture();l.family.partner!.country='FRA';
 const offered=advanceYear(l);assert.deepEqual(offered.pendingDecision?.choices.map(c=>c.id),['selfCare','daycare']);
});
test('an overseas infant does not open a local childcare decision',()=>{
 const l=careFixture();l.family.children[0].country='FRA';
 assert.notEqual(advanceYear(l).pendingDecision?.key,'decision.care');
});
test('legacy care choices are validated then narrowed to available caregivers',()=>{
 const l=careFixture();l.family.partner!.country='FRA';
 l.pendingDecision={id:`care-${l.age}-0`,key:'decision.care',type:'choice',age:l.age,params:{name:'Child'},choices:['selfCare','partnerCare','grandparents','daycare'].map(id=>({id,key:`choice.${id}`,params:{}}))};
 const restored=decodeSave(JSON.stringify({version:1,life:l,past:[]})).life!;
 assert.deepEqual(restored.pendingDecision!.choices.map(c=>c.id),['selfCare','daycare']);
 assert.equal(makeChoice(l,'partnerCare'),l);
 l.pendingDecision.choices[1].id='freeMoney';assert.throws(()=>decodeSave(JSON.stringify({version:1,life:l,past:[]})));
});
test('local partner and grandparents retain all care options and resolve normally',()=>{
 const l=careFixture();l.family.parents[0].country='JPN';
 const offered=advanceYear(l);assert.deepEqual(offered.pendingDecision!.choices.map(c=>c.id),['selfCare','partnerCare','grandparents','daycare']);
 const restored=decodeSave(encodeSave(offered,[])).life!;
 const chosen=makeChoice(restored,'grandparents');assert.equal(chosen.pendingDecision,null);assert.ok(chosen.care.handledChildren.includes('care-child'));
});
test('legacy overseas-child care prompts clear without marking the child cared for',()=>{
 const l=careFixture();const offered=advanceYear(l);offered.family.children[0].country='FRA';offered.descendants.children[0].residence='independent';
 const restored=decodeSave(encodeSave(offered,[])).life!;
 assert.equal(restored.pendingDecision,null);assert.ok(!restored.care.handledChildren.includes('care-child'));
});
test('daycare does not charge a household after its only young child moves abroad',()=>{
 const l=careFixture();l.relationship.childPlan='childfree';l.family.children[0].country='FRA';l.descendants.children[0].residence='independent';l.care.daycareUntil=l.age+4;
 const without=structuredClone(l);without.care.daycareUntil=null;
 assert.equal(nextYear(l).budget.dependents,nextYear(without).budget.dependents);
});
test('daycare does not charge after its only young child dies',()=>{
 const l=careFixture();l.relationship.childPlan='childfree';l.family.children[0].alive=false;l.family.children[0].deathAge=1;l.care.daycareUntil=l.age+4;
 const without=structuredClone(l);without.care.daycareUntil=null;
 assert.equal(nextYear(l).budget.dependents,nextYear(without).budget.dependents);
});
test('switching away from an absent partner caregiver cannot restore foreign earnings',()=>{
 const l=careFixture();l.family.partner!.country='FRA';l.care.who='partner';l.care.until=l.age+3;l.care.previousPartnerIncome=12345;
 const chosen=makeChoice(advanceYear(l),'daycare');
 assert.equal(chosen.relationship.partnerIncome,0);assert.equal(chosen.care.who,null);
});
test('local young children keep daycare costs after backup restoration',()=>{
 const l=careFixture();l.relationship.childPlan='childfree';l.care.handledChildren=['care-child'];l.care.daycareUntil=l.age+4;
 const restored=decodeSave(encodeSave(l,[])).life!;const without=structuredClone(restored);without.care.daycareUntil=null;
 assert.ok(nextYear(restored).budget.dependents>nextYear(without).budget.dependents);
});
test('switching a local partner caregiver to daycare restores their saved salary',()=>{
 const l=careFixture();l.care.who='partner';l.care.until=l.age+3;l.care.previousPartnerIncome=12345;
 const chosen=makeChoice(advanceYear(l),'daycare');assert.equal(chosen.relationship.partnerIncome,12345);assert.equal(chosen.care.who,null);
});
test('automatic separation clears the former partner childcare leave immediately',()=>{
 const l=fixture();l.care.until=l.age+3;l.stats.social=0;l.relationship.childPlan='childfree';l.rng=77;
 const after=nextYear(l);assert.ok(after.events.slice(l.events.length).some(e=>e.key==='event.separation'));
 assert.equal(after.family.partner,null);assert.equal(after.care.who,null);assert.equal(after.care.until,null);
 assert.equal(after.relationship.partnerIncome,0);assert.ok(decodeSave(encodeSave(after,[])).life);
});
test('ending a dating relationship clears its partner childcare leave',()=>{
 const l=fixture();l.settings.autoChoices=false;l.family.married=false;l.relationship.status='dating';l.opportunities.nextRelationshipAge=l.age;l.care.until=l.age+3;
 const offered=advanceYear(l);assert.equal(offered.pendingDecision?.key,'decision.marriage');
 const after=makeChoice(offered,'breakUp');assert.equal(after.family.partner,null);assert.equal(after.care.who,null);assert.equal(after.care.until,null);assert.equal(after.relationship.partnerIncome,0);
});
test('legacy separated saves cannot retain a former partner leave arrangement',()=>{
 const l=fixture();l.family.partner=null;l.family.married=false;l.relationship.status='single';
 const restored=decodeSave(JSON.stringify({version:1,life:l,past:[]})).life!;
 assert.equal(restored.care.who,null);assert.equal(restored.care.until,null);assert.equal(restored.relationship.partnerIncome,0);
});
