import test from'node:test';import assert from'node:assert/strict';import React from'react';import{renderToStaticMarkup}from'react-dom/server';
import{createNewGame}from'../src/game/new-game';import{DEFAULT_SETTINGS,advanceYear,makeChoice,addReflection,trainHobby,toggleAutomaticHobbyLessons}from'../src/game/engine';
import{hobbyOptionsFor,drawHobbyChoices}from'../src/game/hobby-catalog';import{settleEducationHobbies,refreshEducationContext}from'../src/game/education-context-lifecycle';
import{hobbyLifeCandidate,hobbyLifeOptions}from'../src/game/hobby-life';import{hobbyMilestoneCandidate}from'../src/game/hobby-milestones';import{settleAutomaticLessons}from'../src/game/hobby-lessons';
import{hobbyDecision}from'../src/game/hobby-runtime';import{decodeSave,encodeSave}from'../src/game/storage';import{LifeDetails,LifeActions}from'../src/components/GameDetails';import{translator}from'../src/lib/i18n';
import{educationAccessTraits}from'../src/game/education-traits';import{academyAccess}from'../src/game/academy-access-runtime';
const next=(l:any)=>!l.pendingDecision?advanceYear(l):l.pendingDecision.type==='reflection'?addReflection(l,''):makeChoice(l,l.pendingDecision.choices.find((c:any)=>['intensiveCare','attendFollowup','secondaryGo','upperGo','collegeWork','physicalAidDecline'].includes(c.id))?.id??l.pendingDecision.choices[0].id);
let cached:any;function fixture(){if(!cached){let l=createNewGame({...DEFAULT_SETTINGS,country:'JPN',gentler:true,dailyThemeDay:'2026-10-26'},41);for(let i=0;i<800&&!(l.age===40&&l.timeline?.complete&&!l.pendingDecision);i++)l=next(l);assert.equal(l.age,40);cached=l;}const l=structuredClone(cached);l.hobbies=[];l.hobbyState={version:1};l.stats.savings=1e6;l.stats.debt=0;l.stats.investments=0;l.stats.netAssets=l.stats.savings+l.belongings.housingValue;l.stats.happiness=50;l.stats.social=50;l.learning.talents.body=0;l.learning.talents.study=0;l.physicalState={version:1,lastCheckedAge:40,condition:{kind:'mobility',source:'work',since:39,noticeAt:39,recognizedAge:39,wheelchair:true,aid:false}};return l;}
const h=(id:string,level=3)=>({id,skill:5,trainedAt:-1,progress:{since:7,level}});
test('mobility and acquired vision use the exact adapted sport pools without a football fallback',()=>{
 const l=fixture();assert.deepEqual(hobbyOptionsFor(l).filter(id=>id.startsWith('sp_')),['sp_basketball','sp_tabletennis','sp_badminton','sp_archery','sp_running','sp_cycling','sp_rugby']);
 l.physicalState.condition.wheelchair=false;assert.deepEqual(hobbyOptionsFor(l).filter(id=>id.startsWith('sp_')),['sp_basketball','sp_tabletennis','sp_badminton','sp_archery','sp_cycling']);
 l.physicalState.condition.kind='vision';assert.deepEqual(hobbyOptionsFor(l).filter(id=>id.startsWith('sp_')),['sp_running','sp_cycling']);
 l.physicalState.condition.source='birth';l.physicalState.condition.since=0;l.physicalState.condition.noticeAt=1;l.physicalState.condition.recognizedAge=1;assert.ok(hobbyOptionsFor(l).includes('sp_baseball' as any),'congenital vision uses normal country sports in the source');
});
test('hearing discovery and walking restrictions do not erase permitted retained interests',()=>{
 const l=fixture();l.physicalState.condition.kind='hearing';l.physicalState.condition.wheelchair=false;assert.ok(!hobbyOptionsFor(l).includes('music'));assert.ok(!hobbyOptionsFor(l).includes('karaoke'));
 l.hobbies=[h('music')];assert.ok(trainHobby(l,'music').hobbies[0].progress!.level>3,'source body-off does not block retained music');
 l.hobbies=[];l.physicalState.condition.kind='mobility';l.physicalState.condition.source='birth';l.physicalState.condition.since=0;l.physicalState.condition.noticeAt=1;l.physicalState.condition.recognizedAge=1;
 assert.ok(!hobbyOptionsFor(l).includes('dance'));assert.ok(hobbyOptionsFor(l).includes('hiking'));
 l.physicalState.condition.source='work';l.physicalState.condition.since=39;l.physicalState.condition.noticeAt=39;l.physicalState.condition.recognizedAge=39;assert.ok(!hobbyOptionsFor(l).includes('hiking'));
});
test('blocked activity never gains levels or paid practice, while body-adapted sport can grow and receive lessons',()=>{
 const l=fixture();l.hobbies=[h('sp_football'),h('sp_basketball')];l.timeline.complete=true;settleEducationHobbies(l,{sport:1});assert.equal(l.hobbies[0].progress.level,3);assert.ok(Math.abs(l.hobbies[1].progress.level-4.55)<1e-10);
 assert.equal(trainHobby(l,'sp_football'),l);assert.ok(trainHobby(l,'sp_basketball').stats.savings<l.stats.savings);
 const auto=toggleAutomaticHobbyLessons(l);auto.hobbyState.lessonHobby='sp_football';const cash=auto.stats.savings;settleAutomaticLessons(auto,()=>assert.fail('not a funds failure'));assert.equal(auto.stats.savings,cash);
});
test('adapted names appear in current details and actual hobby choices instead of silently showing the original sport',()=>{
 const l=fixture();l.hobbies=[h('sp_cycling')];const html=renderToStaticMarkup(React.createElement(LifeDetails,{life:l,t:translator('en')}));assert.match(html,/Handcycling/);
 l.hobbies=[];l.hobbyState.offer={age:40,options:['sp_cycling','sp_basketball','reading'],replacement:null};
 const choice=hobbyDecision(l)!.choices[0];assert.equal(translator('en')(choice.key,choice.params),'Handcycling');
});
test('pre-eighty body sidelining closes active milestones without awards and imports only with real onset evidence',()=>{
 const l=fixture();l.hobbies=[h('sp_football',8)];const events:any[]=[];hobbyMilestoneCandidate(l,{event:(key,params)=>events.push({key,params})}).run();
 assert.equal(events[0].key,'event.hobbyLife.sidelines');assert.equal(l.hobbies[0].progress.sidelinesAge,40);assert.equal(l.hobbies[0].progress.milestonesSuppressedAge,40);assert.equal(l.stats.happiness,50);
 assert.deepEqual(decodeSave(encodeSave(l,[])).life,l);
 const noBody=structuredClone(l);delete noBody.physicalState;assert.throws(()=>decodeSave(encodeSave(noBody,[])));
 const tooSoon=structuredClone(l);tooSoon.hobbies[0].progress.sidelinesAge=38;assert.throws(()=>decodeSave(encodeSave(tooSoon,[])));
});
test('blocked hiking and dance use their actual sideline scenes and do not masquerade as a sports match',()=>{
 for(const[id,key]of[['dance','event.hobbyLife.sidelines.dance'],['hiking','event.hobbyLife.sidelines.hiking']]){
  const l=fixture();l.hobbies=[h(id,5)];const events:string[]=[];hobbyLifeCandidate(l,{random:()=>0,event:key=>events.push(key)}).run();assert.equal(events[0],key);
 }
});
test('family stories snapshot adapted labels, retain actual hobby IDs and preserve the shared sport receipt',()=>{
 const l=fixture();l.hobbies=[h('sp_basketball',5)];l.family.partner={id:'partner',name:'Alex',sex:'F',country:l.country.id,age:40,birthYear:l.year-40,alive:true,deathAge:null,job:'teacher'};l.family.married=true;l.relationship.status='married';
 const events:any[]=[];const options=hobbyLifeOptions(l);const spouse=options.findIndex(o=>o.id==='spouse');assert.ok(spouse>=0);
 hobbyLifeCandidate(l,{random:()=>(spouse+.1)/options.length,event:(key,params)=>events.push({key,params})}).run();
 assert.equal(events[0].params.hobby,'adapted.wheelchairBasketball');assert.match(translator('en')(events[0].key,events[0].params),/Wheelchair basketball/);assert.equal(l.hobbyState.lifeStories.sharedPartner.hobby,'sp_basketball');assert.equal(l.hobbyState.lifeStories.sharedPartner.label,'adapted.wheelchairBasketball');assert.deepEqual(decodeSave(encodeSave(l,[])).life,l);
});
test('observed physical access reaches actual education odds and academy gates without fabricating legacy knowledge',()=>{
 const l=fixture();l.country={...l.country,ppp:30000};assert.equal(educationAccessTraits(l).disclosedDisabilityMultiplier,.7);
 l.physicalState.condition.aid=true;assert.equal(educationAccessTraits(l).disclosedDisabilityMultiplier,.9);
 l.age=18;l.physicalState.condition.source='birth';l.physicalState.condition.since=0;l.physicalState.condition.noticeAt=1;l.physicalState.condition.recognizedAge=1;l.physicalState.lastCheckedAge=18;l.stats.knowledge=85;l.stats.health=90;l.family.married=false;l.migration.moves=[];assert.equal(academyAccess(l),false);
 l.physicalState.condition.kind='hearing';l.physicalState.condition.wheelchair=false;assert.equal(academyAccess(l),true);l.academics.academyAccess.disability='other';assert.equal(academyAccess(l),false,'observed hearing facts cannot erase another recorded restriction');
 delete l.physicalState;assert.equal(educationAccessTraits(l).disclosedDisabilityMultiplier,undefined);
});
import {observePhysicalYear} from '../src/game/physical-runtime';
test('an observed injury permits one early return to a compatible old sport without inventing a new hobby or level',()=>{
 const l=fixture();l.belongings.transport='none';l.physicalState.lastCheckedAge=39;l.hobbies=[h('sp_cycling',3)];
 assert.equal(observePhysicalYear(l,()=>assert.fail('adapted return is deterministic')),'event.physical.sportReturn.handcycling');assert.equal(l.stats.happiness,52);assert.equal(l.hobbies[0].progress.returnedToSportAge,40);assert.deepEqual(l.physicalState.condition.sportsAdjustment,{age:40,hobby:'sp_cycling'});
 assert.equal(l.hobbies[0].progress.level,3);assert.deepEqual(decodeSave(encodeSave(l,[])).life,l);
 l.age=41;l.year++;assert.notEqual(observePhysicalYear(l,()=>assert.fail('no reroll')),'event.physical.sportReturn.handcycling');
});
test('adapted milestones name the observed sport and senior accomplishments do not claim a competitive prize',()=>{
 for(const age of[40,65]){
  const l=fixture();l.age=age;l.hobbies=[h('sp_basketball',8)];const events:any[]=[];hobbyMilestoneCandidate(l,{event:(key,params)=>events.push({key,params})}).run();
  const text=translator('en')(events[0].key,events[0].params);assert.match(text,/Wheelchair basketball/);if(age===65)assert.doesNotMatch(text,/local sporting event|competition|prize/);
 }
});
import {occupationEarlyRejection} from '../src/game/occupation-access';
test('adapted labels and returned-sport receipts cannot be forged or erased from retained observed histories',()=>{
 const l=fixture();l.belongings.transport='none';l.physicalState.lastCheckedAge=39;l.hobbies=[h('sp_cycling',3)];observePhysicalYear(l,()=>0);
 const broken=structuredClone(l);delete broken.hobbies[0].progress.returnedToSportAge;assert.throws(()=>decodeSave(encodeSave(broken,[])));
 l.hobbies=[];assert.deepEqual(decodeSave(encodeSave(l,[])).life,l);
 const changed=fixture();changed.hobbies=[h('sp_basketball',5)];changed.hobbyState.lifeStories={sharedPartner:{id:'past',name:'Alex',hobby:'sp_basketball',age:40,label:'adapted.handcycling'}};assert.throws(()=>decodeSave(encodeSave(changed,[])));
 changed.hobbyState.lifeStories.sharedPartner.label='adapted.wheelchairBasketball';changed.hobbyState.lifeStories.sharedPartner.age=38;assert.throws(()=>decodeSave(encodeSave(changed,[])));
});
test('acquired condition histories reject kind/source combinations that no audited producer can create',()=>{
 for(const[source,kind]of[['work','hearing'],['road','hearing'],['stroke','vision']]as const){
  const l=fixture();l.physicalState.condition.source=source;l.physicalState.condition.kind=kind;l.physicalState.condition.wheelchair=false;assert.throws(()=>decodeSave(encodeSave(l,[])));
 }
});
