import {resolveUniversityApplication,type UniversityApplicationContext} from './school-admissions';
export interface DomesticCollegeContext extends UniversityApplicationContext {
 kind:'ordinary'|'reopened'|'equivalency';job:'student'|'seeking'|'working'|'other';
}
export interface DomesticCollegeResult {
 status:'work'|'enrolled'|'rejected';mode:'open'|'competitive'|null;retention:number|null;
 job:'keep'|'student'|'seeking';happiness:number;rememberJob:boolean;returnFromAssignedWork:boolean;
 /** A qualifying rejection may invite a retake; country/household/age gates still apply. */
 retakeEligible:boolean;
}
/** Only the domestic work/application branches. Closure, military and overseas choices are resolved separately. */
export function resolveDomesticCollege(c:DomesticCollegeContext,choice:'work'|'apply',draw:()=>number):DomesticCollegeResult {
 const employedEquivalency=c.kind==='equivalency'&&c.job==='working',reopened=c.kind==='reopened';
 const base:DomesticCollegeResult={status:'work',mode:null,retention:null,job:'seeking',happiness:0,rememberJob:false,returnFromAssignedWork:false,retakeEligible:false};
 if(choice==='work')return {...base,job:reopened||employedEquivalency?'keep':'seeking'};
 const application=resolveUniversityApplication(c,draw);
 if(application.status==='rejected')return {...base,status:'rejected',mode:application.mode,job:reopened||employedEquivalency?'keep':'seeking',happiness:reopened||employedEquivalency?-4:-8,retakeEligible:!reopened&&!employedEquivalency};
 if(application.mode==='open')return {...base,...application,job:employedEquivalency||c.job==='seeking'?'student':'keep',happiness:4,rememberJob:employedEquivalency};
 return {...base,...application,job:reopened||employedEquivalency||c.job==='seeking'?'student':'keep',happiness:c.retaking||reopened?7:5,rememberJob:(reopened||employedEquivalency)&&c.job==='working',returnFromAssignedWork:reopened};
}
