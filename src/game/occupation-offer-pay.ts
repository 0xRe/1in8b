import {incomeAtPercentile,percentileOfIncome,type IncomeCountry} from './income-distribution';
import type {OccupationId} from './occupations';
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const formalFactors:Partial<Record<OccupationId,number>>={civil:.1,teacher:.3,nurse:.3,doctor:.3,police:.1,soldier:.1,clerk:.4,engineer:.4,finance:.3,dev:.4,factory:.7,callc:.4,electric:.8,prof:.2,lawyer:.5,childcare:.4,healthtech:.3,social:.2,warehouse:.5,salesagent:.8,welder:.9};
export interface OfferPayFacts {
 country:IncomeCountry;range:readonly [number,number];informality:number;criminalWeight:number;disabled:boolean;familyEdge:number;knowledgeZ:number;
 sameExperience:number;familyExperience:number;previousPercentile:number|null;changingJobs:boolean;
 learnShare:number;effectiveWork:number;preparationYears:number;lateCareer:boolean;irregular:boolean;papersValid:boolean;
 minimumPercentile:(id:OccupationId,formal:boolean)=>number;
}
export interface OccupationalOffer {id:OccupationId;formal:boolean;percentile:number;experience:number;relatedExperience:boolean;lateCareer:boolean}
export function occupationOfferPay(id:OccupationId,f:OfferPayFacts,draw:()=>number):OccupationalOffer{
 const [low,high]=f.range;
 const formalChance=clamp(1-f.informality*(formalFactors[id]??1.15),.02,.98);
 let percentile=clamp(low+(high-low)*(.18+.4*draw())-.06*f.criminalWeight-(f.disabled?.03:0)+f.familyEdge,.004,.99);
 const knowledge=clamp(f.knowledgeZ,-2,2.5);
 if(knowledge)percentile=clamp(percentileOfIncome(f.country,incomeAtPercentile(f.country,percentile)*Math.exp(.13*knowledge)),.004,.99);
 const headroom=f.previousPercentile!==null?clamp((high+.04-f.previousPercentile)/Math.max(.05,high-low)*1.2,0,1):1;
 if(f.sameExperience>=1&&f.previousPercentile!==null){
  const change=f.changingJobs?(.01+.03*draw())*headroom:-.02-.04*draw();
  percentile=clamp(Math.max(percentile,f.previousPercentile+change),.004,Math.min(.99,Math.max(high,f.previousPercentile)));
 }else if(f.sameExperience>=1||f.familyExperience>=2)percentile=clamp(percentile+Math.min(f.sameExperience*.012+f.familyExperience*.006,.12),.004,Math.min(.99,high));
 if(f.changingJobs)percentile=clamp(percentile+f.learnShare*.01*f.effectiveWork*headroom,.004,.99);
 else if(f.preparationYears)percentile=clamp(percentile+.02*f.preparationYears,.004,Math.min(.99,high));
 if(f.lateCareer)percentile=clamp(percentileOfIncome(f.country,incomeAtPercentile(f.country,percentile)*.7),.004,.99);
 percentile=Math.min(percentile,Math.min(.995,high+.04));
 const stateJob=['civil','police','soldier'].includes(id);
 // Non-state jobs draw even when paperwork subsequently prevents formal employment.
 const formal=(stateJob||draw()<formalChance)&&!f.irregular&&f.papersValid;
 return {id,formal,percentile:Math.max(percentile,f.minimumPercentile(id,formal)),experience:f.sameExperience>=1?f.sameExperience:0,relatedExperience:f.sameExperience<1&&f.familyExperience>=2,lateCareer:f.lateCareer};
}
