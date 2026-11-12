import type {Life,Decision} from './types';
import {emptyUniversityAdmissions,offerUniversityRetake,chooseUniversityRetake,consumeUniversityRetake} from './university-retakes';
import {educationEraInputs} from './education-era';
import {collegeContext} from './college-context';
import {collegeEntryGate} from './college-entry';
import {resolveDomesticCollege} from './college-domestic';
import {addKnowledge} from './learning-state';
function applicant(life:Life){
 const facts=life.academics?.upperFacts;if(!facts)return null;
 return {country:life.country.id,age:life.age,quintile:life.stats.incomeQuintile,happiness:life.stats.happiness,ppp:educationEraInputs(life.country,life.era,life.year).statistics.ppp,married:life.family.married,refugee:facts.refugee,irregular:facts.irregular,imprisoned:life.justice.prisonUntil!==null,working:life.stats.employment==='employed'};
}
export function queueUniversityRetake(life:Life,kind:'ordinary'|'equivalency'|'reopened'):void {
 const c=applicant(life);if(!c||life.academics?.circumstances?.developmentalProtection)return;
 life.universityAdmissions=offerUniversityRetake(life.universityAdmissions??emptyUniversityAdmissions(),c,kind);
}
export const isUniversityRetakeDecision=(id:unknown)=>typeof id==='string'&&/^universityRetake-\d{1,3}$/.test(id);
export function universityRetakeDecision(life:Life):Decision|null {
 const r=life.universityAdmissions?.offer,c=applicant(life),id=`universityRetake-${life.age}`;
 if(!life.alive||!r||!c||life.academics?.enrollment||r.age!==life.age||r.country!==life.country.id||c.imprisoned||c.irregular||life.decisions.includes(id))return null;
 return {id,type:'choice',age:life.age,key:'decision.universityRetake',params:{country:r.country},choices:[{id:'retakePrepare',key:'choice.retakePrepare',params:{}},{id:'retakeWork',key:'choice.retakeWork',params:{}}]};
}
export function resolveUniversityRetake(life:Life,choice:string):'prepare'|'work'|null {
 const expected=universityRetakeDecision(life),c=applicant(life);
 if(!expected||!c||life.pendingDecision?.id!==expected.id||!expected.choices.some(x=>x.id===choice))return null;
 const result=chooseUniversityRetake(life.universityAdmissions!,choice==='retakePrepare'?'prepare':'work',c);
 life.universityAdmissions=result.state;
 (life.universityAdmissions.choices??=[]).push({age:life.age,country:life.country.id,choice:choice==='retakePrepare'?'prepare':'work'});
 if(result.effect){life.stats.happiness+=result.effect.happiness;addKnowledge(life,result.effect.knowledge);life.stats.job='student';life.stats.employment='student';life.stats.annualIncome=0;life.schooling.enrolled=false;return 'prepare';}
 return choice==='retakeWork'?'work':null;
}
/** A due examination is consumed before its draw; it does not award study credit. */
export function settleUniversityRetake(life:Life,draw:()=>number):'enrolled'|'rejected'|'cancelled'|null {
 const state=life.universityAdmissions,a=life.academics,c=applicant(life);
 if(state?.offer&&state.offer.age<life.age)state.offer=null;
 if(!state||!a?.collegeFacts||!a.circumstances||!c||!life.alive||c.imprisoned)return null;
 const result=consumeUniversityRetake(state,{age:life.age,serving:false,enrolled:!!a.enrollment,job:life.stats.job==='student'?'student':life.stats.employment==='unemployed'?'seeking':'other',married:life.family.married});
 if(result.state===state)return null;life.universityAdmissions=result.state;
 const cancel=()=>{if(life.stats.job==='student'){life.stats.job='none';life.stats.employment='unemployed';life.stats.annualIncome=0;}return 'cancelled' as const;};
 if(!result.apply)return cancel();
 const context=collegeContext(life,{...a.collegeFacts,kind:'ordinary',job:life.stats.job==='student'?'student':'seeking',retaking:true,vocationalTrack:a.lastGraduation?.stage==='vocational',accessModifiers:a.circumstances.accessModifiers});
 if(!context)return cancel();
 const gate=collegeEntryGate({...context,year:life.year,historical:life.era!=='today',imprisoned:false,rohingyaCamp:a.collegeFacts.rohingyaCamp,rohingyaRakhine:a.collegeFacts.rohingyaRakhine});
 if(gate.reason!=='allowed')return cancel();
 const effects=resolveDomesticCollege(context,'apply',draw);
 life.universityAdmissions.lastAttempt={age:life.age,country:life.country.id,status:effects.status==='enrolled'?'enrolled':'rejected'};
 life.stats.happiness+=effects.happiness;
 if(effects.status==='enrolled'){
  a.enrollment={stage:'university',completedYears:0,lastSettledAge:life.age-1,paused:false,graduationPending:false,...(effects.retention===null?{}:{retention:effects.retention})};a.studyCountry=life.country.id;
  life.schooling.enrolled=true;life.schooling.droppedOut=false;life.schooling.childLabor=false;life.stats.job='student';life.stats.employment='student';life.stats.annualIncome=0;
 }else{life.schooling.enrolled=false;life.stats.job='none';life.stats.employment='unemployed';life.stats.annualIncome=0;if(effects.retakeEligible)queueUniversityRetake(life,'ordinary');}
 return effects.status==='enrolled'?'enrolled':'rejected';
}

/** Reuse the consumed admission slot without postponing the invitation to year end. */
export function scheduleUniversityRetake(life:Life):void {
 const decision=universityRetakeDecision(life),timeline=life.timeline;
 if(!decision||!timeline||timeline.complete||timeline.queue.some(s=>s.id===decision.id))return;
 const scheduled=timeline.scheduledDecisions??=[];
 if(scheduled.length>=2)return;
 timeline.queue.push({kind:'decision',id:decision.id,at:Math.max(timeline.position,Math.min(.97,timeline.position+.04))});
 timeline.queue.sort((a,b)=>a.at-b.at);
 scheduled.push(decision);
 scheduled.sort((a,b)=>timeline.queue.findIndex(s=>s.id===a.id)-timeline.queue.findIndex(s=>s.id===b.id));
}
