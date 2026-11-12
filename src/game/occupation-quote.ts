import {OCCUPATION_IDS} from './occupations';
import type {OccupationalOffer} from './occupation-offer-pay';
import {occupationJob,WORK_JOB_IDS} from './job-identities';
import type {Decision,JobOffer,Life} from './types';
export interface OccupationTerms extends Omit<OccupationalOffer,'id'> {version:1;occupation:OccupationalOffer['id']}
export interface OccupationQuoteBatch {version:1;age:number;year:number;country:string}
export interface AcceptedOccupationQuote extends OccupationQuoteBatch {income:number;terms:OccupationTerms}
export function validOccupationTerms(value:any,job:unknown):value is OccupationTerms{
 return !!value&&typeof value==='object'&&value.version===1&&OCCUPATION_IDS.includes(value.occupation)&&occupationJob(value.occupation)===job&&WORK_JOB_IDS.includes(job as string)&&typeof value.formal==='boolean'&&Number.isFinite(value.percentile)&&value.percentile>=.004&&value.percentile<=1&&Number.isFinite(value.experience)&&(value.experience===0||value.experience>=1&&value.experience<=130)&&typeof value.relatedExperience==='boolean'&&(!value.relatedExperience||value.experience===0)&&typeof value.lateCareer==='boolean';
}
export function quotedJobDecision(age:number,offers:readonly JobOffer[]):Decision{
 return {id:`job-${age}`,type:'choice',age,key:'decision.job',params:{},choices:[...offers.map((offer,i)=>({id:offer.id,key:`choice.offer${i}`,params:{amount:offer.income}})),{id:'wait',key:'choice.wait',params:{}}]};
}
/** A scheduled job menu owns its offer batch until the timeline consumes it. */
export function hasQueuedJobDecision(life:Life):boolean{
 const decisionId=`job-${life.age}`;
 return !!(life.timeline?.scheduledDecisions?.some(decision=>decision.id===decisionId)||life.timeline?.queue.some(slot=>slot.kind==='decision'&&slot.id===decisionId));
}
/** The caller supplies the resolved offer and final income once; reload never reruns salary RNG. */
export function installOccupationQuotes(life:Life,quotes:readonly {offer:OccupationalOffer;income:number}[]):void{
 if(!life.alive||life.pendingDecision||hasQueuedJobDecision(life)||life.age<15||life.age>110||life.decisions.includes(`job-${life.age}`))throw Error('Unavailable occupational quote slot');
 if(quotes.length>3||new Set(quotes.map(q=>q.offer.id)).size!==quotes.length)throw Error('Invalid occupational quote batch');
 const offers:JobOffer[]=quotes.map(({offer,income},i)=>{const {id,...terms}=offer;return {id:`offer${i}`,job:occupationJob(id),income,terms:{version:1,occupation:id,...terms}};});
 if(offers.some(o=>!validOccupationTerms(o.terms,o.job)||!Number.isFinite(o.income)||o.income<.01||o.income>1e12))throw Error('Invalid occupational quote');
 life.jobOfferBatch={version:1,age:life.age,year:life.year,country:life.country.id};life.jobOffers=offers;
 life.pendingDecision=quotedJobDecision(life.age,life.jobOffers);
}
export function occupationQuoteCurrent(life:Life):boolean{
 const batch=life.jobOfferBatch;
 return !batch?!life.jobOffers.some(o=>o.terms!==undefined):batch.version===1&&batch.age===life.age&&batch.year===life.year&&batch.country===life.country.id&&life.jobOffers.length<=3&&new Set(life.jobOffers.map(o=>o.terms?.occupation)).size===life.jobOffers.length&&life.jobOffers.every((o,i)=>o.id===`offer${i}`&&validOccupationTerms(o.terms,o.job)&&Number.isFinite(o.income)&&o.income>=.01&&o.income<=1e12);
}
