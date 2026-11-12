import {retakeEligibility,type RetakeContext} from './school-admissions';
export interface UniversityAdmissionsState {
 version:1;
 choices?:{age:number;country:string;choice:'prepare'|'work'}[];
 lastAttempt?:{age:number;country:string;status:'enrolled'|'rejected'};
 /** Number of additional preparation years accepted, excluding the first application. */
 retakes:number;
 declined:boolean;
 scheduledAge:number|null;
 offer:{country:string;age:number;retakes:number}|null;
}
export type RetakeApplicant=Omit<RetakeContext,'attempts'>&{working:boolean};
export function emptyUniversityAdmissions():UniversityAdmissionsState {
 return {version:1,retakes:0,declined:false,scheduledAge:null,offer:null};
}
/** Called on rejection, not on enrollment; reopening and employed equivalency paths keep their work state. */
export function offerUniversityRetake(state:UniversityAdmissionsState,c:RetakeApplicant,kind:'ordinary'|'reopened'|'equivalency'):UniversityAdmissionsState {
 if(state.offer||state.scheduledAge!==null)return state;
 if(kind==='reopened'||kind==='equivalency'&&c.working||state.declined||retakeEligibility({...c,attempts:state.retakes})!=='eligible')return state;
 return {...state,offer:{country:c.country,age:c.age,retakes:state.retakes}};
}
export function chooseUniversityRetake(state:UniversityAdmissionsState,choice:'prepare'|'work',c:RetakeApplicant):{
 state:UniversityAdmissionsState;effect:{happiness:number;knowledge:number;becomeStudent:true}|null;
} {
 if(!state.offer)return {state,effect:null};
 const cleared={...state,offer:null};
 if(c.imprisoned||c.irregular||c.age!==state.offer.age||c.country!==state.offer.country||state.offer.retakes!==state.retakes||state.retakes>=3)return {state:cleared,effect:null};
 if(choice==='work')return {state:{...cleared,declined:true,scheduledAge:null},effect:null};
 return {state:{...cleared,retakes:state.retakes+1,scheduledAge:c.age+1},effect:{happiness:-3,knowledge:2,becomeStudent:true}};
}
export interface RetakeYearContext {
 age:number;serving:boolean;enrolled:boolean;job:'student'|'seeking'|'other';married:boolean;
}
/** Service defers consumption. Once due without service, eligibility is checked and the marker consumed exactly once. */
export function consumeUniversityRetake(state:UniversityAdmissionsState,c:RetakeYearContext):{state:UniversityAdmissionsState;apply:boolean} {
 if(state.scheduledAge===null||c.age<state.scheduledAge||c.serving)return {state,apply:false};
 return {state:{...state,scheduledAge:null},apply:!c.enrolled&&(c.job==='student'||c.job==='seeking')&&c.age<=25&&!c.married};
}
