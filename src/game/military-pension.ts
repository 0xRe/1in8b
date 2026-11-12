export interface MilitaryPension {value:number;startedAge:number}
export interface MilitaryPensionContext {years:number;lastIncome:number;lastCountry:string|null;currentCountry:string;existing:MilitaryPension|null}
/** Original military-only entitlement, independent of the separate civilian pension calculation. */
export function militaryPensionValue(c:MilitaryPensionContext):number {
 if(c.existing)return c.existing.value;
 return c.years>=20&&c.lastIncome>0&&(c.lastCountry??c.currentCountry)!=='JPN'?c.lastIncome*Math.min(.5,.32+.018*(c.years-20)):0;
}
export function startMilitaryPension(c:MilitaryPensionContext,age:number,workingAsSoldier:boolean,serviceRemaining:number):MilitaryPension|null {
 if(c.existing)return c.existing;
 if(workingAsSoldier||serviceRemaining>0)return null;
 const value=militaryPensionValue(c);
 return value?{value,startedAge:age}:null;
}
/** The caller provides the complete civilian pension base, including its own eligibility/history. */
export function combinedMilitaryPension(base:number,military:number,formalYears:number,militaryYears:number):number {
 if(!military)return base;
 const total=Math.max(formalYears,militaryYears);
 return Math.max(base,military+base*Math.max(0,total-militaryYears)/total);
}
