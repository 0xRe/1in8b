import test from 'node:test';import assert from 'node:assert/strict';
import {createLife,DEFAULT_SETTINGS} from '../src/game/engine';
import {lowerSecondaryContext} from '../src/game/lower-secondary-context';
import {getCountryById} from '../src/game/countries';
import {createLearningState,learningZ} from '../src/game/learning-state';
import {educationAccess} from '../src/game/education-access';
import {educationEraInputs} from '../src/game/education-era';
const environment={homeSchool:false,learningCentre:false,topMarkAge:null,returning:false,currentWar:0,accessModifiers:{}};
function student(){const life=createLife({...DEFAULT_SETTINGS,country:'AFG'},124);life.age=12;life.year=2038;life.sex='F';life.learning=createLearningState(12,{study:.8,body:0,art:0,music:0,hands:0,words:0},60);return life;}
test('secondary context preserves birth-country access and current-country policy after migration',()=>{
 const life=student();life.country=getCountryById('CHN');
 const result=lowerSecondaryContext(life,environment)!;
 assert.equal(result.country,'CHN');assert.equal(result.birthRegion,life.migration.birthCountry.region);
 assert.equal(result.banned,true);assert.equal(result.transition,0);
 assert.equal(result.year,2038);assert.equal(result.age,12);
});
test('latent learning and explicit special facts survive adaptation without changing the save',()=>{
 const life=student(),before=structuredClone(life);
 const result=lowerSecondaryContext(life,{...environment,homeSchool:true,learningCentre:true,topMarkAge:11,returning:true,currentWar:1.5})!;
 assert.equal(result.knowledgeZ,learningZ(life.learning!,12));assert.equal(result.knowledge,life.stats.knowledge);
 assert.equal(result.homeSchool,true);assert.equal(result.learningCentre,true);assert.equal(result.topMarkAge,11);assert.equal(result.returning,true);assert.equal(result.war,1.5);
 assert.deepEqual(life,before);
});
test('historical access uses calendar-year statistics and explicit household modifiers',()=>{
 const life=student();life.sex='M';life.era='past';life.year=1980;
 const modifiers={disclosedDisabilityMultiplier:.4,schoolEthnicityMultiplier:.6,wealthBoost:5 as const};
 const era=educationEraInputs(life.migration.birthCountry,life.era,life.year);
 const expected=educationAccess({...life.migration.birthCountry,...era.statistics},{...modifiers,sex:life.sex,quintile:life.stats.incomeQuintile,urban:life.residence==='urban',...era.access});
 const result=lowerSecondaryContext(life,{...environment,accessModifiers:modifiers})!;
 assert.equal(result.transition,expected.transitions[1]);assert.equal(result.banned,expected.secondaryBanned);
 assert.notEqual(result.transition,lowerSecondaryContext(life,environment)!.transition);
});
test('missing latent learning does not manufacture admission inputs or consume game RNG',()=>{
 const life=student();delete life.learning;const before=structuredClone(life);
 assert.equal(lowerSecondaryContext(life,environment),null);assert.deepEqual(life,before);
});
