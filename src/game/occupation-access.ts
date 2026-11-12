import {OCCUPATIONS,type OccupationId} from './occupations';
import {majorAllowsJob,majorJobEducationRequirement,type MajorCareerFacts} from './major-career';
const state=new Set(['civil','police','soldier','teacher']);
const uniformed=new Set(['civil','police','soldier']);
const licensed=new Set(['doctor','lawyer','nurse','healthtech','prof','pilot']);
const recordRestricted=new Set(['civil','police','soldier','teacher','nurse','doctor','lawyer','finance','prof']);
const guest=new Set(['care','domestic','cleaner','cook','warehouse','delivery','driver','guard','shop']);
const camp=new Set(['vendor','construct','cleaner','artisan']);
const talibanAllowed=new Set(['doctor','nurse','healthtech','teacher','farm','farmhand','herder','artisan','garment','domestic']);
const selfEmployed=new Set(['farm','herder','fisher','haenyeo','vendor','artisan','creator','owner','agbiz']);
/** Facts must come from recorded history and country rules; no profession is granted by inference. */
export interface OccupationAccessFacts extends MajorCareerFacts {
 age:number;country:string;region:string;ppp:number;urban:boolean;quintile:number;money:number;medianIncome:number;
 currentJob?:OccupationId;changingJobs:boolean;lateCareer:boolean;experience:Partial<Record<OccupationId,number>>;
 skill?:OccupationId;codingQualificationAge?:number;training:readonly OccupationId[];
 sportBackground:boolean;artsOffers:readonly OccupationId[];
 /** Combined observed art/stunt, developmental, disability and ethnicity prohibitions. */
 blocked:readonly OccupationId[];
 /** Calendar/technology checks must be evaluated with the source era-specific rules. */
 eraAllowed:readonly OccupationId[];internetAllowed:readonly OccupationId[];
 rohingyaRefugee:boolean;stateless:boolean;noArmy:boolean;drivingSuspended:boolean;talibanWoman:boolean;
 guestWorker:boolean;migrant:boolean;naturalizedHere:boolean;recentDomesticUrbanMove:boolean;
 reindeerHerding:boolean;officer:boolean;mandatoryRetirement:boolean;oldJobExcluded?:OccupationId;
 irregular:boolean;papersValid:boolean;recordLicensePenalty:number;publicEmploymentBarred:boolean;
 civilAgeCap:number|null;
}
export type OccupationRejection='specialEntry'|'restricted'|'major'|'education'|'region'|'internet'|'income'|'age'|'capital'|'papers'|'record'|'sameJob';
export function occupationEarlyRejection(f:OccupationAccessFacts,id:OccupationId):OccupationRejection|null{
 const job=OCCUPATIONS[id];
 if(job.specialEntry&&!(id==='coach'&&(f.major==='pe'||f.sportBackground))&&!f.artsOffers.includes(id))return 'specialEntry';
 if(f.blocked.includes(id)||!f.eraAllowed.includes(id)||f.rohingyaRefugee&&!camp.has(id)||f.stateless&&uniformed.has(id)||id==='soldier'&&f.noArmy||f.drivingSuspended&&['driver','delivery'].includes(id)||f.talibanWoman&&!talibanAllowed.has(id)||f.guestWorker&&!guest.has(id)&&!['agr','ind'].includes(job.sector)||f.recentDomesticUrbanMove&&f.urban&&!f.migrant&&job.sector==='agr')return 'restricted';
 if(!majorAllowsJob(f,id))return 'major';
 const education=majorJobEducationRequirement(f,id,job.education);
 const coding=id==='dev'&&f.codingQualified&&f.codingQualificationAge!==undefined&&f.codingQualificationAge<=f.age;
 if(education>f.education&&f.skill!==id&&!coding&&!(f.training.includes(id)&&education-f.education<=1))return 'education';
 if(job.regions&&!job.regions.some(region=>region===f.region||region===f.country)&&!(id==='herder'&&f.reindeerHerding))return 'region';
 if(job.minimumInternet&&!f.internetAllowed.includes(id))return 'internet';
 if(job.highIncomeOnly&&f.ppp<25000)return 'income';
 const experienced=(f.experience[id]??0)>0;
 if(id==='driver'&&f.age<18)return 'age';
 if(['pilot','cabin'].includes(id)&&!experienced&&!(id==='pilot'&&f.officer&&(f.experience.soldier??0)>=5)&&(f.changingJobs||f.age>(id==='pilot'?30:35)))return 'age';
 if(id==='seafarer'&&!experienced&&!(f.currentJob==='fisher'&&f.age<=40)&&(f.changingJobs||f.age>32))return 'age';
 if(f.mandatoryRetirement&&uniformed.has(id)||f.oldJobExcluded===id)return 'restricted';
 if(id==='agbiz'&&f.quintile<4&&f.money<f.medianIncome*3)return 'capital';
 return null;
}
/** These exclusions happen after the industry availability denominator is counted. */
export function occupationLateRejection(f:OccupationAccessFacts,id:OccupationId):OccupationRejection|null{
 if(f.migrant&&!f.naturalizedHere&&uniformed.has(id)||f.irregular&&(state.has(id)||licensed.has(id))||!f.papersValid&&state.has(id))return 'papers';
 if(recordRestricted.has(id)&&f.recordLicensePenalty>=1||f.publicEmploymentBarred&&state.has(id))return 'record';
 if(f.lateCareer&&uniformed.has(id))return 'restricted';
 if(id==='civil'&&f.civilAgeCap!==null&&f.age>f.civilAgeCap)return 'age';
 if(f.changingJobs&&id===f.currentJob&&(selfEmployed.has(id)||id==='soldier'))return 'sameJob';
 return null;
}

export function occupationRejection(f:OccupationAccessFacts,id:OccupationId):OccupationRejection|null{
 return occupationEarlyRejection(f,id)??occupationLateRejection(f,id);
}
