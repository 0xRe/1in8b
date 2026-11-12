import type {Life,Decision} from './types';
import {getCountryById} from './countries';
import {commitOverseasApplication} from './overseas-state';
import {collegeContext} from './college-context';
import {collegeEntryGate} from './college-entry';
import {resolveDomesticCollege} from './college-domestic';
import {graduateAdmissionProbability} from './school-admissions';
import {educationEraInputs} from './education-era';
import {queueUniversityRetake} from './university-retake-runtime';
export const isStudyDecision=(id:unknown)=>typeof id==='string'&&/^study(?:Destination|Domestic)-\d{1,3}$/.test(id);
export function studyDecision(life:Life):Decision|null{
 const a=life.academics,r=a?.overseasApplication;
 if(!life.alive||!a||!r||r.age!==life.age||r.year!==life.year||r.homeCountry!==life.country.id||a.enrollment||a.overseasResidence||life.justice.prisonUntil!==null)return null;
 const domestic=r.domesticFallback==='pending',id=`study${domestic?'Domestic':'Destination'}-${life.age}`;
 if(life.decisions.includes(id)||(!domestic&&r.status!=='pending'))return null;
 if(domestic)return {id,type:'choice',age:life.age,key:'decision.studyDomestic',params:{country:r.homeCountry},choices:['studyApply','studyWork'].map(id=>({id,key:`choice.${id}`,params:{}}))};
 return {id,type:'choice',age:life.age,key:'decision.studyDestination',params:{country:r.homeCountry},choices:[...r.options.map((o,i)=>({id:`studyDestination${i}`,key:r.fullScholarship?(o.languageMatches?'choice.studyScholarship':'choice.studyScholarshipPreparation'):(o.languageMatches?'choice.studyDestination':'choice.studyDestinationPreparation'),params:{country:getCountryById(o.country)!.name_en,amount:r.fullScholarship?0:o.quotedCost}})),{id:'studyHome',key:'choice.studyHome',params:{}}]};
}
function domestic(life:Life,choice:string,draw:()=>number):string|null{
 const a=life.academics!,r=a.overseasApplication!;
 if(choice==='studyWork'){r.domesticFallback='work';life.stats.job='none';life.stats.employment='unemployed';life.stats.annualIncome=0;return 'work';}
 if(!a.collegeFacts||!a.circumstances)return null;
 const c=collegeContext(life,{...a.collegeFacts,accessModifiers:a.circumstances.accessModifiers,kind:a.college?.kind??'ordinary',job:'seeking',retaking:false,vocationalTrack:a.lastGraduation?.stage==='vocational'});if(!c)return null;
 const gate=collegeEntryGate({...c,year:life.year,historical:life.era!=='today',imprisoned:false,rohingyaCamp:a.collegeFacts.rohingyaCamp,rohingyaRakhine:a.collegeFacts.rohingyaRakhine});
 if(gate.reason!=='allowed'){r.domesticFallback='blocked';life.stats.happiness+=gate.happiness;return 'blocked';}
 const result=resolveDomesticCollege(c,'apply',draw);r.domesticFallback=result.status;life.stats.happiness+=result.happiness;
 if(result.status==='enrolled'){
  a.studyCountry=life.country.id;a.enrollment={stage:'university',completedYears:0,lastSettledAge:life.age-1,paused:false,graduationPending:false,...(result.retention===null?{}:{retention:result.retention})};life.schooling.enrolled=true;life.schooling.childLabor=false;life.schooling.droppedOut=false;life.stats.job='student';life.stats.employment='student';life.stats.annualIncome=0;
 }else if(result.retakeEligible)queueUniversityRetake(life,c.kind);
 return result.status==='enrolled'?'domesticEnrolled':'domesticRejected';
}
export function resolveStudyChoice(life:Life,choice:string,draw:()=>number):string|null{
 const expected=studyDecision(life),pending=life.pendingDecision;
 if(!expected||!pending||JSON.stringify(pending)!==JSON.stringify(expected)||!expected.choices.some(c=>c.id===choice))return null;
 const r=life.academics!.overseasApplication!;
 if(expected.id.startsWith('studyDomestic-'))return domestic(life,choice,draw);
 if(choice==='studyHome'){
  r.status='cancelled';
  if(r.level==='university'){r.domesticFallback='pending';return 'home';}
  const statistics=educationEraInputs(life.country,life.era,life.year).statistics;
  const accepted=draw()<graduateAdmissionProbability(statistics.ter,life.stats.knowledge,life.stats.incomeQuintile);
  r.domesticFallback=accepted?'enrolled':'rejected';
  if(accepted){life.academics!.enrollment={stage:'graduate',completedYears:0,lastSettledAge:life.age-1,paused:false,graduationPending:false};life.academics!.studyCountry=life.country.id;life.schooling.enrolled=true;life.schooling.droppedOut=false;life.schooling.childLabor=false;life.stats.job='student';life.stats.employment='student';}
  else{life.stats.job='none';life.stats.employment='unemployed';life.stats.happiness-=4;}
  life.stats.annualIncome=0;return accepted?'domesticGraduate':'domesticRejected';
 }
 const option=r.options[Number(choice.slice('studyDestination'.length))];if(!option)return null;
 const result=commitOverseasApplication(life,option.country,draw);if(!result)return null;
 if(result.outcome==='domesticApplication')r.domesticFallback='pending';
 return result.outcome;
}
/** Reuse the consumed choice slot so the domestic return happens in the same year. */
export function scheduleStudyChoice(life:Life):void{
 const d=studyDecision(life);if(!d)return;
 const timeline=life.timeline;if(!timeline||timeline.complete){life.pendingDecision=d;return;}
 if(timeline.queue.some(s=>s.id===d.id))return;
 const scheduled=timeline.scheduledDecisions??=[];
 if(scheduled.length>=2){life.pendingDecision=d;return;}
 timeline.queue.push({kind:'decision',id:d.id,at:Math.max(timeline.position,Math.min(.97,timeline.position+.04))});timeline.queue.sort((a,b)=>a.at-b.at);
 scheduled.push(d);scheduled.sort((a,b)=>timeline.queue.findIndex(s=>s.id===a.id)-timeline.queue.findIndex(s=>s.id===b.id));
}
