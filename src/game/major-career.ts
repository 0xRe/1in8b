import type {UniversityMajor} from './university-major';

/** Observed occupational entry requirements; education and licensing are separate gates. */
export const REQUIRED_JOB_MAJORS:Readonly<Record<string,readonly UniversityMajor[]>>={
 doctor:['med'],nurse:['med','nurse'],lawyer:['law'],engineer:['eng','cs','sci','arch'],healthtech:['med','nurse','sci'],
};
const preferred:Readonly<Record<string,{majors:readonly UniversityMajor[];otherwise:number;exceptions?:Partial<Record<UniversityMajor,number>>}>>={
 dev:{majors:['cs','eng','sci'],otherwise:.12},
 designer:{majors:['art','cs','eng','arch','media'],otherwise:.15},
 finance:{majors:['biz','law','sci','eng','cs'],otherwise:.2,exceptions:{hum:.5,soc:.6,edu:.35,agr:.35,media:.35,pe:.1}},
 social:{majors:['soc'],otherwise:.1,exceptions:{edu:.12,hum:.1,nurse:.8,biz:.45,sci:.35,media:.35,law:.3}},
};
export interface MajorCareerFacts {education:number;major?:UniversityMajor;codingQualified?:boolean}
const qualifiedMajor=(facts:MajorCareerFacts)=>facts.education>=4?facts.major:undefined;
/** Ordinary offers preserve unknown legacy degrees; aspiration offers require positive evidence. */
export function majorAllowsJob(facts:MajorCareerFacts,job:string,route:'ordinary'|'aspiration'='ordinary'):boolean{
 const requirements=REQUIRED_JOB_MAJORS[job],major=qualifiedMajor(facts);
 return !requirements||(!major?route==='ordinary':requirements.includes(major));
}
/** This factor belongs in the source offer weighting, not the probability of accepting a job. */
export function crossMajorJobWeight(facts:MajorCareerFacts,job:string):number{
 const major=qualifiedMajor(facts),rule=preferred[job];
 if(!major||!rule||rule.majors.includes(major)||job==='dev'&&facts.codingQualified)return 1;
 return rule.exceptions?.[major]??rule.otherwise;
}
export function majorJobEducationRequirement(facts:MajorCareerFacts,job:string,base:number):number{
 const major=qualifiedMajor(facts);
 return job==='doctor'&&major==='med'||job==='lawyer'&&major==='law'?4:base;
}
