import {normalCdf} from './household-percentile';
import type {StageFocus} from './focus-model';
import type {FocusWeights} from './focus-effects';
export interface KnowledgeContext {
 age:number;enrolled:boolean;higherEducation:boolean;ged:boolean;adultCourse:boolean;
 curious:boolean;goodTeacher:boolean;health:number;
 hobbies:{knowledge:number;social:number}[];
}
const clamp=(value:number,low:number,high:number)=>Math.max(low,Math.min(high,value));
const talentWeight=(age:number)=>.9*clamp(.35+.055*(age-3),.35,1);
const efforts:Partial<Record<StageFocus,number>>={study:1,learn:.8,mind:.6,careerPrep:.4,help:-.1,rest:-.1,parttime:-.1};
export function memoryProtection(context:KnowledgeContext,weights:FocusWeights):number {
 const hobby=context.hobbies.some(h=>h.knowledge>0||h.social>=3);
 return clamp(.8*(weights.mind??0)+.45*((weights.family??0)+(weights.faith??0)+(weights.health??0))+(hobby?.25:0)+(context.health-50)/250,0,.85);
}
export function knowledgeDelta(context:KnowledgeContext,weights:FocusWeights):number {
 const {age}=context;
 const effort=Object.entries(weights).reduce((sum,[focus,weight])=>sum+(efforts[focus as StageFocus]??0)*weight,0);
 const baseline=age<18?.2:age<25?.25:.05;
 let delta=age<6?0:.075*(effort-baseline);
 for(const hobby of context.hobbies)if(hobby.knowledge>0)delta+=hobby.knowledge*.005;
 if(age>=6&&age<=17&&!context.enrolled)delta-=.03;
 if(context.higherEducation)delta+=.02;
 delta+=context.ged?.06:context.adultCourse?.02:0;
 if(age>72)delta-=.02*(1-memoryProtection(context,weights));
 if(age>=6&&context.curious)delta+=.005;
 if(context.goodTeacher)delta+=.05;
 return delta;
}
export function initialKnowledgeEffort(age:number,talent:number,displayedKnowledge:number):number {
 const prior=age<6?talentWeight(age)*talent:clamp(((Number.isFinite(displayedKnowledge)?displayedKnowledge:40)-72)/14,-2.4,2.4);
 return clamp(prior-talentWeight(age)*talent,-1.4,1.6);
}
export function knowledgePercentile(age:number,talent:number,effort:number):number {
 return clamp(100*normalCdf(talentWeight(age)*talent+effort),.5,99.9);
}
export function settleKnowledge(previousEffort:number,talent:number,context:KnowledgeContext,weights:FocusWeights):{effort:number;knowledge:number} {
 const effort=clamp(previousEffort*(context.age<25?.97:.985)+knowledgeDelta(context,weights),-1.4,1.6);
 return {effort,knowledge:knowledgePercentile(context.age,talent,effort)};
}
