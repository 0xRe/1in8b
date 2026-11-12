import type {Life,Job} from './types';
import {chooseSupportedAdult,supportedRoleLow,type SupportedAdultChoice} from './supported-adult';
import {richSchoolSupport} from './supported-school';
import {educationEraInputs} from './education-era';
import {officerPayCalibration} from './officer-pay';
import {incomeAtPercentile} from './income-distribution';
export type SupportedAdultRecord=SupportedAdultChoice&{age:number;country:string;percentile:number|null;entryIncome:number};
export function prepareSupportedAdult(life:Life,draw:()=>number):SupportedAdultRecord|null {
 const a=life.academics,d=life.birthDevelopment?.developmental;
 if(!life.alive||!a?.circumstances?.developmentalProtection||!a.supportedSchool?.adultReadyAge||a.supportedAdult||!d||d.supportLevel<2||life.justice.prisonUntil!==null||a.enrollment)return null;
 const current={...life.country,...educationEraInputs(life.country,life.era,life.year).statistics};
 const result=chooseSupportedAdult({level:d.supportLevel as 2|3,rich:richSchoolSupport({...current,year:life.year}),urban:life.residence==='urban'},draw);
 const percentile=result.kind==='shelteredWork'?.02:'role'in result?supportedRoleLow[result.role]**officerPayCalibration(current,life.country,life.era!=='today')+.02:null;
 const entryIncome=percentile===null?0:incomeAtPercentile(current,percentile);
 const record:SupportedAdultRecord={...result,age:life.age,country:life.country.id,percentile,entryIncome};a.supportedAdult=record;
 life.schooling.enrolled=false;life.schooling.childLabor=false;life.stats.employment=percentile===null?'none':'employed';
 life.stats.job=result.kind==='shelteredWork'?'shelteredWork':percentile===null?'dayActivities':('role'in result?result.role==='farm'?'farmer':result.role:'none') as Job;
 life.stats.annualIncome=entryIncome;
 return record;
}
