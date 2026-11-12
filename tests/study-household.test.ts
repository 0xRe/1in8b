import test from 'node:test';import assert from 'node:assert/strict';
import {createLife,DEFAULT_SETTINGS} from '../src/game/engine';
import {childcareChoices,hasLocalYoungChild,localPartnerPresent} from '../src/game/childcare';
import type {ChildProgress} from '../src/game/types';
function fixture(){
 const life=createLife(DEFAULT_SETTINGS,1);const home=life.country.id;
 life.family.partner={id:'partner-test',name:'Partner',sex:'F',country:home,age:30,birthYear:life.year-30,alive:true,deathAge:null,job:'teacher'};
 life.family.children=[{id:'child-test',name:'Child',sex:'F',country:home,age:1,birthYear:life.year-1,alive:true,deathAge:null,job:'none'}];
 life.descendants.children=[{childId:'child-test',residence:'home'} as ChildProgress];
 life.academics={version:1,qualification:3,doctorate:false,medicine:false,studyCountry:'DEU',enrollment:null,overseasResidence:{country:home==='DEU'?'USA':'DEU',homeCountry:home,startedAge:life.age,level:'university'}};
 return life;
}
test('family waiting at origin cannot supply local childcare during overseas study',()=>{
 const life=fixture();assert.equal(localPartnerPresent(life),false);assert.equal(hasLocalYoungChild(life),false);
 assert.deepEqual(childcareChoices(life),['selfCare','daycare']);
 delete life.academics!.overseasResidence;
 assert.equal(localPartnerPresent(life),true);assert.equal(hasLocalYoungChild(life),true);assert.ok(childcareChoices(life).includes('partnerCare'));
});
test('family physically in the study country remains local without changing permanent residence',()=>{
 const life=fixture();const home=life.country.id,destination=life.academics!.overseasResidence!.country;
 life.family.partner!.country=destination;life.family.children[0].country=destination;
 assert.equal(localPartnerPresent(life),true);assert.equal(hasLocalYoungChild(life),true);assert.equal(life.country.id,home);
});
import {setLifestyle} from '../src/game/engine';
test('overseas study budget excludes a partner still earning in the origin household',()=>{
 const life=fixture();life.age=30;life.pendingDecision=null;life.relationship.status='married';life.relationship.partnerIncome=20000;life.stats.annualIncome=0;life.descendants.annualTransfers=0;
 const away=setLifestyle(life,'diet','healthy');assert.equal(away.budget.income,0);
 const home=structuredClone(life);delete home.academics!.overseasResidence;
 assert.equal(setLifestyle(home,'diet','healthy').budget.income,20000);
});
import {naturalFamily} from './helpers/adult-family-simulation';
import {encodeSave,decodeSave} from '../src/game/storage';
test('a saved childcare choice in the physical study country survives decoding',()=>{
 const life=structuredClone([...naturalFamily(1)].find(l=>l.pendingDecision?.id.startsWith('care-'))!);assert.ok(life);
 const destination=life.country.id==='DEU'?'USA':'DEU';
 life.academics={version:1,qualification:3,doctorate:false,medicine:false,studyCountry:destination,enrollment:null,overseasResidence:{country:destination,homeCountry:life.country.id,startedAge:life.age,level:'university'}};
 const index=Number(life.pendingDecision!.id.split('-')[2]);life.family.children[index].country=destination;life.family.partner!.country=destination;
 life.pendingDecision!.choices=childcareChoices(life).map(id=>({id,key:`choice.${id}`,params:{}}));
 const restored=decodeSave(encodeSave(life,[])).life!;assert.deepEqual(restored.pendingDecision,life.pendingDecision);
});

test('children waiting at origin remain valid but cannot offer local childcare',()=>{
 const life=structuredClone([...naturalFamily(1)].find(l=>l.pendingDecision?.id.startsWith('care-'))!);
 const destination=life.country.id==='DEU'?'USA':'DEU';
 life.academics={version:1,qualification:3,doctorate:false,medicine:false,studyCountry:destination,enrollment:null,overseasResidence:{country:destination,homeCountry:life.country.id,startedAge:life.age,level:'university'}};
 life.pendingDecision!.choices=childcareChoices(life).map(id=>({id,key:`choice.${id}`,params:{}}));
 const restored=decodeSave(encodeSave(life,[])).life!;
 assert.equal(restored.pendingDecision,null);
 assert.deepEqual(restored.family.children,life.family.children);
 assert.equal(hasLocalYoungChild(restored),false);
});
