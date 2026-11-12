import {indexMilitaryPension,shouldAnnouncePensionIncrease} from './pension-index';
import type {Life} from './types';
import {startMilitaryPension} from './military-pension';
import {sourceRetirementAge} from './pension-eligibility';
import {composePensionIncome} from './pension-income';
/** Establish the source entitlement once; income composition and indexing are separate stages. */
export function prepareMilitaryPensionRuntime(life:Life):boolean {
 const e=life.academics?.academy?.employment,c=e?.career,pay=e?.lastMilitaryPay,service=e?.pensionService;
 if(!life.alive||!e||e.pension||!c||!pay||!service||service.age!==life.age)return false;
 const pension=startMilitaryPension({years:c.experienceYears,lastIncome:pay.income,lastCountry:pay.country,currentCountry:life.country.id,existing:null},life.age,life.stats.job==='soldier',service.remaining);
 if(!pension)return false;
 e.pension=pension;return true;
}

/** A known health departure is not a retirement/re-employment pension claim.
 * Preserve a health-exit year's earned salary. A mandatory other-work choice instead starts seeking immediately.
 * Ordinary retirement and active service need their separate income branches.
 */
export function settleDepartedOfficerIncome(life:Life):boolean {
 const e=life.academics?.academy?.employment,exit=e?.healthExit,service=e?.pensionService,retirement=e?.retirement;
 const seekingAfterRetirement=retirement?.status==='resolved'&&retirement.choice==='other'&&retirement.outcome.handledAge<=life.age;
 const restingAfterHealthExit=exit!==undefined&&exit.age<life.age;
 if(!life.alive||!e||(!seekingAfterRetirement&&!restingAfterHealthExit)||life.stats.job!=='none'||life.stats.employment!=='unemployed'||!service||service.age!==life.age||service.remaining>0)return false;
 const retirementAge=sourceRetirementAge({country:life.country.id,region:life.country.region,year:life.year,era:life.era!=='today'});
 if(life.age>=Math.min(65,retirementAge))return false;
 life.stats.annualIncome=composePensionIncome({branch:'inactive',earnedIncome:0,militaryPension:e.pension?.value??0,ordinaryPension:0,retiredPension:0,ordinaryEligible:false,soldier:false,prison:life.justice.prisonUntil!==null});
 return true;
}

/** Shared source index updates both retirement and military awards, never the immutable choice receipt. */
export function indexMilitaryPensionRuntime(life:Life):boolean {
 const e=life.academics?.academy?.employment;
 if(!life.alive||!e)return false;
 const original=e.pension?.value??e.retiredPension??0;
 if(original<=0)return false;
 const start=e.pension?.startedAge??(e.retirement?.status==='resolved'?e.retirement.outcome.handledAge:life.age);
 const result=indexMilitaryPension({value:original,startedAge:start},e.pensionIndex,life.country,life.era,life.year);
 const factor=result.value/original;
 const announce=shouldAnnouncePensionIncrease(life.age,original,result.value,e.pensionIndex?.increaseAge);
 if(announce&&result.index)result.index.increaseAge=life.age;
 if(e.pension)e.pension.value=result.value;
 if(e.retiredPension!==undefined)e.retiredPension*=factor;
 if(result.index)e.pensionIndex=result.index;
 return announce;
}

export function settleRetiredOfficerIncome(life:Life):boolean {
 const e=life.academics?.academy?.employment,service=e?.pensionService;
 if(!life.alive||!e||e.retiredPension===undefined||life.stats.employment!=='retired'||life.stats.job!=='retired'||!service||service.age!==life.age||service.remaining>0)return false;
 life.stats.annualIncome=composePensionIncome({branch:'retired',earnedIncome:0,militaryPension:e.pension?.value??0,ordinaryPension:0,retiredPension:e.retiredPension,ordinaryEligible:false,soldier:false,prison:life.justice.prisonUntil!==null});
 return true;
}

/** Preserve an explicitly recorded inactive service state across adjacent years; never infer or decrement active service. */
export function rollMilitaryServiceState(life:Life):boolean {
 const service=life.academics?.academy?.employment?.pensionService;
 if(!life.alive||!service||service.age!==life.age-1||service.remaining!==0)return false;
 service.age=life.age;return true;
}
