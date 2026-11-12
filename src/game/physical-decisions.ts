import type{Life,Decision}from'./types';
import{physicalAccess,physicalEnvironment}from'./physical-access';
import{incomeAtPercentile}from'./income-distribution';
const cents=(n:number)=>Math.round(n*100)/100;
const signed=(life:Life)=>life.stats.savings-life.stats.debt;
const eligible=(life:Life)=>life.alive&&life.age>=18&&life.justice.prisonUntil===null&&String(life.stats.job)!=='prison'&&life.physicalState?.condition?.recognizedAge!==undefined&&life.age>life.physicalState.condition.recognizedAge;
/** Source equipment purchases use signed money directly, without liquidating investments. */
export function physicalAidCost(life:Life):number{
 const c=life.physicalState?.condition;if(!c)return 0;
 const env=physicalEnvironment(life),priceLevel=Math.max(.22,Math.min(1.25,.11*Math.sqrt(env.ppp/1000)));
 const coverage=Math.max(.3,Math.min(1,(life.country.oop||30)/50));
 return cents(({mobility:1200,vision:600,hearing:2500}[c.kind])/priceLevel*coverage*(physicalAccess(env)<.2?1.5:1));
}
export function preparePhysicalEquipment(life:Life):void{
 const c=life.physicalState?.condition;if(!eligible(life)||!c||c.aid||c.equipment?.offer)return;
 const attempts=c.equipment?.attempts??[],last=attempts.at(-1),cost=physicalAidCost(life),money=signed(life);
 if(attempts.length>=3)return;
 if(attempts.length<2){if(last&&life.age-last.age<8)return;}
 else if(!last?.poorAtOffer||life.age-last.age<2||money<3*cost)return;
 (c.equipment??={attempts:[]}).offer={age:life.age,poorAtOffer:money<3*cost};
}
export const isPhysicalEquipmentDecision=(id:unknown):boolean=>typeof id==='string'&&/^physicalAid-(?:[1-9]\d?|10\d|110)$/.test(id);
export function physicalEquipmentDecision(life:Life):Decision|null{
 const c=life.physicalState?.condition,offer=c?.equipment?.offer,id=`physicalAid-${life.age}`;
 if(!eligible(life)||!c||c.aid||!offer||offer.age>life.age||life.decisions.includes(id))return null;
 const amount=physicalAidCost(life),canDebit=signed(life)-amount>=-1e12;
 return{id,type:'choice',age:life.age,key:'decision.physicalAid',params:{},choices:[
  ...(canDebit?[{id:'physicalAidGet',key:'choice.physicalAidGet',params:{amount}}]:[]),
  {id:'physicalAidDecline',key:'choice.physicalAidDecline',params:{}},
 ]};
}
/** Requote only queued menus after country, finances or eligibility changes. */
export function refreshScheduledPhysicalEquipment(life:Life):void{
 const timeline=life.timeline;if(!timeline?.scheduledDecisions||timeline.year!==life.year||timeline.age!==life.age)return;
 const removed=new Set<string>();
 timeline.scheduledDecisions=timeline.scheduledDecisions.flatMap(decision=>{
  if(!isPhysicalEquipmentDecision(decision.id))return[decision];
  const current=physicalEquipmentDecision(life);
  if(current?.id===decision.id)return[current];
  removed.add(decision.id);return[];
 });
 timeline.queue=timeline.queue.filter(slot=>slot.kind!=='decision'||!removed.has(slot.id));
}
export function resolvePhysicalEquipment(life:Life,choice:string):'received'|'declined'|null{
 const menu=physicalEquipmentDecision(life);if(!menu?.choices.some(c=>c.id===choice))return null;
 const c=life.physicalState!.condition!,equipment=c.equipment!,amount=physicalAidCost(life),received=choice==='physicalAidGet';
 equipment.attempts.push({age:life.age,poorAtOffer:equipment.offer!.poorAtOffer,action:received?'get':'decline',cost:amount});delete equipment.offer;
 if(!received)return'declined';
 const money=signed(life)-amount;life.stats.savings=Math.max(0,money);life.stats.debt=Math.max(0,-money);
 c.aid=true;life.stats.happiness=Math.min(100,life.stats.happiness+4);return'received';
}
export function physicalSupportFor(life:Life):number{
 const c=life.physicalState?.condition;
 if(!eligible(life)||!c||life.age>=65||life.schooling.enrolled||life.academics?.enrollment||!['hi','eca'].includes(life.country.region))return 0;
 const job=String(life.stats.job),seeking=life.stats.employment==='unemployed'&&['none','seeking'].includes(job);
 const home=life.stats.employment==='none'&&(job==='homemaker'||life.care.who==='self'&&job==='none');
 if(!seeking&&!home)return 0;
 return cents(incomeAtPercentile({...life.country,ppp:physicalEnvironment(life).ppp},.5)*.18);
}
/** Actual annual grant, distinct from salary and the year-end savings projection. */
export function payPhysicalSupport(life:Life):number{
 const state=life.physicalState;if(!state||state.lastCheckedAge!==life.age||(state.support?.age??-1)>=life.age)return 0;
 const amount=cents(Math.min(physicalSupportFor(life),Math.max(0,1e12-signed(life))));if(amount<=0)return 0;
 const money=signed(life)+amount;life.stats.savings=Math.max(0,money);life.stats.debt=Math.max(0,-money);
 state.support={age:life.age,amount,country:life.country.id};return amount;
}
