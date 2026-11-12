import type {Life} from './types';
import {getCountryById} from './countries';
import {resolvePostStudy,type PostStudyOutcome} from './study-settlement';
import {returnFromOverseasStudy} from './study-family';
export interface StudySettlementRecord {age:number;fromCountry:string;toCountry:string;choice:'home'|'stay'|'third';outcome:PostStudyOutcome;migrationPenalty:number;partnerLeave?:{partnerId:string;untilAge:number;annualIncome:number;finished:boolean};}
/** Caller supplies verified route probability and eligibility from the persisted graduation offer. */
export function commitStudySettlement(life:Life,c:{choice:'home'|'stay'|'third';probability:number;spouseFallbackEligible:boolean;thirdCountry?:string},draw:()=>number):PostStudyOutcome|null{
 const a=life.academics,r=a?.overseasResidence,degree=a?.lastGraduation;
 if(!life.alive||!a||!r||a.enrollment||a.studySettlement?.age===life.age||life.justice.prisonUntil!==null||life.country.id!==r.homeCountry||degree?.age!==life.age||degree.country!==r.country||!['university','graduate','phd'].includes(degree.stage)||!Number.isFinite(c.probability)||c.probability<0||c.probability>1)return null;
 const target=c.choice==='third'?getCountryById(c.thirdCountry??''):getCountryById(r.country);
 if(c.choice==='third'&&(!target||[r.country,r.homeCountry,life.migration.birthCountry.id].includes(target.id)))return null;
 const outcome=resolvePostStudy(c,draw),success=outcome==='workPermit'||outcome==='spousePermit';
 const receipt:StudySettlementRecord={age:life.age,fromCountry:r.country,toCountry:success?target!.id:r.homeCountry,choice:c.choice,outcome,migrationPenalty:success?(c.choice==='third'?.08:.05):0};
 if(!success)returnFromOverseasStudy(life);
 else{
  const home=life.country,waiting=r.waitingFamily;let joined=false;
  const partner=life.family.partner;
  if(waiting&&life.family.married&&partner?.alive&&partner.id===waiting.partnerId&&partner.country===r.homeCountry){
   partner.country=target!.id;joined=true;
   if(life.relationship.partnerIncome>0&&partner.job!=='retired'&&life.care.who!=='partner'){
    receipt.partnerLeave={partnerId:partner.id,untilAge:life.age+1+Math.floor(draw()*2),annualIncome:life.relationship.partnerIncome*target!.ppp/home.ppp,finished:false};life.relationship.partnerIncome=0;
   }
  }
  for(const child of life.family.children){const state=life.descendants.children.find(s=>s.childId===child.id);
   if(waiting?.childIds.includes(child.id)&&child.alive&&child.age<18&&child.country===r.homeCountry&&state?.residence==='home'){child.country=target!.id;joined=true;}
  }
  life.country=structuredClone(target!);life.residence='urban';life.migration.lastMoveAge=life.age;life.migration.moves.push({age:life.age,country:target!.id,together:joined});
  life.migration.familyCountry=life.family.partner?.alive&&life.family.partner.country===r.homeCountry?r.homeCountry:null;
  delete a.overseasResidence;
 }
 a.studySettlement=receipt;life.schooling.enrolled=false;life.schooling.childLabor=false;life.stats.job='none';life.stats.employment='unemployed';life.stats.annualIncome=0;
 return outcome;
}
/** Do not revive wages for a deceased/replaced partner or overwrite an active childcare leave. */
export function resumeStudyPartnerWork(life:Life):boolean{
 const leave=life.academics?.studySettlement?.partnerLeave;if(!leave||leave.finished||life.age<leave.untilAge)return false;
 const partner=life.family.partner;
 if(!partner?.alive||!life.family.married||partner.id!==leave.partnerId||partner.country!==life.country.id||partner.job==='retired'){leave.finished=true;return false;}
 if(life.care.who==='partner')return false;
 life.relationship.partnerIncome=leave.annualIncome;leave.finished=true;return true;
}
