import {selectNewFocus,newFocusOptions} from '../src/game/school-focus';
import {settleEducationHobbies} from '../src/game/education-context-lifecycle';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,DEFAULT_SETTINGS,advanceYear,makeChoice,addReflection,chooseHobby} from '../src/game/engine';
import {createNewGame as createNewLife} from '../src/game/new-game';
import {refreshEducationContext} from '../src/game/education-context-lifecycle';
import {decodeSave,encodeSave} from '../src/game/storage';

test('production new-life factory initializes earned-qualification state once and preserves base identity',()=>{
 const settings={...DEFAULT_SETTINGS,country:'JPN',dailyThemeDay:'2026-10-26'},legacy=createLife(settings,41),fresh=createNewLife(settings,41);
 assert.equal(fresh.id,legacy.id);assert.equal(fresh.rng,legacy.rng);
 assert.equal(fresh.academics?.origin,'birth');
 assert.equal(fresh.academics?.qualification,0);assert.equal(fresh.academics?.enrollment,null);
 assert.ok(fresh.learning);assert.ok(fresh.stageFocus);assert.ok(fresh.academics?.primaryFacts);assert.ok(fresh.academics?.upperFacts);assert.ok(fresh.academics?.collegeFacts);
 assert.deepEqual(decodeSave(encodeSave(fresh,[])).life,fresh);
 assert.equal(decodeSave(encodeSave(legacy,[])).life!.academics,undefined);
 const before=structuredClone(fresh);refreshEducationContext(fresh);assert.deepEqual(fresh,before);
});
test('new focus selection rejects unavailable actions without mutating fresh or legacy lives',()=>{
 const life=createNewLife({...DEFAULT_SETTINGS,country:'USA'},1),before=structuredClone(life);
 assert.equal(selectNewFocus(life,'work'),life);assert.deepEqual(life,before);
 const old=createLife(DEFAULT_SETTINGS,1),legacy=structuredClone(old);
 assert.equal(selectNewFocus(old,'study'),old);assert.deepEqual(old,legacy);
});

test('ordinary public actions reach primary with the real study focus and never award entry as graduation',()=>{
 let life=createNewLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true},41);
 for(let n=0;n<100&&life.age<6;n++)life=step(life);
 assert.equal(life.age,6);assert.equal(life.academics!.enrollment?.stage,'primary');assert.equal(life.academics!.qualification,0);
 assert.equal(life.stageFocus!.selection.current,'study');
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
});
function step(life:ReturnType<typeof createNewLife>){
 if(!life.pendingDecision)return advanceYear(life);
 if(life.pendingDecision.type==='reflection')return addReflection(life,'');
 const ids=life.pendingDecision.choices.map(c=>c.id),preferred=['intensiveCare','attendFollowup','secondaryGo','upperGo','collegeApply','academicGraduate','academicPhdAccept','schoolStay','returnSchool','offer0','childfree','independent','refuseRisk'];
 return makeChoice(life,preferred.find(id=>ids.includes(id))??ids[0]);
}

test('production-factory cohort reaches real graduation, college and postgraduate choices without injected academics',()=>{
 const reached=new Set<string>();
 for(const country of ['JPN','USA','UGA','DEU'])for(const seed of [1,4,41,207]){
  let life=createNewLife({...DEFAULT_SETTINGS,country,gentler:true},seed);
  for(let n=0;n<500&&life.alive&&life.age<32;n++){
   if(life.academics?.lastGraduation)reached.add(life.academics.lastGraduation.stage);
   const d=life.pendingDecision?.id;if(d?.startsWith('college-'))reached.add('college-choice');if(d?.startsWith('academicAfterUniversity-'))reached.add('postgraduate-choice');
   if(life.age===6)assert.equal(life.academics!.qualification,0);
   const restored=decodeSave(encodeSave(life,[])).life!;assert.deepEqual(restored,life);life=step(restored);
  }
 }
 for(const stage of ['primary','lowerSecondary','upperSecondary','university','college-choice','postgraduate-choice'])assert.ok(reached.has(stage),stage+' must be naturally reachable');
});

test('source-calibrated intellectual learning talent remains saveable without relaxing other talent bounds',()=>{
 const life=createNewLife({...DEFAULT_SETTINGS,country:'UGA'},1);
 assert.ok(life.birthDevelopment?.developmental?.intellectualDisability);
 assert.ok(life.learning!.talents.study < -4.53);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 const bad=structuredClone(life);bad.learning!.talents.body=-5;assert.throws(()=>encodeSave(bad,[]));
});

test('an observed childhood art hobby earns source-scale skill and can open the specialist school choice',()=>{
 let life=createNewLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true},41);
 for(let n=0;n<180&&life.alive&&life.age<15;n++){
  if(life.pendingDecision?.id==='hobby')life=makeChoice(life,'art');
  else life=step(life);
  if(life.age>=7&&!life.pendingDecision)life=selectNewFocus(life,'hobby');
 }
 assert.equal(life.age,15);
 const hobby=life.academics!.upperFacts!.hobbies.find(h=>h.id==='art');
 assert.equal(hobby?.since,7);assert.ok(hobby!.level>=2);
 assert.ok(life.academics!.upperSecondary!.choices!.includes('arts'));
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 const prior=structuredClone(life);settleEducationHobbies(life,{});assert.deepEqual(life,prior,'a repeated completed year cannot grow the hobby twice');
});

test('choosing work after graduation immediately replaces student focus options',()=>{
 let ready:ReturnType<typeof createNewLife>|undefined;
 for(let seed=1;seed<=24&&!ready;seed++){
  let life=createNewLife({...DEFAULT_SETTINGS,country:'DEU',gentler:true},seed);
  for(let n=0;n<180&&life.alive&&life.age<24;n++){
   if(life.pendingDecision?.id.startsWith('college-')){ready=life;break;}
   life=step(life);
  }
 }
 assert.ok(ready,'a real new game must reach a college/work choice');
 const work=makeChoice(ready,'collegeWork');
 assert.ok(!newFocusOptions(work).includes('study'));
 assert.ok(newFocusOptions(work).includes('learn'));
});

test('craft uses its actual first observation and opens the same arts-school pathway as the source hobby',()=>{
 let life=createNewLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true},41);
 for(let n=0;n<180&&life.alive&&life.age<15;n++){
  life=step(life);
  if(life.age>=7&&!life.pendingDecision){
   life=chooseHobby(life,'craft');life=selectNewFocus(life,'hobby');
  }
 }
 assert.equal(life.academics!.upperFacts!.hobbies.find(h=>h.id==='crafts')?.since,7);
 assert.ok(life.academics!.upperSecondary!.choices?.includes('arts'));
});

test('starting a hobby after a completed year records its real age before saving or advancing',()=>{
 let life=createNewLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true},41);
 for(let n=0;n<150&&!(life.age===8&&life.timeline?.complete&&!life.pendingDecision);n++)life=step(life);
 assert.equal(life.age,8);assert.ok(life.timeline?.complete);
 const before=structuredClone(life),added=chooseHobby(life,'craft');
 assert.equal(added.academics!.upperFacts!.hobbies.find(h=>h.id==='crafts')?.since,8);
 assert.deepEqual(life,before);assert.deepEqual(decodeSave(encodeSave(added,[])).life,added);
});

test('new primary focus accrues in the first school year before settlement',()=>{
 let life=createNewLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true,dailyThemeDay:'2026-10-26'},41);
 for(let n=0;n<100&&!(life.age===6&&life.timeline?.complete);n++)life=step(life);
 assert.equal(life.age,6);assert.ok(life.timeline?.complete);
 assert.deepEqual(life.timeline.stageFocusTime,{study:1});
});

test('a real hobby interruption credits only elapsed time before a focus switch and reload',()=>{
 let life=createNewLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true,dailyThemeDay:'2026-10-26'},41);
 for(let n=0;n<100&&life.pendingDecision?.id!=='hobby';n++)life=step(life);
 assert.equal(life.pendingDecision?.id,'hobby');
 const position=life.timeline!.position,before=structuredClone(life);
 assert.ok(position>0&&position<1);
 assert.deepEqual(life.timeline!.stageFocusTime,{study:position});
 assert.deepEqual(life.timeline!.focusTime,{knowledge:position});
 const chosen=selectNewFocus(makeChoice(life,'art'),'hobby');
 const restored=decodeSave(encodeSave(chosen,[])).life!;
 const completed=advanceYear(restored);
 assert.equal(completed.timeline!.complete,true);
 assert.deepEqual(completed.timeline!.stageFocusTime,{study:position,hobby:1-position});
 assert.deepEqual(completed.history.at(-1)!.annual!.stageFocusWeights,{study:position,hobby:1-position});
 assert.deepEqual(advanceYear(chosen),completed);
 assert.deepEqual(decodeSave(encodeSave(completed,[])).life,completed);
 assert.deepEqual(life,before);
});
