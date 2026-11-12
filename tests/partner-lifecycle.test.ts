import assert from 'node:assert/strict';
import test from 'node:test';
import { createLife, advanceYear, makeChoice, DEFAULT_SETTINGS } from '../src/game/engine';
import { familyMembers, migrateDependents } from '../src/game/descendants';
import { decodeSave, encodeSave } from '../src/game/storage';
function fixture() {
 let life=createLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true,autoChoices:true},124);
 for(let n=0;n<400&&life.age<40&&life.alive;n++)life=advanceYear(life);
 for(let n=0;n<30&&life.timeline&&!life.timeline.complete;n++)life=advanceYear(life);
 assert.equal(life.age,40);
 life.family.secondPartner={id:'second-partner-fixture',name:'Second partner',sex:'F',age:24,birthYear:life.year-24,country:'JPN',alive:true,deathAge:null,job:'service'};
 return life;
}
test('second partners participate in annual aging and family totals without double counting',()=>{
 const before=fixture();let after=before;
 for(let n=0;n<40&&after.age===before.age&&after.alive;n++)after=advanceYear(after);
 assert.equal(after.age,before.age+1);
 const partner=after.family.secondPartner!;
 assert.ok(!partner.alive||partner.age===25,'living partners age with the calendar');
 assert.equal(familyMembers(after).filter(p=>p.id===partner.id).length,1);
 assert.deepEqual(decodeSave(encodeSave(after,[])).life,after);
});
test('whole-family migration moves a living second partner but preserves a deceased partner location',()=>{
 const life=fixture();migrateDependents(life,'JPN','FRA');
 assert.equal(life.family.secondPartner!.country,'FRA');
 const partner=life.family.secondPartner!;partner.alive=false;partner.deathAge=partner.age;
 migrateDependents(life,'FRA','DEU');assert.equal(partner.country,'FRA');
});

test('a second partner has mortality and freezes after death',()=>{
 let life=fixture();life.family.secondPartner!.age=110;life.family.secondPartner!.birthYear=life.year-110;
 const startAge=life.age;
 for(let n=0;n<40&&life.age===startAge&&life.alive;n++)life=advanceYear(life);
 assert.equal(life.family.secondPartner!.alive,false);
 assert.equal(life.family.secondPartner!.deathAge,110);
 assert.ok(life.events.some(e=>e.key==='event.familyDeath'&&e.params?.name==='Second partner'));
 const deceased=structuredClone(life.family.secondPartner);
 for(let n=0;n<40&&life.age<startAge+2&&life.alive;n++)life=advanceYear(life);
 assert.deepEqual(life.family.secondPartner,deceased);
});

test('legacy frozen living partner age is recovered from the saved birth year without rewriting deceased partners',()=>{
 const life=fixture();life.family.secondPartner!.birthYear=life.year-31;
 const restored=decodeSave(encodeSave(life,[])).life!;
 assert.equal(restored.family.secondPartner!.age,31);
 assert.equal(life.family.secondPartner!.age,24);
 life.family.secondPartner!.alive=false;life.family.secondPartner!.deathAge=24;
 assert.equal(decodeSave(encodeSave(life,[])).life!.family.secondPartner!.age,24);
});

for(const deceased of ['primary','both'] as const)test(`a surviving player can meet a new partner after ${deceased} partners die`,()=>{
 const life=fixture();life.settings.gentler=false;life.settings.classroom=false;life.settings.autoChoices=false;life.pendingDecision=null;
 life.family.children=[];life.descendants.children=[];life.descendants.grandchildren=[];
 life.family.partner={...life.family.secondPartner!,id:'late-primary',name:'Late partner',alive:false,deathAge:24};
 if(deceased==='both'){life.family.secondPartner!.alive=false;life.family.secondPartner!.deathAge=24;}else delete life.family.secondPartner;
 life.family.married=true;life.family.marriageAge=30;life.relationship.status='married';life.stats.debt=0;life.care.who=null;life.care.until=null;life.opportunities.nextRelationshipAge=40;life.rng=7;
 const offered=advanceYear(life);assert.equal(offered.pendingDecision?.key,'decision.remarriage');
 const declined=makeChoice(offered,'independent');assert.equal(declined.family.partner!.alive,false);assert.equal(declined.opportunities.nextRelationshipAge,45);
 if(deceased==='both'){const paired=structuredClone(life);paired.rng=7;paired.family.secondPartner!.alive=true;paired.family.secondPartner!.deathAge=null;assert.notEqual(advanceYear(paired).pendingDecision?.key,'decision.remarriage');}
 const dating=makeChoice(offered,'partner');assert.equal(dating.relationship.status,'dating');assert.equal(dating.family.married,false);assert.equal(dating.family.partner!.alive,true);
 assert.equal(life.family.partner.alive,false,'source state remains unchanged');
 assert.ok(decodeSave(encodeSave(dating,[])).life);
});

for(const rng of [1,7])test(`relationship opportunity RNG ${rng} never mutates the input save`,()=>{
 const life=fixture();life.settings.gentler=false;life.settings.classroom=false;life.settings.autoChoices=false;life.pendingDecision=null;
 life.family.partner=null;delete life.family.secondPartner;life.family.married=false;life.relationship.status='single';life.opportunities.nextRelationshipAge=40;life.stats.debt=0;life.care.who=null;life.care.until=null;
 life.family.children=[];life.descendants.children=[];life.descendants.grandchildren=[];life.rng=rng;
 const before=structuredClone(life),first=advanceYear(life);
 assert.deepEqual(life,before,'checking an annual opportunity must not change the previous save');
 assert.deepEqual(advanceYear(life),first,'repeating a transition from the same save must be deterministic');
 if(rng===7)assert.equal(first.pendingDecision?.key,'decision.remarriage');
});
