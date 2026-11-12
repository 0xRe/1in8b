import test from 'node:test';import assert from 'node:assert/strict';
import {createNewGame} from '../src/game/new-game';
import {DEFAULT_SETTINGS,advanceYear,makeChoice,addReflection,chooseHobby,trainHobby,hobbyTrainingPrice,requestHobbyChoices} from '../src/game/engine';
import {hobbyDecision,prepareHobbyDecision,annualHobbyCost} from '../src/game/hobby-runtime';
import {hobbyMedianIncome,hobbyTalentMultiplier} from '../src/game/hobby-catalog';
import {decodeSave,encodeSave} from '../src/game/storage';
function next(l:any){const d=l.pendingDecision;return !d?advanceYear(l):d.type==='reflection'?addReflection(l,''):makeChoice(l,d.choices.find((c:any)=>c.id==='intensiveCare'||c.id==='attendFollowup'||c.id==='secondaryGo'||c.id==='upperGo'||c.id==='collegeWork')?.id??d.choices[0].id);}
function observedAt(age:number){let l=createNewGame({...DEFAULT_SETTINGS,country:'JPN',gentler:true,dailyThemeDay:'2026-10-26'},41);for(let i=0;i<350&&!(l.age===age&&l.timeline?.complete&&!l.pendingDecision);i++)l=next(l);assert.equal(l.age,age);return l;}
const adult=()=>observedAt(20);
test('new public lives save a three-activity menu and can receive another offer later without erasing school or reflection decisions',()=>{
 let l=createNewGame({...DEFAULT_SETTINGS,country:'JPN',gentler:true,dailyThemeDay:'2026-10-26'},41);const seen=new Set<string>();
 for(let i=0;i<650&&l.alive&&l.age<=50;i++){
  if(l.pendingDecision){seen.add(l.pendingDecision.id);if(l.pendingDecision.id==='hobby'||/^hobby-/.test(l.pendingDecision.id)){const options=l.pendingDecision.choices.filter(c=>c.id!=='keepHobbies');assert.equal(options.length,3);assert.equal(new Set(options.map(c=>c.id)).size,3);}}
  const snapshot=structuredClone(l),restored=decodeSave(encodeSave(l,[])).life!;assert.deepEqual(restored,l);const advanced=next(l);assert.deepEqual(next(restored),advanced);assert.deepEqual(l,snapshot);l=advanced;
 }
 assert.ok(seen.has('hobby'));assert.ok([...seen].some(id=>/^hobby-(27|50)$/.test(id)),[...seen].join(','));assert.ok(seen.has('reflection-15'));assert.ok([...seen].some(id=>id.startsWith('upperSecondary-')));
});
test('at capacity a new observed hobby replaces the weakest oldest hobby rather than freezing the list',()=>{
 const l=adult();l.hobbies=[{id:'music',skill:99,trainedAt:-1,progress:{since:15,level:1}},{id:'art',skill:1,trainedAt:-1,progress:{since:7,level:1}},{id:'reading',skill:2,trainedAt:-1,progress:{since:10,level:4}}];
 const before=structuredClone(l),out=chooseHobby(l,'craft');assert.notEqual(out,l);assert.deepEqual(out.hobbies.map(h=>h.id),['craft','music','reading']);assert.deepEqual(out.hobbies[0].progress,{since:20,level:0});assert.equal(out.academics!.upperFacts!.hobbies.find(h=>h.id==='crafts')?.since,20);assert.deepEqual(l,before);
});
test('saved replacement disclosure and decline preserve hobbies and reject replaying the same offer',()=>{
 const l=adult();l.hobbies=[{id:'music',skill:99,trainedAt:-1,progress:{since:15,level:1}},{id:'art',skill:1,trainedAt:-1,progress:{since:7,level:1}},{id:'reading',skill:2,trainedAt:-1,progress:{since:10,level:4}}];
 const offered=prepareHobbyDecision(l,()=>.7,true)!;assert.equal(offered.params.replace,'art');l.pendingDecision=offered;
 assert.deepEqual(hobbyDecision(l),offered);const before=structuredClone(l.hobbies),done=makeChoice(l,'keepHobbies');assert.deepEqual(done.hobbies,before);assert.equal(done.hobbyState!.declinedAge,20);assert.equal(hobbyDecision(done),null);assert.equal(makeChoice(done,'keepHobbies'),done);
});
test('lessons increase the actual source level and admission facts once across all hobbies in one year',()=>{
 const l=adult();l.hobbies=[{id:'art',skill:99,trainedAt:-1,progress:{since:7,level:10}},{id:'music',skill:5,trainedAt:-1,progress:{since:7,level:0}}];l.stats.savings=1e6;
 const price=hobbyTrainingPrice(l,'art');assert.ok(Math.abs(price-hobbyMedianIncome(l)*.05)<.011);
 const before=structuredClone(l),out=trainHobby(l,'art');assert.ok(Math.abs(out.hobbies[0].progress!.level-(10+hobbyTalentMultiplier(l,'art')))<1e-9);assert.equal(out.academics!.upperFacts!.hobbies.find(h=>h.id==='art')?.level,out.hobbies[0].progress!.level);assert.equal(trainHobby(out,'music'),out);assert.deepEqual(l,before);
});
test('a paid search queues a saved future offer and cannot be charged again while waiting',()=>{
 const l=adult();l.stats.savings=1e6;const before=structuredClone(l),out=requestHobbyChoices(l);assert.ok(out.hobbyState?.queuedAge===21||out.pendingDecision||out.timeline?.scheduledDecisions?.some(d=>/^hobby/.test(d.id)));assert.ok(out.stats.savings<l.stats.savings);assert.equal(requestHobbyChoices(out),out);assert.deepEqual(l,before);assert.deepEqual(decodeSave(encodeSave(out,[])).life,out);
});
test('actual hobbies add their own recurring leisure cost, without converting the old display meter',()=>{
 const l=adult();l.hobbies=[{id:'art',skill:100,trainedAt:-1,progress:{since:7,level:0}},{id:'travel',skill:1,trainedAt:-1,progress:{since:16,level:2}}];l.stats.annualIncome=10000;
 assert.ok(Math.abs(annualHobbyCost(l)-.07*.6*Math.max(10000,hobbyMedianIncome(l)*.3))<1e-9);
 const old=structuredClone(l);delete old.academics;assert.equal(annualHobbyCost(old),0);
});

test('completed hobby benefits use the actual definition once, and partial years cannot grant them',async()=>{
 const {settleEducationHobbies}=await import('../src/game/education-context-lifecycle');const l=adult();
 l.hobbies=[{id:'art',skill:100,trainedAt:-1,progress:{since:7,level:2,lastSettledAge:19}}];l.stats.happiness=50;l.stats.health=50;l.stats.social=50;
 const partial=structuredClone(l);partial.timeline!.complete=false;settleEducationHobbies(partial,{hobby:.25,study:.75});assert.equal(partial.stats.happiness,50);assert.equal(partial.hobbies[0].progress!.level,2);
 settleEducationHobbies(l,{hobby:.25,study:.75});assert.equal(l.stats.happiness,51.05);assert.equal(l.stats.health,50);assert.equal(l.stats.social,50.3);assert.ok(Math.abs(l.hobbies[0].progress!.level-(2+.65*hobbyTalentMultiplier(l,'art')))<1e-9);
 const once=structuredClone(l);settleEducationHobbies(l,{hobby:1});assert.deepEqual(l,once);
});
test('forged saved hobby choice labels or payloads cannot change an advertised menu',()=>{
 let l=createNewGame({...DEFAULT_SETTINGS,country:'JPN',gentler:true,dailyThemeDay:'2026-10-26'},41);for(let i=0;i<100&&l.pendingDecision?.id!=='hobby';i++)l=next(l);
 assert.ok(l.hobbyState?.offer);assert.deepEqual(decodeSave(encodeSave(l,[])).life,l);
 for(const change of [(bad:any)=>bad.pendingDecision.choices[0].key='choice.'+bad.pendingDecision.choices[0].id,(bad:any)=>bad.pendingDecision.choices[0].params={amount:999},(bad:any)=>bad.hobbyState.offer.options[0]='not-a-hobby']){const bad=structuredClone(l);change(bad);assert.throws(()=>decodeSave(encodeSave(bad,[])));}
});

test('a queued next-year search is actually delivered after reload instead of being a permanent pending flag',()=>{
 let l=adult();l.stats.savings=1e6;l=requestHobbyChoices(l);assert.equal(l.hobbyState?.queuedAge,21);
 let delivered=false;
 for(let i=0;i<70&&l.alive&&l.age<=22;i++){
  l=decodeSave(encodeSave(l,[])).life!;
  if(l.pendingDecision?.id==='hobby-21'){delivered=true;break;}
  l=next(l);
 }
 assert.ok(delivered);assert.equal(l.hobbyState?.queuedAge,undefined);assert.equal(l.pendingDecision!.choices.filter(c=>c.id!=='keepHobbies').length,3);
});

test('lessons before a scheduled offer update the actual replacement before it is shown',()=>{
 let l=observedAt(26);l.stats.savings=1e6;l.hobbies=[{id:'art',skill:20,trainedAt:-1,progress:{since:7,level:1,lastSettledAge:26}},{id:'music',skill:20,trainedAt:-1,progress:{since:10,level:1.5,lastSettledAge:26}},{id:'reading',skill:20,trainedAt:-1,progress:{since:12,level:3,lastSettledAge:26}}];
 for(let i=0;i<80&&l.age<27;i++)l=l.pendingDecision?next(l):advanceYear(l,.001);
 assert.equal(l.age,27);assert.equal(l.timeline?.scheduledDecisions?.find(d=>d.id==='hobby-27')?.params.replace,'art');
 l=trainHobby(l,'art');assert.ok(l.hobbies.find(h=>h.id==='art')!.progress!.level>1.5);l=decodeSave(encodeSave(l,[])).life!;
 for(let i=0;i<20&&l.pendingDecision?.id!=='hobby-27';i++)l=next(l);
 assert.equal(l.pendingDecision?.id,'hobby-27');assert.equal(l.pendingDecision.params.replace,'music');
 const selected=l.pendingDecision.choices.find(c=>c.id!=='keepHobbies')!.id;const done=makeChoice(l,selected);assert.ok(done.hobbies.some(h=>h.id==='art'));assert.ok(!done.hobbies.some(h=>h.id==='music'));assert.ok(done.hobbies.some(h=>h.id===selected));assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);
});
test('inaccessible forged first-offer choices are rejected before they can trap an empty-hobby life',()=>{
 let l=createNewGame({...DEFAULT_SETTINGS,country:'JPN',gentler:true,dailyThemeDay:'2026-10-26'},41);for(let i=0;i<100&&l.pendingDecision?.id!=='hobby';i++)l=next(l);
 l.hobbyState!.offer!.options=['travel','gym','photo'];l.pendingDecision=hobbyDecision(l);assert.throws(()=>decodeSave(encodeSave(l,[])));
});
test('a valid imported catch-up offer at eight or nine stays saveable after it is answered',()=>{
 for(const age of [8,9]){
  const l=observedAt(age);l.hobbies=[];l.decisions=l.decisions.filter(id=>id!=='hobby');delete l.hobbyState;
  assert.deepEqual(decodeSave(encodeSave(l,[])).life,l);
  l.pendingDecision=prepareHobbyDecision(l,()=>.1);assert.equal(l.pendingDecision?.id,`hobby-${age}`);
  const offered=decodeSave(encodeSave(l,[])).life!,done=makeChoice(offered,offered.pendingDecision!.choices[0].id);
  assert.ok(done.decisions.includes(`hobby-${age}`));assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);
 }
});
test('an older hobby without observed progress still trains and grows within a birth-origin save',()=>{
 let l=adult();l.hobbies=[{id:'art',skill:20,trainedAt:-1}];l.stats.savings=1e6;l.stats.netAssets=l.stats.savings+l.stats.investments+l.belongings.housingValue-l.stats.debt;assert.deepEqual(decodeSave(encodeSave(l,[])).life,l);
 const trained=trainHobby(l,'art');assert.ok(trained.hobbies[0].skill>20);assert.equal(trained.hobbies[0].progress,undefined);assert.equal(trainHobby(trained,'art'),trained);
 for(let i=0;i<100&&!(l.age===21&&l.timeline?.complete&&!l.pendingDecision);i++)l=next(l);
 assert.equal(l.age,21);assert.ok(l.hobbies[0].skill>20);assert.equal(l.hobbies[0].progress,undefined);assert.deepEqual(decodeSave(encodeSave(l,[])).life,l);
});
