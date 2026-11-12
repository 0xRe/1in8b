import {hobbyPracticeBlocked} from './named-sports';
import {physicalSportPool} from './physical-activity';
import {ADAPTED_HOBBY_IDS,hobbyDisplayId} from './physical-hobbies';
import{isPhysicalEquipmentDecision,physicalEquipmentDecision}from'./physical-decisions';
import {validatePhysicalState} from './physical-state';
import {validOccupationExperience} from './occupation-experience';
import {occupationQuoteCurrent,validOccupationTerms} from './occupation-quote';
import {JOB_IDS,WORK_JOB_IDS} from './job-identities';
import { isNamedSport } from './named-sports';
import {MAJOR_IDS,majorCompetition,type UniversityMajor} from './university-major';
import {isMajorDecision,universityMajorDecision} from './university-major-runtime';
import {graduateStudyAccess} from './graduate-study-access';
import {isStudyGraduation,studyGraduationDecision} from './study-graduation';
import {HOBBY_ACTIVITIES} from './hobby-life';
import {physicalCountry} from './physical-residence';
import {isStudyDecision,studyDecision} from './study-choice-runtime';
import {ALL_HOBBY_IDS,SOURCE_HOBBY_IDS,hobbyDefinition,hobbyOptionsFor,replacedHobby} from './hobby-catalog';
import { hobbyDecision,isHobbyDecision } from './hobby-runtime';
import {isUniversityRetakeDecision,universityRetakeDecision} from './university-retake-runtime';
import {validateChildDevelopmentObservation} from './child-development-observation';
import {validateChildLearning} from './child-learning-observation';
import {validateDevelopmentObservations} from './development-observation';
import {validateBirthDevelopment} from './birth-development';
import {primaryReturnEligible} from './primary-school-runtime';
import {isCollegeDecision,collegeDecision} from './college-runtime';
import {validateGuardianship} from './grandchild-guardianship-storage';
import {guardianDecision,guardianDecisionId} from './grandchild-guardianship-runtime';
import {childRetirementAge} from './child-retirement';
import {isMilitaryRetirement} from './military-retirement-runtime';
import {militaryRetirementAge} from './military-retirement';
import {isOfficerPromotion} from './officer-promotion-runtime';
import {isUpperSecondaryDecision,upperChoiceIds,isSchoolWithdrawalDecision} from './upper-secondary-runtime';
import {isLowerSecondaryDecision} from './lower-secondary-runtime';
import {academicDecisionAge} from './academic-continuation';
import {TALENT_DOMAINS} from './learning-state';
import {SCHOOL_STAGES,schoolDuration} from './school-model';
import {recoverUniversityProgress} from './university-migration';
import { STAGE_FOCUSES } from './focus-model';
import {FIXED_DECISION_AGES as decisionAge, fixedDecisionAt} from './decision-ages';
import {childUniversityEndAge} from './child-prison';
import { MAX_GREAT_GRANDCHILDREN, MAX_GREAT_GREAT_GRANDCHILDREN } from "./later-generations";
import { childcareChoices, localPartnerPresent } from './childcare';
import { canResolveDescendantChoice, addChildProgress, descendantSubject, descendantChoiceCost, descendantDecision, descendantChoiceIds, emptyDescendants, FAMILY_LIMITS, MAX_RELATIVES, MAX_GRANDCHILDREN, MAX_CHILD_GRANDCHILDREN, parseDescendantDecision } from './descendants';
import { emptyHealthcare, FOLLOWUP_TREATMENTS, HEALTH_TREATMENTS, healthDecisionKey, treatmentCost } from './health';
import { getCountries } from './countries';
import { ALLOCATIONS, FOCUSES, HOBBIES, PET_KINDS, REFLECTION_AGES, SPENDING_CATEGORIES, TEMPERAMENTS, emptyBudget, getDailyTheme } from './engine';
import { ENGINE_MESSAGES } from './messages';
import type { Country, Life } from './types';

export const MAX_SAVE_BYTES = 10_000_000;
export const MAX_PAST_LIVES = 100;
const catalog = new Map(getCountries().map(country => [country.id, country]));
const jobs = JOB_IDS;
const causes = new Set(Object.keys(ENGINE_MESSAGES).filter(key => key.startsWith('cause.')));
const events = new Set(Object.keys(ENGINE_MESSAGES).filter(key => key.startsWith('event.')));
const decisionChoices: Record<string, string[]> = {
  education: ['university', 'vocational', 'work'], opportunity: ['ambition', 'stability'],
  relationship: ['partner', 'independent'], balance: ['family', 'explore', 'health'],
  temperament: [...TEMPERAMENTS], hobby: ['reading', 'music', 'sport', 'art'],
  school: ['returnSchool', 'helpFamily'], relocation: ['move', 'stay'],
};
const isJobDecision = (id: unknown): id is string => typeof id === 'string' && /^job-(?:1[5-9]|[2-5]\d|6[0-4])$/.test(id);
const recurringChoices: Record<string, string[]> = {
  apprenticeship: ['mechanic','hairdresser','keepJob'], risky: ['refuseRisk','acceptRisk'], marriage: ['marry','cohabit','keepDating','breakUp'],
  children: ['haveChild','waitChild','childfree'], care: ['selfCare','partnerCare','grandparents','daycare'], nightSchool: ['nightSchool','laterSchool'],
  debt: ['familyHelp','moneylender'], returnWork: ['returnWork','remainHome'],
  secondWife: ['takeSecondWife','refuseSecondWife'],
  remarriage: ['partner','independent'],
};
const activityChoices:Record<string,string[]>={familyPlanning:['haveChild','waitChild','childfree'],business:['startBusiness','keepJob'],dreamJob:['pursueDream','keepJob'],divorce:['leaveRelationship','keepTogether'],nightSchool:['nightSchool','laterSchool'],migration:['migrateTogether','migrateAlone','stay'],adoptPet:[...PET_KINDS,'noPet']};
function activity(value:unknown):{kind:string;age:number}|null {
  if(typeof value!=='string')return null;
  const match=/^activity-(familyPlanning|business|dreamJob|divorce|nightSchool|migration|adoptPet|askKids)-(\d{1,3})$/.exec(value);
  if(!match)return null;const age=Number(match[2]);
  if(age<(match[1]==='askKids'?55:match[1]==='adoptPet'?6:18)||age>(['adoptPet','askKids'].includes(match[1])?110:64))return null;
  return {kind:match[1],age};
}
function recurring(value: unknown): {kind:string;age:number;index:number|null}|null {
  if(typeof value!=='string')return null;
  const match=/^(apprenticeship|risky|marriage|children|care|nightSchool|debt|returnWork|secondWife|remarriage)-(\d{2})(?:-([0-9]))?$/.exec(value);
  if(!match)return null;
  const age=Number(match[2]),kind=match[1],index=match[3]===undefined?null:Number(match[3]);
  if(age<17||age>64||(kind==='care')!==(index!==null)||index!==null&&index>=FAMILY_LIMITS.children)return null;
  if(kind==='apprenticeship'&&(age<19||age>23)||kind==='children'&&(age<24||age>55)||kind==='nightSchool'&&age<23||kind==='secondWife'&&(age<40||age>58)||kind==='remarriage'&&(age<25||age>65))return null;
  return {kind,age,index};
}
function fail(): never { throw new Error('Invalid or unsupported life save.'); }
function object(value: unknown): asserts value is Record<string, any> { if (!value || typeof value !== 'object' || Array.isArray(value)) fail(); }
function string(value: unknown, max = 200): asserts value is string { if (typeof value !== 'string' || value.length > max) fail(); }
function number(value: unknown, min = 0, max = 1e12): asserts value is number { if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail(); }
function integer(value: unknown, min: number, max: number): asserts value is number { number(value, min, max); if (!Number.isInteger(value)) fail(); }
function boolean(value: unknown): asserts value is boolean { if (typeof value !== 'boolean') fail(); }
function oneOf(value: unknown, allowed: readonly unknown[]) { if (!allowed.includes(value)) fail(); }
function array(value: unknown, max: number): asserts value is any[] { if (!Array.isArray(value) || value.length > max) fail(); }
function occupationTerms(value:any,job:unknown){if(!validOccupationTerms(value,job))fail();}
function occupationBatch(value:any,life:Record<string,any>){
 object(value);oneOf(value.version,[1]);integer(value.age,15,life.age);integer(value.year,life.birthYear,life.year);
 if(value.year!==life.birthYear+value.age||!catalog.has(value.country))fail();
}
function nullableAge(value: unknown) { if (value !== null) integer(value, 0, 110); }
function sex(value: unknown) { oneOf(value, ['M', 'F']); }
function country(value: unknown): Country {
  object(value); string(value.id, 3);
  const c = catalog.get(value.id);
  if (!c) fail();
  // Imported economic/health data never replaces the authoritative catalog.
  return structuredClone(c);
}
function params(value: unknown) {
  object(value);
  if (Object.keys(value).length > 8) fail();
  for (const param of Object.values(value)) {
    if (typeof param === 'string') string(param, 200);
    else number(param, -1e12, 1e12);
  }
}
/** Check the entire tree before interpreting shape, including otherwise unused keys. */
function safeTree(value: unknown, budget = { nodes: 0 }, depth = 0) {
  if (++budget.nodes > 1_000_000 || depth > 15) fail();
  if (typeof value === 'number' && !Number.isFinite(value)) fail();
  if (typeof value === 'string' && value.length > 2000) fail();
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key) || key.length > 100) fail();
      safeTree(child, budget, depth + 1);
    }
  }
}
function person(value: unknown, currentYear: number, allowEarlyLoss = false, allowSupportedWork = false) {
  object(value);
  string(value.id); string(value.name); string(value.country, 3); sex(value.sex);
  if(value.citizenship!==undefined&&!catalog.has(value.citizenship))fail();
  if(value.bond!==undefined&&(typeof value.bond!=='number'||!Number.isFinite(value.bond)))fail();
  if (!catalog.has(value.country)) fail();
  integer(value.age, 0, 110); integer(value.birthYear, 1800, 2200);
  if (value.birthYear + value.age > currentYear) fail();
  boolean(value.alive); nullableAge(value.deathAge); oneOf(value.job, allowSupportedWork ? [...jobs, "dayActivities", "shelteredWork"] : jobs);
  if (value.earlyLoss !== undefined) {
    boolean(value.earlyLoss);
    if (!allowEarlyLoss) fail();
  }
  if (allowEarlyLoss && value.earlyLoss) {
    if (value.alive || value.deathAge !== null || value.age !== 0 || value.job !== "none" || value.fertilityTarget !== 0) fail();
  } else if (value.alive ? value.deathAge !== null : value.deathAge !== value.age) fail();
}
function validateHealthcare(life: Record<string, any>) {
  const health = life.healthcare; object(health);
  integer(health.lastCheckedAge, Math.max(-1, life.age - 1), life.age); number(health.totalOutOfPocket);
  if (health.activeEpisodeId !== null) string(health.activeEpisodeId, 40);
  array(health.childChecks, FAMILY_LIMITS.children);
  const childIds = new Set<string>();
  for (const check of health.childChecks) {
    object(check); string(check.id); integer(check.age, 0, life.age);
    if (!life.family.children.some((child: any) => child.id === check.id) || childIds.has(check.id)) fail();
    childIds.add(check.id);
  }
  array(health.chronic, 4);
  if (health.chronic.length !== life.conditions.length) fail();
  health.chronic.forEach((condition: any, index: number) => {
    object(condition); oneOf(condition.id, [`condition-${index}`]);
    oneOf(condition.diagnosis, ['cardiac', 'respiratory', 'longTerm']);
    integer(condition.diagnosedAge, 0, life.age); boolean(condition.managed);
    integer(condition.nextReviewAge, condition.diagnosedAge, 130);
  });
  array(health.episodes, 512);
  let total = 0; const open: any[] = [];
  health.episodes.forEach((episode: any, index: number) => {
    object(episode); integer(episode.startedAge, 0, life.age);
    oneOf(episode.id, [`health-${episode.startedAge}-${index}`]);
    if (index > 0 && episode.startedAge < health.episodes[index - 1].startedAge) fail();
    string(episode.patientId); string(episode.patientName);
    const patient = episode.patientId === 'self' ? life : life.family.children.find((child: any) => child.id === episode.patientId);
    if (!patient || patient.name !== episode.patientName || !catalog.has(episode.country)) fail();
    integer(episode.patientAge, 0, patient.age);
    if (episode.patientAge !== life.birthYear + episode.startedAge - patient.birthYear) fail();
    oneOf(episode.diagnosis, ['infection', 'injury', 'cardiac', 'premature', 'chronic']);
    oneOf(episode.level, ['clinic', 'hospital', 'icu', 'neonatal', 'followup']);
    if ((episode.level === 'neonatal') !== (episode.diagnosis === 'premature') || episode.level === 'neonatal' && episode.patientAge !== 0) fail();
    if ((episode.level === 'followup') !== (episode.diagnosis === 'chronic') || episode.level === 'followup' && episode.patientId !== 'self') fail();
    oneOf(episode.status, ['awaiting', 'recovering', 'recovered', 'deceased']);
    number(episode.cost); number(episode.untreatedRisk, 0, 0.98); number(episode.access, 0.25, 0.95);
    if (episode.level === 'followup' && episode.untreatedRisk !== 0) fail();
    // Resolved episodes consume the same checkpoint as awaiting ones; imports cannot reopen it.
    if (episode.level !== 'followup' && episode.patientId === 'self' && health.lastCheckedAge < episode.startedAge) fail();
    if (episode.patientId !== 'self' && !health.childChecks.some((check: any) => check.id === episode.patientId && check.age >= episode.startedAge)) fail();
    if (episode.status === 'awaiting') {
      open.push(episode);
      if (!patient.alive || !life.alive || episode.treatment !== null || episode.closedAge !== null || episode.recoveryUntil !== null || episode.cost !== 0 || episode.startedAge !== life.age) fail();
    } else {
      oneOf(episode.treatment, episode.level === 'followup' ? FOLLOWUP_TREATMENTS : HEALTH_TREATMENTS);
      integer(episode.closedAge, episode.startedAge, life.age);
      if (!life.decisions.includes(episode.id)) fail();
      if (episode.status === 'deceased' && patient.alive) fail();
      if (episode.status === 'recovering') integer(episode.recoveryUntil, life.age + 1, 112);
      else if (episode.recoveryUntil !== null) fail();
    }
    total += episode.cost;
  });
  if (Math.abs(total - health.totalOutOfPocket) > 0.02 || open.length > 1) fail();
  if (open.length ? health.activeEpisodeId !== open[0].id || life.pendingDecision?.id !== open[0].id : health.activeEpisodeId !== null || life.pendingDecision?.id?.startsWith('health-')) fail();
  if (open[0]?.patientId === 'self' && open[0].level !== 'followup' && health.lastCheckedAge !== life.age) fail();
  if (open[0] && open[0].patientId !== 'self' && !health.childChecks.some((check: any) => check.id === open[0].patientId && check.age === life.age)) fail();
  if (open[0]?.level === 'followup' && !health.chronic.some((condition: any) => condition.nextReviewAge <= life.age)) fail();
}

function validateDescendants(life: Record<string, any>) {
    const data = life.descendants;
    object(data);
    integer(data.rng, 0, 0xffffffff);
    integer(data.observedSince, life.birthYear, life.year);
    oneOf(data.lastYear, [life.year]);
    number(data.annualTransfers, 0, 1e12);
    number(data.totalTransfers, data.annualTransfers, 1e12);
    array(data.children, FAMILY_LIMITS.children);
    array(data.grandchildren, MAX_GRANDCHILDREN);
    if (data.children.length !== life.family.children.length)
        fail();
    const identities = new Set<string>();
    const unique = (p: any) => { if (!p.id || identities.has(p.id))
        fail(); identities.add(p.id); };
    for (const p of [...life.family.parents, ...life.family.siblings, ...life.family.children, ...(life.family.partner ? [life.family.partner] : []), ...(life.family.secondPartner ? [life.family.secondPartner] : []), ...life.companions])
        unique(p);
    for (const g of data.grandchildren) {
        person(g, life.year, true);
        unique(g);
        string(g.parentId);
        const parent = life.family.children.find((c: any) => c.id === g.parentId), state = data.children.find((c: any) => c.childId === g.parentId), spouse = state?.spouse;
        if (!parent || !state || parent.deathAge !== null && g.birthYear > parent.birthYear + parent.deathAge || g.alive && g.birthYear + g.age !== life.year) fail();
        if (g.origin !== undefined) {
          object(g.origin);
          if (g.origin.rulesVersion !== undefined) oneOf(g.origin.rulesVersion, [2]);
          oneOf(g.origin.method, ['natural','adoption','donor','surrogacy']);
          oneOf(g.origin.union, ['married','cohabiting','solo']);
          oneOf(g.origin.household, ['parent','otherParent']);
          if (!catalog.has(g.origin.country) || g.origin.method === 'adoption' && g.earlyLoss ||
              g.origin.method === 'donor' && parent.sex !== 'F' || g.origin.method === 'surrogacy' && parent.sex !== 'M') fail();
          if (g.origin.household === 'otherParent' && (g.origin.union !== 'solo' || parent.sex !== 'M')) fail();
          if (g.origin.union === 'cohabiting' && (state.unionPlan?.cohabitationYear == null || g.birthYear < state.unionPlan.cohabitationYear)) fail();
          if ((g.origin.union !== 'married' || g.origin.rulesVersion === 2) && (g.birthYear < parent.birthYear + 18 || g.birthYear > parent.birthYear + (parent.sex === 'F' ? 44 : 50))) fail();
        }
        // Unversioned births retain legacy chronology; new versioned births use sex-specific windows.
        if (g.origin === undefined || g.origin.union === 'married') {
          if (!spouse || state.marriedYear === null || spouse.deathAge !== null && g.birthYear > spouse.birthYear + spouse.deathAge) fail();
          if (g.origin?.rulesVersion === 2) {
            if (g.birthYear < state.marriedYear || g.birthYear < spouse.birthYear + 18) fail();
          } else if (g.birthYear <= state.marriedYear || g.birthYear < parent.birthYear + 20 || g.birthYear > parent.birthYear + 48 || g.birthYear < spouse.birthYear + 20 || g.birthYear > spouse.birthYear + 48) fail();
        }
    }
    if (data.greatGrandchildren) {
      array(data.greatGrandchildren, MAX_GREAT_GRANDCHILDREN);
      for (const gg of data.greatGrandchildren) {
        object(gg); string(gg.grandchildId);
        // Later generations do not have careers, but share identity/death invariants.
        person({ ...gg, job: 'none' }, life.year);
        unique(gg);
        const parent = data.grandchildren.find((g: any) => g.id === gg.grandchildId);
        if (!parent || parent.earlyLoss || gg.birthYear < parent.birthYear + 18 || gg.birthYear > parent.birthYear + 44 ||
            parent.deathAge !== null && gg.birthYear > parent.birthYear + parent.deathAge ||
            gg.alive && gg.birthYear + gg.age !== life.year) fail();
      }
    }
    if (data.laterRng !== undefined) integer(data.laterRng, 0, 0xffffffff);
    if (data.laterObservedSince !== undefined) integer(data.laterObservedSince, life.birthYear, life.year);
    if ((data.laterRng === undefined) !== (data.laterObservedSince === undefined)) fail();
    if (data.greatGreatGrandchildren !== undefined) {
      array(data.greatGreatGrandchildren, MAX_GREAT_GREAT_GRANDCHILDREN);
      for (const child of data.greatGreatGrandchildren) {
        object(child); string(child.greatGrandchildId); person({...child, job:'none'},life.year); unique(child);
        const parent = data.greatGrandchildren?.find((p:any)=>p.id===child.greatGrandchildId);
        if (!parent || child.birthYear < parent.birthYear+18 || child.birthYear > parent.birthYear+44 ||
          parent.deathAge !== null && child.birthYear > parent.birthYear+parent.deathAge ||
          child.alive && child.birthYear+child.age !== life.year) fail();
      }
    }
    for (const parent of [...data.grandchildren,...(data.greatGrandchildren??[])]) {
      const children = data.grandchildren.includes(parent)
        ? (data.greatGrandchildren??[]).filter((c:any)=>c.grandchildId===parent.id)
        : (data.greatGreatGrandchildren??[]).filter((c:any)=>c.greatGrandchildId===parent.id);
      if (children.length > 9) fail();
      if (parent.fertilityTarget !== undefined) integer(parent.fertilityTarget, children.length, 9);
    }
    if (data.pendingReconciliation !== undefined) {
      object(data.pendingReconciliation);
      const pending = data.pendingReconciliation;
      string(pending.childId);
      integer(pending.year, data.observedSince, life.year);
      const state = data.children.find((c:any) => c.childId === pending.childId);
      if (state?.prison?.reunion?.choice !== 'time' || state.prison.reunion.year !== pending.year || state.prison.reunion.reconciledYear !== null) fail();
    }
    const childIds = new Set<string>();
    let transfers = 0;
    for (const state of [...data.children, ...data.grandchildren]) {
        object(state);
        string(state.childId);
        const isGrandchild = data.grandchildren.includes(state);
        const child = isGrandchild ? state : life.family.children.find((c: any) => c.id === state.childId);
        if(child&&['dayActivities','shelteredWork'].includes(child.job)&&!state.supportedWork)fail();
        if(state.careWorryYear!==undefined){
          if(!child||isGrandchild||(state.birthDevelopment?.developmental?.supportLevel??0)<2)fail();
          integer(state.careWorryYear,Math.max(life.birthYear+55,child.birthYear+18),Math.min(life.year,child.birthYear+(child.deathAge??child.age)));
        }
        if(state.carePlan!==undefined){
          const plan=state.carePlan;object(plan);
          if(!child||isGrandchild||(state.birthDevelopment?.developmental?.supportLevel??0)<2)fail();
          oneOf(plan.kind,['sibling','groupHome','relatives']);integer(plan.parentAge,50,life.age);
          integer(plan.year,life.birthYear+plan.parentAge,life.birthYear+plan.parentAge);
          if(plan.year<child.birthYear+18||plan.year>child.birthYear+(child.deathAge??child.age))fail();
          if(plan.kind==='sibling'){
            string(plan.siblingId);string(plan.siblingName);integer(plan.siblingBirthYear,1800,2200);
            const sibling=life.family.children.find((s:any)=>s.id===plan.siblingId);
            if(!sibling||sibling.id===child.id||sibling.name!==plan.siblingName||sibling.birthYear!==plan.siblingBirthYear||plan.year<sibling.birthYear+22)fail();
          }
        }
        if(state.supportedWork!==undefined){
          const work=state.supportedWork;object(work);
          if(!child||isGrandchild||(state.birthDevelopment?.developmental?.supportLevel??0)<2)fail();
          integer(work.age,20,child.deathAge??child.age);integer(work.year,child.birthYear+work.age,child.birthYear+work.age);
          boolean(work.urban);boolean(work.richAccess);
          if(work.kind==='shelteredWork'&&!work.richAccess||['familyFarm','familyShop'].includes(work.kind)&&work.richAccess)fail();
          oneOf(work.kind,['dayActivities','shelteredWork','familyShop','familyFarm']);
          if(state.birthDevelopment.developmental.supportLevel===3&&work.kind!=='dayActivities'||work.kind==='familyShop'&&!work.urban||work.kind==='familyFarm'&&work.urban)fail();
          const expectedJob=work.kind==='dayActivities'?'dayActivities':work.kind==='familyFarm'?'farmer':work.kind==='familyShop'?'service':'shelteredWork';
          if(state.income!==0||state.employment!=='retired'&&(child.job!==expectedJob||state.employment!==(work.kind==='dayActivities'?'none':'employed')))fail();

        }
        if(state.travelPracticeAge!==undefined){
          if(!child||isGrandchild||state.birthDevelopment?.developmental?.supportLevel!==2)fail();
          integer(state.travelPracticeAge,14,Math.min(20,child.deathAge??child.age));
        }
        if(state.schoolSupport!==undefined){
          const school=state.schoolSupport,trait=state.birthDevelopment?.developmental;object(school);
          if(!child||isGrandchild||!trait)fail();oneOf(school.kind,['special','home','supported','unsupported']);
          integer(school.age,trait.supportLevel>=2?6:7,Math.min(trait.supportLevel>=2?6:9,child.deathAge??child.age));
          if(trait.supportLevel>=2?!['special','home'].includes(school.kind):!['supported','unsupported'].includes(school.kind))fail();
          if(trait.supportLevel===1&&(!state.developmentObservation||state.developmentObservation.age>school.age||school.kind==='supported'&&!state.developmentObservation.diagnosed))fail();
        }
        if(state.developmentObservation!==undefined){if(!child||isGrandchild)fail();validateChildDevelopmentObservation(state.developmentObservation,state.birthDevelopment,child.deathAge??child.age);}
        if(state.learningObservations!==undefined){if(!child||isGrandchild)fail();validateChildLearning(state.learningObservations,state.birthDevelopment,child.deathAge??child.age);}
        if(state.birthDevelopment!==undefined){if(!child)fail();validateBirthDevelopment(state.birthDevelopment,child.sex);}
        const parentCountry = isGrandchild ? life.family.children.find((c:any) => c.id === state.parentId)?.country : life.country.id;
        if (!child || isGrandchild && child.childId !== child.id || childIds.has(state.childId) || !isGrandchild && (child.birthYear - life.birthYear < 18 || child.birthYear > life.birthYear + 55) || child.alive && child.birthYear + child.age !== life.year)
            fail();
        childIds.add(state.childId);
        if (state.bond !== undefined) number(state.bond, -1000, 1000);
        if (state.prison !== undefined) {
          if (isGrandchild) fail();
          const sentence = state.prison;
          object(sentence);
          integer(sentence.startYear, Math.max(data.observedSince, child.birthYear + 18, life.birthYear + 36), Math.min(life.year, child.birthYear + 45));
          integer(sentence.endYear, sentence.startYear + 1, sentence.startYear + 6);
          oneOf(sentence.endYear - sentence.startYear, [1, 2, 3, 4, 6]);
          const lastAliveYear = child.deathAge === null ? life.year : child.birthYear + child.deathAge;
          if (sentence.startYear > lastAliveYear) fail();
          if (sentence.reunion !== undefined) {
            object(sentence.reunion);
            if (sentence.releasedYear === null) fail();
            oneOf(sentence.reunion.choice, ['welcome', 'time']);
            integer(sentence.reunion.year, sentence.releasedYear, Math.min(life.year, lastAliveYear));
            if (sentence.reunion.reconciledYear !== null) {
              if (sentence.reunion.choice !== 'time') fail();
              integer(sentence.reunion.reconciledYear, sentence.reunion.year + 2, Math.min(life.year, lastAliveYear));
            }
          }
          if (sentence.releasedYear !== null) {
            integer(sentence.releasedYear, sentence.endYear, Math.min(life.year, lastAliveYear));
            if (sentence.releasedYear !== sentence.endYear) fail();
          }
        }

        if (state.unionPlan !== undefined) {
          const plan = state.unionPlan;
          object(plan); oneOf(plan.version, [1]);
          integer(plan.observedYear, Math.max(data.observedSince, child.birthYear), life.year);
          if (child.deathAge !== null && plan.observedYear > child.birthYear + child.deathAge) fail();
          oneOf(plan.orientation, ['unknown', 'oppositeSex', 'sameSex', 'bisexual']);
          oneOf(plan.sameSexPartner, [null, true, false]);
          if (plan.orientation === 'sameSex' && plan.sameSexPartner !== true ||
              plan.orientation === 'oppositeSex' && plan.sameSexPartner !== false ||
              plan.orientation === 'bisexual' && plan.sameSexPartner === null) fail();
          if (state.spouse && plan.sameSexPartner !== null && plan.sameSexPartner !== (child.sex === state.spouse.sex)) fail();
          if (plan.cohabitationAge !== null) integer(plan.cohabitationAge, 18, 110);
          if (plan.cohabitationYear !== null) {
            integer(plan.cohabitationYear, Math.max(plan.observedYear, child.birthYear + 18), life.year);
            if (plan.cohabitationAge === null || plan.cohabitationYear < child.birthYear + plan.cohabitationAge ||
                child.deathAge !== null && plan.cohabitationYear > child.birthYear + child.deathAge) fail();
          }
          if (plan.disclosure !== undefined) {
            object(plan.disclosure);
            const disclosure = plan.disclosure;
            if (disclosure.age !== null) {
              integer(disclosure.age, 17, 110);
              if (!['sameSex', 'bisexual'].includes(plan.orientation) || child.birthYear + disclosure.age <= plan.observedYear) fail();
            }
            if (disclosure.year !== null) {
              integer(disclosure.year, plan.observedYear + 1, life.year);
              if (disclosure.age === null || disclosure.year < child.birthYear + disclosure.age ||
                  child.deathAge !== null && disclosure.year > child.birthYear + child.deathAge) fail();
            }
          }
          if (plan.fertilityTarget !== null) {
            const births = isGrandchild ? (data.greatGrandchildren ?? []).filter((g:any)=>g.grandchildId===child.id).length
              : data.grandchildren.filter((g:any)=>g.parentId===child.id).length;
            integer(plan.fertilityTarget, births, 9);
            if (child.age < 18) fail();
          }
        }
        oneOf(state.education, ['unknown', 'preschool', 'school', 'specialSchool', 'outOfSchool', 'secondary', 'university', 'graduate', 'droppedOut']);
        oneOf(state.employment, ['none', 'student', 'employed', 'unemployed', 'retired']);
        number(state.income, 0, 1e10);
        integer(state.level, 0, 10);
        oneOf(state.studyFunding, [null, 'parent', 'shared', 'self']);
        if (state.studyUntil !== null)
            integer(state.studyUntil, child.alive ? life.year + 1 : child.birthYear + 19, Math.max(life.year + 4, state.admission?.path === 'university' ? child.birthYear + 23 : 0, state.prison ? Math.max(state.prison.endYear, child.birthYear + childUniversityEndAge(child.birthYear, state.prison)) : 0));
        if ((state.education === 'university') !== (state.studyUntil !== null) || state.education === 'university' && (state.employment !== 'student' || state.studyFunding === null))
            fail();
        if (['none', 'student', 'unemployed'].includes(state.employment) && state.income !== 0 || state.employment === 'retired' && child.age < 65 && !state.retirement || child.age < 18 && ['employed', 'retired'].includes(state.employment))
            fail();
        if(state.retirement!==undefined){
          object(state.retirement);const record=state.retirement;
          if(isGrandchild||!catalog.has(record.country)||state.employment!=='retired')fail();
          oneOf(record.job,[...jobs,"dayActivities","shelteredWork"]);if(record.job==='retired')fail();
          integer(record.age,childRetirementAge(record.country,child.sex,record.job,record.year),child.deathAge??child.age);
          integer(record.year,data.observedSince,life.year);
          if(record.year!==child.birthYear+record.age)fail();
        }
        boolean(state.universityResolved);
        if (state.admission !== undefined) {
          object(state.admission);
          const admission = state.admission;
          oneOf(admission.attemptedAge, [18, 19]);
          oneOf(admission.path, [null, 'pending', 'university', 'work']);
          if (isGrandchild || admission.attemptedAge > (child.deathAge ?? child.age)) fail();
          if (admission.path === null || admission.path === 'pending') {
            if (admission.attemptedAge !== 18 || state.universityResolved ||
                (!['school', 'secondary'].includes(state.education)&&!(admission.path===null&&state.birthDevelopment?.developmental?.supportLevel>=2&&['specialSchool','outOfSchool'].includes(state.education)))) fail();
          } else {
            if (!state.universityResolved) fail();
            if (admission.path === 'university' && !['university', 'graduate', 'droppedOut'].includes(state.education)) fail();
            if (admission.path === 'work' && state.education !== 'secondary') fail();
          }
        }
        if (state.universityFunding !== undefined) {
          object(state.universityFunding);
          const funding=state.universityFunding;
          if(isGrandchild||!state.admission||state.admission.attemptedAge!==18||funding.version!==1)fail();
          integer(funding.year,child.birthYear+18,child.birthYear+18);
          number(funding.packageCost,0,1e12);
          if(funding.result===undefined){
            if(state.universityResolved||state.admission.path!=="pending")fail();
          } else {
            object(funding.result);const result=funding.result;
            oneOf(result.outcome,['funded','shared','self','assisted','withdrawn']);
            const rules:Record<string,number[]>={funded:[1,6,4,4],shared:[.5,4,3,2],self:[0,2,0,0],assisted:[.4,1,0,1],withdrawn:[0,-6,-2,0]};
            const [factor,happiness,social,bond]=rules[result.outcome];
            if(!state.universityResolved||result.cost!==funding.packageCost*factor||result.happiness!==happiness||result.social!==social||result.bond!==bond)fail();
            if(state.admission.path!==(result.outcome==='withdrawn'?'work':'university'))fail();
            if(state.education==='university'&&state.studyFunding!==(result.outcome==='funded'?'parent':result.outcome==='shared'?'shared':'self'))fail();
          }
        }
        if(state.homePlan!==undefined){
          const plan=state.homePlan;object(plan);
          if(isGrandchild||plan.version!==1||!catalog.has(plan.country))fail();
          integer(plan.observedYear,Math.max(data.observedSince,child.birthYear+15),Math.min(life.year,child.birthYear+(child.deathAge??child.age)));
          if(plan.leaveAge!==0)integer(plan.leaveAge,19,40);
          boolean(plan.staying);boolean(plan.left);
          if(plan.decision!==undefined){
            const decision=plan.decision;object(decision);
            integer(decision.year,plan.observedYear,Math.min(life.year,child.birthYear+(child.deathAge??child.age)));
            oneOf(decision.outcome,['stay','leave']);oneOf(decision.reason,['own','university','city','wedding','cohabitation']);
            if(decision.outcome==='stay'&&!plan.staying||decision.outcome==='leave'&&!plan.left)fail();
            if(decision.reason==='city'&&(plan.leaveAge!==0||decision.year-child.birthYear<17||decision.year-child.birthYear>35||decision.outcome!=='leave'))fail();
            if(['own','university'].includes(decision.reason)&&(plan.leaveAge===0||decision.year-child.birthYear<plan.leaveAge))fail();
            if(decision.reason==='university'&&decision.year-child.birthYear>23)fail();
          }
        }
        if(state.weddingHome!==undefined){
          object(state.weddingHome);
          if(isGrandchild||state.marriedYear===null)fail();
          integer(state.weddingHome.year,state.marriedYear,state.marriedYear);
          oneOf(state.weddingHome.outcome,['pending','stay','leave','independent']);
          if(state.weddingHome.outcome==='pending'){
            if(state.weddingHome.resolvedYear!==null)fail();
          }else integer(state.weddingHome.resolvedYear,state.marriedYear,Math.min(life.year,child.birthYear+(child.deathAge??child.age)));
        }
        if(state.board!==undefined){
          object(state.board);
          if(isGrandchild)fail();
          boolean(state.board.willing);
          integer(state.board.year,Math.max(data.observedSince,child.birthYear+20),Math.min(life.year,life.birthYear+59,child.birthYear+(child.deathAge??child.age)));
        }
        boolean(state.weddingResolved);
        boolean(state.migrationResolved);
        if (state.weddingAt !== null) integer(state.weddingAt, 18, 111);
        integer(state.migrationAt, 21, 113);
        oneOf(state.residence, ['home', 'independent']);
        if (state.residence === 'home' && child.alive && child.country !== parentCountry && !(!isGrandchild && child.country === physicalCountry(life as Life)) && !(isGrandchild && child.origin?.household === 'otherParent'))
            fail();
        if (!catalog.has(state.originCountry))
            fail();
        for (const key of ['migratedYear', 'lastVisitYear', 'firstPayYear'])
            if (state[key] !== null)
                integer(state[key], data.observedSince, life.year);
        oneOf(state.firstPayStatus, ['pending', 'received', 'unknown']);
        if ((state.firstPayStatus === 'received') !== (state.firstPayYear !== null))
            fail();
        // Migration is historical; a later wedding can reunite a household in the same country.
        if (state.migratedYear !== null && !state.migrationResolved)
            fail();
        if (state.marriedYear !== null) {
            integer(state.marriedYear, child.birthYear + 18, life.year);
            if (child.deathAge !== null && state.marriedYear > child.birthYear + child.deathAge)
                fail();
        }
        if ((state.spouse === null) !== (state.marriedYear === null))
            fail();
        if (state.spouse !== null) {
            person(state.spouse, life.year);
            unique(state.spouse);
            if (!state.weddingResolved || state.spouse.deathAge !== null && state.marriedYear > state.spouse.birthYear + state.spouse.deathAge || state.spouse.birthYear + 18 > state.marriedYear || state.spouse.alive && state.spouse.birthYear + state.spouse.age !== life.year || child.alive && state.spouse.alive && child.country !== state.spouse.country)
                fail();
        }
        number(state.contribution, 0, isGrandchild ? 0 : 1e11);
        if (isGrandchild && (child.birthYear < data.observedSince || state.education === 'unknown' || state.firstPayStatus === 'unknown' || child.age < 18 && state.residence !== 'home' || child.age >= 19 && ['preschool','school'].includes(state.education) || child.age >= 65 && state.employment !== 'retired')) fail();
        const universityEnd = Math.max(childUniversityEndAge(child.birthYear, state.prison), state.prison ? state.prison.endYear - child.birthYear : 0);
        if (state.education === 'university' && (child.age < (state.admission ? 18 : 19) || child.age >= universityEnd || state.studyUntil !== child.birthYear + universityEnd)) fail();
        const supportedSchool=state.schoolSupport?.kind==='special'&&state.education==='specialSchool'&&state.employment==='student';
        const withoutSchool=state.schoolSupport?.kind==='home'&&state.education==='outOfSchool'&&state.employment==='none';
        if(['specialSchool','outOfSchool'].includes(state.education)&&!supportedSchool&&!withoutSchool)fail();
        if(child.age>=6&&child.age<19&&['special','home'].includes(state.schoolSupport?.kind)&&!supportedSchool&&!withoutSchool)fail();
        if (child.age < 6 && (state.education !== 'preschool' || state.employment !== 'none') || child.age >= 6 && child.age < 19 && !(child.age === 18 && state.admission && state.universityResolved) && !supportedSchool&&!withoutSchool&&(state.education !== 'school' || state.employment !== 'student')) fail();
        if (state.employment === 'employed' && ['none','student','retired'].includes(child.job) || state.employment === 'retired' && child.job !== 'retired') fail();
        if (state.firstPayYear !== null && state.firstPayYear < child.birthYear + 19 || state.migratedYear !== null && state.migratedYear < child.birthYear + 21 || state.lastVisitYear !== null && state.migratedYear === null) fail();
        transfers += state.contribution;
    }
    if (Math.abs(transfers - data.annualTransfers) > .02)
        fail();
    for (const child of life.family.children)
        if (data.grandchildren.filter((g: any) => g.parentId === child.id).length > MAX_CHILD_GRANDCHILDREN)
            fail();
    for (const row of life.history)
        if (row.annual && life.birthYear + row.age < data.observedSince && (row.annual.grandchildren !== null || row.annual.grandchildrenAlive !== null))
            fail();
}

function validateFeed(life: Record<string, any>) {
  if (life.feed === undefined) return;
  const feed = life.feed;
  object(feed); array(feed.recent, 14); object(feed.lastYears);
  const eventId = (id: unknown) => {
    string(id, 80);
    if (!/^[a-z][a-z0-9_-]*$/.test(id) || ['constructor', 'prototype', '__proto__'].includes(id)) fail();
  };
  if (Object.keys(feed.lastYears).length > 2048) fail();
  for (const [id, year] of Object.entries(feed.lastYears)) {
    eventId(id); integer(year, life.birthYear, life.year);
  }
  for (const id of feed.recent) {
    eventId(id);
    if (!Object.hasOwn(feed.lastYears, id)) fail();
  }
  if (feed.plan === null) return;
  const plan = feed.plan;
  object(plan); integer(plan.year, life.birthYear, life.year);
  integer(plan.age, 0, 110);
  if (plan.age !== plan.year - life.birthYear) fail();
  array(plan.queue, plan.age < 6 ? 2 : 3); object(plan.gates);
  if (Object.keys(plan.gates).length > 2048) fail();
  for (const [id, passed] of Object.entries(plan.gates)) {eventId(id); boolean(passed);}
  let previous = -1;
  const queued = new Set<string>();
  for (const slot of plan.queue) {
    object(slot); eventId(slot.id); number(slot.at, 0.08, 0.94);
    if (slot.at >= 0.94 || slot.at <= previous || queued.has(slot.id) ||
        feed.lastYears[slot.id] === plan.year || plan.gates[slot.id] === false) fail();
    queued.add(slot.id); previous = slot.at;
  }
}

/** Pending feed slots have one authoritative order shared by both schedulers. */
function validateTimeline(life: Record<string, any>) {
  if (life.timeline === undefined) return;
  const timeline = life.timeline;
  object(timeline); integer(timeline.year, life.year, life.year);
  integer(timeline.age, life.age, life.age); number(timeline.position, 0, 1);
  boolean(timeline.complete); array(timeline.queue, 7);
  if (timeline.financePending !== undefined) {
    boolean(timeline.financePending);
    if (timeline.complete && timeline.financePending) fail();
  }
  if (timeline.focusTime !== undefined) {
    object(timeline.focusTime);
    for (const [focus, time] of Object.entries(timeline.focusTime)) {
      oneOf(focus, ['balanced','health','knowledge','career','relationships','creativity']);
      number(time, 0, 1e6);
    }
  }
  if (timeline.stageFocusTime !== undefined) {
    object(timeline.stageFocusTime);
    for (const [focus,time] of Object.entries(timeline.stageFocusTime)) {oneOf(focus,STAGE_FOCUSES);number(time,0,1e6);}
  }
  const plan = life.feed?.plan;
  if (!plan || plan.year !== timeline.year || plan.age !== timeline.age) fail();
  if (timeline.complete && (timeline.position !== 1 || timeline.queue.length)) fail();
  let previous = timeline.position, decisions = 0;
  const ids = new Set<string>();
  const feedSlots: {id: string; at: number}[] = [];
  for (const slot of timeline.queue) {
    object(slot); oneOf(slot.kind, ['feed', 'decision', 'milestone', 'adoption']);
    string(slot.id, slot.kind === 'decision' ? 222 : 80); number(slot.at, 0, 1);
    const descendantId = slot.kind === 'decision' && parseDescendantDecision(slot.id);
    if ((!descendantId && !/^[a-zA-Z0-9_-]+$/.test(slot.id)) || ['constructor', 'prototype', '__proto__'].includes(slot.id)) fail();
    const key = `${slot.kind}:${slot.id}`;
    if (slot.at < previous || ids.has(key)) fail();
    previous = slot.at; ids.add(key);
    if (slot.kind === 'feed') feedSlots.push({id: slot.id, at: slot.at});
    else if (slot.kind === 'milestone') {
      if (slot.id !== 'survive' || slot.at !== .03 || ![1,5,15,30,50,65,80,90,100].includes(life.age)) fail();
    } else if (slot.kind === 'adoption') {
      if (slot.id !== 'move' || slot.at !== .02) fail();
    } else {
      if (++decisions > 2 || life.decisions.includes(slot.id) || life.pendingDecision?.id === slot.id) fail();
    }
  }
  if (feedSlots.length !== plan.queue.length || feedSlots.some((slot, index) =>
      slot.id !== plan.queue[index].id || slot.at !== plan.queue[index].at)) fail();
  if (timeline.scheduledDecisions !== undefined) {
    array(timeline.scheduledDecisions, 2);
    const slots = timeline.queue.filter((slot: any) => slot.kind === 'decision');
    if (slots.length !== timeline.scheduledDecisions.length) fail();
    for (let i = 0; i < slots.length; i++) {
      const decision = timeline.scheduledDecisions[i]; object(decision);
      if (decision.id !== slots[i].id) fail();
      validateDecision(life, decision);
    }
  }

}

function validateDecision(value: Record<string, any>, decision: any) {
    if (!value.alive) fail();
    object(decision); params(decision.params); oneOf(decision.age, [value.age]);
    const reflection = decision.type === 'reflection';
    let ids: string[];
    if (reflection) {
      if (!REFLECTION_AGES.includes(value.age) || decision.id !== `reflection-${value.age}` || decision.key !== `decision.reflection.${value.age}` || value.reflections[String(value.age)] !== undefined) fail();
      ids = ['reflect', 'skip'];
    } else {
      oneOf(decision.type, ['choice']);
      const health = value.healthcare.episodes.find((episode: any) => episode.id === decision.id);
      const descendant = parseDescendantDecision(decision.id);
      const academicAge=academicDecisionAge(decision.id);
      if(isPhysicalEquipmentDecision(decision.id)){const expected=physicalEquipmentDecision(value as Life);if(!expected||JSON.stringify(expected)!==JSON.stringify(decision))fail();ids=expected.choices.map(c=>c.id);
      }else if(isMajorDecision(decision.id)){const expected=universityMajorDecision(value as Life);if(!expected||JSON.stringify(expected)!==JSON.stringify(decision))fail();ids=expected.choices.map(c=>c.id);
      }else if(isStudyGraduation(decision.id)){const expected=studyGraduationDecision(value as Life);if(!expected||JSON.stringify(expected)!==JSON.stringify(decision))fail();ids=expected.choices.map(c=>c.id);
      }else if(isStudyDecision(decision.id)){
        const expected=studyDecision(value as Life);if(!expected||JSON.stringify(expected)!==JSON.stringify(decision))fail();ids=expected.choices.map(c=>c.id);
      }else if(isHobbyDecision(decision.id)&&value.hobbyState?.offer?.age===value.age){
        const expected=hobbyDecision(value as Life);if(!expected||expected.id!==decision.id||expected.key!==decision.key||Object.keys(decision.params).length!==1||decision.params.replace!==expected.params.replace)fail();ids=expected!.choices.map(c=>c.id);
        if(value.pendingDecision?.id===decision.id){const eligible=new Set(hobbyOptionsFor(value as Life));if(value.hobbyState.offer.options.some((id:any)=>!eligible.has(id))||(replacedHobby(value.hobbies)?.id??'')!==decision.params.replace)fail();}
      }else if(typeof decision.id==='string'&&decision.id.startsWith('guardian-')){
        const expected=guardianDecision(value as Life);
        // Earlier saves used the plural heading for one child; update wording only.
        if(expected?.key==='decision.guardianOne'&&decision.key==='decision.guardian')decision.key=expected.key;
        if(!expected||decision.id!==expected.id||decision.key!==expected.key||value.decisions.includes(decision.id)||Object.keys(decision.params).length!==Object.keys(expected.params).length||Object.entries(expected.params).some(([key,param])=>decision.params[key]!==param))fail();
        ids=expected!.choices.map(c=>c.id);
      }else if(isMilitaryRetirement(decision.id)){
        const r=value.academics?.academy?.employment?.retirement,o=r?.offer;
        if(!o||r.status!=='offered'||o.age!==value.age||decision.id!==`militaryRetirement-${value.age}`||decision.key!=='decision.militaryRetirement'||decision.params.rank!==o.rank||decision.params.amount!==o.pensionPreview/12||Object.keys(decision.params).length!==2||value.decisions.includes(decision.id))fail();
        ids=['militaryRetire','militaryOther'];
      }else if(isOfficerPromotion(decision.id)){
        const r=value.academics?.academy?.employment?.career?.promotion;
        if(!r||r.status!=='offered'||r.age!==value.age||decision.id!==`officerPromotion-${value.age}`||decision.params.rank!==r.rank||Object.keys(decision.params).length!==1||decision.key!==(r.rank===0?'decision.officerPromotion.field':'decision.officerPromotion.general')||value.decisions.includes(decision.id))fail();
        ids=['officerAccept','officerDecline'];
      }else if(isSchoolWithdrawalDecision(decision.id)){
        const p=value.academics?.secondaryProgress?.pending;
        if(!p||p.age+1!==value.age||decision.id!==`schoolWithdrawal-${value.age}`||decision.key!==`decision.schoolWithdrawal.${p.reason}`||decision.params.country!==p.country||Object.keys(decision.params).length!==1||value.decisions.includes(decision.id))fail();
        ids=['schoolStay','schoolGed','schoolWork'];
      }else if(isUpperSecondaryDecision(decision.id)){
        const r=value.academics?.upperSecondary;
        if(!value.learning||!value.academics?.upperFacts||!value.academics?.circumstances||!r||r.status!=='pending'||r.route!=='choice'||r.age!==value.age||decision.id!==`upperSecondary-${value.age}`||decision.key!=='decision.upperSecondary'||value.decisions.includes(decision.id)||decision.params.country!==r.country||Object.keys(decision.params).length!==1||!Array.isArray(r.choices))fail();
        ids=r.choices.map((key:keyof typeof upperChoiceIds)=>upperChoiceIds[key]);
      } else if(isUniversityRetakeDecision(decision.id)){
        const expected=universityRetakeDecision(value as Life);if(!expected||decision.id!==expected.id||decision.key!==expected.key||decision.params.country!==expected.params.country||Object.keys(decision.params).length!==1)fail();ids=expected!.choices.map(c=>c.id);
      } else if(isCollegeDecision(decision.id)){
        const expected=collegeDecision(value as unknown as Life);
        if(!expected||decision.id!==expected.id||decision.key!==expected.key||decision.params.country!==expected.params.country||Object.keys(decision.params).length!==1)fail();
        ids=expected!.choices.map(c=>c.id);
      } else if(isLowerSecondaryDecision(decision.id)){
        const receipt=value.academics?.lowerSecondary;
        if(!value.learning||!value.academics?.circumstances||!receipt||receipt.status!=='pending'||receipt.age!==value.age||decision.id!==`lowerSecondary-${value.age}`||value.decisions.includes(decision.id)||!catalog.has(decision.params.country)||decision.params.country!==receipt.country||Object.keys(decision.params).length!==1)fail();
        if(decision.key!==(receipt.route==='banned'?'decision.lowerSecondaryBanned':'decision.lowerSecondary'))fail();
        ids=receipt.route==='banned'?['secondaryHome','secondaryWork']:['secondaryGo','secondaryWork'];
      } else if (academicAge !== null) {
        const degree=value.academics?.lastGraduation;
        const phd=decision.id.startsWith('academicPhd-');
        if(academicAge!==value.age||decision.key!==(phd?'decision.academicPhd':'decision.academicAfterUniversity')||value.decisions.includes(decision.id)||degree?.stage!==(phd?'graduate':'university')||degree.age!==value.age||!catalog.has(decision.params.country))fail();
        if(phd){
          if(value.academics.phdInvitation?.age!==value.age||value.academics.phdInvitation.offered!==true||Object.keys(decision.params).length!==1)fail();
          ids=['academicPhdAccept','academicPhdWork'];
        }else{
          oneOf(decision.params.working,[0,1]);if(Object.keys(decision.params).length!==2)fail();
          ids=[...(decision.params.working?['academicKeep']:[]),'academicWork','academicGraduate'];
          const abroad=graduateStudyAccess(value as Life);
          if(abroad?.eligible){
            // Existing domestic-only pending menus can gain the newly implemented route.
            if(Array.isArray(decision.choices)&&decision.choices.length===ids.length&&decision.choices.every((c:any,i:number)=>c?.id===ids[i]))decision.choices.push({id:'academicGraduateAbroad',key:'choice.academicGraduateAbroad',params:{amount:abroad.cost}});
            ids.push('academicGraduateAbroad');
            if(decision.choices.find((c:any)=>c.id==='academicGraduateAbroad')?.params.amount!==abroad.cost)fail();
          }
        }
      } else if (health) {
        if (health.id !== value.healthcare.activeEpisodeId || decision.key !== healthDecisionKey(health.level) || value.decisions.includes(decision.id) || decision.params.name !== health.patientName) fail();
        ids = health.level === 'followup' ? FOLLOWUP_TREATMENTS : HEALTH_TREATMENTS;
      } else if (descendant) {
        const subject=descendantSubject(value as Life,descendant.childId),child=subject?.person,state=subject?.state;
        if(!child?.alive||!state||value.decisions.includes(decision.id))fail();
        if(!canResolveDescendantChoice(child,state,descendant.kind,value.year))fail();
        const expected=descendantDecision(value as Life,child,descendant.kind);
        if(decision.key!==expected.key||Object.keys(decision.params).length!==Object.keys(expected.params).length||Object.entries(expected.params).some(([key,value])=>decision.params[key]!==value))fail();
        ids=[...descendantChoiceIds(state,descendant.kind)];
      } else {
      if(decision.id==='school'&&value.academics&&!primaryReturnEligible(value as unknown as Life))fail();
      const job = isJobDecision(decision.id);
      const repeat=recurring(decision.id);
      const action=activity(decision.id);
      const key=action?(action.kind==='familyPlanning'?'children':action.kind==='adoptPet'?'pet':action.kind):job?'job':repeat?repeat.kind:decision.id;
      if ((!job && !repeat && !action && !Object.hasOwn(decisionChoices, decision.id)) || decision.key !== `decision.${key}` || value.decisions.includes(decision.id)) fail();
      if(action){if(action.kind==='askKids'||action.age!==value.age)fail();if(action.kind==='migration'&&value.migration.offerCountry===null)fail();if(action.kind==='divorce'&&!value.family.partner)fail();}
      else if (repeat) {
        if(repeat.age!==value.age)fail();
        if(repeat.kind==='marriage'&&!value.family.partner?.alive)fail();
        if(repeat.kind==='care'&&!value.family.children[repeat.index!]?.alive)fail();
        if(repeat.kind==='secondWife'&&(!value.family.partner?.alive||value.family.secondPartner))fail();
        if(repeat.kind==='remarriage'&&value.family.partner?.alive)fail();
      } else if (!job && !fixedDecisionAt(decision.id, value.age)) fail();
      if (job && (decision.id !== `job-${value.age}` || (value.jobOfferBatch ? value.jobOffers.length > 3 || !occupationQuoteCurrent(value as Life) : value.jobOffers.length !== 3))) fail();
      ids = action?activityChoices[action.kind]:job ? [...value.jobOffers.map((o:any)=>o.id), 'wait'] : repeat?.kind==='care'?childcareChoices(value as Life):repeat?recurringChoices[repeat.kind]:decisionChoices[decision.id];
      }
    }
    // Accept the exact historical list before normalizing; arbitrary additions still fail.
    const careDecision=recurring(decision.id);
    if(careDecision?.kind==='care'){
      const legacy=recurringChoices.care.filter(id=>id!=='grandparents'||value.family.parents.some((parent:any)=>parent.alive));
      if(Array.isArray(decision.choices)&&decision.choices.length===legacy.length&&decision.choices.every((c:any,i:number)=>c?.id===legacy[i]))ids=legacy;
    }
    array(decision.choices, 6);
    if (decision.choices.length !== ids.length) fail();
    decision.choices.forEach((choice: any, i: number) => {
      object(choice); oneOf(choice.id, [ids[i]]); oneOf(choice.key, [...(isMajorDecision(decision.id)?[universityMajorDecision(value as Life)?.choices[i]?.key]:[]),...(isStudyGraduation(decision.id)?[studyGraduationDecision(value as Life)?.choices[i]?.key]:[]),...(isStudyDecision(decision.id)?[studyDecision(value as Life)?.choices[i]?.key]:[]),...(isCollegeDecision(decision.id)?[collegeDecision(value as Life)?.choices[i]?.key]:[]),...(isHobbyDecision(decision.id)&&value.hobbyState?.offer?.age===value.age?[hobbyDecision(value as Life)?.choices[i]?.key]:[]),decision.id === 'hobby' ? `hobby.${ids[i]}` : decision.id.startsWith('activity-adoptPet-')&&PET_KINDS.includes(ids[i] as any)?`pet.${ids[i]}`:`choice.${ids[i]}`]); params(choice.params);
      if(isHobbyDecision(decision.id)&&value.hobbyState?.offer?.age===value.age){if(choice.key!==hobbyDecision(value as Life)!.choices[i].key||Object.keys(choice.params).length)fail();}
      // Accept the historical college label, then render the current employment-aware text.
      if(isCollegeDecision(decision.id))choice.key=collegeDecision(value as Life)!.choices[i].key;
      if (decision.id.startsWith('health-')) { const episode = value.healthcare.episodes.find((episode: any) => episode.id === decision.id); if (choice.params.amount !== treatmentCost(value as Life, episode, choice.id)) fail(); }
      if(decision.id.startsWith('guardian-')){const expected=guardianDecision(value as Life)!.choices[i];if(Object.keys(choice.params).length!==1||choice.params.amount!==expected.params.amount)fail();}
      const descendant=parseDescendantDecision(decision.id);
      if(descendant){const child=descendantSubject(value as Life,descendant.childId)!.person;if(choice.params.amount!==descendantChoiceCost(value as Life,child,descendant.kind,choice.id))fail();}
      if (isJobDecision(decision.id) && i < value.jobOffers.length && choice.params.amount !== value.jobOffers[i].income) fail();
    });
}

function validateHobbyPhysicalReceipts(life:Life,hobby:any):void{
 const p=hobby.progress;
 if(p.sidelinesAge!==undefined){
  integer(p.sidelinesAge,Math.max(8,p.since),Math.min(95,life.age));
  if(p.level<2||p.sidelinesAge<12&&p.level<3||!hobbyPracticeBlocked(life,hobby.id,p.sidelinesAge))fail();
 }
 if(p.milestonesSuppressedAge!==undefined){
  integer(p.milestonesSuppressedAge,Math.max(8,p.since),Math.min(95,life.age));
  if(p.level<3||p.sidelinesAge===undefined||p.sidelinesAge>p.milestonesSuppressedAge||!hobbyPracticeBlocked(life,hobby.id,p.milestonesSuppressedAge))fail();
 }
 if(p.returnedToSportAge!==undefined){
  integer(p.returnedToSportAge,p.since+1,life.age);
  const c=life.physicalState?.condition,record=c?.sportsAdjustment;
  if(!record||record.hobby!==hobby.id||record.age!==p.returnedToSportAge||p.since>=c!.since||p.level<2||hobbyPracticeBlocked(life,hobby.id,p.returnedToSportAge)||!physicalSportPool(life,p.returnedToSportAge)?.some(id=>`sp_${id}`===hobby.id))fail();
 }
}
function validateLife(value: unknown): Life {
  object(value);
  // Upgrade the previous version-1 layout without rerolling any identity or RNG.
  if (value.mechanicsVersion === undefined) {
    object(value.stats); object(value.family);
    value.mechanicsVersion = 2; value.stats.debt = 0;
    value.temperament = { kind: value.age >= 2 ? 'curious' : 'undecided', settled: value.age >= 5 };
    value.talents = []; value.hobbies = [];
    value.schooling = { enrolled: value.stats.employment === 'student', droppedOut: false, childLabor: false, years: Math.max(0, Math.min(16, value.age - 6)) };
    value.budget = emptyBudget(); value.belongings = { phone: false, transport: 'none', housing: 'family', housingValue: 0 };
    value.residence = value.stats.birthPlaceType; value.jobOffers = [];
    value.family.married = value.family.partner !== null; value.family.marriageAge = value.family.married ? Math.min(value.age, 28) : null;
  }
  if (value.mechanicsVersion === 2) {
    value.mechanicsVersion = 3;
    value.training = { kind:null,endsAt:null,previousIncome:0,previousJob:'none' }; value.justice = { prisonUntil:null };
    value.relationship = { status:value.family.married?'married':value.family.partner?'dating':'single',childPlan:'open',nextChildDecisionAge:Math.max(24,value.age+1),partnerIncome:0 };
    value.care = { until:null,who:null,previousIncome:0,previousJob:'none',previousPartnerIncome:0,daycareUntil:null,handledChildren:[] };
    value.opportunities = { lastRiskAge:value.age<17?-10:value.age,lastDebtAge:value.age<18?-10:value.age,nextNightSchoolAge:Math.max(23,value.age+1),nextRelationshipAge:Math.max(22,value.age+1),moneylenderUntil:null };
  }
  if(value.mechanicsVersion===3){
    value.mechanicsVersion=4;value.lifestyle={diet:'balanced',insurance:'basic',gifts:'modest'};
    value.annualSpending={health:0,education:0,experiences:0,giving:0,family:0};value.pets=[];
    value.dailyTheme=getDailyTheme(value.settings?.dailyThemeDay);value.settings.dailyThemeDay=value.dailyTheme.day;
    value.migration={birthCountry:structuredClone(value.country),offerCountry:null,lastMoveAge:null,familyCountry:null,moves:[]};
  }
  if (value.mechanicsVersion === 4) {
    value.mechanicsVersion = 5; value.healthcare = emptyHealthcare();
    value.healthcare.lastCheckedAge = value.age - 1;
    array(value.conditions, 4);
    value.healthcare.chronic = value.conditions.map((_condition: unknown, index: number) => ({ id: `condition-${index}`, diagnosis: 'longTerm', diagnosedAge: value.age, managed: false, nextReviewAge: value.age + 3 }));
  }
  if (value.mechanicsVersion === 5) {
    // Old saves never captured these facts. Do not infer earlier years from today's state.
    array(value.history, 111);
    for (const entry of value.history) { object(entry); entry.annual = null; }
    array(value.companions, 4);
    for (const companion of value.companions) { object(companion); companion.lastJob = jobs.includes(companion.job) && !['none', 'student', 'retired'].includes(companion.job) ? companion.job : null; }
    object(value.stats);
    // The current role is observed state, even when retirement will replace it next year.
    // Record only this checkpoint; earlier jobs and already-retired roles remain unknown.
    value.career = jobs.includes(value.stats.job) && !['none', 'student', 'retired'].includes(value.stats.job)
      ? [{ age: value.age, job: value.stats.job }] : [];
    value.mechanicsVersion = 6;
  }
  if (value.mechanicsVersion === 6) {
    object(value.family); array(value.family.children, FAMILY_LIMITS.children); array(value.history, 111);
    value.descendants = emptyDescendants(value.seed, value.year);
    for (const child of value.family.children) { person(child, value.year, false, true); addChildProgress(value as Life, child, true); }
    for (const row of value.history) { object(row); if (row.annual !== null) { object(row.annual); row.annual.grandchildren = null; row.annual.grandchildrenAlive = null; } }
    value.mechanicsVersion = 7;
  }
  oneOf(value.mechanicsVersion, [7]);
  oneOf(value.version, [1]); string(value.id, 100); string(value.name); string(value.certificate);
  integer(value.seed, 0, 0xffffffff); integer(value.rng, 0, 0xffffffff);
  integer(value.age, 0, 110); integer(value.birthYear, 1990, 2080); integer(value.year, 1990, 2190);
  if (value.year !== value.birthYear + value.age) fail();
  oneOf(value.era, ['past', 'today', 'future']);
  if (value.birthYear !== ({ past: 1990, today: 2026, future: 2080 } as const)[value.era as 'past']) fail();
  sex(value.sex); boolean(value.alive); nullableAge(value.deathAge);
  if (value.alive ? value.deathAge !== null || value.cause !== null : value.deathAge !== value.age || !causes.has(value.cause)) fail();
  const normalizedCountry = country(value.country);
  if(value.birthDevelopment!==undefined)validateBirthDevelopment(value.birthDevelopment,value.sex);
  if (value.learning !== undefined) {
    object(value.learning); oneOf(value.learning.version, [1]);
    number(value.learning.effort, -1.4, 1.6); object(value.learning.talents);
    if(value.learning.lastSettledAge!==undefined)integer(value.learning.lastSettledAge,0,value.age);
    if(value.learning.support!==undefined){
      const support=value.learning.support;object(support);boolean(support.ged);boolean(support.adultCourse);
      if(support.goodTeacherAge!==null)integer(support.goodTeacherAge,0,value.age);
    }
    const developmental=value.birthDevelopment?.developmental;
    const studyMinimum=developmental&&(developmental.kind==='intellectual'||developmental.intellectualDisability)
      ?Math.min(-4.53,-2.4-1.2*(developmental.supportLevel-1)-.94):-4.53;
    // Only the source developmental study draw extends the ordinary talent range.
    // Keep legacy descriptors with ordinary talents valid; never redraw on import.
    for (const domain of TALENT_DOMAINS) number(value.learning.talents[domain], domain==='study'?studyMinimum:-4.53, 4.53);
  }
  validateDevelopmentObservations(value as unknown as Life);
  if (value.academics !== undefined) {
    const academic=value.academics;
    object(academic);oneOf(academic.version,[1]);integer(academic.qualification,0,5);
    if(academic.origin!==undefined){oneOf(academic.origin,['birth']);if(!value.birthDevelopment||!value.learning||!academic.primaryFacts||!academic.upperFacts||!academic.collegeFacts||!academic.circumstances)fail();}
    boolean(academic.doctorate);boolean(academic.medicine);
    if(academic.doctorate&&academic.qualification<5)fail();
    if(academic.studyCountry!==null&&!catalog.has(academic.studyCountry))fail();
    if(academic.supportedAdult!==undefined){
      const r=academic.supportedAdult,d=value.birthDevelopment?.developmental;object(r);
      if(!d||d.supportLevel<2||!academic.circumstances?.developmentalProtection||academic.supportedSchool?.adultReadyAge===undefined)fail();
      integer(r.age,18,value.age);if(r.age<academic.supportedSchool.adultReadyAge||!catalog.has(r.country))fail();
      oneOf(r.kind,['shelteredWork','dayActivities','home','supportedJob','familyShop','familyFarm']);boolean(r.formal);number(r.entryIncome,0,1e12);
      if(['dayActivities','home'].includes(r.kind)){if(r.percentile!==null||r.entryIncome!==0||r.formal||r.role!==undefined)fail();}
      else {number(r.percentile,0,1);if(d.supportLevel!==2)fail();}
      if(r.kind==='shelteredWork'&&(r.percentile!==.02||r.formal||r.role!==undefined))fail();
      if(r.kind==='supportedJob'){oneOf(r.role,['cleaner','warehouse','cook','shop','artisan','factory']);if(!r.formal)fail();}
      if(r.kind==='familyShop'&&(r.role!=='vendor'||r.formal)||r.kind==='familyFarm'&&(r.role!=='farm'||r.formal))fail();
    }
    if(academic.supportedSchool!==undefined){
      const r=academic.supportedSchool,d=value.birthDevelopment?.developmental;object(r);
      if(!d||d.supportLevel<2||!academic.circumstances?.developmentalProtection)fail();
      oneOf(r.kind,['specialSchool','specialClass','home']);integer(r.startedAge,6,Math.min(6,value.age));
      integer(r.lastTransitionAge,6,value.age);
      if(r.kind==='specialClass'&&d.supportLevel===3)fail();
      if(r.endedAge!==undefined)integer(r.endedAge,6,value.age);
      if(r.kind==='home'&&r.endedAge!==6)fail();
      if(r.adultReadyAge!==undefined){integer(r.adultReadyAge,18,value.age);if(r.endedAge===undefined||r.endedAge>r.adultReadyAge)fail();}
      if(r.endedAge!==undefined&&academic.enrollment)fail();
    }
    if(academic.major!==undefined){oneOf(academic.major,MAJOR_IDS);if(academic.major==='mil'||academic.medicine!==(academic.major==='med')||academic.majorRecord?.status!=='resolved')fail();}
    if(academic.majorRecord!==undefined){
      const r=academic.majorRecord;object(r);integer(r.age,0,value.age);if(!catalog.has(r.country)||academic.origin!=='birth')fail();oneOf(r.stage,['university','graduate']);oneOf(r.status,['pending','resolved']);
      const o=r.offer;object(o);array(o.options,5);if(o.options.length!==5||new Set(o.options).size!==5)fail();for(const id of o.options){oneOf(id,MAJOR_IDS);if(id==='mil')fail();}
      boolean(o.medicineOffered);if(o.medicineOffered!==o.options.includes('med'))fail();array(o.preferred,3);for(const id of o.preferred)oneOf(id,o.options);
      array(o.auditions,2);if(new Set(o.auditions).size!==o.auditions.length)fail();for(const id of o.auditions){oneOf(id,['mus','dnc']);oneOf(id,o.options);}
      if(o.hobby!==undefined){object(o.hobby);oneOf(o.hobby.major,o.options);string(o.hobby.id,40);}
      if(o.talent!==undefined)oneOf(o.talent,['body','art','music','hands','words']);
      if(r.status==='pending'){if(r.choice!==undefined||r.result!==undefined||academic.major!==undefined)fail();}
      else {oneOf(r.choice,o.options);const result=r.result;object(result);oneOf(result.major,MAJOR_IDS);if(result.major==='mil'||result.major!==academic.major)fail();oneOf(result.outcome,['chosen','competitiveRejected','auditionRejected','auditionAccepted']);oneOf(result.knowledge,[2]);
        const expectedHappiness={chosen:0,competitiveRejected:-3,auditionRejected:-4,auditionAccepted:4};oneOf(result.happiness,[expectedHappiness[result.outcome as keyof typeof expectedHappiness]]);
        if(['chosen','auditionAccepted'].includes(result.outcome)&&result.major!==r.choice)fail();
        if(result.outcome==='competitiveRejected'){
          const facts={ppp:catalog.get(r.country)!.ppp};
          if(!majorCompetition(facts,r.choice))fail();
          const alternatives=o.options.filter((id:UniversityMajor)=>id!==r.choice&&!majorCompetition(facts,id)&&!['mus','dnc','med'].includes(id));
          const preferred=o.preferred.find((id:UniversityMajor)=>alternatives.includes(id));
          const allowed=preferred?[preferred]:alternatives.length?alternatives:['hum','soc','biz','edu','sci','agr','media','hosp'];
          oneOf(result.major,allowed);
        }
        if(['mus','dnc'].includes(r.choice)&&!result.outcome.startsWith('audition'))fail();
        if(result.outcome.startsWith('audition')&&!['mus','dnc'].includes(r.choice))fail();
        if(result.outcome==='auditionRejected'&&!(r.choice==='mus'?['art','edu','media']:['pe','art','edu']).includes(result.major))fail();
        if(result.hobbyGain!==undefined){object(result.hobbyGain);if(result.outcome!=='auditionAccepted')fail();oneOf(result.hobbyGain.id,[r.choice==='mus'?'music':'dance']);oneOf(result.hobbyGain.amount,[1]);}
      }
    }
    if(academic.studyAccess!==undefined){const f=academic.studyAccess;object(f);oneOf(f.ethnicity,['none','uyghur','rohingya']);for(const key of ['naturalized','eastGerman','recentlyFled'])boolean(f[key]);}
    if(academic.academyAccess!==undefined){const f=academic.academyAccess;object(f);oneOf(f.disability,[null,'hear','other']);for(const key of ['papersValid','criminalRecord','idol'])boolean(f[key]);}
    if(academic.collegeFacts!==undefined){
      object(academic.collegeFacts);
      for(const key of ['adhd','dyslexia','dyslexiaDiagnosed','unsupportedAutism','politicallyMarkedParent','rohingyaCamp','rohingyaRakhine'])boolean(academic.collegeFacts[key]);
    }
    if(academic.primaryFacts!==undefined){
      const f=academic.primaryFacts;object(f);
      for(const key of ['rich','refugee','irregular','learningCentreOnly'])boolean(f[key]);
      array(f.absentParentIds,2);if(new Set(f.absentParentIds).size!==f.absentParentIds.length||f.absentParentIds.some((id:any)=>!value.family.parents.some((p:any)=>p.id===id)))fail();
      if(f.germanHistory!==undefined){object(f.germanHistory);boolean(f.germanHistory.eastGermanOrigin);boolean(f.germanHistory.leftEastGermany);}
    }
    if(academic.primary!==undefined){
      object(academic.primary);
      if(academic.primary.lateEntry!==undefined){
        const r=academic.primary.lateEntry;object(r);integer(r.age,8,Math.min(8,value.age));oneOf(r.outcome,['enrolled','help','rejected']);
        if(!catalog.has(r.country)||!value.decisions.includes('school'))fail();
      }
      if(academic.primary.lastRetentionAge!==undefined)integer(academic.primary.lastRetentionAge,6,value.age);
      if(academic.primary.transferredAge!==undefined){integer(academic.primary.transferredAge,6,value.age);if(academic.primary.placement?.kind!=='private'||academic.primary.lastRetentionAge===undefined||academic.primary.lastRetentionAge<academic.primary.transferredAge)fail();}
      if(academic.primary.placement!==undefined){
        const placement=academic.primary.placement;object(placement);
        integer(placement.age,5,Math.min(5,value.age));oneOf(placement.kind,['private','public']);
      }
      if(academic.primary.entry!==undefined){
        const entry=academic.primary.entry;object(entry);
        integer(entry.age,6,Math.min(6,value.age));oneOf(entry.kind,['school','homeSchool','learningCentre','outOfSchool']);
        if(!catalog.has(entry.country))fail();
      }
    }
    if(academic.circumstances!==undefined){
      const c=academic.circumstances;object(c);
      for(const key of ['homeSchool','learningCentre','developmentalProtection'])boolean(c[key]);
      if(c.topMarkAge!==null)integer(c.topMarkAge,0,value.age);
      object(c.accessModifiers);
      for(const key of ['disclosedDisabilityMultiplier','upperSecondaryMultiplier','schoolEthnicityMultiplier','universityEthnicityMultiplier'])if(c.accessModifiers[key]!==undefined)number(c.accessModifiers[key],0,100);
      if(c.accessModifiers.intellectualDisability!==undefined)boolean(c.accessModifiers.intellectualDisability);
      if(c.accessModifiers.wealthBoost!==undefined)oneOf(c.accessModifiers.wealthBoost,[5,10]);
    }
    if(academic.lowerSecondary!==undefined){
      const entry=academic.lowerSecondary;object(entry);integer(entry.age,10,value.age);
      if(!catalog.has(entry.country)||academic.qualification<1)fail();
      oneOf(entry.route,['homeSchool','learningCentre','automatic','freeSchool','banned','application']);
      oneOf(entry.status,['pending','enrolled','outOfSchool']);
      if(['homeSchool','automatic','freeSchool'].includes(entry.route)&&entry.status!=='enrolled')fail();
      if(entry.route==='learningCentre'&&entry.status==='pending'||entry.route==='banned'&&entry.status==='enrolled')fail();
      if(entry.retry!==undefined){boolean(entry.retry);if(entry.retry&&(entry.route!=='application'||entry.status!=='outOfSchool'))fail();}
    }
    if(academic.upperFacts!==undefined){
      const facts=academic.upperFacts;object(facts);
      for(const key of ['refugee','irregular','refugeeCamp','unregisteredBirth','militaryAcademy','studyAbroad'])boolean(facts[key]);
      integer(facts.bullyingCount,0,10000);
      array(facts.hobbies,100);const seen=new Set();
      for(const h of facts.hobbies){object(h);string(h.id,40);if(!/^[a-z_]+$/.test(h.id)||seen.has(h.id))fail();seen.add(h.id);integer(h.since,0,value.age);number(h.level,0,1000);}
    }
    if(academic.upperSecondary!==undefined){
      const entry=academic.upperSecondary;object(entry);integer(entry.age,10,value.age);
      if(!catalog.has(entry.country)||academic.qualification<2)fail();
      oneOf(entry.route,['choice','homeSchool','camp','freeSchool']);
      oneOf(entry.status,['pending','enrolled','outOfSchool']);
      if(entry.route==='choice'){
        array(entry.choices,4);if(entry.choices.length<2||entry.choices[0]!=='go'||!entry.choices.includes('voc')||new Set(entry.choices).size!==entry.choices.length)fail();
        for(const choice of entry.choices)oneOf(choice,['go','arts','voc','work']);
      }else if(entry.choices!==undefined)fail();
      if(['homeSchool','freeSchool'].includes(entry.route)&&entry.status!=='enrolled'||entry.route==='camp'&&entry.status!=='outOfSchool')fail();
    }
    if(academic.specialistSchool!==undefined){
      const specialist=academic.specialistSchool;object(specialist);oneOf(specialist.kind,['art','sport']);string(specialist.hobby,40);
      if(specialist.kind==='art'&&!['art','music','dance','drama','crafts','photo'].includes(specialist.hobby)||specialist.kind==='sport'&&specialist.hobby!=='sport'&&!/^sp_[a-z_]{1,32}$/.test(specialist.hobby))fail();
      if(academic.upperSecondary?.status!=='enrolled')fail();
    }
    if(academic.secondaryProgress!==undefined){
      const progress=academic.secondaryProgress;object(progress);integer(progress.settledAge,0,value.age);boolean(progress.answered);boolean(progress.committedToStay);
      if(progress.answeredAge!==undefined){integer(progress.answeredAge,0,value.age);if(!progress.answered)fail();}
      if(progress.committedToStay&&!progress.answered)fail();
      if(progress.pending!==null){
        const pending=progress.pending;object(pending);integer(pending.age,0,value.age);boolean(pending.mandatory);
        if(pending.age!==progress.settledAge||progress.answered||!catalog.has(pending.country))fail();
        oneOf(pending.reason,['bullying','marks','money','work','exam']);
      }
    }
    if(academic.equivalency!==undefined){
      const exam=academic.equivalency;object(exam);oneOf(exam.target,[1,2,3]);
      if(exam.examAt!==null)integer(exam.examAt,1,value.age+1);
      if(exam.lastResult!==undefined){object(exam.lastResult);integer(exam.lastResult.age,0,value.age);boolean(exam.lastResult.passed);}
      if(exam.highSchoolPassAge!==undefined){integer(exam.highSchoolPassAge,0,value.age);if(academic.qualification<3)fail();}
      if(exam.collegePending!==undefined){boolean(exam.collegePending);if(exam.collegePending&&exam.highSchoolPassAge===undefined)fail();}
    }
    if(academic.college!==undefined){
      const college=academic.college;object(college);integer(college.age,1,value.age);
      if(!catalog.has(college.country)||academic.qualification<3)fail();
      array(college.choices,6);if(college.choices.length<2||college.choices[0]!=='apply'||college.choices[1]!=='work'||new Set(college.choices).size!==college.choices.length)fail();
      for(const choice of college.choices)oneOf(choice,['apply','work','abroad','army','navy','air']);
      oneOf(college.academyOffer,[null,'threeBranches','jp','cn','generic']);
      if(!!college.academyOffer!==college.choices.includes('army')||college.choices.includes('navy')!==(college.academyOffer==='threeBranches')||college.choices.includes('air')!==(college.academyOffer==='threeBranches'))fail();
      oneOf(college.kind,['ordinary','equivalency']);oneOf(college.status,['pending','enrolled','rejected','work','blocked','abroad']);
      if(college.status==='abroad'&&(!college.choices.includes('abroad')||!academic.overseasApplication||academic.overseasApplication.age<college.age))fail();
      if(college.kind==='equivalency'&&(academic.equivalency?.highSchoolPassAge===undefined||academic.equivalency.highSchoolPassAge>college.age||academic.equivalency.collegePending!==false))fail();
      if(college.closureYear!==null){integer(college.closureYear,1950,2100);if(college.status!=='blocked')fail();}
    }
    if(academic.commissionFacts!==undefined){
      const facts=academic.commissionFacts;object(facts);number(facts.workShare,0,1);number(facts.migrationPenalty,0,1);
      for(const key of ['reducedHours','reducedWork','familyCanHelp','rohingyaCamp'])boolean(facts[key]);
      if(facts.partyToJoin!==null)string(facts.partyToJoin,80);
    }
    if(academic.academy!==undefined){
      const academy=academic.academy;object(academy);integer(academy.startedAge,1,value.age);oneOf(academy.major,['mil']);oneOf(academy.branch,['army','navy','air','jp','cn','generic']);
      if(academic.college?.status!=='enrolled'||!academic.college.academyOffer||academy.startedAge!==academic.college.age)fail();
      if(academy.commissionedAge!==undefined){integer(academy.commissionedAge,academy.startedAge+4,value.age);if(academic.qualification<4)fail();}
      if(academy.employment!==undefined){object(academy.employment);if(academy.commissionedAge===undefined||academy.employment.formal!==true)fail();number(academy.employment.percentile,0,1);if(academy.employment.party!==null)string(academy.employment.party,80);}
      if(academy.employment?.retirementFacts!==undefined){
        const f=academy.employment.retirementFacts;object(f);integer(f.age,academy.commissionedAge,value.age);integer(f.formalYears,0,f.age);integer(f.civilYears,0,f.formalYears);number(f.careerIncome,0,1e15);if(f.careerPercentile!==null)number(f.careerPercentile,0,1);
        if(!academy.employment.career)fail();
      }
      if(academy.employment?.retiredPension!==undefined){number(academy.employment.retiredPension,0,1e15);const retirement=academy.employment.retirement;if(!retirement||retirement.status!=='resolved'||retirement.choice!=='retire')fail();}
      if(academy.employment?.retirement!==undefined){
        const record=academy.employment.retirement;object(record);oneOf(record.status,['offered','resolved']);
        const offer=record.offer;object(offer);oneOf(offer.rank,[0,1,2]);integer(offer.age,Math.max(academy.commissionedAge,militaryRetirementAge(true,offer.rank)),value.age);number(offer.pensionPreview,0,1e15);
        array(offer.choices,2);if(offer.choices.length!==2||offer.choices[0]!=='retire'||offer.choices[1]!=='other')fail();
        if(record.status==='offered'){if(record.choice!==undefined||record.outcome!==undefined)fail();}
        else {
          oneOf(record.choice,['retire','other']);const outcome=record.outcome;object(outcome);
          oneOf(outcome.handledAge,[offer.age]);oneOf(outcome.lastJob,['soldier']);number(outcome.careerIncome,0,1e15);number(outcome.careerPercentile,0,1);number(outcome.income,0,outcome.careerIncome);
          if(record.choice==='retire'){
            oneOf(outcome.job,['retired']);oneOf(outcome.retired,[true]);number(outcome.pension,0,1e15);oneOf(outcome.happiness,[4]);oneOf(outcome.health,[3]);
            if(outcome.oldJob!==undefined||outcome.oldLookAge!==undefined||outcome.seekingYears!==undefined)fail();
          }else{
            oneOf(outcome.job,['none']);oneOf(outcome.retired,[false]);oneOf(outcome.income,[0]);oneOf(outcome.oldJob,['soldier']);oneOf(outcome.seekingYears,[0]);oneOf(outcome.oldLookAge,[offer.age]);oneOf(outcome.happiness,[-2]);oneOf(outcome.health,[0]);if(outcome.pension!==undefined)fail();
          }
        }
      }
      if(academy.employment?.pensionIndex!==undefined){
        const e=academy.employment,index=e.pensionIndex;object(index);
        const starts=[e.pension?.startedAge,e.retiredPension!==undefined&&e.retirement?.status==='resolved'?e.retirement.outcome.handledAge:undefined].filter((age):age is number=>age!==undefined);
        if(!starts.length)fail();const first=Math.min(...starts);integer(index.year,value.birthYear+first,value.year);
        if(index.country!==undefined&&!catalog.has(index.country))fail();if(index.increaseAge!==undefined)integer(index.increaseAge,Math.max(50,first),value.age);
      }
      if(academy.employment?.pensionService!==undefined){const service=academy.employment.pensionService;object(service);integer(service.age,academy.commissionedAge,value.age);number(service.remaining,0,100);}
      if(academy.employment?.pension!==undefined){const pension=academy.employment.pension;object(pension);number(pension.value,0,1e15);if(!(pension.value>0)||!academy.employment.lastMilitaryPay||!academy.employment.career||academy.employment.career.experienceYears<20)fail();integer(pension.startedAge,academy.commissionedAge,value.age);}
      if(academy.employment?.lastMilitaryPay!==undefined){const pay=academy.employment.lastMilitaryPay;object(pay);number(pay.income,0,1e15);if(!catalog.has(pay.country))fail();integer(pay.age,academy.commissionedAge,value.age);}
      if(academy.employment?.sickOutAge!==undefined){integer(academy.employment.sickOutAge,Math.max(30,academy.commissionedAge),Math.min(64,value.age));if(academy.employment.healthExit?.age!==academy.employment.sickOutAge)fail();}
      if(academy.employment?.healthExit!==undefined){const exit=academy.employment.healthExit;object(exit);integer(exit.age,Math.max(30,academy.commissionedAge),Math.min(64,value.age));oneOf(exit.previousJob,['soldier']);}
      if(academy.employment?.career!==undefined){
        const career=academy.employment.career;object(career);oneOf(career.rank,[0,1,2]);
        for(const key of ['jobYears','experienceYears','formalYears'])integer(career[key],0,value.age);
        integer(career.lastSettledAge,academy.commissionedAge-1,value.age);
        if(career.jobYears>career.experienceYears||career.jobYears>career.formalYears)fail();
        if(career.promotionFacts!==undefined){
          const f=career.promotionFacts;object(f);integer(f.age,academy.commissionedAge,value.age);number(f.migrationExperienceLoss,0,value.age);
          for(const key of ['inOffice','nomad','mandatoryRetirement'])boolean(f[key]);
        }
        if(career.lastStepAge!==undefined)integer(career.lastStepAge,academy.commissionedAge,value.age);
        if(career.promotion!==undefined){
          const promotion=career.promotion;object(promotion);integer(promotion.age,academy.commissionedAge,value.age);
          oneOf(promotion.rank,[0,1,2]);oneOf(promotion.job,['soldier']);oneOf(promotion.status,['ineligible','missed','offered','resolved']);
          if(promotion.status==='offered'&&promotion.rank===2)fail();
        }
      }
      if(academy.employment?.annualFacts!==undefined){
        const facts=academy.employment.annualFacts;object(facts);if(!academy.employment.career)fail();
        integer(facts.age,academy.commissionedAge,value.age);if(!catalog.has(facts.country))fail();
        for(const key of ['workShare','learnShare','familyShare','migrationPenalty'])number(facts[key],0,1);
        if(facts.workShare+facts.learnShare+facts.familyShare>1.000001)fail();
        number(facts.effortUsed,0,1);number(facts.eraIncomeFactor,0,10);
        if(facts.frontPayPercentile!==null)number(facts.frontPayPercentile,0,1);
        for(const key of ['migrated','raisedThisYear','apprentice','rehired','reducedHours','reducedWork'])boolean(facts[key]);
      }
      const offer=academic.college.academyOffer;
      if(offer==='threeBranches'?!['army','navy','air'].includes(academy.branch):academy.branch!==offer)fail();
    }
    if(academic.phdStartedAge!==undefined)integer(academic.phdStartedAge,0,value.age);
    if(academic.phdInvitation!==undefined){object(academic.phdInvitation);integer(academic.phdInvitation.age,0,value.age);boolean(academic.phdInvitation.offered);}
    if(academic.lastWithdrawal!==undefined){
      const withdrawal=academic.lastWithdrawal;object(withdrawal);oneOf(withdrawal.stage,['primary','lowerSecondary','upperSecondary','vocational','university','graduate','phd']);
      integer(withdrawal.age,0,value.age);integer(withdrawal.completedYears,1,['primary','university'].includes(withdrawal.stage)?5:['graduate','lowerSecondary','upperSecondary','vocational'].includes(withdrawal.stage)?2:4);
      if(!catalog.has(withdrawal.country))fail();
    }
    if(academic.lastGraduation!==undefined){
      const graduation=academic.lastGraduation;object(graduation);oneOf(graduation.stage,SCHOOL_STAGES);
      integer(graduation.age,0,value.age);if(!catalog.has(graduation.country))fail();
    }
    if(academic.overseasApplication!==undefined){
      const offer=academic.overseasApplication;object(offer);integer(offer.age,0,value.age);integer(offer.year,1990,value.year);if(offer.year!==value.birthYear+offer.age)fail();
      if(!catalog.has(offer.homeCountry))fail();oneOf(offer.level,['university','graduate']);boolean(offer.fullScholarship);boolean(offer.selfFunded);oneOf(offer.status,['pending','resolved','cancelled']);
      if(offer.domesticFallback!==undefined){oneOf(offer.domesticFallback,['pending','enrolled','rejected','work','blocked']);if(offer.status==='pending')fail();}
      array(offer.options,3);if(!offer.options.length||new Set(offer.options.map((o:any)=>o.country)).size!==offer.options.length)fail();
      for(const o of offer.options){object(o);if(!catalog.has(o.country)||o.country===offer.homeCountry)fail();number(o.quotedCost,0,1e12);boolean(o.languageMatches);number(o.admissionFactor,0,2);number(o.policyFactor,0,1);number(o.scholarshipProbability,0,1);}
      if((offer.status==='resolved')!==(offer.receipt!==undefined))fail();
      if(offer.receipt!==undefined){
        const receipt=offer.receipt;object(receipt);if(!offer.options.some((o:any)=>o.country===receipt.country))fail();
        const r=receipt.result;object(r);oneOf(r.outcome,['overseas','domesticApplication','domesticGraduate','work','fundingUnavailable']);boolean(r.governmentScholarship);
        for(const k of ['familyContribution','personalCost','savings','debt'])number(r[k],0,1e12);
        integer(r.preparationYears,0,1);number(r.happiness,-5,8);number(r.knowledge,0,6);
        if(r.outcome!=='overseas'&&(r.personalCost!==0||r.familyContribution!==0||r.governmentScholarship||r.preparationYears!==0||r.knowledge!==0))fail();
      }
    }
    if(academic.studyGraduation!==undefined){
      const r=academic.studyGraduation;object(r);integer(r.age,0,value.age);
      if(!catalog.has(r.homeCountry)||!catalog.has(r.studyCountry)||r.homeCountry===r.studyCountry)fail();
      oneOf(r.stage,['university','graduate','phd']);oneOf(r.outcome,['pending','enrolled','home','workPermit','spousePermit','denied']);
      number(r.hostProbability,0,1);number(r.graduateProbability,0,1);
      if(r.spousePartnerId!==undefined){string(r.spousePartnerId,100);if(!r.spousePartnerId)fail();}
      if(r.third!==undefined){object(r.third);if(!catalog.has(r.third.country)||[r.homeCountry,r.studyCountry,value.migration.birthCountry.id].includes(r.third.country))fail();number(r.third.probability,0,1);}
      if(r.outcome==='enrolled'&&r.stage!=='university')fail();
      if(['home','workPermit','spousePermit','denied'].includes(r.outcome)&&(!academic.studySettlement||academic.studySettlement.age!==r.age||academic.studySettlement.outcome!==r.outcome))fail();
    }
    if(academic.studySettlement!==undefined){
      const r=academic.studySettlement;object(r);integer(r.age,0,value.age);if(!catalog.has(r.fromCountry)||!catalog.has(r.toCountry))fail();
      oneOf(r.choice,['home','stay','third']);oneOf(r.outcome,['home','workPermit','spousePermit','denied']);
      const success=['workPermit','spousePermit'].includes(r.outcome);
      if((r.choice==='home')!==(r.outcome==='home')||r.outcome==='spousePermit'&&r.choice!=='stay')fail();
      oneOf(r.migrationPenalty,[success?(r.choice==='third'?.08:.05):0]);
      if(success){
        if((r.choice==='stay')!==(r.toCountry===r.fromCountry))fail();
        array(value.migration?.moves,111);if(!value.migration.moves.some((m:any)=>m.age===r.age&&m.country===r.toCountry))fail();
      }
      if(r.partnerLeave!==undefined){const leave=r.partnerLeave;object(leave);if(!success)fail();string(leave.partnerId,100);if(!leave.partnerId)fail();integer(leave.untilAge,r.age+1,r.age+2);number(leave.annualIncome,0,1e12);boolean(leave.finished);}
    }
    if(academic.overseasResidence!==undefined){
      const residence=academic.overseasResidence;object(residence);if(!catalog.has(residence.country)||!catalog.has(residence.homeCountry)||residence.country===residence.homeCountry)fail();
      integer(residence.startedAge,0,value.age);oneOf(residence.level,['university','graduate']);
      if(residence.waitingFamily!==undefined){
        const waiting=residence.waitingFamily;object(waiting);string(waiting.partnerId,100);if(!waiting.partnerId)fail();array(waiting.childIds,FAMILY_LIMITS.children);
        if(new Set(waiting.childIds).size!==waiting.childIds.length)fail();
        for(const id of waiting.childIds){string(id,100);const child=value.family.children.find((c:any)=>c.id===id);if(!child)fail();const departureAge=value.birthYear+residence.startedAge-child.birthYear;if(departureAge<0||departureAge>=18)fail();}
      }
    }
    if(academic.enrollment!==null){
      const school=academic.enrollment;
      object(school);oneOf(school.stage,SCHOOL_STAGES);
      if(school.retention!==undefined){number(school.retention,0,1);if(!['university','lowerSecondary','upperSecondary','vocational'].includes(school.stage))fail();}
      if(school.preparationYears!==undefined){
        integer(school.preparationYears,0,1);
        if(!['university','graduate'].includes(school.stage)||school.preparationYears===1&&(school.completedYears!==0||school.graduationPending))fail();
      }
      integer(school.lastSettledAge,0,value.age);
      boolean(school.paused);boolean(school.graduationPending);
      const duration=schoolDuration(school.stage,normalizedCountry.id,academic.medicine,academic.studyCountry??undefined);
      integer(school.completedYears,0,Math.min(duration,school.lastSettledAge));
      if(school.graduationPending!==(school.completedYears===duration))fail();
      if(school.stage==='graduate'&&academic.qualification<4||school.stage==='phd'&&academic.qualification<5)fail();
    }
  }
  if (value.universityAdmissions !== undefined) {
    const admission=value.universityAdmissions;
    object(admission);oneOf(admission.version,[1]);integer(admission.retakes,0,3);boolean(admission.declined);
    if(admission.lastAttempt!==undefined){const r=admission.lastAttempt;object(r);integer(r.age,18,Math.min(25,value.age));if(admission.retakes===0||!catalog.has(r.country))fail();oneOf(r.status,['enrolled','rejected']);}
    if(admission.choices!==undefined){array(admission.choices,4);let age=0;for(const r of admission.choices){object(r);integer(r.age,Math.max(17,age+1),value.age);age=r.age;if(!catalog.has(r.country)||!value.decisions.includes(`universityRetake-${r.age}`))fail();oneOf(r.choice,['prepare','work']);}}
    if(admission.scheduledAge!==null){
      integer(admission.scheduledAge,1,Math.min(110,value.age+1));
      if(admission.retakes===0||admission.declined||admission.offer!==null)fail();
    }
    if(admission.offer!==null){
      const offer=admission.offer;object(offer);
      if(!catalog.has(offer.country)||admission.declined)fail();
      integer(offer.age,value.age,value.age);integer(offer.retakes,0,2);
      if(offer.retakes!==admission.retakes)fail();
    }
  }
  if (value.stageFocus !== undefined) {
    object(value.stageFocus); oneOf(value.stageFocus.version, [1]);
    object(value.stageFocus.selection);
    for (const key of ['current', 'picked', 'returnTo', 'automaticFallback'])
      oneOf(value.stageFocus.selection[key], [null, ...STAGE_FOCUSES]);
  }
  if (value.playback !== undefined) {
    object(value.playback); boolean(value.playback.paused);
    oneOf(value.playback.speed, [1, 2, 4, 8, 12, 16]);
  }
  object(value.settings);
  oneOf(value.settings.weightMode, ['births', 'population', 'equal']);
  oneOf(value.settings.era, ['past', 'today', 'future', 'random']);
  oneOf(value.settings.duration, [30, 60, 90]);
  for (const key of ['gentler', 'classroom', 'autoChoices']) boolean(value.settings[key]);
  if (value.settings.autoLean !== undefined) oneOf(value.settings.autoLean, ['balanced', 'cautious', 'adventurous', 'family']);
  for (const key of ['country', 'realCountry']) if (value.settings[key] !== undefined && !catalog.has(value.settings[key])) fail();
  if(value.settings.dailyThemeDay!==undefined){string(value.settings.dailyThemeDay,10);try{getDailyTheme(value.settings.dailyThemeDay);}catch{fail();}}
  oneOf(value.focus, FOCUSES); oneOf(value.allocation, ALLOCATIONS);
  object(value.stats);
  for (const key of ['health', 'happiness', 'knowledge', 'social']) number(value.stats[key], 0, 100);
  for (const key of ['savings', 'investments', 'annualIncome', 'debt']) number(value.stats[key], 0, 1e12);
  number(value.stats.netAssets, -1e12, 3e12);
  object(value.belongings); boolean(value.belongings.phone);
  oneOf(value.belongings.transport, ['none', 'bicycle', 'car']); oneOf(value.belongings.housing, ['family', 'rent', 'owned']);
  number(value.belongings.housingValue);
  if (value.belongings.housing !== 'owned' && value.belongings.housingValue !== 0) fail();
  if (Math.abs(value.stats.netAssets - value.stats.savings - value.stats.investments - value.belongings.housingValue + value.stats.debt) > 0.02) fail();
  integer(value.stats.education, 0, 4); integer(value.stats.incomeQuintile, 1, 5);
  oneOf(value.stats.job,[...jobs,'dayActivities','shelteredWork']);
  if(['dayActivities','shelteredWork'].includes(value.stats.job)&&!value.academics?.supportedAdult)fail(); oneOf(value.stats.employment, ['none', 'student', 'employed', 'unemployed', 'retired']);
  oneOf(value.stats.birthPlaceType, ['urban', 'rural']);
  oneOf(value.stats.religion, ['christianity', 'islam', 'hinduism', 'buddhism', 'judaism', 'folk', 'other', 'none']);
  object(value.family);
  boolean(value.family.married);
  if (value.family.marriageAge !== null) integer(value.family.marriageAge, 0, value.age);
  if (value.family.married && (value.family.partner === null || value.family.marriageAge === null)) fail();
  for (const key of ['parents', 'siblings', 'children'] as const) {
    array(value.family[key], FAMILY_LIMITS[key]);
    for (const relative of value.family[key]) person(relative, value.year, false, key==='children');
  }
  if (value.family.parents.length !== FAMILY_LIMITS.parents) fail();
  if (value.family.partner !== null) person(value.family.partner, value.year);
  if (value.family.secondPartner) {
    person(value.family.secondPartner, value.year);
    // Earlier builds omitted this partner from yearly aging. Birth year is
    // authoritative for a living person; deceased ages remain historical facts.
    if (value.family.secondPartner.alive) {
      const age = value.year - value.family.secondPartner.birthYear;
      integer(age, 0, 110);
      value.family.secondPartner.age = age;
    }
  }
  if (value.tribute !== undefined) string(value.tribute, 500);
  array(value.companions, 4);
  if (value.companions.length !== 4) fail();
  for (const companion of value.companions) {
    object(companion); string(companion.id); string(companion.name); sex(companion.sex);
    companion.country = country(companion.country);
    integer(companion.age, 0, value.age); boolean(companion.alive); nullableAge(companion.deathAge);
    if (companion.alive ? companion.deathAge !== null || companion.cause !== null : companion.deathAge !== companion.age || !causes.has(companion.cause)) fail();
    number(companion.health, 0, 100); number(companion.happiness, 0, 100);
    integer(companion.education, 0, 4); integer(companion.children, 0, 8); number(companion.netAssets);
    oneOf(companion.job, jobs);
    if (companion.lastJob !== null) oneOf(companion.lastJob, WORK_JOB_IDS);
  }
  array(value.events, 2048);
  if (value.events.length === 0 || value.events[0].key !== 'event.birth') fail();
  let previousAge = 0;
  for (const entry of value.events) {
    object(entry); string(entry.id); string(entry.icon, 12);
    integer(entry.age, previousAge, value.age); integer(entry.year, value.birthYear, value.year);
    if (entry.year !== value.birthYear + entry.age || !events.has(entry.key)) fail();
    oneOf(entry.kind, ['birth', 'milestone', 'everyday', 'career', 'family', 'health', 'finance', 'decision', 'death', 'reflection']);
    params(entry.params); previousAge = entry.age;
  }
  if(value.occupationExperience!==undefined&&!validOccupationExperience(value.occupationExperience,value.birthYear,value.year))fail();
  if(value.occupationExperience?.migration){const m=value.occupationExperience.migration;if(!catalog.has(m.country)||!Array.isArray(value.migration?.moves)||!value.migration.moves.some((move:any)=>move.country===m.country&&value.birthYear+move.age===m.year))fail();}
  array(value.career, 1000);
  let careerAge = 0;
  for (const entry of value.career) {
    object(entry); integer(entry.age, careerAge, value.age); careerAge = entry.age;
    oneOf(entry.job, [...WORK_JOB_IDS,'shelteredWork']);
    if(entry.offer!==undefined){occupationBatch(entry.offer,value);if(entry.offer.age!==entry.age)fail();number(entry.offer.income,.01,1e12);occupationTerms(entry.offer.terms,entry.job);}
  }
  array(value.history, 111);
  if (value.history.length !== value.age + 1) fail();
  value.history.forEach((entry: any, age: number) => {
    object(entry); oneOf(entry.age, [age]);
    for (const key of ['health', 'happiness', 'knowledge', 'social']) number(entry[key], 0, 100);
    number(entry.netAssets, -1e12, 3e12);
    if (entry.annual !== null) {
      const record = entry.annual; object(record);
      if (record.completed !== undefined) boolean(record.completed);
      if (record.focusWeights !== undefined) {
        if (record.completed === undefined || record.completed === false && record.focusWeights !== null || record.completed === true && record.focusWeights === null) fail();
        if (record.focusWeights !== null) {
          object(record.focusWeights); let total = 0;
          for (const [focus, weight] of Object.entries(record.focusWeights)) { oneOf(focus, FOCUSES); number(weight,0,1); total += weight as number; }
          if (Object.keys(record.focusWeights).length && Math.abs(total - 1) > 1e-8) fail();
        }
      }
      if (record.stageFocusWeights !== undefined) {
        if (record.completed === undefined || record.completed === false && record.stageFocusWeights !== null || record.completed === true && record.stageFocusWeights === null) fail();
        if (record.stageFocusWeights !== null) {
          object(record.stageFocusWeights); let total = 0;
          for (const [focus, weight] of Object.entries(record.stageFocusWeights)) { oneOf(focus, STAGE_FOCUSES); number(weight,0,1); total += weight as number; }
          if (Object.keys(record.stageFocusWeights).length && Math.abs(total - 1) > 1e-8) fail();
        }
      }
      if (!catalog.has(record.country)) fail();
      oneOf(record.job, [...jobs,'dayActivities','shelteredWork']); oneOf(record.employment, ['none', 'student', 'employed', 'unemployed', 'retired']);
      if(record.academic!==undefined){object(record.academic);integer(record.academic.qualification,0,5);boolean(record.academic.doctorate);if(record.academic.doctorate&&record.academic.qualification<5)fail();}
      integer(record.education, 0, 4); oneOf(record.focus, FOCUSES); oneOf(record.allocation, ALLOCATIONS);
      if (record.personalIncome !== undefined) number(record.personalIncome, 0, 1e13);
      for (const key of ['income', 'totalExpenses']) number(record[key], 0, 1e13);
      number(record.annualSavings, -1e13, 1e13);
      if (Math.abs(record.income - record.totalExpenses - record.annualSavings) > 0.02) fail();
      for (const key of ['savings', 'investments', 'debt']) number(record[key], 0, 1e12);
      boolean(record.partner); integer(record.children, 0, FAMILY_LIMITS.children); integer(record.childrenAlive, 0, record.children);
      for (const [key,limit] of [['greatGrandchildren',MAX_GREAT_GRANDCHILDREN],['greatGreatGrandchildren',MAX_GREAT_GREAT_GRANDCHILDREN]] as const) {
        const total=record[key], alive=record[`${key}Alive`];
        if(total == null) { if(alive != null) fail(); }
        else { integer(total,0,limit); integer(alive,0,total); }
      }
      integer(record.relativesAlive, record.childrenAlive + Number(record.partner) +
        (record.grandchildrenAlive ?? 0) + (record.greatGrandchildrenAlive ?? 0) +
        (record.greatGreatGrandchildrenAlive ?? 0), MAX_RELATIVES);
      if (record.grandchildren === null || record.grandchildrenAlive === null) { if (record.grandchildren !== null || record.grandchildrenAlive !== null) fail(); }
      else { integer(record.grandchildren, 0, MAX_GRANDCHILDREN); integer(record.grandchildrenAlive, 0, record.grandchildren); if (record.relativesAlive < record.childrenAlive + Number(record.partner) + record.grandchildrenAlive) fail(); }
    }
  });
  object(value.reflections);
  for (const [age, reflection] of Object.entries(value.reflections)) {
    if (!REFLECTION_AGES.map(String).includes(age) || Number(age) > value.age) fail();
    string(reflection, 2000);
  }
  array(value.conditions, 4); value.conditions.forEach((condition: unknown) => oneOf(condition, ['chronic']));
  oneOf(value.residence, ['urban', 'rural']);
  object(value.temperament); oneOf(value.temperament.kind, ['undecided', ...TEMPERAMENTS, 'persistent']); boolean(value.temperament.settled);
  array(value.talents, 2); value.talents.forEach((id: unknown) => oneOf(id, HOBBIES));
  if (new Set(value.talents).size !== value.talents.length) fail();
  array(value.hobbies, 3);
  const hobbyIds: string[] = [];
  for (const hobby of value.hobbies) { object(hobby); oneOf(hobby.id, ALL_HOBBY_IDS); if(isNamedSport(hobby.id)&&(!hobby.progress||value.academics?.origin!=='birth'))fail(); number(hobby.skill, 0, 100); integer(hobby.trainedAt, -1, value.age); if(hobby.progress!==undefined){object(hobby.progress);if(Object.keys(hobby.progress).some(k=>!['since','level','lastSettledAge','sidelinesAge','milestonesSuppressedAge','returnedToSportAge','milestones'].includes(k)))fail();integer(hobby.progress.since,0,value.age);number(hobby.progress.level,0,1000);validateHobbyPhysicalReceipts(value as Life,hobby);if(hobby.progress.lastSettledAge!==undefined)integer(hobby.progress.lastSettledAge,hobby.progress.since,value.age);if(hobby.progress.milestones!==undefined){const marks=hobby.progress.milestones;object(marks);if(!Object.keys(marks).length||Object.keys(marks).some(k=>!['familiarAge','accomplishedAge'].includes(k)))fail();for(const [key,level] of [['familiarAge',3],['accomplishedAge',8]] as const)if(marks[key]!==undefined){integer(marks[key],Math.max(8,hobby.progress.since),value.age);if(hobby.progress.level<level)fail();}}}
    hobbyIds.push(hobby.id); }
  if (new Set(hobbyIds).size !== hobbyIds.length) fail();
  if(value.hobbyState!==undefined){
    const h=value.hobbyState;object(h);oneOf(h.version,[1]);if(value.academics?.origin!=='birth'||Object.keys(h).some(k=>!['version','offer','declinedAge','lastActionAge','queuedAge','pausedSince','craftSalesSince','lifeStories','lessonHobby','automaticLessons'].includes(k)))fail();
    if(h.lessonHobby!==undefined)oneOf(h.lessonHobby,SOURCE_HOBBY_IDS);
    if(h.automaticLessons!==undefined){const auto=h.automaticLessons;object(auto);if(Object.keys(auto).some(k=>!['since','pausedForFunds','lastPaidAge','lastNoticeAge'].includes(k)))fail();integer(auto.since,15,value.age);boolean(auto.pausedForFunds);for(const key of ['lastPaidAge','lastNoticeAge'])if(auto[key]!==undefined)integer(auto[key],auto.since,value.age);if(auto.lastPaidAge!==undefined&&(h.lastActionAge===undefined||auto.lastPaidAge>h.lastActionAge))fail();}
    if(h.lifeStories!==undefined){
      const stories=h.lifeStories;object(stories);if(Object.keys(stories).some(k=>!['sharedPartner','activities','contestAge'].includes(k)))fail();
      if(stories.sharedPartner!==undefined){const shared=stories.sharedPartner;object(shared);if(Object.keys(shared).some(k=>!['id','name','hobby','age','label'].includes(k)))fail();string(shared.id,200);string(shared.name,200);if(!shared.id.trim()||!shared.name.trim())fail();oneOf(shared.hobby,SOURCE_HOBBY_IDS);integer(shared.age,12,Math.min(95,value.age));if(shared.label!==undefined){oneOf(shared.label,ADAPTED_HOBBY_IDS);if(hobbyDisplayId(value as Life,shared.hobby,shared.age)!==shared.label)fail();}}
      if(stories.activities!==undefined){array(stories.activities,HOBBY_ACTIVITIES.length);if(stories.activities.length&&value.age<16)fail();if(new Set(stories.activities).size!==stories.activities.length)fail();stories.activities.forEach((id:unknown)=>oneOf(id,HOBBY_ACTIVITIES));}
      if(stories.contestAge!==undefined)integer(stories.contestAge,12,Math.min(95,value.age));
    }
    if(h.pausedSince!==undefined)integer(h.pausedSince,18,value.age);
    if(h.craftSalesSince!==undefined){integer(h.craftSalesSince,8,value.age);const craft=value.hobbies.find((item:any)=>item.id==='craft');if(craft&&(!craft.progress||craft.progress.since<=h.craftSalesSince&&(craft.progress.level<8||craft.progress.milestones?.accomplishedAge!==h.craftSalesSince)))fail();}
    for(const key of ['declinedAge','lastActionAge'])if(h[key]!==undefined)integer(h[key],0,value.age);
    if(h.queuedAge!==undefined)integer(h.queuedAge,1,value.age+1);
    if(h.offer!==undefined){object(h.offer);integer(h.offer.age,7,value.age);array(h.offer.options,3);if(!h.offer.options.length||new Set(h.offer.options).size!==h.offer.options.length||Object.keys(h.offer).length!==3)fail();h.offer.options.forEach((id:unknown)=>{oneOf(id,SOURCE_HOBBY_IDS);if(hobbyDefinition(id as string)!.minAge!==undefined&&h.offer.age<hobbyDefinition(id as string)!.minAge!)fail();});if(h.offer.replacement!==null)oneOf(h.offer.replacement,ALL_HOBBY_IDS);}
    if(h.declinedAge!==undefined&&(!h.offer||h.declinedAge>h.offer.age))fail();
  }

  object(value.schooling);
  for (const key of ['enrolled', 'droppedOut', 'childLabor']) boolean(value.schooling[key]);
  integer(value.schooling.years, 0, Math.max(0, value.age - 5));
  if (value.schooling.enrolled && value.schooling.childLabor) fail();
  if (value.schooling.childWorkPaid !== undefined) boolean(value.schooling.childWorkPaid);
  if (value.schooling.university !== undefined) {
    const course = value.schooling.university;
    object(course);
    integer(course.startedAge, 0, value.age);
    integer(course.lastProgressAge, course.startedAge, value.age);
    integer(course.completedYears, 0, Math.min(4, course.lastProgressAge - course.startedAge));
  }
  object(value.budget);
  for (const key of ['income', 'tax', 'food', 'housing', 'transport', 'health', 'leisure', 'education', 'dependents', 'totalExpenses']) number(value.budget[key], 0, 1e13);
  number(value.budget.annualSavings, -1e13, 1e13);
  const expenses = ['tax', 'food', 'housing', 'transport', 'health', 'leisure', 'education', 'dependents'].reduce((sum, key) => sum + value.budget[key], 0);
  if (Math.abs(expenses - value.budget.totalExpenses) > 0.02 || Math.abs(value.budget.income - expenses - value.budget.annualSavings) > 0.02) fail();
  if(value.jobOfferBatch!==undefined)occupationBatch(value.jobOfferBatch,value);
  array(value.jobOffers, 3);
  value.jobOffers.forEach((offer: any, index: number) => { object(offer); oneOf(offer.id, [`offer${index}`]); oneOf(offer.job, WORK_JOB_IDS); number(offer.income, 0.01, 1e12); if(value.jobOfferBatch!==undefined)occupationTerms(offer.terms,offer.job);else if(offer.terms!==undefined)fail(); });
  if(value.jobOfferBatch&&new Set(value.jobOffers.map((o:any)=>o.terms.occupation)).size!==value.jobOffers.length)fail();
  object(value.training);oneOf(value.training.kind,[null,'mechanic','hairdresser','nightSchool']);
  if(value.training.endsAt!==null)integer(value.training.endsAt,0,130);
  if((value.training.kind===null)!==(value.training.endsAt===null))fail();
  number(value.training.previousIncome);oneOf(value.training.previousJob,[...jobs,'dayActivities','shelteredWork']);
  object(value.justice);if(value.justice.prisonUntil!==null)integer(value.justice.prisonUntil,value.age+1,115);
  object(value.relationship);oneOf(value.relationship.status,['single','dating','cohabiting','married']);oneOf(value.relationship.childPlan,['open','waiting','childfree']);
  integer(value.relationship.nextChildDecisionAge,0,130);number(value.relationship.partnerIncome);
  if((value.relationship.status==='single')!==(value.family.partner===null)||(value.relationship.status==='married')!==value.family.married)fail();
  object(value.care);oneOf(value.care.who,[null,'self','partner']);oneOf(value.care.previousJob,[...jobs,'dayActivities','shelteredWork']);
  for(const key of ['until','daycareUntil'])if(value.care[key]!==null)integer(value.care[key],0,130);
  if((value.care.who===null)!==(value.care.until===null))fail();
  number(value.care.previousIncome);number(value.care.previousPartnerIncome);array(value.care.handledChildren,FAMILY_LIMITS.children);
  value.care.handledChildren.forEach((id:unknown)=>{string(id);if(!value.family.children.some((child:any)=>child.id===id))fail();});
  if(new Set(value.care.handledChildren).size!==value.care.handledChildren.length)fail();
  object(value.opportunities);
  for(const key of ['lastRiskAge','lastDebtAge'])integer(value.opportunities[key],-10,value.age);
  for(const key of ['nextNightSchoolAge','nextRelationshipAge'])integer(value.opportunities[key],0,130);
  if(value.opportunities.moneylenderUntil!==null)integer(value.opportunities.moneylenderUntil,0,130);
  object(value.lifestyle);oneOf(value.lifestyle.diet,['balanced','healthy','convenient']);oneOf(value.lifestyle.insurance,['basic','full']);oneOf(value.lifestyle.gifts,['generous','modest','attendance']);
  object(value.annualSpending);if(Object.keys(value.annualSpending).length!==5)fail();
  for(const category of SPENDING_CATEGORIES)number(value.annualSpending[category],0,1e9);
  array(value.pets,3);const petIds:string[]=[];
  for(const pet of value.pets){object(pet);string(pet.id);oneOf(pet.kind,PET_KINDS);string(pet.name,40);integer(pet.age,0,value.age);boolean(pet.alive);petIds.push(pet.id);}
  if(new Set(petIds).size!==petIds.length)fail();
  object(value.dailyTheme);string(value.dailyTheme.day,10);let expectedTheme;
  try{expectedTheme=getDailyTheme(value.dailyTheme.day);}catch{fail();}
  if(value.dailyTheme.id!==expectedTheme.id||value.settings.dailyThemeDay!==value.dailyTheme.day)fail();
  object(value.migration);value.migration.birthCountry=country(value.migration.birthCountry);
  if(value.migration.offerCountry!==null)value.migration.offerCountry=country(value.migration.offerCountry);
  if(value.migration.lastMoveAge!==null)integer(value.migration.lastMoveAge,18,value.age);
  if(value.migration.familyCountry!==null&&!catalog.has(value.migration.familyCountry))fail();
  array(value.migration.moves,3);let previousMove=13;
  for(const move of value.migration.moves){object(move);integer(move.age,previousMove+5,value.age);if(!catalog.has(move.country))fail();boolean(move.together);previousMove=move.age;}
  if(value.migration.moves.length){if(value.migration.lastMoveAge!==previousMove||value.migration.moves.at(-1).country!==normalizedCountry.id)fail();}
  else if(value.migration.lastMoveAge!==null||value.migration.birthCountry.id!==normalizedCountry.id)fail();
  validateFeed(value);
  validateDescendants(value);
  validateGuardianship(value as Life);
  validateHealthcare(value);
  validatePhysicalState(value as Life);
  const physicalCondition=value.physicalState?.condition,adjustment=physicalCondition?.sportsAdjustment;
  if(adjustment?.hobby){
    if(!physicalSportPool(value as Life,adjustment.age)?.some(id=>`sp_${id}`===adjustment.hobby)||hobbyPracticeBlocked(value as Life,adjustment.hobby,adjustment.age))fail();
    const retained=value.hobbies.find((h:any)=>h.id===adjustment.hobby);
    if(retained?.progress&&retained.progress.since<physicalCondition.since&&retained.progress.returnedToSportAge!==adjustment.age)fail();
  }

  array(value.decisions, 1000); value.decisions.forEach((id: unknown) => {
    if(typeof id==='string'&&id.startsWith('guardian-')){if(!value.descendants.guardianship?.records.some((r:any)=>guardianDecisionId(r.parentId)===id))fail();return;}
    const descendant=parseDescendantDecision(id);
    if (descendant) { const state=descendantSubject(value as Life,descendant.childId)?.state; if(!state || !(descendant.kind==='reunion' ? state.prison?.reunion : state[descendant.kind==='university'?'universityResolved':descendant.kind==='wedding'?'weddingResolved':'migrationResolved']))fail(); return; }
    if(typeof id==='string'&&id.startsWith('hobby-')){if(!isHobbyDecision(id)||value.academics?.origin!=='birth'||Number(id.slice(6))>value.age||Number(id.slice(6))<8)fail();return;}
    if(isSchoolWithdrawalDecision(id)){const p=value.academics?.secondaryProgress;if(!p?.answered||p.answeredAge!==Number(String(id).split('-')[1]))fail();return;}
    if(isUpperSecondaryDecision(id)){const r=value.academics?.upperSecondary;if(!r||r.age!==Number(String(id).split('-')[1])||r.status==='pending'||r.route!=='choice')fail();return;}
    if(isMilitaryRetirement(id)){const r=value.academics?.academy?.employment?.retirement;if(!r||r.status!=='resolved'||r.offer.age!==Number(String(id).split('-')[1]))fail();return;}
    if(isOfficerPromotion(id)){const c=value.academics?.academy?.employment?.career,age=Number(String(id).split('-')[1]);if(!c||c.lastStepAge===undefined||age<22||age>c.lastStepAge)fail();return;}
    if(isUniversityRetakeDecision(id)){const r=value.universityAdmissions?.choices?.find((r:any)=>`universityRetake-${r.age}`===id);if(!r)fail();return;}
    if(isPhysicalEquipmentDecision(id)){if(!value.physicalState?.condition?.equipment?.attempts.some((a:any)=>a.age===Number(String(id).split('-')[1])))fail();return;}
    if(isMajorDecision(id)){const r=value.academics?.majorRecord;if(!r||r.status!=='resolved'||r.age!==Number(String(id).split('-')[1]))fail();return;}
    if(isStudyGraduation(id)){const age=Number(String(id).split('-')[1]);if(age>value.age)fail();const r=value.academics?.studyGraduation;if(r?.age===age&&r.outcome==='pending')fail();return;}
    if(isStudyDecision(id)){const age=Number(String(id).split('-')[1]);if(age>value.age)fail();const r=value.academics?.overseasApplication;if(r?.age===age&&(String(id).startsWith('studyDestination-')?r.status==='pending':!r.domesticFallback||r.domesticFallback==='pending'))fail();return;}
    if(isCollegeDecision(id)){const r=value.academics?.college;if(!r||r.age!==Number(String(id).split('-')[1])||!['enrolled','rejected','work','abroad'].includes(r.status)||!['ordinary','equivalency'].includes(r.kind))fail();return;}
    if(isLowerSecondaryDecision(id)){const r=value.academics?.lowerSecondary;if(!r||r.age!==Number(String(id).split('-')[1])||r.status==='pending'||!['application','banned'].includes(r.route))fail();return;}
    const academicAge=academicDecisionAge(id);
    if(academicAge!==null){if(academicAge>value.age)fail();return;}
    const repeat=recurring(id);
    const action=activity(id);
    const health = value.healthcare.episodes.find((episode: any) => episode.id === id);
    if (health) { if (health.status === 'awaiting') fail(); return; }
    if (!isJobDecision(id)&&!repeat&&!action) oneOf(id, Object.keys(decisionChoices));
    const age = action?action.age:repeat?repeat.age:isJobDecision(id) ? Number(id.slice(4)) : decisionAge[String(id)];
    if (age > value.age) fail();
  });
  if (new Set(value.decisions).size !== value.decisions.length) fail();
  const helpAges=value.decisions.flatMap((id:string)=>{const a=activity(id);return a?.kind==='askKids'?[a.age]:[];}).sort((a:number,b:number)=>a-b);
  for(let i=1;i<helpAges.length;i++)if(helpAges[i]-helpAges[i-1]<3)fail();
  validateTimeline(value);
  if (value.pendingDecision !== null) validateDecision(value, value.pendingDecision);
  const careDecision=value.pendingDecision&&recurring(value.pendingDecision.id);
  if(careDecision?.kind==='care'){
    if(value.family.children[careDecision.index!].country!==physicalCountry(value as Life))value.pendingDecision=null;
    else value.pendingDecision.choices=value.pendingDecision.choices.filter((c:any)=>childcareChoices(value as Life).includes(c.id));
  }
  // Older separation saves could retain a former partner's unpaid leave.
  if(value.care.who==='partner'&&!localPartnerPresent(value as Life)){
    value.care.who=null;value.care.until=null;value.relationship.partnerIncome=0;
  }
  value.country = normalizedCountry;
  recoverUniversityProgress(value as Life);
  return value as Life;
}

export function decodeSave(text: string): { life: Life | null; past: Life[] } {
  if (typeof text !== 'string' || text.length > MAX_SAVE_BYTES || new TextEncoder().encode(text).length > MAX_SAVE_BYTES) throw new Error('Save file is too large.');
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { fail(); }
  safeTree(parsed); object(parsed);
  oneOf(parsed.version, [1]); array(parsed.past, MAX_PAST_LIVES);
  const life = parsed.life === null ? null : validateLife(parsed.life);
  let past = parsed.past.map(validateLife);
  // Imported and recovered endings must remain reachable from the home archive,
  // even when the backup predates the normal game-over archive write.
  if (life && !life.alive && !past.some(previous => previous.id === life.id))
    past = [life, ...past].slice(0, MAX_PAST_LIVES);
  return { life, past };
}
export function encodeSave(life: Life | null, past: Life[]): string {
  if (!Array.isArray(past)) fail();
  const text = JSON.stringify({ version: 1, life, past: past.slice(0, MAX_PAST_LIVES) });
  // Export and autosave use the same validation boundary as import.
  decodeSave(text);
  return text;
}
