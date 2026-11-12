import test from 'node:test';import assert from 'node:assert/strict';
import {createNewGame} from '../src/game/new-game';import {DEFAULT_SETTINGS} from '../src/game/engine';
import {hobbyOptionsFor,drawHobbyChoices,replacedHobby,hobbyDefinition,sourceHobbyLevel} from '../src/game/hobby-catalog';
function person(){const l=createNewGame({...DEFAULT_SETTINGS,country:'JPN'},41);l.age=20;l.year=2026;l.stats.incomeQuintile=5;l.stats.annualIncome=100000;l.stats.education=4;l.academics!.qualification=4;l.residence='urban';return l;}
test('actual access facts control the general hobby catalog without equating current money to childhood means',()=>{
 const l=person();let ids=hobbyOptionsFor(l);assert.ok(ids.includes('writing'));assert.ok(ids.includes('dance'));assert.ok(ids.includes('karaoke'));assert.ok(!ids.includes('sns'));
 l.belongings.phone=true;assert.ok(hobbyOptionsFor(l).includes('sns'));
 l.age=11;ids=hobbyOptionsFor(l);for(const id of ['photo','gym','travel','karaoke','sns'])assert.ok(!ids.includes(id as any),id);assert.ok(ids.includes('cooking'));
 l.age=9;assert.ok(!hobbyOptionsFor(l).includes('cooking'));
 l.age=16;l.stats.incomeQuintile=3;assert.ok(!hobbyOptionsFor(l).includes('travel'));l.stats.incomeQuintile=4;assert.ok(hobbyOptionsFor(l).includes('travel'));
 l.residence='rural';assert.ok(!hobbyOptionsFor(l).includes('gym'));
 l.age=20;l.year=1976;assert.ok(!hobbyOptionsFor(l).includes('karaoke'));l.year=1977;assert.ok(hobbyOptionsFor(l).includes('karaoke'));
 l.academics!.qualification=0;l.academics!.enrollment=null;l.stats.education=0;l.schooling.enrolled=false;l.schooling.years=0;assert.ok(!hobbyOptionsFor(l).includes('reading'));assert.ok(!hobbyOptionsFor(l).includes('writing'));
});
test('closed catalog excludes duplicates and independently sampled menus contain three distinct eligible activities',()=>{
 const l=person();l.hobbies=[{id:'art',skill:77,trainedAt:-1,progress:{since:7,level:2}}];
 const before=structuredClone(l);const a=drawHobbyChoices(l,()=>.1),b=drawHobbyChoices(l,()=>.1);
 assert.equal(a.length,3);assert.equal(new Set(a).size,3);assert.ok(!a.includes('art'));assert.deepEqual(a,b);assert.deepEqual(l,before);
 assert.equal(hobbyDefinition('not-a-hobby'),null);assert.equal(hobbyDefinition('nature'),null);
});
test('replacement uses actual observed skill then oldest start age, never the disconnected legacy display meter',()=>{
 const hobbies:any[]=[{id:'music',skill:99,progress:{since:15,level:1}},{id:'art',skill:1,progress:{since:7,level:1}},{id:'reading',skill:2,progress:{since:10,level:4}}];
 assert.equal(replacedHobby(hobbies)?.id,'art');
 hobbies[0].progress.since=7;assert.equal(replacedHobby(hobbies)?.id,'art');
 assert.equal(replacedHobby(hobbies.slice(0,2)),null);
 assert.equal(sourceHobbyLevel({id:'reading',skill:80,trainedAt:-1}),null);
});

test('writing contributes its audited knowledge value to real learning context',async()=>{
 const {learningHobby}=await import('../src/game/learning-context');
 assert.deepEqual(learningHobby('writing'),{knowledge:3,social:0});
});
