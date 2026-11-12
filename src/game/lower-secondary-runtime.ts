import type {Life,Decision} from './types';
import type {LowerSecondaryEnvironment} from './lower-secondary-context';
import {lowerSecondaryContext} from './lower-secondary-context';
import {prepareLowerSecondary,commitLowerSecondaryChoice} from './lower-secondary-state';
import {initializeLegacyLearning,addKnowledge} from './learning-state';
export interface SchoolCircumstances extends Omit<LowerSecondaryEnvironment,'returning'|'currentWar'> {developmentalProtection:boolean}
export const isLowerSecondaryDecision=(id:unknown):boolean=>typeof id==='string'&&/^lowerSecondary-\d{1,3}$/.test(id);
const context=(life:Life)=>life.academics?.circumstances?lowerSecondaryContext(life,{...life.academics.circumstances,currentWar:life.country.war,returning:false}):null;
function enrolled(life:Life){life.schooling.enrolled=true;life.schooling.droppedOut=false;life.schooling.childLabor=false;life.stats.job='student';life.stats.employment='student';life.stats.annualIncome=0;}
/** Mutate only the engine's cloned draft; every returned result is a newly committed transition. */
export function prepareSecondaryRuntime(life:Life,draw:()=>number,work:(forcePaid:boolean)=>void):string|null {
 const academic=life.academics,c=academic?.circumstances,degree=academic?.lastGraduation;
 if(!life.alive||life.justice.prisonUntil!==null||!academic||!c||c.developmentalProtection||academic.lowerSecondary||academic.enrollment||academic.qualification!==1||degree?.stage!=='primary'||degree.age!==life.age||life.age<10)return null;
 life.learning=initializeLegacyLearning(life).learning;
 const input=context(life)!;
 const result=prepareLowerSecondary(academic,input,false,draw);life.academics=result.academic;
 if(result.plan?.kind==='enrolled'){enrolled(life);return 'enrolled';}
 if(result.plan?.kind==='childwork'){work(false);return 'centreUnavailable';}
 return null;
}
export function secondaryDecision(life:Life):Decision|null {
 const r=life.academics?.lowerSecondary,c=context(life),id=`lowerSecondary-${life.age}`;
 if(!life.alive||life.justice.prisonUntil!==null||!r||!c||r.status!=='pending'||r.age!==life.age||r.country!==life.country.id||life.academics!.enrollment||life.decisions.includes(id)||(r.route==='banned')!==c.banned)return null;
 const ids=r.route==='banned'?['secondaryHome','secondaryWork']:['secondaryGo','secondaryWork'];
 return {id,type:'choice',age:life.age,key:r.route==='banned'?'decision.lowerSecondaryBanned':'decision.lowerSecondary',params:{country:life.country.id},choices:ids.map(id=>({id,key:`choice.${id}`,params:{}}))};
}
export function resolveSecondaryRuntime(life:Life,choice:string,draw:()=>number,work:(forcePaid:boolean)=>void):string|null {
 const expected=secondaryDecision(life),decision=life.pendingDecision;
 if(!expected||decision?.id!==expected.id||decision.params.country!==life.country.id||!expected.choices.some(c=>c.id===choice))return null;
 const pick=choice==='secondaryGo'?'go':choice==='secondaryHome'?'home':'work';
 const result=commitLowerSecondaryChoice(life.academics!,context(life)!,pick,draw);
 if(!result.effects)return null;
 life.academics=result.academic;const effect=result.effects;
 life.stats.happiness+=effect.happiness;life.stats.social+=effect.social;addKnowledge(life,effect.knowledge);
 if(effect.kind==='enrolled')enrolled(life);else if(effect.kind==='childwork')work(effect.forcePaid);
 return effect.kind==='enrolled'?'enrolled':pick==='home'?'home':pick==='work'?'work':'rejected';
}
