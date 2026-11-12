import type {Life} from './types';
import {educationEraInputs} from './education-era';
import {supportedSchoolEntry,supportedSchoolContinuation,type SupportedSchoolKind} from './supported-school';
export interface SupportedSchoolRecord {kind:SupportedSchoolKind;startedAge:6;lastTransitionAge:number;endedAge?:number;adultReadyAge?:number}
/** Engine-owned draft. Transitions consume only new observed graduation receipts. */
export function prepareSupportedSchool(life:Life,draw:()=>number):string|null {
 const a=life.academics,d=life.birthDevelopment?.developmental;
 if(!life.alive||!a?.circumstances?.developmentalProtection||!d||d.supportLevel<2||life.justice.prisonUntil!==null)return null;
 const c={ppp:educationEraInputs(life.country,life.era,life.year).statistics.ppp,region:life.country.region,year:life.year};
 const enroll=(stage:'primary'|'lowerSecondary'|'upperSecondary')=>{
  a.enrollment={stage,completedYears:0,lastSettledAge:life.age-1,paused:false,graduationPending:false};a.studyCountry=life.country.id;
  life.schooling.enrolled=true;life.schooling.droppedOut=false;life.schooling.childLabor=false;
  life.stats.job='student';life.stats.employment='student';life.stats.annualIncome=0;
 };
 const home=()=>{a.enrollment=null;life.schooling.enrolled=false;life.schooling.childLabor=false;life.stats.job='none';life.stats.employment='none';life.stats.annualIncome=0;};
 if(!a.supportedSchool&&life.age===6){
  const kind=supportedSchoolEntry(d.supportLevel as 2|3,c,draw);
  a.supportedSchool={kind,startedAge:6,lastTransitionAge:6};
  if(kind==='home'){home();a.supportedSchool.endedAge=6;}else enroll('primary');
  return kind;
 }
 const r=a.supportedSchool,g=a.lastGraduation;
 if(!r||r.adultReadyAge!==undefined)return null;
 if(!a.enrollment&&g?.age===life.age&&r.lastTransitionAge<life.age&&['primary','lowerSecondary','upperSecondary','vocational'].includes(g.stage)){
  const next=supportedSchoolContinuation(g.stage as 'primary'|'lowerSecondary'|'upperSecondary'|'vocational',life.age,c,draw);
  r.lastTransitionAge=life.age;
  if(next==='home'||next==='adult'){home();r.endedAge=life.age;if(next==='adult')r.adultReadyAge=life.age;}else enroll(next);
  return next;
 }
 if(!a.enrollment&&life.age>=18&&r.endedAge!==undefined){r.adultReadyAge=life.age;return 'adult';}
 return null;
}
