import {militaryRetirementAge} from './military-retirement';
import type {Life,Decision} from './types';
import {prepareOfficerPromotion,commitOfficerPromotion} from './officer-promotion-state';
import {officerPayRange} from './officer-pay';
import {payEraCountry} from './pay-era';
export interface OfficerPromotionFacts {age:number;migrationExperienceLoss:number;inOffice:boolean;nomad:boolean;mandatoryRetirement:boolean}
export const isOfficerPromotion=(id:unknown)=>typeof id==='string'&&/^officerPromotion-\d{1,3}$/.test(id);
function active(life:Life){const academy=life.academics?.academy;const career=academy?.employment?.career;return !!career&&life.age<militaryRetirementAge(academy?.commissionedAge!==undefined,career.rank)&&life.alive&&life.stats.job==='soldier'&&life.stats.employment==='employed'&&life.justice.prisonUntil===null;}
export function prepareOfficerPromotionRuntime(life:Life,queued:number,draw:()=>number):void {
 const c=life.academics?.academy?.employment?.career,f=c?.promotionFacts;
 if(!c||!f||f.age!==life.age||!active(life))return;
 c.promotion=prepareOfficerPromotion(c.promotion,{age:life.age,rank:c.rank,effectiveExperience:Math.max(0,c.experienceYears-f.migrationExperienceLoss),knowledge:life.stats.knowledge,lastStepAge:c.lastStepAge??null,working:true,inOffice:f.inOffice,nomad:f.nomad,enrolled:!!life.academics?.enrollment,mandatoryRetirement:f.mandatoryRetirement},queued,draw);
}
export function officerPromotionDecision(life:Life):Decision|null {
 const c=life.academics?.academy?.employment?.career,r=c?.promotion,id=`officerPromotion-${life.age}`;
 if(!active(life)||!c||!r||r.status!=='offered'||r.age!==life.age||r.rank!==c.rank||life.decisions.includes(id))return null;
 return {id,type:'choice',age:life.age,key:c.rank===0?'decision.officerPromotion.field':'decision.officerPromotion.general',params:{rank:c.rank},choices:['officerAccept','officerDecline'].map(id=>({id,key:`choice.${id}`,params:{}}))};
}
export function resolveOfficerPromotionRuntime(life:Life,choice:string):'accepted'|'declined'|null {
 const expected=officerPromotionDecision(life),pending=life.pendingDecision;
 if(!expected||pending?.id!==expected.id||pending.params.rank!==expected.params.rank||!expected.choices.some(c=>c.id===choice))return null;
 const e=life.academics!.academy!.employment!,c=e.career!;
 const country=payEraCountry(life.country,life.era,life.year);
 const nextRank=(c.rank+1) as 1|2;
 const result=commitOfficerPromotion(c.promotion!,{age:life.age,rank:c.rank,job:life.stats.job,percentile:e.percentile,newRankCeiling:officerPayRange(country,life.country,life.era!=='today',nextRank)[1],lastStepAge:c.lastStepAge??null},choice==='officerAccept'?'accept':'decline');
 if(!result)return null;
 c.promotion=result.state;c.rank=result.effect.rank;c.lastStepAge=result.effect.lastStepAge;e.percentile=result.effect.percentile;
 life.stats.happiness+=result.effect.happiness;life.stats.health+=result.effect.health;
 return choice==='officerAccept'?'accepted':'declined';
}
