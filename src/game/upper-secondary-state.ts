import type {AcademicState} from './school-model';
import {planUpperSecondary,resolveUpperSecondary,type UpperSecondaryContext,type UpperSecondaryChoice,type UpperSecondaryPlan,type UpperSecondaryResult} from './upper-secondary';
export interface UpperSecondaryRecord {
 age:number;country:string;route:'choice'|'homeSchool'|'camp'|'freeSchool';status:'pending'|'enrolled'|'outOfSchool';choices?:UpperSecondaryChoice[];
}
function enroll(academic:AcademicState,c:UpperSecondaryContext,stage:'upperSecondary'|'vocational',retention?:number):AcademicState {
 return {...academic,studyCountry:c.country,enrollment:{stage,completedYears:0,lastSettledAge:c.age-1,paused:false,graduationPending:false,...(retention===undefined?{}:{retention})}};
}
/** Initial graduation handoff only; late return and developmental paths have separate transactions. */
export function prepareUpperSecondary(academic:AcademicState,c:UpperSecondaryContext,separateSchoolPath:boolean):{academic:AcademicState;plan:UpperSecondaryPlan|null} {
 if(separateSchoolPath||c.returning||c.age<10||academic.upperSecondary||academic.enrollment||academic.qualification!==2||academic.lastGraduation?.stage!=='lowerSecondary'||academic.lastGraduation.age!==c.age)return {academic,plan:null};
 const plan=planUpperSecondary(c);
 const next:AcademicState={...academic,upperSecondary:{age:c.age,country:c.country,...(plan.choices?{choices:plan.choices}:{}),route:c.homeSchool?'homeSchool':c.refugeeCamp?'camp':plan.kind==='enrolled'?'freeSchool':'choice',status:plan.kind==='choice'?'pending':plan.kind==='enrolled'?'enrolled':'outOfSchool'}};
 return {academic:plan.kind==='enrolled'?enroll(next,c,'upperSecondary',plan.retention):next,plan};
}
/** Effects and the returned state must be committed together by the runtime. */
export function commitUpperSecondaryChoice(academic:AcademicState,c:UpperSecondaryContext,choice:UpperSecondaryChoice,draw:()=>number):{academic:AcademicState;effects:UpperSecondaryResult|null} {
 const receipt=academic.upperSecondary;
 if(!receipt||receipt.route!=='choice'||receipt.status!=='pending'||receipt.age!==c.age||receipt.country!==c.country||academic.enrollment||academic.qualification!==2||c.returning)return {academic,effects:null};
 const effects=resolveUpperSecondary(c,choice,draw);
 if(!effects)return {academic,effects:null};
 let next:AcademicState={...academic,upperSecondary:{...receipt,status:effects.kind==='enrolled'?'enrolled':'outOfSchool'}};
 if(effects.kind==='enrolled')next=enroll(next,c,effects.stage!,effects.retention);
 if(effects.specialist)next.specialistSchool={kind:effects.specialist.kind,hobby:effects.specialist.hobby};
 return {academic:next,effects};
}
