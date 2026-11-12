const regionalPaidWork={ssa:.239,sa:.055,eap:.062,lac:.06,mena:.064,eca:.04,hi:.02};
export interface ChildWorkContext {region:keyof typeof regionalPaidWork;quintile:number;war:number}
/** Retain false as well as true. Forced paid work bypasses the ordinary household draw. */
export function resolveChildWork(paid:boolean|undefined,context:ChildWorkContext,forcePaid:boolean,draw:()=>number):boolean {
 if(forcePaid)return true;
 if(paid!==undefined)return paid;
 const household=[1.5,1.25,1,.45,.1][context.quintile-1]??1;
 const probability=Math.max(.03,Math.min(.85,regionalPaidWork[context.region]*4*household*(context.war?1.5:1)));
 return draw()<probability;
}
export interface SchoolReturnResult {outcome:'help'|'enrolled'|'rejected';happiness:number;social:number}
/** This choice changes neither earned qualifications nor knowledge; the caller handles enrollment after success. */
export function resolveSchoolReturn(choice:'ask'|'help',quintile:number,social:number,draw:()=>number):SchoolReturnResult {
 if(choice==='help')return {outcome:'help',happiness:0,social:4};
 return draw()<.25+.1*quintile+social/400
  ?{outcome:'enrolled',happiness:0,social:0}
  :{outcome:'rejected',happiness:-5,social:0};
}
