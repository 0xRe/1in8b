import type {AcademicState} from './school-model';
import {planLowerSecondary,resolveLowerSecondaryChoice,type LowerSecondaryContext,type LowerSecondaryChoice,type LowerSecondaryPlan,type LowerSecondaryResult} from './lower-secondary';
export interface LowerSecondaryRecord {
 age:number;country:string;route:LowerSecondaryPlan['route'];status:'pending'|'enrolled'|'outOfSchool';retry?:boolean;
}
function enroll(academic:AcademicState,c:LowerSecondaryContext,retention?:number):AcademicState {
 return {...academic,studyCountry:c.country,enrollment:{stage:'lowerSecondary',completedYears:0,lastSettledAge:c.age-1,paused:false,graduationPending:false,...(retention===undefined?{}:{retention})}};
}
/** Initial post-primary entry only. Late return and separate developmental schooling have separate transactions. */
export function prepareLowerSecondary(academic:AcademicState,c:LowerSecondaryContext,separateSchoolPath:boolean,draw:()=>number):{academic:AcademicState;plan:LowerSecondaryPlan|null} {
 const degree=academic.lastGraduation;
 if(separateSchoolPath||c.returning||c.age<10||academic.lowerSecondary||academic.enrollment||academic.qualification!==1||degree?.stage!=='primary'||degree.age!==c.age)return {academic,plan:null};
 const plan=planLowerSecondary(c,draw);
 const next:AcademicState={...academic,lowerSecondary:{age:c.age,country:c.country,route:plan.route,status:plan.kind==='choice'?'pending':plan.kind==='enrolled'?'enrolled':'outOfSchool'}};
 return {academic:plan.kind==='enrolled'?enroll(next,c,plan.retention):next,plan};
}
/** Caller applies returned effects together with this state; a repeated commit returns no effects. */
export function commitLowerSecondaryChoice(academic:AcademicState,c:LowerSecondaryContext,choice:LowerSecondaryChoice,draw:()=>number):{academic:AcademicState;effects:LowerSecondaryResult|null} {
 const receipt=academic.lowerSecondary;
 if(!receipt||receipt.status!=='pending'||receipt.age!==c.age||receipt.country!==c.country||academic.enrollment||academic.qualification!==1||c.returning||(receipt.route==='banned')!==c.banned)return {academic,effects:null};
 const effects=resolveLowerSecondaryChoice(c,choice,draw);
 if(!effects)return {academic,effects:null};
 const next:AcademicState={...academic,lowerSecondary:{...receipt,status:effects.kind==='enrolled'?'enrolled':'outOfSchool',retry:effects.retry}};
 return {academic:effects.kind==='enrolled'?enroll(next,c):next,effects};
}
