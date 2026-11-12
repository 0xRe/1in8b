import type {Job,Sex} from './types';
/** Source kidRetAge, using the child's current residence and calendar year. */
export function childRetirementAge(country:string,sex:Sex,job:Job,year:number):number {
 const withoutWage=['none','student','farmer','artisan','entrepreneur'].includes(job);
 return country==='CHN'&&!withoutWage
  ?(sex==='F'?55:60)+Math.max(0,Math.min(3,Math.floor((year-2025)/5))):65;
}
export interface ChildRetirementRecord {age:number;year:number;country:string;job:Job}
