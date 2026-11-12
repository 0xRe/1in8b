import type { Life } from './types';
import{activePhysicalCondition,physicalSportPool}from'./physical-activity';
import{hobbyPracticeBlocked}from'./named-sports';
export const ADAPTED_HOBBIES={
 'adapted.handcycling':{hobby:'sp_cycling',name:'Handcycling'},
 'adapted.wheelchairBasketball':{hobby:'sp_basketball',name:'Wheelchair basketball'},
 'adapted.wheelchairRugby':{hobby:'sp_rugby',name:'Wheelchair rugby'},
 'adapted.wheelchairRacing':{hobby:'sp_running',name:'Wheelchair racing'},
 'adapted.wheelchairBadminton':{hobby:'sp_badminton',name:'Wheelchair badminton'},
 'adapted.wheelchairTableTennis':{hobby:'sp_tabletennis',name:'Wheelchair table tennis'},
}as const;
export type AdaptedHobbyId=keyof typeof ADAPTED_HOBBIES;
export const ADAPTED_HOBBY_IDS=Object.keys(ADAPTED_HOBBIES)as AdaptedHobbyId[];
export function hobbyDisplayId(life:Life,id:string,atAge=life.age):string{
 const c=activePhysicalCondition(life,atAge);if(c?.kind!=='mobility')return id;
 if(id==='sp_cycling')return'adapted.handcycling';
 const pool=physicalSportPool(life,atAge);if(!pool?.some(s=>`sp_${s}`===id))return id;
 return id==='sp_basketball'?'adapted.wheelchairBasketball':id==='sp_rugby'?'adapted.wheelchairRugby':id==='sp_running'?'adapted.wheelchairRacing':c.wheelchair&&id==='sp_badminton'?'adapted.wheelchairBadminton':c.wheelchair&&id==='sp_tabletennis'?'adapted.wheelchairTableTennis':id;
}
export const hobbyDisplayKey=(life:Life,id:string,atAge=life.age)=>`hobby.${hobbyDisplayId(life,id,atAge)}`;
export function hobbySidelineKey(id:string):string{return`event.hobbyLife.sidelines${id==='dance'?'.dance':id==='hiking'?'.hiking':''}`;}
/** The driving follow-up takes priority; that producer must resolve owned cars before this hook. */
export function observeSportAdjustment(life:Life):string|null{
 const c=activePhysicalCondition(life);if(!c||!['road','work','stroke'].includes(c.source)||life.age<=c.since||c.sportsAdjustment||life.justice.prisonUntil!==null||life.belongings.transport==='car')return null;
 const hobby=life.age-c.since<=2?life.hobbies.find(h=>h.progress&&h.progress.level>=2&&h.progress.since<c.since&&!hobbyPracticeBlocked(life,h.id)&&physicalSportPool(life)?.some(s=>`sp_${s}`===h.id)):undefined;
 c.sportsAdjustment={age:life.age,...(hobby?{hobby:hobby.id}:{})};if(!hobby)return null;
 hobby.progress!.returnedToSportAge=life.age;life.stats.happiness=Math.min(100,life.stats.happiness+2);
 return c.kind==='vision'?'event.physical.sportReturn.vision':hobby.id==='sp_cycling'?'event.physical.sportReturn.handcycling':c.wheelchair||hobby.id==='sp_basketball'?'event.physical.sportReturn.wheelchair':'event.physical.sportReturn.standing';
}
