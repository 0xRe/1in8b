import {normalizeFocusTime,type FocusWeights} from './focus-effects';

/** Eligibility is supplied by the body/sport domain; focus never overrides it. */
export interface PracticeHobby {
 id:string;level:number;sport:boolean;blocked:boolean;talent:number|null;
}
const talentMultiplier=(talent:number|null)=>talent===null?1:Math.max(.4,Math.min(1.9,1+.35*talent));

/** Focus practice only; ordinary hobby growth and occupational bonuses settle separately. */
export function settleFocusPractice<T extends PracticeHobby>(hobbies:readonly T[],time:FocusWeights):T[] {
 const result=hobbies.map(hobby=>({...hobby}));
 const weights=normalizeFocusTime(time);
 for(const focus of ['hobby','sport'] as const){
  const share=weights[focus]??0;
  if(!share)continue;
  const target=result.find(hobby=>!hobby.blocked&&(focus!=='sport'||hobby.sport));
  if(target)target.level+=1.2*share*talentMultiplier(target.talent);
 }
 return result;
}
export function settleCareerPreparation(previous:number,time:FocusWeights,working:boolean):number {
 const share=normalizeFocusTime(time).careerPrep??0;
 return share?Math.min(2,previous+share):working?0:previous;
}
