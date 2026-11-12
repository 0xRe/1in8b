import type {Life} from './types';
import {settleOfficerCareer} from './officer-career';
import {officerPayRange,officerMinimumPercentile,officerAnnualIncome,officerAgeIncomeFactor,type OfficerPayModifiers} from './officer-pay';
import {payEraCountry} from './pay-era';
export interface OfficerAnnualFacts extends OfficerPayModifiers {
 age:number;country:string;learnShare:number;familyShare:number;effortUsed:number;
 migrated:boolean;raisedThisYear:boolean;apprentice:boolean;rehired:boolean;
 eraIncomeFactor:number;frontPayPercentile:number|null;
}
/** Facts are scoped to one observed year; never reuse last year's economic/front-service inputs. */
export function settleOfficerRuntime(life:Life,draw:()=>number):boolean {
 const employment=life.academics?.academy?.employment,career=employment?.career,facts=employment?.annualFacts;
 if(!life.alive||life.stats.job!=='soldier'||life.stats.employment!=='employed'||life.justice.prisonUntil!==null||life.care.who==='self'||life.training.kind||!life.timeline?.complete||!employment||!career||!facts||facts.age!==life.age||facts.country!==life.country.id)return false;
 const current=payEraCountry(life.country,life.era,life.year);
 const [rangeLow,rangeHigh]=officerPayRange(current,life.country,life.era!=='today',career.rank);
 const settled=settleOfficerCareer(career,{...facts,percentile:employment.percentile,rangeLow,rangeHigh,minimumPercentile:officerMinimumPercentile(current,life.year),ppp:current.ppp,knowledge:life.stats.knowledge},draw);
 if(!settled)return true;
 const retirement=employment.retirementFacts;
 if(retirement?.age===life.age&&retirement.formalYears>=career.formalYears)retirement.formalYears+=settled.career.formalYears-career.formalYears;
 employment.career=settled.career;employment.percentile=settled.percentile;
 facts.effortUsed=settled.effortUsed;facts.migrationPenalty=settled.migrationPenalty;
 life.stats.annualIncome=officerAnnualIncome(current,life.year,settled.percentile,{...facts,ageIncomeFactor:officerAgeIncomeFactor(life.age)});
 employment.lastMilitaryPay={income:life.stats.annualIncome,country:life.country.id,age:life.age};
 if(retirement?.age===life.age){retirement.careerIncome=Math.max(retirement.careerIncome,life.stats.annualIncome);retirement.careerPercentile=Math.max(retirement.careerPercentile??employment.percentile,employment.percentile);}
 const probability=officerHealthExitProbability(life.age,life.stats.health);
 if(probability!==null&&draw()<probability){
  employment.healthExit={age:life.age,previousJob:'soldier'};
  if(life.stats.health<50)employment.sickOutAge=life.age;else delete employment.sickOutAge;
  life.stats.job='none';life.stats.employment='unemployed';life.stats.happiness-=6;
 }
 return true;
}
/** Source employed health exit precedes retirement and preserves the year's already earned pay. */
export function officerHealthExitProbability(age:number,health:number):number|null {
 return age<30||age>=65?null:health<25?.14:health<35?.06:health<45?.012:.002;
}

/** Source clears sickOut independently of salary facts; the historical exit record remains intact. */
export function settleOfficerRecovery(life:Life):void {
 const employment=life.academics?.academy?.employment,age=employment?.sickOutAge;
 if(!employment||age===undefined)return;
 if(life.stats.job!=='none'||life.stats.health>=50||life.age-age>=6)delete employment.sickOutAge;
}
