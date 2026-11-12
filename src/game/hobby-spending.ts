import type {Life} from './types';
import {hobbyMedianIncome} from './hobby-catalog';
import {incomeAtPercentile} from './income-distribution';
import {educationEraInputs} from './education-era';
export type SpendingAccess='available'|'unknown'|'unavailable';
/** Null facts are evaluated both ways; an absent historical observation is never a false flag. */
export interface HobbySpendingFinance {
 medianIncome:number;lowerIncome:number;ppp:number;personalIncome:number;
 savings:number;debt:number;investments:number;homeValue:number;car:boolean;
 educationLevel:number;inHigherEducation:boolean;formal:boolean|null;debtIncreased:boolean|null;
}
export function hobbyCreditLimit(f:HobbySpendingFinance,formal:boolean):number {
 const priceLevel=Math.max(.22,Math.min(1.25,.11*Math.sqrt(f.ppp/1000)));
 return f.medianIncome*.2+Math.max(0,f.personalIncome)*(formal?1:.3)+f.homeValue*.8+(formal&&(f.educationLevel>=4||f.inHigherEducation)?f.medianIncome*.8:0)+(f.car?8000/priceLevel:0);
}
function heavyDebt(f:HobbySpendingFinance):boolean {
 const money=f.savings-f.debt;if(money>=0)return false;
 const debt=-money-f.investments,income=Math.max(f.personalIncome,f.lowerIncome);
 if(debt<income*.25)return false;
 return money+f.investments+f.homeValue<0||debt-Math.min(debt,f.homeValue*.8)>income*1.5||debt>income*6;
}
export function spendingAccessFromFinance(f:HobbySpendingFinance):SpendingAccess {
 const outcomes=(f.formal===null?[false,true]:[f.formal]).flatMap(formal=>(f.debtIncreased===null?[false,true]:[f.debtIncreased]).map(increased=>{
  const money=f.savings-f.debt;
  return money<0&&money>-hobbyCreditLimit(f,formal)*.98&&(heavyDebt(f)||increased);
 }));
 return outcomes.every(Boolean)?'available':outcomes.some(Boolean)?'unknown':'unavailable';
}
export function hobbySpendingFinance(life:Life):HobbySpendingFinance {
 const country={...life.country,...educationEraInputs(life.country,life.era,life.year).statistics};
 return {medianIncome:hobbyMedianIncome(life),lowerIncome:incomeAtPercentile(country,.3),ppp:country.ppp,personalIncome:life.stats.annualIncome,savings:life.stats.savings,debt:life.stats.debt,investments:life.stats.investments,homeValue:life.belongings.housingValue,car:life.belongings.transport==='car',educationLevel:life.stats.education,inHigherEducation:!!life.academics?.enrollment&&['university','graduate','phd'].includes(life.academics.enrollment.stage),formal:['hi','eca'].includes(life.country.region)?true:country.ppp<=15000?false:null,debtIncreased:null};
}
export function hobbySpendingAccess(life:Life):SpendingAccess {
 if(life.academics?.origin!=='birth'||!life.alive||life.pendingDecision||life.age<18||life.justice.prisonUntil!==null||!life.hobbies.some(h=>h.progress))return 'unavailable';
 if(life.hobbyState?.pausedSince!==undefined)return 'available';
 return spendingAccessFromFinance(hobbySpendingFinance(life));
}
/** Suppress recurring costs only when the credit boundary is known in every possible regime. */
export function hobbyCreditExhausted(life:Life):boolean {
 const f=hobbySpendingFinance(life),money=f.savings-f.debt;
 return money<0&&(f.formal===null?[false,true]:[f.formal]).every(formal=>money<=-hobbyCreditLimit(f,formal)*.98);
}
