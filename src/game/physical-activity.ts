import type{Life}from'./types';
import type{SportId}from'./sport-catalog';
export function activePhysicalCondition(life:Pick<Life,'physicalState'|'age'>,atAge=life.age){
 const c=life.physicalState?.condition;return c&&c.recognizedAge!==undefined&&c.recognizedAge<=atAge?c:null;
}
const wheelchair:readonly SportId[]=['basketball','tabletennis','badminton','archery','running','cycling','rugby'];
const ambulatory:readonly SportId[]=['basketball','tabletennis','badminton','archery','cycling'];
const acquiredVision:readonly SportId[]=['running','cycling'];
export function physicalSportPool(life:Life,atAge=life.age):readonly SportId[]|null{
 const c=activePhysicalCondition(life,atAge);if(!c)return null;
 return c.kind==='mobility'?(c.wheelchair?wheelchair:ambulatory):c.kind==='vision'&&['road','work'].includes(c.source)?acquiredVision:null;
}
export function physicalFeetOff(life:Life,atAge=life.age):boolean{
 const c=activePhysicalCondition(life,atAge);return !!c&&c.kind==='mobility'&&(c.wheelchair||['road','work','stroke'].includes(c.source));
}
