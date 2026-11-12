import type {Country} from './types';
import {incomeAtPercentile} from './income-distribution';
const tuitionFree=new Set(['DEU','AUT','NOR','FIN','SWE','DNK','CZE','POL','SVK','GRC','FRA','TUR','ARG','BRA','URY','CUB','EGY','DZA','MAR','TUN','LBY','SAU','KWT','QAT','OMN','ARE','IRN','EST','SVN','HRV','MLT','CYP','LUX','MUS','BHR','MDV']);
/** Source four-year tuition/living-cost package. Country must already carry era-adjusted PPP. */
export function childUniversityCost(country:Country,koreanSupport:boolean):number {
 return incomeAtPercentile(country,.5)*(country.region==='hi'?1.6:country.region==='eca'?.8:1)*
  (tuitionFree.has(country.id)?.5:country.id==='KOR'&&koreanSupport?.4:1);
}
export interface ChildFundingResult {
 outcome:'funded'|'shared'|'self'|'assisted'|'withdrawn';cost:number;happiness:number;social:number;bond:number;
}
/** Resolve once at the funding choice. A caller must not invoke this as annual dropout risk. */
export function resolveChildUniversityFunding(choice:'full'|'half'|'self',cost:number,savings:number,random:()=>number):ChildFundingResult {
 if(choice==='full')return {outcome:'funded',cost,happiness:6,social:4,bond:4};
 if(choice==='half')return {outcome:'shared',cost:cost/2,happiness:4,social:3,bond:2};
 if(random()<.25){
  const assistance=cost*.4;
  if(savings>=assistance&&random()<Math.max(0,Math.min(1,savings/Math.max(1,cost))))
   return {outcome:'assisted',cost:assistance,happiness:1,social:0,bond:1};
  return {outcome:'withdrawn',cost:0,happiness:-6,social:-2,bond:0};
 }
 return {outcome:'self',cost:0,happiness:2,social:0,bond:0};
}
