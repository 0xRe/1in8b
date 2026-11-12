import {studyWaitingFamily} from './study-family';
import {getCountryById} from './countries';
import {overseasQuote,selectStudyDestinations} from './overseas-offer';
import {studyLanguageMatches} from './study-language';
import type {Life} from './types';
import {resolveOverseasAdmission,type OverseasAdmission} from './overseas-admission';
import {graduateAdmissionProbability} from './school-admissions';
import {educationEraInputs} from './education-era';
import {addKnowledge} from './learning-state';
export interface OverseasOption {country:string;quotedCost:number;languageMatches:boolean;admissionFactor:number;policyFactor:number;scholarshipProbability:number;}
export interface OverseasApplicationRecord {
 age:number;year:number;homeCountry:string;level:'university'|'graduate';fullScholarship:boolean;selfFunded:boolean;
 options:OverseasOption[];domesticFallback?:'pending'|'enrolled'|'rejected'|'work'|'blocked';status:'pending'|'resolved'|'cancelled';receipt?:{country:string;result:OverseasAdmission};
}
export interface OverseasResidence {waitingFamily?:{partnerId:string;childIds:string[]};country:string;homeCountry:string;startedAge:number;level:'university'|'graduate';}
/** Caller owns the draft, validates access before offering, and schedules the returned fallback.
 * A resolved receipt prevents reapplication; temporary study never changes permanent migration.
 */
export function commitOverseasApplication(life:Life,country:string,draw:()=>number):OverseasAdmission|null{
 const academic=life.academics,offer=academic?.overseasApplication;
 if(!life.alive||!academic||!offer||offer.status!=='pending'||offer.receipt||offer.age!==life.age||offer.year!==life.year||offer.homeCountry!==life.country.id||academic.enrollment||academic.overseasResidence||life.justice.prisonUntil!==null||academic.qualification!==(offer.level==='university'?3:4))return null;
 const option=offer.options.find(o=>o.country===country);if(!option||country===life.country.id)return null;
 const {statistics}=educationEraInputs(life.country,life.era,life.year);
 const result=resolveOverseasAdmission({...option,level:offer.level,fullScholarship:offer.fullScholarship,selfFunded:offer.selfFunded,knowledge:life.stats.knowledge,quintile:life.stats.incomeQuintile,savings:life.stats.savings,debt:life.stats.debt,graduateProbability:graduateAdmissionProbability(statistics.ter,life.stats.knowledge,life.stats.incomeQuintile)},draw);
 offer.status='resolved';offer.receipt={country,result:{...result}};
 life.stats.savings=result.savings;life.stats.debt=result.debt;life.stats.happiness=Math.max(0,Math.min(100,life.stats.happiness+result.happiness));
 life.stats.netAssets=life.stats.savings+life.stats.investments+life.belongings.housingValue-life.stats.debt;
 if(result.knowledge){addKnowledge(life,result.knowledge);life.stats.knowledge=Math.max(0,Math.min(100,life.stats.knowledge));}
 if(result.outcome==='overseas'||result.outcome==='domesticGraduate'){
  const abroad=result.outcome==='overseas';
  academic.studyCountry=abroad?country:life.country.id;
  academic.enrollment={stage:abroad?offer.level:'graduate',completedYears:0,lastSettledAge:life.age-1,paused:false,graduationPending:false,...(abroad?{preparationYears:result.preparationYears}:{})};
  if(abroad){const waitingFamily=studyWaitingFamily(life);academic.overseasResidence={country,homeCountry:life.country.id,startedAge:life.age,level:offer.level,...(waitingFamily?{waitingFamily}:{})};}
  life.schooling.enrolled=true;life.schooling.droppedOut=false;life.schooling.childLabor=false;life.stats.employment='student';life.stats.job='student';
 }else {life.schooling.enrolled=false;life.schooling.childLabor=false;life.stats.employment='unemployed';life.stats.job='none';}
 life.stats.annualIncome=0;
 return result;
}
export interface EligibleStudyDestination {country:string;weight:number;admissionFactor:number;policyFactor:number;scholarshipProbability:number;}
export function prepareOverseasApplication(life:Life,eligible:readonly EligibleStudyDestination[],funding:{fullScholarship:boolean;selfFunded:boolean},draw:()=>number):boolean{
 const academic=life.academics;
 if(!life.alive||!academic||academic.enrollment||academic.overseasResidence||academic.overseasApplication?.status==='pending'||academic.overseasApplication?.age===life.age||life.justice.prisonUntil!==null||![3,4].includes(academic.qualification))return false;
 const graduate=academic.qualification===4;
 if(funding.fullScholarship&&graduate)return false;
 const candidates=eligible.filter(o=>o.country!==life.country.id&&o.country!==life.migration.birthCountry.id&&getCountryById(o.country)&&Number.isFinite(o.weight)&&o.weight>0);
 const chosen=selectStudyDestinations(Object.fromEntries(candidates.map(o=>[o.country,o.weight])),draw);
 if(!chosen.length)return false;
 const originPPP=educationEraInputs(life.country,life.era,life.year).statistics.ppp;
 const options=chosen.map(country=>{
  const destination=getCountryById(country)!,candidate=candidates.find(o=>o.country===country)!;
  const languageMatches=studyLanguageMatches(life.migration.birthCountry.id,country,academic.qualification,graduate);
  return {country,languageMatches,quotedCost:overseasQuote({originPPP,destination:country,destinationPPP:destination.ppp,graduate,languageMatches}),admissionFactor:candidate.admissionFactor,policyFactor:candidate.policyFactor,scholarshipProbability:candidate.scholarshipProbability};
 });
 academic.overseasApplication={age:life.age,year:life.year,homeCountry:life.country.id,level:graduate?'graduate':'university',...funding,options,status:'pending'};
 return true;
}
