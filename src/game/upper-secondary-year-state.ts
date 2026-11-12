import {schoolDuration,type AcademicState} from './school-model';
import {settleUpperSecondaryRisk,resolveSchoolWithdrawal,settleEquivalencyExam,type UpperSecondaryYearContext,type SchoolWithdrawalReason,type EquivalencyExamContext} from './upper-secondary-year';
export interface SecondaryProgress {
 settledAge:number;answered:boolean;committedToStay:boolean;answeredAge?:number;
 pending:{age:number;country:string;reason:SchoolWithdrawalReason;mandatory:boolean}|null;
}
export interface EquivalencyState {
 examAt:number|null;target:1|2|3;lastResult?:{age:number;passed:boolean};highSchoolPassAge?:number;collegePending?:boolean;
}
type YearEnvironment=Omit<UpperSecondaryYearContext,'stage'|'completedYears'|'duration'|'retention'|'withdrawalAnswered'|'committedToStay'>;
/** Call after credit settlement. Unobserved/replayed years cannot draw risk or grant credit. */
export function commitUpperSecondaryYear(academic:AcademicState,c:YearEnvironment,draw:()=>number){
 const school=academic.enrollment,previous=academic.secondaryProgress;
 if(!school||!['upperSecondary','vocational'].includes(school.stage)||school.paused||school.lastSettledAge!==c.age||(previous?.settledAge??-1)>=c.age||previous?.pending)return {academic,effects:null};
 const stage=school.stage as 'upperSecondary'|'vocational';
 const effects=settleUpperSecondaryRisk({...c,stage,completedYears:school.completedYears,duration:schoolDuration(stage,c.country,false),retention:school.retention,withdrawalAnswered:previous?.answered??false,committedToStay:previous?.committedToStay??false},draw);
 const next:AcademicState={...academic,enrollment:{...school},secondaryProgress:{settledAge:c.age,answered:previous?.answered??false,...(previous?.answeredAge===undefined?{}:{answeredAge:previous.answeredAge}),committedToStay:previous?.committedToStay??false,pending:effects.kind==='choice'?{age:c.age,country:c.country,reason:effects.reason!,mandatory:effects.mandatory!}:null}};
 if(effects.clearRetention)delete next.enrollment!.retention;
 if(effects.kind==='withdraw'){
  next.enrollment=null;next.lastWithdrawal={stage,age:c.age,completedYears:school.completedYears,country:c.country};
 }
 return {academic:next,effects};
}
export function commitSchoolWithdrawal(academic:AcademicState,c:{age:number;country:string;homeSchool:boolean},choice:'stay'|'ged'|'work'){
 const progress=academic.secondaryProgress,pending=progress?.pending,school=academic.enrollment;
 if(!progress||!pending||progress.answered||pending.age+1!==c.age||pending.country!==c.country||c.homeSchool||!school||!['upperSecondary','vocational'].includes(school.stage))return {academic,effects:null};
 const effects=resolveSchoolWithdrawal(choice,pending.reason,c.age);
 const next:AcademicState={...academic,secondaryProgress:{...progress,pending:null,answered:true,answeredAge:c.age,committedToStay:effects.committedToStay}};
 if(effects.leave){
  next.enrollment=null;next.lastWithdrawal={stage:school.stage as 'upperSecondary'|'vocational',age:c.age,completedYears:school.completedYears,country:c.country};
  if(effects.examAt!==null)next.equivalency={examAt:effects.examAt,target:Math.min(3,academic.qualification+1) as 1|2|3};
 }
 return {academic:next,effects};
}
/** Atomically consume the examination before its result can be replayed after reload. */
export function commitEquivalencyExam(academic:AcademicState,c:Omit<EquivalencyExamContext,'examAt'|'target'|'qualification'>,draw:()=>number){
 const exam=academic.equivalency;
 if(!exam)return {academic,effects:null};
 const effects=settleEquivalencyExam({...c,examAt:exam.examAt,target:exam.target,qualification:academic.qualification},draw);
 if(!effects)return {academic,effects:null};
 const next:AcademicState={...academic,qualification:effects.qualification,equivalency:{...exam,examAt:null,lastResult:{age:c.age,passed:effects.passed},collegePending:effects.queueCollege,...(effects.highSchoolPassAge===null?{}:{highSchoolPassAge:effects.highSchoolPassAge})}};
 return {academic:next,effects};
}
