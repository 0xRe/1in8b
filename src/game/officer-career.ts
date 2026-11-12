import {settleOfficerYear,type OfficerYearContext} from './officer-year';
/** Observed service counters, never inferred from calendar age or degree dates. */
export interface OfficerCareer {
 rank:0|1|2;
 lastStepAge?:number;
 promotionFacts?:import("./officer-promotion-runtime").OfficerPromotionFacts;
 promotion?:import("./officer-promotion-state").OfficerPromotionRecord;
 jobYears:number;
 experienceYears:number;
 formalYears:number;
 lastSettledAge:number;
}
export type OfficerCareerContext=Omit<OfficerYearContext,'jobYears'|'experienceYears'|'formalYears'>;
/** Caller first establishes active employment and a completed observed year. No RNG on replay. */
export function settleOfficerCareer(career:OfficerCareer,context:OfficerCareerContext,draw:()=>number){
 if(context.age<=career.lastSettledAge)return null;
 const result=settleOfficerYear({...context,jobYears:career.jobYears,experienceYears:career.experienceYears,formalYears:career.formalYears},draw);
 return {
  career:{...career,jobYears:result.jobYears,experienceYears:result.experienceYears,formalYears:result.formalYears,lastSettledAge:context.age},
  percentile:result.percentile,effortUsed:result.effortUsed,migrationPenalty:result.migrationPenalty,
 };
}
