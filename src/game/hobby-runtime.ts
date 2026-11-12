import {hobbyDisplayKey} from './physical-hobbies';
import {hobbyCreditExhausted} from './hobby-spending';
import type {Decision,HobbyId,Life} from './types';
import {drawHobbyChoices,hobbyDefinition,hobbyMedianIncome,hobbyOptionsFor,replacedHobby} from './hobby-catalog';
export const HOBBY_OFFER_AGES=[7,15,27,50] as const;
export function hobbyDecisionId(age:number):string{return age===7?'hobby':`hobby-${age}`;}
export function isHobbyDecision(id:string):boolean{return id==='hobby'||/^hobby-(?:[1-9]\d?|10\d|110)$/.test(id);}
export function hobbyDecision(life:Life):Decision|null{
 const offer=life.hobbyState?.offer;
 if(!offer||offer.age!==life.age||life.academics?.origin!=='birth'||life.decisions.includes(hobbyDecisionId(life.age)))return null;
 return {id:hobbyDecisionId(life.age),type:'choice',age:life.age,key:life.hobbies.length?'decision.hobbyAgain':'decision.hobby',params:{replace:offer.replacement??''},choices:[...offer.options.map(id=>({id,key:hobbyDisplayKey(life,id),params:{}})),...(life.hobbies.length?[{id:'keepHobbies',key:'choice.keepHobbies',params:{}}]:[])]};
}
/** A candidate is drawn once, only after mandatory annual decisions have a slot. */
export function prepareHobbyDecision(life:Life,random:()=>number,requested=false):Decision|null{
 if(life.academics?.origin!=='birth'||!life.alive||life.age<7||life.justice.prisonUntil!==null)return null;
 const id=hobbyDecisionId(life.age);
 if(life.decisions.includes(id))return null;
 const queued=life.hobbyState?.queuedAge!==undefined&&life.hobbyState.queuedAge<=life.age;
 if(!requested&&!queued&&!(HOBBY_OFFER_AGES as readonly number[]).includes(life.age)&&!(life.age>=8&&life.age<=11&&!life.hobbies.length&&!life.decisions.includes('hobby')))return null;
 if(life.hobbyState?.offer?.age===life.age)return hobbyDecision(life);
 const replacement=replacedHobby(life.hobbies);if(life.hobbies.length>=3&&!replacement)return null;
 const options=drawHobbyChoices(life,random);if(!options.length)return null;
 life.hobbyState={...life.hobbyState,version:1,offer:{age:life.age,options,replacement:replacement?.id??null}};delete life.hobbyState.queuedAge;
 return hobbyDecision(life);
}
/** Reconcile only at presentation, never during decoding or after the player chooses. */
export function refreshHobbyDecision(life:Life,random:()=>number):Decision|null{
 const offer=life.hobbyState?.offer;if(!offer||offer.age!==life.age)return null;
 const available=new Set(hobbyOptionsFor(life));
 if(offer.options.some(id=>!available.has(id))){
  const retained=offer.options.filter(id=>available.has(id));
  offer.options=[...new Set([...retained,...drawHobbyChoices(life,random)])].slice(0,3);
 }
 if(!offer.options.length)return null;
 offer.replacement=replacedHobby(life.hobbies)?.id??null;
 return hobbyDecision(life);
}
export function resolveHobbyChoice(life:Life,id:string):boolean{
 const menu=hobbyDecision(life);if(!menu?.choices.some(c=>c.id===id))return false;
 if(id==='keepHobbies'){life.hobbyState!.declinedAge=life.age;return true;}
 if((replacedHobby(life.hobbies)?.id??'')!==menu.params.replace)return false;
 return addObservedHobby(life,id as HobbyId);
}
export function addObservedHobby(life:Life,id:HobbyId):boolean{
 if(!hobbyOptionsFor(life).includes(id))return false;
 const replacement=replacedHobby(life.hobbies);if(life.hobbies.length>=3&&!replacement)return false;
 if(replacement)life.hobbies=life.hobbies.filter(h=>h!==replacement);
 life.hobbies.unshift({id,skill:life.talents.includes(id)?10:5,trainedAt:-1,progress:{since:life.age,level:0}});
 life.stats.happiness=Math.min(100,life.stats.happiness+3);
 return true;
}
export function hobbySearchAvailable(life:Life):boolean{
 if(life.academics?.origin!=='birth'||!life.alive||life.pendingDecision||life.age<10||life.justice.prisonUntil!==null||life.hobbyState?.queuedAge!==undefined||life.hobbyState?.lastActionAge===life.age)return false;
 const age=life.hobbyState?.offer?.age;
 if(age!==undefined&&life.age-age<5&&!(life.hobbyState?.declinedAge===age&&life.age>age))return false;
 if(life.hobbies.length>=3&&!replacedHobby(life.hobbies))return false;
 return hobbyOptionsFor(life).length>0;
}
export function hobbySearchPrice(life:Life):number{return Math.round(hobbyMedianIncome(life)*.02*100)/100;}
export function hobbyCostBeforePause(life:Life):number{
 if(life.academics?.origin!=='birth'||life.age<18||life.justice.prisonUntil!==null)return 0;
 return life.hobbies.reduce((n,h)=>n+(hobbyDefinition(h.id)?.cost??0),0)*.6*Math.max(life.stats.annualIncome,hobbyMedianIncome(life)*.3);
}

export function annualHobbyCost(life:Life):number{return life.hobbyState?.pausedSince!==undefined||hobbyCreditExhausted(life)?0:hobbyCostBeforePause(life);}
