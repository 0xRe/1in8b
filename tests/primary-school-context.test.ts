import test from 'node:test';import assert from 'node:assert/strict';
import {primarySchoolContext} from '../src/game/primary-school-context';
import {createLife,DEFAULT_SETTINGS} from '../src/game/engine';
import {getCountryById} from '../src/game/countries';
import {educationAccess} from '../src/game/education-access';
import {educationEraInputs} from '../src/game/education-era';
const environment={rich:false,refugee:false,irregular:false,learningCentreOnly:false,absentParentIds:[],accessModifiers:{}};
test('education access and private shares follow birth country while entry conditions follow residence',()=>{
 const life=createLife({...DEFAULT_SETTINGS,country:'IND'},1);life.country=getCountryById('USA')!;
 const context=primarySchoolContext(life,environment);
 const birth=life.migration.birthCountry;
 const expected=educationAccess(birth,{sex:life.sex,quintile:life.stats.incomeQuintile,urban:life.residence==='urban'});
 assert.equal(context.completion,expected.transitions[0]);assert.equal(context.privateShare,.45);
 assert.equal(context.country,'USA');assert.equal(context.region,'hi');assert.equal(context.war,life.country.war);
});
test('parent admission floor only uses living non-absent parents in supported degree occupations',()=>{
 const life=createLife({...DEFAULT_SETTINGS,country:'UGA'},2);life.family.parents.forEach(p=>{p.alive=true;p.job='farmer';});
 const parent=life.family.parents[0];parent.job='teacher';
 assert.equal(primarySchoolContext(life,environment).educatedParentPresent,true);
 assert.equal(primarySchoolContext(life,{...environment,absentParentIds:[parent.id]}).educatedParentPresent,false);
 parent.alive=false;assert.equal(primarySchoolContext(life,environment).educatedParentPresent,false);
});
test('historical access uses the education-era adapter and private-school cutoff for the same year',()=>{
 const life=createLife({...DEFAULT_SETTINGS,country:'CHN',era:'past'},3);life.year=1992;
 const era=educationEraInputs(life.migration.birthCountry,life.era,life.year);
 const expected=educationAccess({...life.migration.birthCountry,...era.statistics},{sex:life.sex,quintile:life.stats.incomeQuintile,urban:life.residence==='urban',...era.access});
 const context=primarySchoolContext(life,environment);
 assert.equal(context.completion,expected.transitions[0]);assert.equal(context.privateShare,0);assert.equal(context.year,1992);
 life.year=1993;assert.equal(primarySchoolContext(life,environment).privateShare,.09);
});
test('special household and access modifiers are explicit and context construction never changes the life',()=>{
 const life=createLife({...DEFAULT_SETTINGS,country:'UGA'},4),before=structuredClone(life);
 const context=primarySchoolContext(life,{...environment,rich:true,refugee:true,irregular:true,learningCentreOnly:true,accessModifiers:{disclosedDisabilityMultiplier:.5}});
 assert.equal(context.rich,true);assert.equal(context.refugee,true);assert.equal(context.irregular,true);assert.equal(context.learningCentreOnly,true);
 assert.ok(context.completion<primarySchoolContext(life,environment).completion);assert.deepEqual(life,before);
});
