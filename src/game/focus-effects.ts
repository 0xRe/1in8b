import {STAGE_FOCUSES,type StageFocus} from './focus-model';
export type FocusWeights=Partial<Record<StageFocus,number>>;
export interface FocusStats {health:number;happiness:number;social:number}
const clamp=(value:number)=>Math.max(0,Math.min(100,value));
const deltas:Record<StageFocus,readonly [number,number,number]>={
 study:[0,-1,-1],play:[0,4,4],help:[0,0,2],sport:[4,2,1],hobby:[0,4,0],
 work:[-3,-2,-2],balance:[1,1,1],family:[0,3,5],health:[5,1,0],learn:[0,-1,0],
 faith:[0,3,4],rest:[2,2,0],mind:[0,1,1],parttime:[0,-1,1],careerPrep:[0,-2,0],
};
export function normalizeFocusTime(time:FocusWeights):FocusWeights {
 let total=0;
 for(const [key,value] of Object.entries(time)){
  if(!STAGE_FOCUSES.includes(key as StageFocus)||!Number.isFinite(value)||value<0)throw new RangeError('Invalid focus time');
  total+=value;
 }
 if(!Number.isFinite(total))throw new RangeError('Invalid focus total');
 return total>0?Object.fromEntries(Object.entries(time).filter(([,value])=>value>0).map(([key,value])=>[key,value/total])):{};
}
export function healthFocusFactor(age:number):number {
 return age<50?1:age<65?.8:age<75?.6:age<85?.45:.3;
}
/** Only direct focus effects. Knowledge and later annual convergence settle separately. */
export function settleFocusStats(input:FocusStats,age:number,time:FocusWeights):FocusStats {
 const stats={...input},weights=normalizeFocusTime(time);
 if(age<6)return stats;
 for(const [key,weight] of Object.entries(weights)){
  const [health,happiness,social]=deltas[key as StageFocus];
  stats.health=clamp(stats.health+health*weight*(key==='health'?healthFocusFactor(age):1));
  stats.happiness=clamp(stats.happiness+happiness*weight);
  stats.social=clamp(stats.social+social*weight);
 }
 return stats;
}
