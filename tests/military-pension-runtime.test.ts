import test from 'node:test';import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {advanceYear,createLife,DEFAULT_SETTINGS} from '../src/game/engine';
import {encodeSave,decodeSave} from '../src/game/storage';
import {settleOfficerRuntime,officerHealthExitProbability,settleOfficerRecovery} from '../src/game/officer-runtime';
import {officerAnnualIncome,officerAgeIncomeFactor} from '../src/game/officer-pay';
import {payEraCountry} from '../src/game/pay-era';
const base=[...naturalFamily(1)].find(l=>l.age>=45&&!l.pendingDecision&&l.timeline?.complete)!;
function fixture(){
 const l=structuredClone(base);l.stats.job='soldier';l.stats.employment='employed';l.stats.annualIncome=123;
 l.care.who=null;l.training.kind=null;l.justice.prisonUntil=null;
 Object.assign(l.timeline!,{complete:false,position:.99,queue:[],financePending:true,focusPending:false});
 l.academics={version:1,qualification:4,doctorate:false,medicine:false,studyCountry:'USA',enrollment:null,college:{age:18,country:'USA',kind:'ordinary',status:'enrolled',closureYear:null,choices:['apply','work','army','navy','air'],academyOffer:'threeBranches'},academy:{branch:'army',startedAge:18,commissionedAge:22,major:'mil',employment:{formal:true,percentile:.7,party:null,career:{rank:0,jobYears:0,experienceYears:0,formalYears:0,lastSettledAge:l.age-1},annualFacts:{age:l.age,country:l.country.id,workShare:0,learnShare:0,familyShare:0,effortUsed:0,migrationPenalty:0,migrated:false,raisedThisYear:false,apprentice:false,rehired:false,reducedHours:false,reducedWork:false,eraIncomeFactor:1,frontPayPercentile:null}}}};
 return l;
}

import {prepareMilitaryPensionRuntime} from '../src/game/military-pension-runtime';
function departed(){const l=fixture(),e=l.academics!.academy!.employment!;l.stats.job='none';l.stats.employment='unemployed';e.career!.experienceYears=22;e.career!.formalYears=22;e.lastMilitaryPay={income:10000,country:'USA',age:l.age-1};e.pensionService={age:l.age,remaining:0};return l;}
test('actual annual finance creates one military pension award and survives reload',()=>{
 const result=advanceYear(departed(),.01),e=result.academics!.academy!.employment!;
 assert.deepEqual(e.pension,{value:10000*(.32+.018*2),startedAge:result.age});
 const restored=decodeSave(encodeSave(result,[])).life!;const before=structuredClone(restored);
 assert.equal(prepareMilitaryPensionRuntime(restored),false);assert.deepEqual(restored,before);
});
test('pension entitlement waits for observed service status and departure',()=>{
 for(const change of [(l:ReturnType<typeof departed>)=>{delete l.academics!.academy!.employment!.pensionService;},(l:ReturnType<typeof departed>)=>{l.stats.job='soldier';},(l:ReturnType<typeof departed>)=>{l.academics!.academy!.employment!.pensionService!.remaining=1;},(l:ReturnType<typeof departed>)=>{l.academics!.academy!.employment!.pensionService!.age--;}]){
  const l=departed();change(l);const before=structuredClone(l);assert.equal(prepareMilitaryPensionRuntime(l),false);assert.deepEqual(l,before);
 }
});

test('the year after a health exit pays the military pension instead of repeating the last salary',()=>{
 const l=departed(),e=l.academics!.academy!.employment!;
 e.healthExit={age:l.age-1,previousJob:'soldier'};
 l.stats.annualIncome=10000;
 const result=advanceYear(l,.01);
 assert.equal(result.stats.annualIncome,10000*(.32+.018*2));
 assert.equal(result.history.at(-1)!.annual!.personalIncome,result.stats.annualIncome);
 assert.equal(decodeSave(encodeSave(result,[])).life!.stats.annualIncome,result.stats.annualIncome);
});
test('a short-service health departure does not keep receiving its former wage',()=>{
 const l=departed(),e=l.academics!.academy!.employment!;
 e.healthExit={age:l.age-1,previousJob:'soldier'};
 e.career!.experienceYears=10;e.career!.formalYears=10;l.stats.annualIncome=10000;
 const result=advanceYear(l,.01);
 assert.equal(result.stats.annualIncome,0);
 assert.equal(result.academics!.academy!.employment!.pension,undefined);
});

import {settleDepartedOfficerIncome} from '../src/game/military-pension-runtime';
test('departure settlement is repeatable and excludes exit-year, active-service and retirement branches',()=>{
 const l=departed(),e=l.academics!.academy!.employment!;
 e.healthExit={age:l.age-1,previousJob:'soldier'};prepareMilitaryPensionRuntime(l);
 assert.equal(settleDepartedOfficerIncome(l),true);const income=l.stats.annualIncome;
 assert.equal(settleDepartedOfficerIncome(l),true);assert.equal(l.stats.annualIncome,income);
 const variants=[
  (x:typeof l)=>{x.academics!.academy!.employment!.healthExit!.age=x.age;},
  (x:typeof l)=>{x.academics!.academy!.employment!.pensionService!.remaining=1;},
  (x:typeof l)=>{x.academics!.academy!.employment!.pensionService!.age--;},
  (x:typeof l)=>{x.stats.job='soldier';x.stats.employment='employed';},
  (x:typeof l)=>{x.age=70;x.academics!.academy!.employment!.pensionService!.age=70;},
 ];
 for(const change of variants){const x=structuredClone(l);change(x);const before=structuredClone(x);assert.equal(settleDepartedOfficerIncome(x),false);assert.deepEqual(x,before);}
 const prison=structuredClone(l);prison.justice.prisonUntil=prison.age+2;
 assert.equal(settleDepartedOfficerIncome(prison),true);assert.equal(prison.stats.annualIncome,0);
});

test('actual annual finance indexes an existing military pension once before payment and reload',()=>{
 let l=createLife({...DEFAULT_SETTINGS,era:'past',country:'JPN',gentler:true,autoChoices:true},1);
 for(let i=0;i<5000&&l.alive&&l.age<45;i++)l=advanceYear(l);
 assert.equal(l.age,45);
 l.academics=structuredClone(departed().academics);
 l.stats.job='none';l.stats.employment='unemployed';l.pendingDecision=null;
 Object.assign(l.timeline!,{complete:false,position:.99,queue:[],financePending:true,focusPending:false});
 const e=l.academics!.academy!.employment!;e.pensionService={age:l.age,remaining:0};
 e.healthExit={age:l.age-1,previousJob:'soldier'};
 e.pension={value:10000,startedAge:l.age-1};e.pensionIndex={year:l.year-1,country:'DEU'};
 const result=advanceYear(l,.01),award=result.academics!.academy!.employment!.pension!;
 assert.ok(award.value>10000);assert.equal(result.stats.annualIncome,Math.round(award.value*100)/100);
 const restored=decodeSave(encodeSave(result,[])).life!;
 assert.deepEqual(restored.academics!.academy!.employment!.pensionIndex,{year:l.year,country:'DEU'});
 for(const index of [{year:l.year+1,country:'DEU'},{year:l.year,country:'INVALID'},{year:l.year,country:'DEU',increaseAge:49},null]){
  const bad=structuredClone(restored);bad.academics!.academy!.employment!.pensionIndex=index as any;
  assert.throws(()=>decodeSave(JSON.stringify({version:1,life:bad,past:[]})));
 }
});

import {translator} from '../src/lib/i18n';
test('a new military award adds one readable life event and existing awards do not repeat it',()=>{
 const l=departed();const result=advanceYear(l,.01);
 const events=result.events.filter(event=>event.key==='event.militaryPensionStarted');
 assert.equal(events.length,1);assert.equal(events[0].params.years,22);
 assert.equal(events[0].params.amount,10000*(.32+.018*2)/12);
 const text=translator('en')(events[0].key,events[0].params);
 assert.ok(text.includes('22'));assert.ok(text.includes('military pension'));assert.ok(!text.includes('{'));
 const restored=decodeSave(encodeSave(result,[])).life!;
 Object.assign(restored.timeline!,{complete:false,position:.99,queue:[],financePending:true,focusPending:false});
 const repeat=advanceYear(restored,.01);
 assert.equal(repeat.events.filter(event=>event.key==='event.militaryPensionStarted').length,1);
 const retired=departed();retired.stats.job='retired';retired.stats.employment='retired';
 assert.equal(advanceYear(retired,.01).events.filter(event=>event.key==='event.militaryPensionStarted').length,0);
});

test('turning sixty-five never cuts an already awarded military pension to thirty percent',()=>{
 const older=[...naturalFamily(1)].find(l=>l.age===64&&!l.pendingDecision&&l.timeline?.complete)!;
 assert.ok(older);
 let life=structuredClone(older);life.settings.autoChoices=true;
 life.academics=structuredClone(departed().academics);
 const e=life.academics!.academy!.employment!;e.pension={value:20000,startedAge:45};
 life.stats.job='none';life.stats.employment='unemployed';life.stats.annualIncome=20000;
 for(let i=0;i<30&&life.age===64;i++)life=advanceYear(life);
 assert.equal(life.age,65);assert.equal(life.stats.employment,'retired');
 assert.equal(life.stats.annualIncome,20000);
 assert.equal(decodeSave(encodeSave(life,[])).life!.stats.annualIncome,20000);
});

import {prepareMilitaryRetirementRecord,commitMilitaryRetirementRecord} from '../src/game/military-retirement-state';
test('retirement offers and outcomes round-trip in actual saves, rejecting forged records',()=>{
 const life=structuredClone([...naturalFamily(1)].find(l=>l.age===52&&!l.pendingDecision&&l.timeline?.complete)!);
 life.academics=structuredClone(departed().academics);
 const e=life.academics!.academy!.employment!;
 const context={age:52,rank:0 as const,commissioned:true,working:true,retired:false,handledAge:null,income:10000,percentile:.8,careerIncome:0,careerPercentile:null};
 const offered=prepareMilitaryRetirementRecord(undefined,context,()=>4000)!;
 for(const record of [offered,commitMilitaryRetirementRecord(offered,context,'retire',()=>4500)!,commitMilitaryRetirementRecord(offered,context,'other',()=>0)!]){
  e.retirement=record;
  assert.deepEqual(decodeSave(encodeSave(life,[])).life!.academics!.academy!.employment!.retirement,record);
 }
 const invalid=[null,{...offered,status:'invalid'},{...offered,offer:{...offered.offer,age:51}},{...offered,offer:{...offered.offer,choices:['retire','rehire']}},{...offered,outcome:{}}, {...commitMilitaryRetirementRecord(offered,context,'retire',()=>4500)!,choice:'other'}];
 for(const record of invalid){e.retirement=record as any;assert.throws(()=>decodeSave(JSON.stringify({version:1,life,past:[]})));}
});

import {prepareMilitaryRetirementRuntime,resolveMilitaryRetirementRuntime} from '../src/game/military-retirement-runtime';
function retirementLife(){
 const life=structuredClone([...naturalFamily(1)].find(l=>l.age===52&&!l.pendingDecision&&l.timeline?.complete)!);
 life.academics=structuredClone(departed().academics);life.stats.job='soldier';life.stats.employment='employed';life.stats.annualIncome=10000;life.stats.happiness=50;life.stats.health=60;life.justice.prisonUntil=null;
 life.academics!.academy!.employment!.retirementFacts={age:52,formalYears:22,civilYears:0,careerIncome:15000,careerPercentile:null};
 return life;
}
test('retirement runtime applies both choices to a life and preserves outcome through reload',()=>{
 for(const choice of ['retire','other'] as const){
  const life=retirementLife();prepareMilitaryRetirementRuntime(life,()=>.1);
  assert.equal(life.academics!.academy!.employment!.retirement!.status,'offered');
  const restored=decodeSave(encodeSave(life,[])).life!;
  assert.equal(resolveMilitaryRetirementRuntime(restored,choice,()=>.1),choice);
  assert.equal(restored.stats.job,choice==='retire'?'retired':'none');
  assert.equal(restored.stats.annualIncome,choice==='retire'?10000:0);
  assert.equal(restored.stats.happiness,choice==='retire'?54:48);
  assert.equal(restored.stats.health,choice==='retire'?63:60);
  const saved=decodeSave(encodeSave(restored,[])).life!,before=structuredClone(saved);
  assert.equal(resolveMilitaryRetirementRuntime(saved,choice,()=>{throw Error('repeat draw')}),null);assert.deepEqual(saved,before);
  if(choice==='retire')assert.ok(saved.academics!.academy!.employment!.retiredPension!>0);
 }
});
test('retirement runtime does not invent missing historical income or reuse stale service facts',()=>{
 for(const change of [(l:ReturnType<typeof retirementLife>)=>{delete l.history[20].annual!.personalIncome;},(l:ReturnType<typeof retirementLife>)=>{l.academics!.academy!.employment!.retirementFacts!.age--;},(l:ReturnType<typeof retirementLife>)=>{delete l.academics!.academy!.employment!.lastMilitaryPay;}]){
  const life=retirementLife();change(life);const before=structuredClone(life);prepareMilitaryRetirementRuntime(life,()=>{throw Error('unknown history draw')});assert.deepEqual(life,before);
 }
});

test('retirement fact snapshots may age without corrupting saves, while invalid facts are rejected',()=>{
 const life=retirementLife();life.academics!.academy!.employment!.career!.formalYears=23;
 const restored=decodeSave(encodeSave(life,[])).life!;
 const before=structuredClone(restored);prepareMilitaryRetirementRuntime(restored,()=>{throw Error('outdated formal service draw')});assert.deepEqual(restored,before);
 for(const patch of [{age:53},{formalYears:-1},{civilYears:23},{careerPercentile:2},{careerIncome:-1}]){
  const bad=retirementLife();Object.assign(bad.academics!.academy!.employment!.retirementFacts!,patch);
  assert.throws(()=>decodeSave(JSON.stringify({version:1,life:bad,past:[]})));
 }
});

test('actual annual finance replaces retained salary with the stored retirement award',()=>{
 const life=retirementLife();prepareMilitaryRetirementRuntime(life,()=>.1);resolveMilitaryRetirementRuntime(life,'retire',()=>.1);
 const e=life.academics!.academy!.employment!;e.pensionService={age:life.age,remaining:0};
 const expected=e.retiredPension!;assert.notEqual(expected,life.stats.annualIncome);
 Object.assign(life.timeline!,{complete:false,position:.99,queue:[],financePending:true,focusPending:false});
 const settled=advanceYear(life,.01);
 assert.equal(settled.stats.annualIncome,Math.round(Math.max(expected,settled.academics!.academy!.employment!.pension?.value??0)*100)/100);
 assert.equal(decodeSave(encodeSave(settled,[])).life!.stats.annualIncome,settled.stats.annualIncome);
});

import {indexMilitaryPensionRuntime} from '../src/game/military-pension-runtime';
test('retirement pension alone gets a persisted index and both awards share later adjustments',()=>{
 let life=createLife({...DEFAULT_SETTINGS,era:'past',country:'DEU',gentler:true,autoChoices:true},1);
 for(let i=0;i<5000&&life.alive&&life.age<52;i++)life=advanceYear(life);
 assert.equal(life.age,52);life.academics=structuredClone(retirementLife().academics);life.stats.job='soldier';life.stats.employment='employed';life.justice.prisonUntil=null;
 prepareMilitaryRetirementRuntime(life,()=>.1);resolveMilitaryRetirementRuntime(life,'retire',()=>.1);
 const e=life.academics!.academy!.employment!,original=e.retiredPension!,receipt=structuredClone(e.retirement);
 assert.equal(e.pension,undefined);indexMilitaryPensionRuntime(life);
 assert.deepEqual(e.pensionIndex,{year:life.year});assert.equal(e.retiredPension,original);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life!.academics!.academy!.employment!.pensionIndex,e.pensionIndex);
 life.age++;life.year++;e.pension={value:10000,startedAge:life.age};
 indexMilitaryPensionRuntime(life);const adjusted=e.retiredPension!;
 assert.ok(adjusted>original);assert.ok(Math.abs(adjusted/original-e.pension.value/10000)<1e-12);
 indexMilitaryPensionRuntime(life);assert.equal(e.retiredPension,adjusted);assert.deepEqual(e.retirement,receipt);
});

import {settleRetiredOfficerIncome} from '../src/game/military-pension-runtime';
test('retired pension payment waits for current service status and does not overwrite new employment',()=>{
 const life=retirementLife();prepareMilitaryRetirementRuntime(life,()=>.1);resolveMilitaryRetirementRuntime(life,'retire',()=>.1);
 life.academics!.academy!.employment!.pensionService={age:life.age,remaining:0};
 for(const change of [(l:typeof life)=>{delete l.academics!.academy!.employment!.pensionService;},(l:typeof life)=>{l.academics!.academy!.employment!.pensionService!.age--;},(l:typeof life)=>{l.academics!.academy!.employment!.pensionService!.remaining=1;},(l:typeof life)=>{l.stats.job='engineer';l.stats.employment='employed';}]){
  const copy=structuredClone(life);change(copy);const before=structuredClone(copy);assert.equal(settleRetiredOfficerIncome(copy),false);assert.deepEqual(copy,before);
 }
});

import {militaryRetirementDecision} from '../src/game/military-retirement-runtime';
import {makeChoice} from '../src/game/engine';
test('real retirement choice buttons resolve once through save reload and update the life record',()=>{
 for(const choice of ['militaryRetire','militaryOther']){
  const life=retirementLife();prepareMilitaryRetirementRuntime(life,()=>.1);life.pendingDecision=militaryRetirementDecision(life);
  assert.ok(life.pendingDecision);assert.equal(life.pendingDecision.choices.length,2);
  assert.ok(translator('en')(life.pendingDecision.key,life.pendingDecision.params).includes('retirement'));
  const saved=decodeSave(encodeSave(life,[])).life!;
  const result=makeChoice(saved,choice);
  assert.equal(result.pendingDecision,null);assert.equal(result.stats.job,choice==='militaryRetire'?'retired':'none');
  assert.ok(result.decisions.includes('militaryRetirement-52'));
  assert.ok(result.events.some(event=>event.key===`event.militaryRetirement.${choice==='militaryRetire'?'retire':'other'}`));
  const restored=decodeSave(encodeSave(result,[])).life!;assert.deepEqual(makeChoice(restored,choice),restored);
 }
});

test('saved retirement buttons reject altered previews and expire after employment changes',()=>{
 const life=retirementLife();prepareMilitaryRetirementRuntime(life,()=>.1);life.pendingDecision=militaryRetirementDecision(life)!;
 const bad=structuredClone(life);bad.pendingDecision!.params.amount=1;
 assert.throws(()=>decodeSave(JSON.stringify({version:1,life:bad,past:[]})));
 life.stats.job='engineer';life.stats.employment='employed';const before=structuredClone(life.stats);
 const result=makeChoice(decodeSave(encodeSave(life,[])).life!,'militaryRetire');
 assert.equal(result.pendingDecision,null);assert.deepEqual(result.stats,before);assert.equal(result.academics!.academy!.employment!.retirement!.status,'offered');assert.ok(!result.decisions.includes('militaryRetirement-52'));
});

import {rollMilitaryRetirementFacts} from '../src/game/military-retirement-runtime';
import {familyChoice} from './helpers/adult-family-simulation';
test('observed officer service updates total formal years once and carries retirement facts to the next year',()=>{
 const life=retirementLife(),e=life.academics!.academy!.employment!;
 e.career!.lastSettledAge=life.age-1;e.annualFacts!.age=life.age;e.annualFacts!.country=life.country.id;
 assert.equal(settleOfficerRuntime(life,()=>.99),true);assert.equal(e.retirementFacts!.formalYears,23);
 settleOfficerRuntime(life,()=>.99);assert.equal(e.retirementFacts!.formalYears,23);
 life.age++;life.year++;assert.equal(rollMilitaryRetirementFacts(life),true);assert.equal(e.retirementFacts!.age,life.age);assert.equal(e.retirementFacts!.formalYears,23);
 assert.equal(rollMilitaryRetirementFacts(life),false);
});
test('actual year advancement schedules military retirement at the rank age and preserves the queued choice',()=>{
 let life=structuredClone([...naturalFamily(1)].find(l=>l.age===51&&!l.pendingDecision&&l.timeline?.complete)!);
 life.academics=structuredClone(retirementLife().academics);life.settings.autoChoices=false;
 life.stats.job='soldier';life.stats.employment='employed';life.justice.prisonUntil=null;life.care.who=null;life.training.kind=null;
 const e=life.academics!.academy!.employment!;e.retirementFacts!.age=51;e.career!.lastSettledAge=51;e.lastMilitaryPay!.age=51;e.pensionService={age:51,remaining:0};
 for(let i=0;i<100&&life.age===51;i++)life=life.pendingDecision?familyChoice(life):advanceYear(life);
 assert.equal(life.age,52);
 const decisions=[...life.timeline!.scheduledDecisions!,...(life.pendingDecision?[life.pendingDecision]:[])];
 assert.ok(decisions.some(d=>d.id==='militaryRetirement-52'));assert.ok(decisions.length<=2);
 const restored=decodeSave(encodeSave(life,[])).life!;
 assert.ok(restored.pendingDecision?.id==='militaryRetirement-52'||restored.timeline!.scheduledDecisions!.some(d=>d.id==='militaryRetirement-52'));
 for(let i=0;i<100&&life.alive&&life.age===52&&(!life.timeline?.complete||life.pendingDecision);i++)life=life.pendingDecision?(life.pendingDecision.id==='militaryRetirement-52'?makeChoice(life,'militaryRetire'):familyChoice(life)):advanceYear(life,.25);
 assert.equal(life.stats.employment,'retired');assert.equal(life.timeline!.complete,true);
 const employment=life.academics!.academy!.employment!;
 assert.equal(life.stats.annualIncome,Math.round(Math.max(employment.retiredPension!,employment.pension?.value??0)*100)/100);
 assert.ok(decodeSave(encodeSave(life,[])).life!.decisions.includes('militaryRetirement-52'));

});

import {rollMilitaryServiceState} from '../src/game/military-pension-runtime';
test('only adjacent known zero-service state rolls forward, without inventing active-service progress',()=>{
 const life=retirementLife(),e=life.academics!.academy!.employment!;e.pensionService={age:life.age-1,remaining:0};
 assert.equal(rollMilitaryServiceState(life),true);assert.equal(e.pensionService.age,life.age);assert.equal(rollMilitaryServiceState(life),false);
 for(const state of [undefined,{age:life.age-2,remaining:0},{age:life.age-1,remaining:1}]){e.pensionService=state;const before=structuredClone(life);assert.equal(rollMilitaryServiceState(life),false);assert.deepEqual(life,before);}
});

test('choosing other work receives the military pension during that same year of job search',()=>{
 const life=retirementLife();prepareMilitaryRetirementRuntime(life,()=>.1);life.pendingDecision=militaryRetirementDecision(life);
 const seeking=makeChoice(life,'militaryOther'),e=seeking.academics!.academy!.employment!;
 assert.equal(e.healthExit,undefined);assert.equal(seeking.stats.annualIncome,0);
 e.pensionService={age:seeking.age,remaining:0};
 Object.assign(seeking.timeline!,{complete:false,position:.99,queue:[],financePending:true,focusPending:false});
 const settled=advanceYear(seeking,.01),employment=settled.academics!.academy!.employment!;
 assert.equal(employment.pension!.value,3560);assert.equal(settled.stats.annualIncome,3560);
 const restored=decodeSave(encodeSave(settled,[])).life!;
 Object.assign(restored.timeline!,{complete:false,position:.99,queue:[],financePending:true,focusPending:false});
 assert.equal(advanceYear(restored,.01).stats.annualIncome,3560);
});

test('an already retired life crosses sixty-five without a second retirement or pension haircut',()=>{
 const older=[...naturalFamily(1)].find(l=>l.age===64&&!l.pendingDecision&&l.timeline?.complete)!;
 assert.ok(older);
 let life=structuredClone(older);life.settings.autoChoices=true;
 life.stats.job='retired';life.stats.employment='retired';life.stats.annualIncome=50000;
 const retirementEvents=life.events.filter(e=>e.key==='event.retirement').length;
 for(let i=0;i<30&&life.age===64;i++)life=advanceYear(life);
 assert.equal(life.age,65);
 assert.equal(life.stats.annualIncome,50000);
 assert.equal(life.events.filter(e=>e.key==='event.retirement').length,retirementEvents);
 const restored=decodeSave(encodeSave(life,[])).life!;
 assert.equal(restored.stats.annualIncome,50000);
});

test('civilian job loss preserves an awarded military pension in the same annual settlement',()=>{
 const life=retirementLife();prepareMilitaryRetirementRuntime(life,()=>.1);resolveMilitaryRetirementRuntime(life,'other',()=>.1);
 const e=life.academics!.academy!.employment!;e.pensionService={age:life.age,remaining:0};e.pension={value:3560,startedAge:life.age};
 life.stats.job='engineer';life.stats.employment='employed';life.stats.annualIncome=50000;
 life.training.kind=null;life.care.who=null;
 Object.assign(life.timeline!,{complete:false,position:.99,queue:[],financePending:true,focusPending:false});
 let lost:typeof life|undefined;
 for(let seed=1;seed<=500&&!lost;seed++){
  const candidate=structuredClone(life);candidate.rng=seed;
  const result=advanceYear(candidate,.01);
  if(result.stats.employment==='unemployed')lost=result;
 }
 assert.ok(lost,'deterministic seeds exercise actual civilian job loss');
 assert.equal(lost.stats.annualIncome,3560);
 assert.equal(lost.stats.job,'none');
 const restored=decodeSave(encodeSave(lost,[])).life!;
 assert.equal(restored.stats.annualIncome,3560);assert.equal(restored.stats.job,'none');
});
