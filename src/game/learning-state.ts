import {normalQuantile} from './normal-quantile';
import {initialKnowledgeEffort,knowledgePercentile,settleKnowledge,type KnowledgeContext} from './focus-knowledge';
import {normalizeFocusTime,type FocusWeights} from './focus-effects';
export const TALENT_DOMAINS=['study','body','art','music','hands','words'] as const;
export type Talents=Record<typeof TALENT_DOMAINS[number],number>;
export interface LearningState {version:1;talents:Talents;effort:number;lastSettledAge?:number;support?:{ged:boolean;adultCourse:boolean;goodTeacherAge:number|null}}
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
/** One common normal draw followed by six domain draws; never draw during save decoding. */
export function drawTalents(draw:()=>number):Talents {
 const gaussian=()=>normalQuantile(clamp(draw(),.0001,.9999));
 const common=gaussian();
 return Object.fromEntries(TALENT_DOMAINS.map(domain=>[domain,Math.round((.25*common+.968*gaussian())*100)/100])) as Talents;
}
export function createLearningState(age:number,talents:Talents,displayedKnowledge:number):LearningState {
 return {version:1,talents:{...talents},effort:initialKnowledgeEffort(age,talents.study,displayedKnowledge)};
}
export function learningZ(state:LearningState,age:number):number {
 return .9*clamp(.35+.055*(age-3),.35,1)*state.talents.study+state.effort;
}
/** Event gains affect accumulated effort, not permanent talent or the gameplay RNG. */
export function applyLearningGain(state:LearningState,age:number,gain:number):{state:LearningState;knowledge:number} {
 const effort=clamp(state.effort+gain*.009,-1.4,1.6);
 return {state:{...state,talents:{...state.talents},effort},knowledge:knowledgePercentile(age,state.talents.study,effort)};
}

/** Original legacy fallback uses a local identity stream, separate from life-event RNG. */
export function legacyTalents(birthName:string,birthCountry:string,sex:string):Talents {
 let seed=7;
 for(const character of `${birthName}|${birthCountry}|${sex}`)seed=(seed*31+character.charCodeAt(0))>>>0;
 seed ||= 1;
 return drawTalents(()=>{
  seed=(Math.imul(seed^(seed>>>15),2246822507)+2654435769)>>>0;
  return ((seed>>>8)+.5)/16777216;
 });
}
interface LegacyLearningLife {
 learning?:LearningState;name:string;sex:string;age:number;
 country:{id:string};migration?:{birthCountry:{id:string}};
 stats:{knowledge:number};
}
/** Explicit runtime migration only. Save decoding never calls this or rewrites old records. */
export function initializeLegacyLearning<T extends LegacyLearningLife>(life:T):T {
 if(life.learning)return life;
 const talents=legacyTalents(life.name,life.migration?.birthCountry.id??life.country.id,life.sex);
 return {...life,learning:createLearningState(life.age,talents,life.stats.knowledge)};
}

/** Mutates only a caller-owned game draft. Absent latent state retains legacy gain semantics. */
export function addKnowledge(life:{age:number;learning?:LearningState;stats:{knowledge:number}},gain:number):void {
 if(!life.learning){life.stats.knowledge+=gain;return;}
 if(gain===0)return;
 const result=applyLearningGain(life.learning,life.age,gain);
 life.learning=result.state;life.stats.knowledge=result.knowledge;
}


/** Commit one observed year's learning; an omitted marker denotes an unobserved past. */
export function settleLearningYear(state:LearningState,context:KnowledgeContext,time:FocusWeights):{state:LearningState;knowledge:number|null} {
 if(state.lastSettledAge!==undefined&&context.age<=state.lastSettledAge)return {state,knowledge:null};
 const result=settleKnowledge(state.effort,state.talents.study,context,normalizeFocusTime(time));
 return {state:{...state,talents:{...state.talents},effort:result.effort,lastSettledAge:context.age},knowledge:result.knowledge};
}
