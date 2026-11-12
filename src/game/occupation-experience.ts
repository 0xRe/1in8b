import type {Life} from './types';
import {OCCUPATIONS as occupationCatalog,occupationFromLegacyJob,type OccupationId} from './occupations';
import {occupationFamily} from './occupation-market';
import {WORK_JOB_IDS,occupationJob} from './job-identities';
export interface OccupationExperience {version:1;sinceYear:number;lastSettledYear?:number;years:Partial<Record<OccupationId,number>>;unclassifiedYears:number;migration?:{year:number;country:string;discounts:Partial<Record<OccupationId,number>>}}
const migrationRestricted=new Set<OccupationId>(['farm','herder','fisher','haenyeo','vendor','artisan','owner','agbiz','civil','police','soldier','lawyer']);
/** Snapshot the original local-career discount at an observed adult move. */
export function snapshotOccupationMigration(life:Life,destination:string):void{
 const state=life.occupationExperience;
 if(!state||destination===life.country.id||life.age<15||life.schooling.enrolled||life.stats.employment==='retired'||life.stats.job==='clergy')return;
 const discounts:Partial<Record<OccupationId,number>>={};
 for(const id of migrationRestricted)if(state.years[id])discounts[id]=state.years[id];
 state.migration={year:life.year,country:destination,discounts};
}
/** Record only an observed finance settlement; career change dates cannot establish tenure. */
export function settleOccupationExperience(life:Life):void{
 const state=life.occupationExperience;if(!state||state.lastSettledYear!==undefined&&state.lastSettledYear>=life.year)return;
 state.lastSettledYear=life.year;
 if(life.stats.employment!=='employed'||life.schooling.enrolled||life.justice.prisonUntil!==null||life.care.who==='self'||life.stats.job==='childwork')return;
 if(!WORK_JOB_IDS.includes(life.stats.job))return;
 const id=occupationFromLegacyJob(life.stats.job);
 if(!id){state.unclassifiedYears++;return;}
 state.years[id]=(state.years[id]??0)+1;
}
/** Migration discounts are explicit observed snapshots, never inferred from a country change. */
export function occupationExperienceFor(life:Life,id:OccupationId,discounts?:Partial<Record<OccupationId,number>>){
 const state=life.occupationExperience;if(!state)return null;
 const excluded=discounts??state.migration?.discounts??{};
 const family=occupationFamily(id);let related=0;
 const effective=(job:OccupationId)=>Math.max(0,(state.years[job]??0)-(excluded[job]??0));
 if(family)for(const job of Object.keys(state.years) as OccupationId[])if(job!==id&&occupationFamily(job)===family)related+=effective(job);
 return {same:effective(id),related,unclassifiedYears:state.unclassifiedYears};
}
export function validOccupationExperience(value:any,birthYear:number,currentYear:number):value is OccupationExperience{
 if(!value||typeof value!=='object'||value.version!==1||!Number.isInteger(value.sinceYear)||value.sinceYear<birthYear||value.sinceYear>currentYear||!value.years||typeof value.years!=='object'||Array.isArray(value.years)||!Number.isInteger(value.unclassifiedYears)||value.unclassifiedYears<0)return false;
 if(value.lastSettledYear!==undefined&&(!Number.isInteger(value.lastSettledYear)||value.lastSettledYear<value.sinceYear||value.lastSettledYear>currentYear))return false;
 let total=value.unclassifiedYears;
 for(const [id,years] of Object.entries(value.years)){
  if(id==='childwork'||!Object.hasOwn(occupationCatalog,id)||!WORK_JOB_IDS.includes(occupationJob(id as OccupationId))||!Number.isInteger(years)||(years as number)<1)return false;
  total+=years as number;
 }
 if(value.migration!==undefined){
  const m=value.migration;
  if(!m||typeof m!=='object'||!Number.isInteger(m.year)||m.year<value.sinceYear||m.year>currentYear||typeof m.country!=='string'||!m.discounts||typeof m.discounts!=='object'||Array.isArray(m.discounts))return false;
  for(const [id,years] of Object.entries(m.discounts))if(!migrationRestricted.has(id as OccupationId)||!Number.isInteger(years)||(years as number)<1||(years as number)>(value.years[id]??0))return false;
 }
 return total<=(value.lastSettledYear===undefined?0:value.lastSettledYear-value.sinceYear+1);
}
