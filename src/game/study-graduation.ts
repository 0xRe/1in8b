import {shortageMajor} from './university-major';
import {studyAccess} from './study-access';
import type {Decision,Life} from './types';
import {getCountryById} from './countries';
import {studyOnwardDestination} from './study-onward';
import {studyDestinationOpen} from './study-destinations';
import {postStudyProbability} from './study-settlement';
import {commitStudySettlement} from './study-settlement-runtime';
import {graduateAdmissionProbability} from './school-admissions';
import {educationEraInputs} from './education-era';
export interface StudyGraduationOffer {age:number;homeCountry:string;studyCountry:string;stage:'university'|'graduate'|'phd';hostProbability:number;graduateProbability:number;spousePartnerId?:string;third?:{country:string;probability:number};outcome:'pending'|'enrolled'|'home'|'workPermit'|'spousePermit'|'denied';}
export interface StudyGraduationFacts {freeExit:boolean;papersValid:boolean;shortageMajor:boolean;spouseFallbackEligible:boolean;warAt?:(country:string)=>number;}
function studySpouseEligible(life:Life,host:string):boolean{
 const country=getCountryById(host),partner=life.family.partner;
 return country?.region==='hi'&&!['ARE','SAU','QAT','KWT','BHR','OMN'].includes(host)&&life.family.married&&!!partner?.alive&&partner.citizenship===host&&partner.country===host;
}
export const isStudyGraduation=(id:unknown)=>typeof id==='string'&&/^studyGraduation-\d{1,3}$/.test(id);
export function prepareStudyGraduation(life:Life,facts:StudyGraduationFacts):boolean{
 const a=life.academics,r=a?.overseasResidence,d=a?.lastGraduation;
 if(!life.alive||!a||!r||!d||d.age!==life.age||d.country!==r.country||!['university','graduate','phd'].includes(d.stage)||a.enrollment||r.homeCountry!==life.country.id||life.justice.prisonUntil!==null||a.studyGraduation?.age===life.age)return false;
 const host=getCountryById(r.country)!;
 const probability=(country:string,thirdCountry:boolean)=>postStudyProbability({country,ppp:getCountryById(country)!.ppp,graduate:d.stage!=='university',shortageMajor:facts.shortageMajor,thirdCountry,birthCountry:life.migration.birthCountry.id,year:life.year});
 const third=studyOnwardDestination({studyCountry:host.id,birthCountry:life.migration.birthCountry.id,originalName:life.name,alreadyMigrated:life.migration.moves.length>0,freeExit:facts.freeExit,papersValid:facts.papersValid,destinationOpen:country=>studyDestinationOpen({origin:life.migration.birthCountry.id,birthCountry:life.migration.birthCountry.id,year:life.year,muslim:false,warAt:facts.warAt},country)});
 const partner=life.family.partner;
 a.studyGraduation={age:life.age,homeCountry:r.homeCountry,studyCountry:r.country,stage:d.stage as StudyGraduationOffer['stage'],hostProbability:probability(host.id,false),graduateProbability:graduateAdmissionProbability(educationEraInputs(life.country,life.era,life.year).statistics.ter,life.stats.knowledge,life.stats.incomeQuintile),outcome:'pending',...(third?{third:{country:third,probability:probability(third,true)}}:{}),...(facts.spouseFallbackEligible&&life.family.married&&partner?.alive?{spousePartnerId:partner.id}:{})};
 return true;
}
export function studyGraduationDecision(life:Life):Decision|null{
 const a=life.academics,r=a?.studyGraduation,d=a?.lastGraduation,id=`studyGraduation-${life.age}`;
 if(!life.alive||!a||!r||r.age!==life.age||r.outcome!=='pending'||r.homeCountry!==life.country.id||r.studyCountry!==a.overseasResidence?.country||a.enrollment||d?.age!==life.age||d.country!==r.studyCountry||d.stage!==r.stage||life.justice.prisonUntil!==null||life.decisions.includes(id))return null;
 if(r.stage==='graduate'&&a.phdInvitation?.age===life.age&&a.phdInvitation.offered&&!life.decisions.includes(`academicPhd-${life.age}`))return null;
 return {id,type:'choice',age:life.age,key:'decision.studyGraduation',params:{country:r.studyCountry},choices:[
 {id:'studyFinishStay',key:'choice.studyFinishStay',params:{country:getCountryById(r.studyCountry)!.name_en}},
 {id:'studyFinishHome',key:'choice.studyFinishHome',params:{country:getCountryById(r.homeCountry)!.name_en}},
 ...(r.stage==='university'?[{id:'studyFinishGraduate',key:'choice.studyFinishGraduate',params:{country:getCountryById(r.studyCountry)!.name_en}}]:[]),
 ...(r.third?[{id:'studyFinishThird',key:'choice.studyFinishThird',params:{country:getCountryById(r.third.country)!.name_en}}]:[])]};
}
export function resolveStudyGraduation(life:Life,choice:string,draw:()=>number):string|null{
 const expected=studyGraduationDecision(life);
 if(!expected||JSON.stringify(expected)!==JSON.stringify(life.pendingDecision)||!expected.choices.some(c=>c.id===choice))return null;
 const a=life.academics!,r=a.studyGraduation!;
 if(choice==='studyFinishGraduate'&&draw()<r.graduateProbability){
  a.studyCountry=r.studyCountry;a.enrollment={stage:'graduate',completedYears:0,lastSettledAge:life.age-1,paused:false,graduationPending:false};r.outcome='enrolled';
  life.schooling.enrolled=true;life.schooling.childLabor=false;life.schooling.droppedOut=false;life.stats.job='student';life.stats.employment='student';life.stats.annualIncome=0;return 'enrolled';
 }
 const route=choice==='studyFinishHome'?'home':choice==='studyFinishThird'?'third':'stay';
 const result=commitStudySettlement(life,{choice:route,probability:route==='third'?r.third!.probability:r.hostProbability,spouseFallbackEligible:!!r.spousePartnerId&&life.family.partner?.id===r.spousePartnerId&&studySpouseEligible(life,r.studyCountry),thirdCountry:r.third?.country},draw);
 if(result)r.outcome=result;return result;
}
export function scheduleStudyGraduation(life:Life):void{
 const d=studyGraduationDecision(life);if(!d)return;
 const t=life.timeline;if(!t||t.complete){life.pendingDecision=d;return;}
 if(t.queue.some(s=>s.id===d.id))return;
 const scheduled=t.scheduledDecisions??=[];
 if(scheduled.length>=2){life.pendingDecision=d;return;}
 t.queue.push({kind:'decision',id:d.id,at:Math.max(t.position,Math.min(.97,t.position+.04))});t.queue.sort((a,b)=>a.at-b.at);
 scheduled.push(d);scheduled.sort((a,b)=>t.queue.findIndex(s=>s.id===a.id)-t.queue.findIndex(s=>s.id===b.id));
}

/** Runtime bridge uses observed access and generated citizenship; legacy nationality is never inferred. */
export function prepareNaturalStudyGraduation(life:Life):boolean{
 const access=studyAccess(life),host=life.academics?.overseasResidence?.country;
 if(!access||!host)return false;
 const spouseFallbackEligible=studySpouseEligible(life,host);
 return prepareStudyGraduation(life,{freeExit:access.freeExit,papersValid:access.papersValid,shortageMajor:shortageMajor(life.academics?.major)||!!life.academics?.medicine,spouseFallbackEligible});
}
