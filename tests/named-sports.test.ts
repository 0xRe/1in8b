import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createNewGame} from '../src/game/new-game';
import {DEFAULT_SETTINGS,advanceYear,makeChoice,addReflection,trainHobby,toggleAutomaticHobbyLessons} from '../src/game/engine';
import {hobbyOptionsFor,drawHobbyChoices,hobbyDefinition} from '../src/game/hobby-catalog';
import {prepareHobbyDecision,resolveHobbyChoice,refreshHobbyDecision} from '../src/game/hobby-runtime';
import {settleEducationHobbies,refreshEducationContext} from '../src/game/education-context-lifecycle';
import {settleAutomaticLessons} from '../src/game/hobby-lessons';
import {hobbyLifeOptions,hobbyLifeCandidate} from '../src/game/hobby-life';
import {hobbyMilestoneCandidate} from '../src/game/hobby-milestones';
import {selectSpecialistSchool} from '../src/game/upper-secondary';
import {decodeSave,encodeSave} from '../src/game/storage';
import {LifeActions} from '../src/components/GameDetails';
import {translator} from '../src/lib/i18n';
import countries from '../src/data/countries.json';

const next=(l:any)=>!l.pendingDecision?advanceYear(l):l.pendingDecision.type==='reflection'?addReflection(l,''):makeChoice(l,l.pendingDecision.choices.find((c:any)=>['intensiveCare','attendFollowup','secondaryGo','upperGo','collegeWork'].includes(c.id))?.id??l.pendingDecision.choices[0].id);
let cached:any;
function adult(){if(!cached){let l=createNewGame({...DEFAULT_SETTINGS,country:'JPN',gentler:true,dailyThemeDay:'2026-10-26'},41);for(let i=0;i<800&&!(l.age===20&&l.timeline?.complete&&!l.pendingDecision);i++)l=next(l);assert.equal(l.age,20);cached=l;}const l=structuredClone(cached);l.hobbies=[];l.hobbyState={version:1};l.stats.savings=1e6;l.stats.investments=0;l.stats.debt=0;l.stats.netAssets=1e6+l.belongings.housingValue;l.stats.happiness=50;l.stats.social=50;l.learning.talents.body=0;l.learning.talents.study=0;return l;}
const sport=(id:string,level=3)=>({id,skill:5,trainedAt:-1,progress:{since:7,level}});
test('country pools expose distinct local sports and fallback football without making every sport universally available',()=>{
 for(const [country,want] of [['USA',['sp_basketball','sp_baseball','sp_amfootball','sp_football']],['FRA',['sp_football','sp_rugby','sp_cycling']],['BIH',['sp_football','sp_basketball','sp_handball']],['MMR',['sp_chinlone','sp_football']]] as const){
  const l=adult();l.country=countries.find(c=>c.id===country)!;
  assert.deepEqual(hobbyOptionsFor(l).filter(id=>id.startsWith('sp_')),want);
 }
 const l=adult();l.hobbies=[sport('sp_baseball')];assert.ok(!hobbyOptionsFor(l).includes('sp_baseball' as any));assert.equal(hobbyDefinition('sp_unknown'),null);
});
test('new menus draw named sports with country and sex weights while retaining old generic-sport choices',()=>{
 const l=adult();l.country=countries.find(c=>c.id==='USA')!;l.sex='M';
 const tally=(sex:'M'|'F')=>{l.sex=sex;const counts:Record<string,number>={};for(let i=0;i<3000;i++){const id=drawHobbyChoices(l,()=>(i+.5)/3000)[0];counts[id]=(counts[id]??0)+1;}return counts;};
 const male=tally('M'),female=tally('F');assert.ok(!male.sport);assert.ok(male.sp_baseball>0&&male.sp_amfootball>0);assert.ok(male.sp_basketball>male.sp_baseball);assert.ok(female.sp_football<male.sp_football/4);
 l.hobbies=[];l.hobbyState={version:1,offer:{age:20,options:['sport','reading','music'],replacement:null}};
 const old=refreshHobbyDecision(l,()=>assert.fail('old generic sport must not reroll'));assert.ok(old!.choices.some(c=>c.id==='sport'));assert.equal(resolveHobbyChoice(l,'sport'),true);
});
test('age seventy excludes strenuous discovery and low-health discovery while soft sports remain available',()=>{
 const l=adult();l.country=countries.find(c=>c.id==='USA')!;l.age=69;assert.ok(hobbyOptionsFor(l).includes('sp_football' as any));
 l.age=70;assert.deepEqual(hobbyOptionsFor(l).filter(id=>id.startsWith('sp_')),[]);
 l.country=countries.find(c=>c.id==='FRA')!;assert.deepEqual(hobbyOptionsFor(l).filter(id=>id.startsWith('sp_')),['sp_cycling']);
 l.stats.health=39;assert.deepEqual(hobbyOptionsFor(l).filter(id=>id.startsWith('sp_')),[]);
});
test('named sports receive body focus and ordinary growth and feed the actual sports-school adapter',()=>{
 const l=adult();l.hobbies=[sport('sp_baseball',2)];l.timeline.complete=true;l.age=13;settleEducationHobbies(l,{sport:1});
 assert.ok(Math.abs(l.hobbies[0].progress.level-3.55)<1e-10);
 refreshEducationContext(l);assert.deepEqual(selectSpecialistSchool(8000,false,l.academics.upperFacts.hobbies),{kind:'sport',hobby:'sp_baseball',level:l.hobbies[0].progress.level});
 const saved=adult();saved.hobbies=[sport('sp_baseball',2)];refreshEducationContext(saved);assert.deepEqual(decodeSave(encodeSave(saved,[])).life,saved);
});
test('retained strenuous sport stops growth at eighty, keeps wellbeing and yields focus to an available interest',()=>{
 const l=adult();l.age=80;l.hobbies=[sport('sp_football'),sport('reading')];l.timeline.complete=true;const before=l.stats.happiness;
 settleEducationHobbies(l,{hobby:1,sport:1});
 assert.equal(l.hobbies[0].progress.level,3);assert.ok(Math.abs(l.hobbies[1].progress.level-3.95)<1e-10);assert.ok(l.stats.happiness>before);
 const soft=adult();soft.age=80;soft.hobbies=[sport('sp_cycling')];soft.timeline.complete=true;settleEducationHobbies(soft,{sport:1});assert.ok(Math.abs(soft.hobbies[0].progress.level-4.55)<1e-10);
});
test('manual and automatic lessons charge a named sport once and never charge blocked sport or silently switch target',()=>{
 const l=adult();l.hobbies=[sport('sp_football'),sport('music')];
 const manual=trainHobby(l,'sp_football');assert.ok(manual.hobbies[0].progress!.level>3);assert.ok(manual.stats.savings<l.stats.savings);assert.equal(l.hobbies[0].progress.level,3);
 const old=structuredClone(l);old.age=80;assert.equal(trainHobby(old,'sp_football'),old);const on=toggleAutomaticHobbyLessons(old);on.hobbyState.lessonHobby='sp_football';const cash=on.stats.savings;settleAutomaticLessons(on,()=>assert.fail('blocked target is not a funds failure'));assert.equal(on.stats.savings,cash);assert.equal(on.hobbies[1].progress.level,3);assert.equal(on.hobbyState.lessonHobby,'sp_football');
 const available=toggleAutomaticHobbyLessons(l);settleAutomaticLessons(available,()=>{});assert.ok(available.stats.savings<l.stats.savings);assert.equal(available.hobbyState.automaticLessons.lastPaidAge,20);
});
test('named sports keep exact story names but share generic sport activity and first-competition receipts',()=>{
 const l=adult();l.hobbies=[sport('sp_baseball',5)];l.family.married=false;l.family.children=[];
 const events:any[]=[];hobbyLifeCandidate(l,{random:()=>.5,event:(key,params)=>events.push({key,params})}).run();
 assert.deepEqual(l.hobbyState.lifeStories.activities,['sport']);assert.equal(events[0].key,'event.hobbyLife.activity.sport');assert.equal(events[0].params.hobby,'sp_baseball');
 l.hobbies=[sport('sp_basketball',5)];assert.equal(hobbyLifeOptions(l).some(o=>o.id==='activity'),false);
 hobbyLifeCandidate(l,{random:()=>.99,event:()=>{}}).run();assert.equal(l.hobbyState.lifeStories.contestAge,20);
 assert.equal(hobbyLifeOptions(l).some(o=>o.id==='contest'),false);
 const rendered=translator('en')('event.hobbyLife.friends',{hobby:'sp_baseball'});assert.match(rendered,/Baseball/);assert.doesNotMatch(rendered,/sp_baseball/);
});
test('a blocked sport gets one sideline story, then yields to another hobby and cannot teach or compete',()=>{
 const l=adult();l.age=80;l.hobbies=[sport('sp_football',5),sport('reading',3)];l.family.married=false;
 const events:any[]=[];const c=hobbyLifeCandidate(l,{random:()=>0,event:(key,params)=>events.push({key,params})});c.run();
 assert.equal(events[0].key,'event.hobbyLife.sidelines');assert.equal(l.hobbies[0].progress.sidelinesAge,80);assert.equal(l.stats.happiness,53);assert.equal(l.stats.social,51);
 assert.equal(hobbyLifeOptions(l)[0].hobby,'reading');c.run();assert.equal(events.filter(e=>e.key==='event.hobbyLife.sidelines').length,1);
 l.hobbies.pop();assert.ok(hobbyLifeOptions(l).every(o=>!['teach','spouse','activity','contest'].includes(o.id)));
});
test('named milestones and English controls display the actual sport rather than raw IDs',()=>{
 const l=adult();l.hobbies=[sport('sp_baseball',8)];const keys:string[]=[];hobbyMilestoneCandidate(l,{event:key=>keys.push(key)}).run();const text=translator('en')(keys[0]);assert.match(text,/Baseball/);assert.doesNotMatch(text,/^event\./);
 const html=renderToStaticMarkup(React.createElement(LifeActions,{life:l,t:translator('en'),onChange:()=>{}}));assert.match(html,/Baseball/);assert.doesNotMatch(html,/hobby\.sp_/);
});
test('named saved menu resolves unchanged across import without backfilling its level or discovery history',()=>{
 const l=adult();delete l.hobbyState.offer;l.hobbyState.offer={age:20,options:['sp_baseball','reading','music'],replacement:null};
 const imported=decodeSave(encodeSave(l,[])).life!;assert.deepEqual(imported,l);assert.equal(resolveHobbyChoice(imported,'sp_baseball'),true);assert.equal(imported.hobbies[0].progress!.level,0);assert.equal(imported.hobbies[0].progress!.since,20);
 const unknown=structuredClone(l);unknown.hobbyState.offer.options[0]='sp_unlisted';assert.throws(()=>decodeSave(encodeSave(unknown,[])));
});

test('observed sideline receipts roundtrip in a real eighty-year life and reject invented sport, dates or levels',()=>{
 let l=createNewGame({...DEFAULT_SETTINGS,country:'JPN',gentler:true,dailyThemeDay:'2026-10-26'},41);
 for(let i=0;i<1500&&l.alive&&!(l.age===80&&l.timeline?.complete&&!l.pendingDecision);i++)l=next(l);
 assert.equal(l.age,80);assert.equal(l.alive,true);l.hobbies=[sport('sp_football',5)] as any;
 hobbyLifeCandidate(l,{random:()=>0,event:()=>{}}).run();
 const loaded=decodeSave(encodeSave(l,[])).life!;assert.deepEqual(loaded,l);
 for(const mutate of[(b:any)=>b.hobbies[0].progress.sidelinesAge=79,(b:any)=>b.hobbies[0].progress.sidelinesAge=81,(b:any)=>b.hobbies[0].progress.level=1.9,(b:any)=>b.hobbies[0].id='sp_cycling',(b:any)=>b.hobbies[0].id='sp_unlisted',(b:any)=>b.hobbies[0].progress.sidelined=true]){
  const bad=structuredClone(l);mutate(bad);assert.throws(()=>decodeSave(encodeSave(bad,[])));
 }
 const events:string[]=[];hobbyLifeCandidate(loaded,{random:()=>0,event:key=>events.push(key)}).run();assert.ok(!events.includes('event.hobbyLife.sidelines'));
});

test('natural first hobby decisions save and resolve named sports with identical engine continuation',()=>{
 let found=false;
 for(const seed of[41,123,456,18,24]){
  let l=createNewGame({...DEFAULT_SETTINGS,country:'USA',gentler:true,dailyThemeDay:'2026-10-26'},seed);
  for(let i=0;i<500&&l.alive&&l.age<8;i++){
   const choice=l.pendingDecision?.choices.find(c=>c.id.startsWith('sp_'));
   if(choice){const before=structuredClone(l),loaded=decodeSave(encodeSave(l,[])).life!;const result=makeChoice(l,choice.id);assert.deepEqual(result,makeChoice(loaded,choice.id));assert.deepEqual(l,before);assert.equal(result.hobbies[0].id,choice.id);assert.equal(result.hobbies[0].progress!.since,7);assert.equal(result.hobbies[0].progress!.level,0);assert.deepEqual(decodeSave(encodeSave(result,[])).life,result);found=true;break;}
   l=next(l);
  }
  if(found)break;
 }
 assert.equal(found,true);
});

test('the discovery draw keeps the audited sports-first ordering before general interests',()=>{
 const l=adult();l.country=countries.find(c=>c.id==='USA')!;l.sex='M';assert.deepEqual(drawHobbyChoices(l,()=>0),['sp_basketball','sp_baseball','sp_amfootball']);
});
test('English automatic controls explain why a retained selected sport will not receive lessons',()=>{
 const l=adult();l.age=80;l.hobbies=[sport('sp_football'),sport('music')];l.hobbyState={version:1,lessonHobby:'sp_football',automaticLessons:{since:20,pausedForFunds:false}};
 const html=renderToStaticMarkup(React.createElement(LifeActions,{life:l,t:translator('en'),onChange:()=>{}}));
 assert.match(html,/selected hobby can no longer be actively practised/);assert.match(html,/no lesson payment/);
});

function eighty(){
 let l=createNewGame({...DEFAULT_SETTINGS,country:'JPN',gentler:true,dailyThemeDay:'2026-10-26'},41);
 for(let i=0;i<1500&&l.alive&&!(l.age===80&&l.timeline?.complete&&!l.pendingDecision);i++)l=next(l);
 assert.equal(l.age,80);assert.equal(l.alive,true);l.hobbies=[sport('sp_football',8)] as any;l.stats.happiness=50;l.stats.social=50;return l;
}
test('blocked milestones close without accomplishment rewards and share the one observed sideline receipt',()=>{
 for(const lifeStoryFirst of [false,true]){
  const l=eighty(),events:any[]=[];
  const story=hobbyLifeCandidate(l,{random:()=>0,event:(key,params)=>events.push({key,params})});
  const milestone=hobbyMilestoneCandidate(l,{event:(key,params)=>events.push({key,params})});
  if(lifeStoryFirst)story.run();
  milestone.run();assert.equal(l.hobbies[0].progress!.sidelinesAge,80);assert.equal((l.hobbies[0].progress as any).milestonesSuppressedAge,80);assert.equal(l.hobbies[0].progress!.milestones,undefined);
  assert.equal(l.stats.happiness,lifeStoryFirst?53:50);assert.equal(l.stats.social,lifeStoryFirst?51:50);
  assert.deepEqual(events,[{key:'event.hobbyLife.sidelines',params:{hobby:'sp_football'}}]);assert.equal(milestone.eligible(()=>true),false);milestone.run();assert.equal(events.length,1);
  const restored=decodeSave(encodeSave(l,[])).life!;assert.deepEqual(restored,l);hobbyMilestoneCandidate(restored,{event:()=>assert.fail('no delayed active milestone')}).run();
 }
});
test('import rejects unsupported named legacy meters and engine cannot turn them into paid practice',()=>{
 const l=eighty();l.hobbies=[{id:'sp_football',skill:5,trainedAt:-1}] as any;assert.throws(()=>decodeSave(encodeSave(l,[])));assert.equal(trainHobby(l,'sp_football'),l);
 l.hobbies=[{id:'sport',skill:5,trainedAt:-1}];assert.deepEqual(decodeSave(encodeSave(l,[])).life,l);assert.ok(trainHobby(l,'sport').hobbies[0].skill>5);
});
test('suppressed milestone receipts require blocked sport, observed threshold and an earlier-or-same sideline story',()=>{
 const l=eighty();hobbyMilestoneCandidate(l,{event:()=>{}}).run();
 for(const mutate of[(b:any)=>b.hobbies[0].progress.milestonesSuppressedAge=79,(b:any)=>b.hobbies[0].progress.milestonesSuppressedAge=81,(b:any)=>delete b.hobbies[0].progress.sidelinesAge,(b:any)=>b.hobbies[0].id='sp_cycling',(b:any)=>b.hobbies[0].progress.level=2.9]){
  const bad=structuredClone(l);mutate(bad);assert.throws(()=>decodeSave(encodeSave(bad,[])));
 }
});
