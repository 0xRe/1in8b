import type{Life}from'./types';
import{physicalEnvironment,physicalAccess}from'./physical-access';
import{observeSportAdjustment}from'./physical-hobbies';
import{preparePhysicalEquipment,payPhysicalSupport}from'./physical-decisions';
export{physicalEnvironment,physicalAccess}from'./physical-access';
const clamp=(n:number,low:number,high:number)=>Math.max(low,Math.min(high,n));
/** Observe the current actual year once. Never called during decoding or to backfill skipped years. */
export function observePhysicalYear(life:Life,draw:()=>number):string|null{
 const state=life.physicalState;if(!state||!life.alive||state.lastCheckedAge>=life.age)return null;
 state.lastCheckedAge=life.age;const c=state.condition;
 if(!c){
  if(state.polioAt!==undefined&&life.age>=state.polioAt){
   delete state.polioAt;state.condition={kind:'mobility',since:life.age,source:'polio',wheelchair:draw()<.3,noticeAt:life.age,recognizedAge:life.age,aid:false};
   life.stats.health=clamp(life.stats.health-8,0,100);life.stats.happiness=clamp(life.stats.happiness-6,0,100);return'event.physical.acquired.polio';
  }
  return null;
 }
 if(c.recognizedAge===undefined){
  if(life.age<c.noticeAt)return null;c.recognizedAge=life.age;return`event.physical.recognized.${c.kind}${c.kind==='mobility'&&c.wheelchair?'.wheelchair':''}`;
 }
 const adjustment=observeSportAdjustment(life);if(adjustment)return adjustment;
 if(c.kind==='mobility'&&c.wheelchair&&c.source==='birth'&&!c.cerebralPalsy&&life.age>=3){
  const value=draw()*100,kind=value<=80?'spastic':value<=90?'dyskinetic':value<=95?'ataxic':'mixed';
  c.cerebralPalsy={kind,age:life.age};return`event.physical.cerebralPalsy.${kind}`;
 }
 if(!c.aid&&!c.childAid&&life.age<18&&life.age>=c.noticeAt+1){
  const probability=Math.min(.95,physicalAccess(physicalEnvironment(life))*[.6,.8,1,1.15,1.3][life.stats.incomeQuintile-1]);
  const received=draw()<probability;c.childAid={age:life.age,received};
  if(!received)return'event.physical.childAidUnavailable';
  c.aid=true;life.stats.happiness=clamp(life.stats.happiness+3,0,100);
  return`event.physical.childAid.${c.kind}${c.kind==='mobility'&&c.wheelchair?'.wheelchair':''}`;
 }
 preparePhysicalEquipment(life);
 return payPhysicalSupport(life)>0?'event.physical.support':null;
}
