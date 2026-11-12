import data from '../data/occupations.json';
import type {Job} from './types';
export type OccupationId=keyof typeof data;
export interface OccupationDefinition {
 sector:'agr'|'ind'|'ser'|'home'|'none';education:number;percentile:readonly number[];urban:-1|0|1;
 regions?:string[];risks?:Record<string,number>;maleWeight?:number;femaleWeight?:number;
 minimumInternet?:number;rarity?:number;highIncomeOnly?:boolean;specialEntry?:boolean;
}
export const OCCUPATIONS=data as Record<OccupationId,OccupationDefinition>;
export const OCCUPATION_IDS=Object.keys(data) as OccupationId[];
/** Legacy service means a generic service job, whereas source service is conscription.
 * Ambiguous old states stay unknown; importing must not rewrite somebody's career. */
export function occupationFromLegacyJob(job:Job):OccupationId|null{
 if(job==='farmer')return 'farm';
 if(job==='hairdresser')return 'hair';
 if(job==='shelteredWork')return 'shelter';
 if(job==='dayActivities')return 'dayc';
 if(['service','entrepreneur','none'].includes(job))return null;
 return Object.hasOwn(OCCUPATIONS,job)?job as OccupationId:null;
}
