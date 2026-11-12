import type {AnnualRecord} from './types';
import {ordinaryPensionBase,type PensionBaseContext} from './pension-base';

type HistoryRow={age:number;annual:AnnualRecord|null};
/** Financial settlement reads previous completed years, before adding this year's source snapshot. */
export function observedPensionHistory(history:readonly HistoryRow[],beforeAge:number) {
 const indexed=new Map(history.map(row=>[row.age,row.annual]));
 const rows:PensionBaseContext['history'][number][]=[];
 const missingAges:number[]=[];
 for(let age=20;age<beforeAge;age++) {
  const annual=indexed.get(age);
  if(!annual || annual.completed!==true || annual.personalIncome===undefined) {
   missingAges.push(age);
   continue;
  }
  rows.push({age,country:annual.country,income:Math.round(annual.personalIncome)});
 }
 return {complete:missingAges.length===0,rows,missingAges};
}
/** Missing history is unknown, not zero: do not draw eligibility or fabricate a partial award. */
export function pensionBaseFromObservedHistory(context:Omit<PensionBaseContext,'history'>,history:readonly HistoryRow[],beforeAge:number,draw:()=>number):number|null {
 const observed=observedPensionHistory(history,beforeAge);
 return observed.complete?ordinaryPensionBase({...context,history:observed.rows},draw):null;
}

import type {Country,Era} from './types';
import {pensionEraCountry} from './pension-era';
/** Modern current-country input is projected once; foreign-history statistics stay modern per source. */
export function pensionBaseAtYear(context:Omit<PensionBaseContext,'history'|'era'|'country'>&{country:Country},history:readonly HistoryRow[],beforeAge:number,era:Era,draw:()=>number):number|null {
 return pensionBaseFromObservedHistory({...context,country:pensionEraCountry(context.country,era,context.year),era:era!=='today'},history,beforeAge,draw);
}

import {militaryPensionValue,combinedMilitaryPension,type MilitaryPensionContext} from './military-pension';
/** Source pensionAmount: civilian base first, then military entitlement plus nonmilitary service share. */
export function pensionAmountAtYear(context:Parameters<typeof pensionBaseAtYear>[0],history:readonly HistoryRow[],beforeAge:number,era:Era,military:Omit<MilitaryPensionContext,'currentCountry'>,draw:()=>number):number|null {
 const base=pensionBaseAtYear(context,history,beforeAge,era,draw);
 if(base===null)return null;
 const amount=militaryPensionValue({...military,currentCountry:context.country.id});
 return combinedMilitaryPension(base,amount,context.formalYears,military.years);
}
