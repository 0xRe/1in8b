import{hobbyPracticeBlocked}from'./named-sports';
import type{EventParams,Hobby,Life}from'./types';
import{hobbyDefinition,hobbyMedianIncome,hobbyTalentMultiplier}from'./hobby-catalog';
export const hobbyLessonPrice=(life:Life)=>Math.round(hobbyMedianIncome(life)*.05*100)/100;
export function hobbyLessonGain(life:Life,hobby:Hobby):number{return hobby.progress?2*hobbyTalentMultiplier(life,hobby.id)*(hobby.progress.level<6?1:Math.max(.1,Math.min(1,(14-hobby.progress.level)/8))):0;}
export function automaticLessonTarget(life:Life):Hobby|null{const hobby=life.hobbies.find(h=>h.id===life.hobbyState?.lessonHobby)??life.hobbies[0];return hobby?.progress&&hobbyDefinition(hobby.id)?hobby:null;}
export function automaticLessonStatus(life:Life):'off'|'waiting'|'scheduled'{const auto=life.hobbyState?.automaticLessons;return !auto?'off':auto.pausedForFunds?'waiting':'scheduled';}
export function automaticLessonsAvailable(life:Life):boolean{return life.academics?.origin==='birth'&&life.alive&&!life.pendingDecision&&life.age>=15&&life.justice.prisonUntil===null&&(!!life.hobbyState?.automaticLessons||!!automaticLessonTarget(life));}
/** Invoked only at the existing observed year-end finance boundary. No RNG or borrowing. */
export function settleAutomaticLessons(life:Life,event:(key:string,params:EventParams)=>void):void{
 const auto=life.hobbyState?.automaticLessons;if(!auto||life.academics?.origin!=='birth'||!life.alive)return;
 if(life.age<15||!life.hobbies.length){delete life.hobbyState!.automaticLessons;return;}
 if(life.justice.prisonUntil!==null||life.hobbyState?.lastActionAge===life.age)return;
 const target=automaticLessonTarget(life);if(!target||hobbyPracticeBlocked(life,target.id))return;
 const price=hobbyLessonPrice(life),median=hobbyMedianIncome(life),money=life.stats.savings-life.stats.debt;
 const cash=Math.max(0,money)+life.stats.investments;
 if(cash+1e-8<price+Math.max(price*2,median)){
  auto.pausedForFunds=true;
  if(auto.lastNoticeAge===undefined||life.age-auto.lastNoticeAge>=8){auto.lastNoticeAge=life.age;event('event.hobbyAutoSkipped',{});}
  return;
 }
 const draw=Math.min(life.stats.investments,Math.max(0,price-Math.max(0,money)));
 life.stats.investments-=draw;const remaining=money+draw-price;
 life.stats.savings=Math.max(0,remaining);life.stats.debt=Math.max(0,-remaining);
 target.progress!.level=Math.min(1000,target.progress!.level+hobbyLessonGain(life,target));target.trainedAt=life.age;
 life.stats.happiness=Math.min(100,life.stats.happiness+3);
 life.hobbyState!.lessonHobby=target.id;life.hobbyState!.lastActionAge=life.age;
 auto.pausedForFunds=false;auto.lastPaidAge=life.age;
}
