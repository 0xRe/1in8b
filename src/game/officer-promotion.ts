type Rank=0|1|2;
export interface OfficerPromotionContext {
 age:number;rank:Rank;effectiveExperience:number;knowledge:number;lastStepAge:number|null;
 working:boolean;inOffice:boolean;nomad:boolean;enrolled:boolean;mandatoryRetirement:boolean;
}
/** effectiveExperience is source expIn('soldier').same, after any migration experience deduction. */
export function officerPromotionProbability(c:OfficerPromotionContext):number|null {
 if(!c.working||c.inOffice||c.nomad||c.enrolled||c.mandatoryRetirement||c.age<22||c.age>62||c.rank===2)return null;
 if(c.lastStepAge!==null&&c.age-c.lastStepAge<(c.rank?4:3))return null;
 if(c.rank===0)return c.effectiveExperience>=9?.22:null;
 return c.age>=45&&c.effectiveExperience>=18?.002*Math.max(.8,Math.min(1.6,.8+c.knowledge/100)):null;
}
interface PromotionResolution {
 age:number;rank:Rank;offeredRank:Rank;percentile:number;newRankCeiling:number;lastStepAge:number|null;
}
/** Caller validates the current offered decision and computes the ceiling for the promoted rank. */
export function resolveOfficerPromotion(c:PromotionResolution,choice:'accept'|'decline') {
 if(c.rank===2||c.rank!==c.offeredRank||c.lastStepAge===c.age)return null;
 if(choice==='decline')return {rank:c.rank,percentile:c.percentile,lastStepAge:c.age,happiness:0,health:0};
 return {rank:(c.rank+1) as Rank,percentile:Math.max(0,Math.min(.995,c.percentile+Math.max(.04,(c.newRankCeiling-c.percentile)*.5))),lastStepAge:c.age,happiness:5,health:-1};
}
