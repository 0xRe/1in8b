import {addChildProgress} from '../src/game/descendants';
import assert from 'node:assert/strict';
import test from 'node:test';
import * as game from '../src/game/engine';
import { decodeSave, encodeSave } from '../src/game/storage';
import type { Life } from '../src/game/types';

function adult(): Life {
  let life=game.createLife({...game.DEFAULT_SETTINGS,country:'JPN',gentler:true,autoChoices:true,dailyThemeDay:'2026-10-20'},124);
  for(let step=0;step<200&&life.alive&&life.age<45;step++)life=game.advanceYear(life);
  assert.equal(life.age,45);
  life.settings.autoChoices=false;life.settings.gentler=false;life.pendingDecision=null;
  life.relationship.childPlan='childfree';life.opportunities.lastRiskAge=45;life.opportunities.lastDebtAge=45;
  life.opportunities.nextNightSchoolAge=100;life.opportunities.nextRelationshipAge=100;
  life.stats.debt=0;life.stats.savings=100000;life.stats.investments=0;life.stats.health=5;
  life.stats.netAssets=life.stats.savings+life.belongings.housingValue;
  return life;
}
function icu(): Life {
  const base=adult();
  for(let rng=0;rng<1000;rng++){
    const next=game.advanceYear({...base,rng});
    if(next.pendingDecision?.key==='decision.healthIcu')return next;
  }
  assert.fail('A severely unwell adult must have a reachable seeded ICU decision.');
}

test('birth saves carry serializable health history and legacy saves migrate without consuming RNG',()=>{
  const birth=game.createLife({...game.DEFAULT_SETTINGS,country:'JPN'},124);
  assert.ok(birth.healthcare,'health history missing');
  const save=JSON.parse(encodeSave(birth,[]));save.life.mechanicsVersion=4;delete save.life.healthcare;
  const restored=decodeSave(JSON.stringify(save)).life!;
  assert.equal(restored.rng,birth.rng);assert.equal(restored.name,birth.name);
  assert.equal(restored.healthcare.lastCheckedAge,-1); // Older saves have not had the new birth screen.
  assert.equal(birth.healthcare.lastCheckedAge,0);
  assert.deepEqual(restored.healthcare.episodes,[]);
  assert.deepEqual(game.advanceYear(restored),game.advanceYear(decodeSave(encodeSave(restored,[])).life!));
});

test('reachable ICU pauses time, resumes exactly from save, and treatment changes health and bills',()=>{
  const life=icu();
  assert.deepEqual(game.advanceYear(life),life);
  assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
  const treated=game.makeChoice(life,'intensiveCare');
  assert.deepEqual(game.makeChoice(decodeSave(encodeSave(life,[])).life!,'intensiveCare'),treated);
  assert.equal(treated.pendingDecision,null);assert.equal(treated.healthcare.activeEpisodeId,null);
  assert.ok(treated.healthcare.totalOutOfPocket>0);
  assert.notEqual(treated.stats.savings,life.stats.savings);
  assert.deepEqual(game.makeChoice(treated,'intensiveCare'),treated);
  assert.deepEqual(decodeSave(encodeSave(treated,[])).life,treated);
});

test('coverage reduces the same critical-care bill and recovery never rolls annual mortality twice',()=>{
  const life=icu();
  const full=structuredClone(life);full.lifestyle.insurance='full';
  const basicResult=game.makeChoice(life,'intensiveCare'),fullResult=game.makeChoice(full,'intensiveCare');
  assert.ok(fullResult.healthcare.totalOutOfPocket<basicResult.healthcare.totalOutOfPocket);
  let recovered:Life|undefined;
  for(let rng=0;rng<100;rng++){const candidate=game.makeChoice({...life,rng},'intensiveCare');if(candidate.alive){recovered=candidate;break;}}
  assert.ok(recovered);assert.equal(recovered.healthcare.lastCheckedAge,recovered.age);
  recovered.settings.autoChoices=true;
  const age=recovered.age;
  for(let i=0;i<12&&recovered.age===age;i++)recovered=game.advanceYear(recovered);
  assert.equal(recovered.age,age+1);assert.equal(recovered.alive,true);
});

test('critical care can recover or end a life and terminal decisions cannot be replayed',()=>{
  const life=icu();let saved:Life|undefined,dead:Life|undefined;
  for(let rng=0;rng<5000&&(!saved||!dead);rng++){
    const recovered=game.makeChoice({...life,rng},'intensiveCare');
    const unsupported=game.makeChoice({...life,rng},'supportiveCare');
    if(recovered.alive&&!unsupported.alive){saved=recovered;dead=unsupported;}
  }
  assert.ok(saved&&dead,'Treatments must have different actual survival consequences.');
  assert.equal(dead.events.filter(event=>event.key==='event.death').length,1);
  assert.equal(dead.healthcare.episodes.at(-1)?.status,'deceased');
  assert.deepEqual(game.advanceYear(dead),dead);assert.deepEqual(decodeSave(encodeSave(dead,[])).life,dead);
});

test('premature birth care is reachable, automatically resolvable, and includes family child hospitalization',()=>{
  let neonatal:Life|undefined;
  for(let seed=0;seed<1000&&!neonatal;seed++){
    const life=game.createLife({...game.DEFAULT_SETTINGS,country:'JPN'},seed);
    if(life.pendingDecision?.key==='decision.healthNeonatal')neonatal=life;
  }
  assert.ok(neonatal,'Own birth can need neonatal care.');
  assert.equal(neonatal.age,0);assert.deepEqual(decodeSave(encodeSave(neonatal,[])).life,neonatal);
  const auto=game.createLife({...neonatal.settings,autoChoices:true},neonatal.seed);
  assert.equal(auto.pendingDecision,null);assert.ok(auto.healthcare.episodes.length);
  const base=adult();base.stats.health=95;base.settings.gentler=true;
  base.family.children=[];base.care.handledChildren=[];base.relationship.childPlan='open';
  base.family.partner={id:'partner-test',name:'Alex',sex:'F',country:'JPN',age:45,birthYear:base.birthYear,alive:true,deathAge:null,job:'service'};
  base.family.married=true;base.family.marriageAge=30;base.relationship.status='married';
  let childHospital:Life|undefined;
  for(let rng=0;rng<500&&!childHospital;rng++){
    const offered=game.requestActivity({...base,rng},'familyPlanning');
    const next=game.makeChoice(offered,'haveChild');
    if(next.pendingDecision?.key==='decision.healthNeonatal')childHospital=next;
  }
  assert.ok(childHospital,'A child can need neonatal care.');
  assert.equal(childHospital.healthcare.episodes.at(-1)?.patientId,childHospital.family.children[0].id);
  assert.deepEqual(decodeSave(encodeSave(childHospital,[])).life,childHospital);
});

test('health imports reject contradictory episodes, orphan decisions and unsupported costs',()=>{
  const life=icu();const save=JSON.parse(encodeSave(life,[]));
  for(const alter of [
    (s:any)=>s.life.healthcare.episodes[0].cost=-1,
    (s:any)=>s.life.healthcare.activeEpisodeId='missing',
    (s:any)=>s.life.healthcare.episodes.at(-1).patientId='missing-child',
    (s:any)=>s.life.healthcare.episodes.at(-1).untreatedRisk=2,
    (s:any)=>s.life.healthcare.lastCheckedAge=s.life.age+1,
    (s:any)=>s.life.pendingDecision=null,
    (s:any)=>s.life.healthcare.episodes.at(-1).status='recovered',
  ]){const bad=structuredClone(save);alter(bad);assert.throws(()=>decodeSave(JSON.stringify(bad)));}
});

function partnerAndChild(life:Life, childAge:number):Life {
  life.family.partner={id:'partner-test',name:'Alex',sex:'F',country:'JPN',age:45,birthYear:life.birthYear,alive:true,deathAge:null,job:'service'};
  life.family.married=true;life.family.marriageAge=30;life.relationship.status='married';
  life.family.children=[{id:'child-test',name:'Robin',sex:'M',country:'JPN',age:childAge,birthYear:life.year-childAge,alive:true,deathAge:null,job:'none'}];
  life.descendants.children=[];addChildProgress(life,life.family.children[0]);
  life.care.handledChildren=[];life.care.who=null;life.care.until=null;
  return life;
}

test('a migrated family is billed using the patient country rather than the player destination',()=>{
  const life=icu();const episode=life.healthcare.episodes.at(-1)!;
  const original=game.treatmentCost(life,episode,'intensiveCare');
  const abroad=structuredClone(life);abroad.country={...life.country,ppp:life.country.ppp*10,oop:90};
  assert.equal(game.treatmentCost(abroad,episode,'intensiveCare'),original);
});

test('chronic follow-up controls future health loss and postponement brings the next review forward',()=>{
  const base=adult();base.healthcare.lastCheckedAge=base.age;
  base.healthcare.chronic=[{id:'condition-0',diagnosis:'longTerm',diagnosedAge:40,managed:false,nextReviewAge:45}];base.conditions=['chronic'];
  const offered=game.advanceYear(base);
  assert.equal(offered.pendingDecision?.key,'decision.healthFollowup');
  assert.deepEqual(decodeSave(encodeSave(offered,[])).life,offered);
  const attended=game.makeChoice(offered,'attendFollowup'),skipped=game.makeChoice(offered,'skipFollowup');
  assert.equal(attended.healthcare.chronic[0].managed,true);assert.equal(skipped.healthcare.chronic[0].managed,false);
  assert.equal(attended.healthcare.chronic[0].nextReviewAge,48);assert.equal(skipped.healthcare.chronic[0].nextReviewAge,46);
  assert.ok(attended.stats.health>skipped.stats.health);
  assert.ok(attended.stats.savings<skipped.stats.savings);
  const attendedNext=game.advanceYear(attended),skippedNext=game.advanceYear(skipped);
  assert.ok(attendedNext.stats.health>skippedNext.stats.health);
  assert.deepEqual(decodeSave(encodeSave(attendedNext,[])).life,attendedNext);
});

test('older children can be hospitalized and recovery never kills the parent or double-checks the child',()=>{
  const base=partnerAndChild(adult(),7);base.stats.health=95;base.healthcare.lastCheckedAge=45;
  let hospital:Life|undefined;
  for(let rng=0;rng<1000&&!hospital;rng++){
    const next=game.advanceYear({...base,rng});
    if(next.pendingDecision?.key==='decision.healthHospital')hospital=next;
  }
  assert.ok(hospital);assert.equal(hospital.healthcare.episodes.at(-1)?.patientId,'child-test');
  assert.deepEqual(decodeSave(encodeSave(hospital,[])).life,hospital);
  let recovered:Life|undefined;
  for(let rng=0;rng<100&&!recovered;rng++){
    const next=game.makeChoice({...hospital,rng},'intensiveCare');
    if(next.family.children[0].alive)recovered=next;
  }
  assert.ok(recovered);assert.equal(recovered.alive,true);
  const next=game.advanceYear(recovered);
  assert.equal(next.family.children[0].alive,true);assert.equal(next.family.children[0].age,8);
  assert.equal(next.healthcare.episodes.at(-1)?.status,'recovered');
  assert.deepEqual(decodeSave(encodeSave(next,[])).life,next);
});

test('gentler and classroom modes reduce early-life critical risk',()=>{
  const base=adult();
  for(let rng=0;rng<1000;rng++){
    const ordinary=game.advanceYear({...base,rng});
    if(ordinary.pendingDecision?.key!=='decision.healthIcu')continue;
    for(const mode of ['gentler','classroom'] as const){
      const gentle=game.advanceYear({...base,rng,settings:{...base.settings,[mode]:true}});
      assert.equal(gentle.pendingDecision?.key,'decision.healthIcu');
      assert.ok(gentle.healthcare.episodes.at(-1)!.untreatedRisk<ordinary.healthcare.episodes.at(-1)!.untreatedRisk);
    }
    return;
  }
  assert.fail('Expected an ICU scenario.');
});

test('a second solo migration keeps the family actual country',()=>{
  let base=partnerAndChild(adult(),7);base.stats.health=95;
  base.migration.familyCountry='JPN';base.migration.lastMoveAge=35;
  base.migration.moves=[{age:35,country:base.country.id,together:false}];
  base.care.who=null;base.care.until=null;base.training.kind=null;base.training.endsAt=null;base.schooling.enrolled=false;
  const offered=game.requestActivity(base,'migration');assert.ok(offered.migration.offerCountry);
  const moved=game.makeChoice(offered,'migrateAlone');
  const offeredAgain=structuredClone(moved);
  offeredAgain.pendingDecision={id:`activity-migration-${moved.age+5}`,age:moved.age+5,type:'choice',key:'decision.migration',params:{},choices:['migrateTogether','migrateAlone','stay'].map(id=>({id,key:`choice.${id}`,params:{}}))};
  offeredAgain.age+=5;offeredAgain.year+=5;offeredAgain.migration.offerCountry=base.country;
  const movedAgain=game.makeChoice(offeredAgain,'migrateAlone');
  assert.equal(movedAgain.migration.familyCountry,'JPN');assert.equal(movedAgain.family.children[0].country,'JPN');
});

test('sensitive modes finish with peaceful wording when care cannot save a patient',()=>{
  const life=icu();
  for(const mode of ['gentler','classroom'] as const){
    let ending:Life|undefined;
    for(let rng=0;rng<5000&&!ending;rng++){
      const next=game.makeChoice({...life,rng,settings:{...life.settings,[mode]:true}},'supportiveCare');
      if(!next.alive)ending=next;
    }
    assert.ok(ending);assert.equal(ending.cause,'cause.peaceful');
  }
});

test('child care saves cannot omit the consumed annual health check',()=>{
  const base=partnerAndChild(adult(),7);base.healthcare.lastCheckedAge=45;
  let hospital:Life|undefined;
  for(let rng=0;rng<1000&&!hospital;rng++){
    const next=game.advanceYear({...base,rng});
    if(next.pendingDecision?.key==='decision.healthHospital')hospital=next;
  }
  assert.ok(hospital);
  const bad=JSON.parse(encodeSave(hospital,[]));bad.life.healthcare.childChecks=[];
  assert.throws(()=>decodeSave(JSON.stringify(bad)));
});

test('an ordinary seeded life reaches adult ICU without injected state',()=>{
  for(let seed=1;seed<=32;seed++){
  let life=game.createLife({...game.DEFAULT_SETTINGS,country:'JPN',dailyThemeDay:'2026-10-20'},seed);
  for(let step=0;step<400&&life.alive;step++){
    if(life.age>=18&&life.pendingDecision?.key==='decision.healthIcu'){
      assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);return;
    }
    // Preserve this ICU scenario's six-child household through player choices.
    const choice = life.pendingDecision?.key === 'decision.children' && life.family.children.length >= 6 ? 'childfree' : life.pendingDecision?.choices[0].id;
    life=life.pendingDecision?life.pendingDecision.type==='reflection'?game.addReflection(life,''):game.makeChoice(life,choice!):game.advanceYear(life);
  }
  }
  assert.fail('No normal life in the bounded seed cohort reached adult ICU.');
});

test('an imported health episode cannot claim neonatal care at an adult age',()=>{
  const life=icu();const save=JSON.parse(encodeSave(life,[]));const episode=save.life.healthcare.episodes.at(-1);
  episode.level='neonatal';episode.diagnosis='premature';episode.patientAge=0;
  save.life.pendingDecision.key='decision.healthNeonatal';
  // Keep the estimate consistent so this tests chronology rather than quote validation.
  for(const choice of save.life.pendingDecision.choices)choice.params.amount=game.treatmentCost(save.life,episode,choice.id);
  assert.throws(()=>decodeSave(JSON.stringify(save)));
});

test('negative newborn screening consumes the infant mortality checkpoint exactly once',()=>{
  const birth=game.createLife({...game.DEFAULT_SETTINGS,country:'JPN',dailyThemeDay:'2026-10-20'},3);
  assert.equal(birth.pendingDecision,null);
  assert.equal(birth.healthcare.lastCheckedAge,0);
  const next=game.advanceYear(decodeSave(encodeSave(birth,[])).life!);
  assert.equal(next.age,1);assert.equal(next.alive,true);
  assert.equal(next.healthcare.episodes.filter(episode=>episode.patientAge===0).length,0);
});

test('a newborn child with a negative screen cannot receive another infant mortality draw',()=>{
  const base=partnerAndChild(adult(),7);base.family.children=[];base.descendants.children=[];base.relationship.childPlan='open';
  for(let rng=0;rng<100;rng++){
    const birth=game.makeChoice(game.requestActivity({...base,rng},'familyPlanning'),'haveChild');
    if(birth.pendingDecision)continue;
    const child=birth.family.children.at(-1)!;
    assert.ok(child);
    assert.ok(birth.healthcare.childChecks.some(check=>check.id===child.id&&check.age===birth.age));
    assert.deepEqual(decodeSave(encodeSave(birth,[])).life,birth);
    birth.healthcare.lastCheckedAge=birth.age;
    const next=game.advanceYear(birth);
    assert.equal(next.age,birth.age+1);assert.equal(next.family.children.at(-1)?.age,1);
    assert.equal(next.family.children.at(-1)?.alive,true);
    return;
  }
  assert.fail('Expected a newborn without a care episode.');
});

test('completed treatment retains a non-resettable mortality checkpoint on import',()=>{
  const birth=game.createLife({...game.DEFAULT_SETTINGS,country:'JPN'},21);
  assert.equal(birth.pendingDecision?.key,'decision.healthNeonatal');
  const treated=game.makeChoice(birth,'intensiveCare');
  assert.equal(treated.healthcare.episodes[0].status,'recovering');
  const bad=JSON.parse(encodeSave(treated,[]));bad.life.healthcare.lastCheckedAge=-1;
  assert.throws(()=>decodeSave(JSON.stringify(bad)));
});

test('completed child treatment retains its consumed checkpoint on import',()=>{
  const base=partnerAndChild(adult(),7);base.healthcare.lastCheckedAge=45;
  for(let rng=0;rng<1000;rng++){
    const hospital=game.advanceYear({...base,rng});
    if(hospital.pendingDecision?.key!=='decision.healthHospital')continue;
    const treated=game.makeChoice(hospital,'intensiveCare');
    const bad=JSON.parse(encodeSave(treated,[]));bad.life.healthcare.childChecks=[];
    assert.throws(()=>decodeSave(JSON.stringify(bad)));return;
  }
  assert.fail('Expected child hospitalization.');
});
