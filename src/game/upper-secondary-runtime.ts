import {commitUpperSecondaryYear,commitSchoolWithdrawal,commitEquivalencyExam} from './upper-secondary-year-state';
import type {Life,Decision} from './types';
import {upperSecondaryContext} from './upper-secondary-context';
import {prepareUpperSecondary,commitUpperSecondaryChoice} from './upper-secondary-state';
import type {UpperSecondaryChoice} from './upper-secondary';
import {initializeLegacyLearning,addKnowledge} from './learning-state';
export interface UpperSchoolFacts {
 refugee:boolean;irregular:boolean;refugeeCamp:boolean;unregisteredBirth:boolean;
 militaryAcademy:boolean;studyAbroad:boolean;bullyingCount:number;
 hobbies:{id:string;since:number;level:number}[];
}
export const isUpperSecondaryDecision=(id:unknown):boolean=>typeof id==='string'&&/^upperSecondary-\d{1,3}$/.test(id);
export const upperChoiceIds:Record<UpperSecondaryChoice,string>={go:'upperGo',voc:'upperVoc',arts:'upperArts',work:'upperWork'};
function context(life:Life){
 const a=life.academics,f=a?.upperFacts,c=a?.circumstances;
 return f&&c?upperSecondaryContext(life,{...f,homeSchool:c.homeSchool,returning:false,alreadySpecialist:!!a.specialistSchool,accessModifiers:c.accessModifiers}):null;
}
function enroll(life:Life){life.schooling.enrolled=true;life.schooling.droppedOut=false;life.schooling.childLabor=false;life.stats.job='student';life.stats.employment='student';life.stats.annualIncome=0;}
function work(life:Life,paid:boolean,childwork:(paid:boolean)=>void){
 life.schooling.enrolled=false;life.schooling.droppedOut=true;
 if(life.age<15)childwork(paid);else {life.schooling.childLabor=false;life.stats.job='none';life.stats.employment='unemployed';life.stats.annualIncome=0;}
}
function registration(life:Life,draw:()=>number,events:string[]){
 const f=life.academics!.upperFacts!;
 if(f.unregisteredBirth&&draw()<.7){f.unregisteredBirth=false;events.push('registration');}
}
export function prepareUpperRuntime(life:Life,draw:()=>number,childwork:(paid:boolean)=>void):string[]{
 const a=life.academics;
 if(!life.alive||life.justice.prisonUntil!==null||!a?.upperFacts||!a.circumstances||a.circumstances.developmentalProtection||a.upperSecondary||a.enrollment||a.qualification!==2||a.lastGraduation?.stage!=='lowerSecondary'||a.lastGraduation.age!==life.age)return [];
 life.learning=initializeLegacyLearning(life).learning;
 const result=prepareUpperSecondary(a,context(life)!,false);life.academics=result.academic;
 const events:string[]=[];
 if(result.plan?.kind==='enrolled'){enroll(life);events.push('general');registration(life,draw,events);}
 else if(result.plan&&result.plan.kind!=='choice'){work(life,false,childwork);events.push('campUnavailable');}
 return events;
}
export function upperSecondaryDecision(life:Life):Decision|null {
 const a=life.academics,r=a?.upperSecondary,id=`upperSecondary-${life.age}`;
 if(!life.alive||life.justice.prisonUntil!==null||!r||r.status!=='pending'||r.route!=='choice'||r.age!==life.age||r.country!==life.country.id||a!.enrollment||!context(life)||life.decisions.includes(id))return null;
 return {id,type:'choice',age:life.age,key:'decision.upperSecondary',params:{country:r.country},choices:(r.choices??[]).map(choice=>({id:upperChoiceIds[choice],key:`choice.${upperChoiceIds[choice]}`,params:{}}))};
}
export function resolveUpperRuntime(life:Life,choiceId:string,draw:()=>number,childwork:(paid:boolean)=>void):string[]|null {
 const expected=upperSecondaryDecision(life),pending=life.pendingDecision;
 if(!expected||pending?.id!==expected.id||pending.params.country!==life.country.id||!expected.choices.some(c=>c.id===choiceId))return null;
 const choice=(Object.keys(upperChoiceIds) as UpperSecondaryChoice[]).find(k=>upperChoiceIds[k]===choiceId)!;
 const result=commitUpperSecondaryChoice(life.academics!,context(life)!,choice,draw);
 if(!result.effects)return null;
 life.academics=result.academic;const effect=result.effects;life.stats.happiness+=effect.happiness;
 const events:string[]=[];
 if(effect.kind==='enrolled'){
  enroll(life);
  if(effect.specialist){const hobby=life.academics.upperFacts!.hobbies.find(h=>h.id===effect.specialist!.hobby);if(hobby)hobby.level+=effect.hobbyGain;if(life.academics.origin==='birth'){const actual=life.hobbies.find(h=>(h.id==='craft'?'crafts':h.id)===effect.specialist!.hobby);if(actual?.progress)actual.progress.level+=effect.hobbyGain;}events.push(effect.specialist.kind);}
  else events.push(`${effect.stage==='vocational'?'vocational':'general'}${choice==='arts'?'AfterAudition':''}`);
  registration(life,draw,events);
 }else if(effect.kind!=='keepWork'){work(life,effect.forcePaid,childwork);events.push(choice==='work'?'work':'rejected');}
 return events;
}

export const isSchoolWithdrawalDecision=(id:unknown):boolean=>typeof id==='string'&&/^schoolWithdrawal-\d{1,3}$/.test(id);
export function schoolWithdrawalDecision(life:Life):Decision|null {
 const a=life.academics,p=a?.secondaryProgress?.pending,s=a?.enrollment;
 if(!life.alive||life.justice.prisonUntil!==null||!p||p.age+1!==life.age||p.country!==life.country.id||a!.secondaryProgress!.answered||!s||!['upperSecondary','vocational'].includes(s.stage)||a!.circumstances?.homeSchool||life.stats.job!=='student')return null;
 return {id:`schoolWithdrawal-${life.age}`,type:'choice',age:life.age,key:`decision.schoolWithdrawal.${p.reason}`,params:{country:p.country},choices:['schoolStay','schoolGed','schoolWork'].map(id=>({id,key:`choice.${id}`,params:{}}))};
}
/** The original drains its queued offer at the next year boundary, even when it is no longer eligible. */
export function expireSchoolWithdrawal(life:Life){
 const p=life.academics?.secondaryProgress?.pending;
 if(p&&life.age>=p.age+1&&!schoolWithdrawalDecision(life))life.academics!.secondaryProgress!.pending=null;
}
export function resolveWithdrawalRuntime(life:Life,choiceId:string):string|null {
 const expected=schoolWithdrawalDecision(life),pending=life.pendingDecision;
 if(!expected||pending?.id!==expected.id||pending.params.country!==life.country.id||!expected.choices.some(c=>c.id===choiceId))return null;
 const choice=choiceId==='schoolStay'?'stay':choiceId==='schoolGed'?'ged':'work';
 const result=commitSchoolWithdrawal(life.academics!,{age:life.age,country:life.country.id,homeSchool:life.academics!.circumstances?.homeSchool??false},choice);
 if(!result.effects)return null;
 life.academics=result.academic;life.stats.happiness+=result.effects.happiness;addKnowledge(life,result.effects.knowledge);
 if(result.effects.leave){life.schooling.enrolled=false;life.schooling.droppedOut=true;life.schooling.childLabor=false;life.stats.job='none';life.stats.employment='unemployed';life.stats.annualIncome=0;}
 return choice;
}
export function settleUpperRuntime(life:Life,draw:()=>number,childwork:(paid:boolean)=>void):string|null {
 const a=life.academics,f=a?.upperFacts,c=a?.circumstances;
 if(!a||!f||!c)return null;
 const result=commitUpperSecondaryYear(a,{age:life.age,country:life.country.id,persistent:life.temperament.kind==='persistent',developmentalProtection:c.developmentalProtection,homeSchool:c.homeSchool,quintile:life.stats.incomeQuintile,war:life.country.war,militaryAcademy:f.militaryAcademy,studyAbroad:f.studyAbroad,student:life.stats.job==='student',married:life.family.married,refugee:f.refugee,bullyingCount:f.bullyingCount,knowledge:life.stats.knowledge},draw);
 life.academics=result.academic;
 if(result.effects?.kind==='withdraw'){work(life,false,childwork);life.stats.happiness+=result.effects.happiness!;life.academics.circumstances!.homeSchool=false;return 'withdrawn';}
 return null;
}
export function settleEquivalencyRuntime(life:Life,draw:()=>number):string|null {
 if(!life.academics?.equivalency)return null;
 const times=life.timeline?.stageFocusTime??{},total=Object.values(times).reduce((n,v)=>n+(v??0),0);
 const result=commitEquivalencyExam(life.academics,{age:life.age,country:life.country.id,knowledge:life.stats.knowledge,learnWeight:total?(times.learn??0)/total:0,studyWeight:total?(times.study??0)/total:0,collegeCompleted:life.decisions.includes('education')},draw);
 if(!result.effects)return null;
 life.academics=result.academic;life.stats.happiness+=result.effects.happiness;addKnowledge(life,result.effects.knowledge);
 if(result.effects.passed)life.stats.education=Math.max(life.stats.education,Math.min(2,result.effects.qualification)) as Life['stats']['education'];
 return result.effects.passed?'passed':'failed';
}
