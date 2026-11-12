import privateShares from '../data/private-school-share.json';
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
export interface PrimarySchoolContext {
 /** Contextual completion probability from educationAccess.transitions[0], not a national percentage. */
 completion:number;
 /** Current-country conditions; privateShare must already reflect birth-country/era inputs. */
 region:string;war:number;year:number;quintile:number;rich:boolean;privateShare:number;
 /** Unassigned is distinct from a household explicitly placed in the public cohort. */
 placement:'private'|'public'|'unassigned';
}
/** Calibrate start and retention together so private enrollment is not counted twice. */
export function primarySchoolAccess(context:PrimarySchoolContext){
 const start=context.war<1&&['hi','eca'].includes(context.region)&&context.year>=1980
  ?1:clamp(context.completion+.12,0,.998)*(context.war>=1.5?.8:1);
 const late=(probability:number)=>Math.min(.998,probability+(1-probability)*.35);
 const privatePlacement=context.war>=1?0:Math.min(.9,context.privateShare*[0,.3,.6,1,1.6,2.6][context.quintile]*(context.rich?2:1),start>=1?1:.85*context.completion);
 const otherPrivate=context.placement==='public'?privatePlacement:0;
 const publicStart=otherPrivate>0&&start<1?clamp((start-otherPrivate)/(1-otherPrivate),0,1):start;
 const publicLateEntry=late(publicStart),lateEntry=late(start);
 const retention=clamp(otherPrivate>0?(context.completion-otherPrivate)/((1-otherPrivate)*publicLateEntry):context.completion/lateEntry,.01,1);
 return {start,lateEntry,privatePlacement,publicStart,publicLateEntry,retention};
}
/** Caller applies a transfer/withdrawal once after an observed school year, before graduation. */
export function resolvePrimaryRetention(context:PrimarySchoolContext,completedYears:number,duration:number,knowledge:number,persistent:boolean,developmentalProtection:boolean,draw:()=>number):'stay'|'transfer'|'withdraw' {
 if(completedYears<1||completedYears>=duration)return 'stay';
 const access=primarySchoolAccess(context);
 const risk=access.start>=1?0:1-access.retention**(1/(duration-1))+(knowledge<8&&context.completion<.97?.02:0);
 if(risk<=0)return 'stay';
 const threshold=clamp(risk*(persistent?.8:1)*(context.placement==='private'?.15:1),0,.4);
 const failed=draw()<threshold;
 if(!failed)return 'stay';
 if(context.placement==='private')return 'transfer';
 return developmentalProtection?'stay':'withdraw';
}

/** Source simulation calibration, not a live enrollment statistic. Era exclusion is resolved by the caller. */
export function privateSchoolShare(country:string,region:string,publicOnlyEra:boolean):number {
 if(publicOnlyEra)return 0;
 const shares:Record<string,number>=privateShares;
 const regional:Record<string,number>={hi:6,eca:1,lac:12,eap:8,mena:10,sa:20,ssa:15};
 return (shares[country]??regional[region]??5)/100;
}
