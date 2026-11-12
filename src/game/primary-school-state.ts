import type {AcademicState} from './school-model';
import {primarySchoolAccess} from './primary-school-access';
import {resolvePrimaryEntry,type PrimaryEntryContext} from './primary-school-entry';
export interface PrimarySchoolRecord {
 lateEntry?:{age:8;country:string;outcome:'enrolled'|'help'|'rejected'};
 transferredAge?:number;lastRetentionAge?:number;
 placement?:{age:5;kind:'private'|'public'};
 entry?:{age:6;kind:'school'|'homeSchool'|'learningCentre'|'outOfSchool';country:string};
}
export type PrimaryRuntimeContext=Omit<PrimaryEntryContext,'placement'>;
/** Separate age-five plan; explicit public placement must be retained for cohort calibration. */
export function planPrimaryPlacement(academic:AcademicState,age:number,context:PrimaryRuntimeContext,separateSchoolPath:boolean,draw:()=>number):{academic:AcademicState;effortGain:number} {
 if(age!==5||separateSchoolPath||academic.primary?.placement||academic.primary?.entry||academic.enrollment||academic.qualification>0)return {academic,effortGain:0};
 const probability=primarySchoolAccess({...context,placement:'unassigned'}).privatePlacement;
 const kind=draw()<probability?'private':'public';
 return {academic:{...academic,primary:{...academic.primary,placement:{age:5,kind}}},effortGain:kind==='private'?.05:0};
}
/** Commit only the actual age-six admission; delayed/return entry uses separate decisions. */
export function commitPrimaryEntry(academic:AcademicState,age:number,context:PrimaryRuntimeContext,separateSchoolPath:boolean,draw:()=>number):AcademicState {
 if(age!==6||separateSchoolPath||academic.primary?.entry||academic.enrollment||academic.qualification>0)return academic;
 const kind=resolvePrimaryEntry({...context,placement:academic.primary?.placement?.kind??'unassigned'},draw);
 return {...academic,primary:{...academic.primary,entry:{age:6,kind,country:context.country}},
  ...(kind==='outOfSchool'?{}:{studyCountry:context.country,enrollment:{stage:'primary',completedYears:0,lastSettledAge:age-1,paused:false,graduationPending:false}}),
 };
}
