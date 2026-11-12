import {resolveDomesticCollege,type DomesticCollegeContext,type DomesticCollegeResult} from './college-domestic';
export interface AcademyEligibility {
 country:string;birthCountry:string;age:number;year:number;historical:boolean;sex:'M'|'F';knowledge:number;health:number;
 disability:string|null;immigrated:boolean;refugee:boolean;papersValid:boolean;married:boolean;idol:boolean;criminalRecord:boolean;religiousBelief:boolean;
}
export function academyEligible(c:AcademyEligibility):boolean {
 const before=(year:number)=>c.historical&&c.year<year;
 return c.age<=22&&!(c.country==='CHN'&&c.religiousBelief)&&!(c.country==='JPN'&&before(1953)&&!before(1946))&&
  c.knowledge>=55&&c.health>=60&&(!c.disability||c.disability==='hear')&&c.country===c.birthCountry&&!c.immigrated&&!c.refugee&&c.papersValid&&
  !['CRI','PAN','ISL','HKG','MAC'].includes(c.country)&&!(c.sex==='F'&&(['SAU','IRN','AFG','YEM','SOM'].includes(c.country)||before(1990)))&&
  !c.married&&!c.idol&&!c.criminalRecord;
}
export type AcademyBranch='army'|'navy'|'air'|'jp'|'cn'|'generic';
/** Requires an eligible offered branch. China fallback deliberately consumes ordinary admission RNG separately. */
export function resolveAcademy(c:DomesticCollegeContext&{knowledge:number;health:number},branch:AcademyBranch,draw:()=>number):{
 academy:boolean;fallback:boolean;health:number;domestic:DomesticCollegeResult;
} {
 const probability=Math.max(.03,Math.min(.35,.04+(c.knowledge-55)*.006+(c.health-60)*.004));
 const accepted=draw()<probability*(branch==='air'?(c.health>=70?.85:.4):1);
 const base:DomesticCollegeResult={status:'rejected',mode:'competitive',retention:null,job:'seeking',happiness:-6,rememberJob:false,returnFromAssignedWork:false,retakeEligible:true};
 if(accepted)return {academy:true,fallback:false,health:2,domestic:{...base,status:'enrolled',job:c.job==='seeking'?'student':'keep',happiness:6,retakeEligible:false}};
 if(branch==='cn')return {academy:false,fallback:true,health:0,domestic:resolveDomesticCollege(c,'apply',draw)};
 return {academy:false,fallback:false,health:0,domestic:base};
}
