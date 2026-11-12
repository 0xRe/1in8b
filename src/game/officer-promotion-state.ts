import {officerPromotionProbability,resolveOfficerPromotion,type OfficerPromotionContext} from './officer-promotion';
export interface OfficerPromotionRecord {age:number;rank:0|1|2;job:'soldier';status:'ineligible'|'missed'|'offered'|'resolved'}
/** Called at the source ladder slot, after earlier decisions have reserved their capacity. */
export function prepareOfficerPromotion(previous:OfficerPromotionRecord|undefined,context:OfficerPromotionContext,queued:number,draw:()=>number):OfficerPromotionRecord|undefined {
 if(previous&&previous.age>=context.age)return previous;
 if(queued>=2)return previous;
 const probability=officerPromotionProbability(context);
 return {age:context.age,rank:context.rank,job:'soldier',status:probability===null?'ineligible':draw()<probability?'offered':'missed'};
}
export function commitOfficerPromotion(record:OfficerPromotionRecord,context:{age:number;rank:0|1|2;job:string;percentile:number;newRankCeiling:number;lastStepAge:number|null},choice:'accept'|'decline') {
 if(record.status!=='offered'||record.age!==context.age||record.rank!==context.rank||record.job!==context.job)return null;
 const effect=resolveOfficerPromotion({...context,offeredRank:record.rank},choice);
 return effect?{state:{...record,status:'resolved' as const},effect}:null;
}
