import {resolveSchoolReturn} from './child-school-work';
import type {Life} from './types';
import type {PrimarySchoolEnvironment} from './primary-school-context';
import {primarySchoolContext} from './primary-school-context';
import {planPrimaryPlacement,commitPrimaryEntry} from './primary-school-state';
import {resolvePrimaryRetention} from './primary-school-access';
import {initializeLegacyLearning} from './learning-state';
export type PrimaryRuntimeFacts=Omit<PrimarySchoolEnvironment,'accessModifiers'>;
function context(life:Life){const a=life.academics;return a?.primaryFacts&&a.circumstances?primarySchoolContext(life,{...a.primaryFacts,accessModifiers:a.circumstances.accessModifiers}):null;}
/** Engine-owned draft only; source age-five placement and age-six admission are separate commits. */
export function preparePrimaryRuntime(life:Life,draw:()=>number,work:()=>void):string|null {
 const a=life.academics,c=context(life);
 if(!life.alive||!a||!c||life.justice.prisonUntil!==null||a.circumstances!.developmentalProtection)return null;
 const planned=planPrimaryPlacement(a,life.age,c,false,draw);
 if(planned.academic!==a){
  life.academics=planned.academic;
  if(planned.effortGain){life.learning=initializeLegacyLearning(life).learning;life.learning!.effort=Math.min(1.6,life.learning!.effort+planned.effortGain);}
  return planned.academic.primary!.placement!.kind==='private'?'privatePlan':null;
 }
 const entered=commitPrimaryEntry(a,life.age,c,false,draw);if(entered===a)return null;
 life.academics=entered;const kind=entered.primary!.entry!.kind;
 entered.circumstances!.homeSchool=kind==='homeSchool';entered.circumstances!.learningCentre=kind==='learningCentre';
 if(kind==='outOfSchool')work();
 else {life.schooling.enrolled=true;life.schooling.droppedOut=false;life.schooling.childLabor=false;life.stats.employment='student';life.stats.job='student';life.stats.annualIncome=0;}
 return kind;
}
/** Called after one observed course-credit settlement. Repeated calls cannot charge effects or reroll. */
export function settlePrimaryRuntime(life:Life,duration:number,draw:()=>number,work:()=>void):'transfer'|'withdraw'|null {
 const a=life.academics,s=a?.enrollment,c=context(life);
 if(!life.alive||!a||!s||s.stage!=='primary'||s.paused||!c||life.justice.prisonUntil!==null||s.lastSettledAge!==life.age||a.primary?.lastRetentionAge===life.age)return null;
 a.primary??={};a.primary.lastRetentionAge=life.age;
 const outcome=resolvePrimaryRetention({...c,placement:a.primary.transferredAge!==undefined?'public':a.primary.placement?.kind??'unassigned'},s.completedYears,duration,life.stats.knowledge,life.temperament.kind==='persistent',a.circumstances!.developmentalProtection,draw);
 if(outcome==='stay')return null;
 if(outcome==='transfer'){a.primary.transferredAge=life.age;life.stats.happiness-=2;return outcome;}
 a.lastWithdrawal={stage:'primary',age:life.age,completedYears:s.completedYears,country:a.studyCountry??life.country.id};
 a.enrollment=null;life.schooling.enrolled=false;life.schooling.droppedOut=true;
 if(life.age<15)work();else{life.schooling.childLabor=false;life.stats.employment='unemployed';life.stats.job='none';life.stats.annualIncome=0;}
 return outcome;
}

/** The original age-eight request is distinct from later family-fortune-driven school return. */
export function primaryReturnEligible(life:Life):boolean {
 const a=life.academics;
 return !!a&&life.alive&&life.age===8&&!a.enrollment&&a.qualification===0&&!a.primary?.lateEntry&&!a.circumstances?.developmentalProtection&&!life.decisions.includes('school')&&life.justice.prisonUntil===null;
}
export function resolvePrimaryReturn(life:Life,choice:string,draw:()=>number):'enrolled'|'help'|'rejected'|null {
 if(!primaryReturnEligible(life)||life.pendingDecision?.id!=='school'||!['returnSchool','helpFamily'].includes(choice))return null;
 const result=resolveSchoolReturn(choice==='returnSchool'?'ask':'help',life.stats.incomeQuintile,life.stats.social,draw);
 const a=life.academics!;a.primary??={};a.primary.lateEntry={age:8,country:life.country.id,outcome:result.outcome};
 life.stats.happiness+=result.happiness;life.stats.social+=result.social;
 if(result.outcome==='enrolled'){
  a.enrollment={stage:'primary',completedYears:0,lastSettledAge:7,paused:false,graduationPending:false};a.studyCountry=life.country.id;
  life.schooling.enrolled=true;life.schooling.droppedOut=false;life.schooling.childLabor=false;
  life.stats.employment='student';life.stats.job='student';life.stats.annualIncome=0;
 }
 return result.outcome;
}
