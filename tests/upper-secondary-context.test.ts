import test from 'node:test';import assert from 'node:assert/strict';
import {createLife,DEFAULT_SETTINGS} from '../src/game/engine';
import {upperSecondaryContext} from '../src/game/upper-secondary-context';
import {getCountryById} from '../src/game/countries';
import {createLearningState} from '../src/game/learning-state';
import {planUpperSecondary} from '../src/game/upper-secondary';
const environment={homeSchool:false,refugeeCamp:false,refugee:false,irregular:false,returning:false,accessModifiers:{},hobbies:[{id:'music',since:10,level:3}],alreadySpecialist:false};
function student(){const l=createLife({...DEFAULT_SETTINGS,country:'JPN'},124);l.age=15;l.year=2041;l.learning=createLearningState(15,{study:.8,body:0,art:0,music:0,hands:0,words:0},60);return l;}
test('upper context separates birth-country school access from residence reform policy',()=>{
 const l=student();l.country=getCountryById('UGA');l.stats.incomeQuintile=1;
 const c=upperSecondaryContext(l,environment)!;
 assert.equal(c.birthCountry,'JPN');assert.equal(c.country,'UGA');assert.ok(c.transition>=.973);
 assert.deepEqual(planUpperSecondary(c).choices,['go','arts','voc']);
 const banned=createLife({...DEFAULT_SETTINGS,country:'AFG'},23);banned.sex='F';banned.age=15;banned.learning=l.learning;banned.country=getCountryById('USA');
 const foreign=upperSecondaryContext(banned,{...environment,hobbies:[]})!;
 assert.equal(foreign.transition,0);assert.deepEqual(planUpperSecondary(foreign).choices,['go','voc']);
 assert.deepEqual(planUpperSecondary(upperSecondaryContext(banned,{...environment,hobbies:[],refugee:true})!).choices,['go','voc','work']);
});
test('specialist entry uses supplied source hobby age and level, never legacy last-training or skill',()=>{
 const l=student();l.hobbies=[{id:'art',skill:100,trainedAt:10}];const before=structuredClone(l);
 assert.deepEqual(upperSecondaryContext(l,environment)!.specialist,{kind:'art',hobby:'music',level:3});
 assert.equal(upperSecondaryContext(l,{...environment,hobbies:[]})!.specialist,null);
 assert.equal(upperSecondaryContext(l,{...environment,alreadySpecialist:true})!.specialist,null);
 assert.deepEqual(l,before);
});
test('historical birthplace purchasing power controls specialist availability after migration',()=>{
 const l=student();l.country=getCountryById('USA');l.era='past';l.year=1950;
 assert.equal(upperSecondaryContext(l,environment)!.specialist,null);
 l.year=2026;assert.equal(upperSecondaryContext(l,environment)!.specialist?.hobby,'music');
 delete l.birthDevelopment; // Legacy supplied modifiers remain in effect when birth facts are unknown.
 const base=upperSecondaryContext(l,environment)!.transition;
 assert.ok(upperSecondaryContext(l,{...environment,accessModifiers:{upperSecondaryMultiplier:.2}})!.transition<base);
});
test('missing learning is explicit and policy facts do not mutate life or RNG',()=>{
 const l=student();const c=upperSecondaryContext(l,{...environment,refugee:true,irregular:true,returning:true,homeSchool:true,refugeeCamp:true})!;
 assert.equal(c.refugee,true);assert.equal(c.irregular,true);assert.equal(c.returning,true);assert.equal(c.homeSchool,true);assert.equal(c.refugeeCamp,true);
 delete l.learning;const before=structuredClone(l);assert.equal(upperSecondaryContext(l,environment),null);assert.deepEqual(l,before);
});
