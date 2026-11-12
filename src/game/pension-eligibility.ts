import type {PensionIncomeContext} from './pension-income';
interface RetirementContext {country:string;region:string;year:number;era:boolean}
export function sourceRetirementAge(c:RetirementContext):number {
 const base:Record<string,number>={hi:65,eca:62,lac:62,mena:60,eap:60,sa:60,ssa:60};
 const extra=c.era&&c.year>=2030&&(c.region==='hi'||c.region==='eca'||c.country==='CHN')?Math.min(5,Math.floor((c.year-2030)/10)+1):0;
 if(base[c.region]===undefined)throw new RangeError('Unknown pension region');
 return base[c.region]+extra;
}
export interface PensionEligibilityContext extends RetirementContext {
 age:number;formalYears:number;serviceRemaining:number;working:boolean;childwork:boolean;seeking:boolean;returningJobSearch:boolean;retired:boolean;
}
/** Eligibility for a working/seeking supplement differs from the pensionBase retirement lottery. */
export function selectPensionIncomeBranch(c:PensionEligibilityContext):{branch:PensionIncomeContext['branch'];ordinaryEligible:boolean;retirementAge:number} {
 const retirementAge=sourceRetirementAge(c);
 const ordinaryEligible=c.age>=retirementAge&&(c.region==='hi'||c.region==='eca'||c.formalYears>=10);
 const branch=c.serviceRemaining>0?'service':c.working?'working':c.childwork?'childwork':c.seeking&&!c.retired&&(c.returningJobSearch||ordinaryEligible)?'seekingPension':c.retired||c.age>=65?'retired':'inactive';
 return {branch,ordinaryEligible,retirementAge};
}
