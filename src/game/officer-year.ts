export interface OfficerYearContext {
 age:number;percentile:number;rangeLow:number;rangeHigh:number;minimumPercentile:number;ppp:number;
 jobYears:number;experienceYears:number;formalYears:number;knowledge:number;
 workShare:number;learnShare:number;familyShare:number;effortUsed:number;
 migrated:boolean;migrationPenalty:number;raisedThisYear:boolean;
}
const clamp=(value:number,low:number,high:number)=>Math.max(low,Math.min(high,value));
/** Original employed non-owner pay progression. Rank-adjusted range and formal minimum must be resolved first. */
export function settleOfficerYear(c:OfficerYearContext,draw:()=>number){
 const jobYears=c.jobYears+1,experienceYears=c.experienceYears+1,formalYears=c.formalYears+1;
 const national=.55+.65*clamp(c.ppp/50000,0,1);
 const headroom=clamp((c.rangeHigh+.04-c.percentile)/Math.max(.05,c.rangeHigh-c.rangeLow)*1.2,0,1);
 const focus=(c.workShare*.012+c.learnShare*.006)*Math.max(0,1-c.effortUsed/.1);
 const growth=(c.age>55?-.004:(experienceYears<=10?.015*national:experienceYears<=20?.007*national:.001)*headroom)+focus*headroom-c.familyShare*.003+(.003+(c.knowledge-50)/50*.003)*headroom;
 let change=growth+(draw()-.5)*.02;
 if(jobYears===1||c.raisedThisYear)change=Math.max(0,change);
 const percentile=Math.max(clamp(c.percentile+change,Math.max(.005,c.rangeLow-.06),Math.min(.995,c.rangeHigh+.04)),c.minimumPercentile);
 return {jobYears,experienceYears,formalYears,percentile,effortUsed:c.effortUsed+focus,migrationPenalty:c.migrated&&c.migrationPenalty>0?Math.max(0,c.migrationPenalty-.015):c.migrationPenalty};
}
