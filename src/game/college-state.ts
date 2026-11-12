import {resolveAcademy,type AcademyBranch} from './college-academy';
import type {CollegeMenu,CollegeChoice} from './college-menu';
import type {AcademicState} from './school-model';
import {collegeEntryGate,type CollegeEntryContext,type CollegeEntryResult} from './college-entry';
import {resolveDomesticCollege,type DomesticCollegeContext,type DomesticCollegeResult} from './college-domestic';
export interface CollegeRecord {
 choices:CollegeChoice[];academyOffer:CollegeMenu['academy'];
 age:number;country:string;kind:'ordinary'|'equivalency';status:'pending'|'enrolled'|'rejected'|'work'|'blocked'|'abroad';closureYear:number|null;
}
type Context=CollegeEntryContext&DomesticCollegeContext;
/** Initial graduation/GED handoff. Retake and historical reopening use separate eligibility transactions. */
export function prepareCollege(academic:AcademicState,c:Context,menu:CollegeMenu={choices:['apply','work'],abroad:'hidden',academy:null}):{academic:AcademicState;gate:CollegeEntryResult|null} {
 if(c.imprisoned||c.retaking||c.kind==='reopened'||academic.college||academic.enrollment||academic.qualification!==3)return {academic,gate:null};
 const graduation=academic.lastGraduation;
 const eligible=c.kind==='equivalency'?academic.equivalency?.collegePending===true:
  graduation?.age===c.age&&['upperSecondary','vocational'].includes(graduation.stage);
 if(!eligible)return {academic,gate:null};
 const gate=collegeEntryGate(c);
 return {academic:{...academic,college:{choices:[...menu.choices],academyOffer:menu.academy,age:c.age,country:c.country,kind:c.kind,status:gate.reason==='allowed'?'pending':'blocked',closureYear:gate.closureYear},...(c.kind==='equivalency'?{equivalency:{...academic.equivalency!,collegePending:false}}:{})},gate};
}
/** Caller atomically applies returned stats/job effects with this academic state. */
export function commitCollege(academic:AcademicState,c:Context,choice:'work'|'apply',draw:()=>number):{academic:AcademicState;effects:DomesticCollegeResult|null} {
 const record=academic.college;
 if(!record||!['work','apply'].includes(choice)||!record.choices.includes(choice)||record.status!=='pending'||record.age!==c.age||record.country!==c.country||record.kind!==c.kind||c.retaking||academic.enrollment||academic.qualification!==3||collegeEntryGate(c).reason!=='allowed')return {academic,effects:null};
 const effects=resolveDomesticCollege(c,choice,draw);
 const next:AcademicState={...academic,college:{...record,status:effects.status}};
 if(effects.status==='enrolled'){
  next.studyCountry=c.country;
  next.enrollment={stage:'university',completedYears:0,lastSettledAge:c.age-1,paused:false,graduationPending:false,...(effects.retention===null?{}:{retention:effects.retention})};
 }
 return {academic:next,effects};
}

/** Military choice uses the saved offered branch and freshly resolved eligibility. */
export function commitCollegeAcademy(academic:AcademicState,c:Context&{knowledge:number;health:number},choice:'army'|'navy'|'air',eligible:boolean,draw:()=>number):{academic:AcademicState;effects:ReturnType<typeof resolveAcademy>|null} {
 const record=academic.college;
 if(!eligible||!record?.academyOffer||!record.choices.includes(choice)||record.status!=='pending'||record.age!==c.age||record.country!==c.country||record.kind!==c.kind||c.retaking||academic.enrollment||academic.qualification!==3||collegeEntryGate(c).reason!=='allowed')return {academic,effects:null};
 const branch:AcademyBranch=choice==='army'?(record.academyOffer==='threeBranches'?'army':record.academyOffer):choice;
 const effects=resolveAcademy(c,branch,draw),result=effects.domestic;
 const next:AcademicState={...academic,college:{...record,status:result.status}};
 if(result.status==='enrolled'){
  next.studyCountry=c.country;
  next.enrollment={stage:'university',completedYears:0,lastSettledAge:c.age-1,paused:false,graduationPending:false,...(result.retention===null?{}:{retention:result.retention})};
  if(effects.academy)next.academy={branch,startedAge:c.age,major:'mil'};
 }
 return {academic:next,effects};
}
