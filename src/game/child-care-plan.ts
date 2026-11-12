import {childCareWorry} from './child-care-worry';
export type ChildCarePlan={kind:'groupHome'|'relatives';year:number;parentAge:number}|{kind:'sibling';year:number;parentAge:number;siblingId:string;siblingName:string;siblingBirthYear:number};
export interface CareSibling {id:string;name:string;birthYear:number;age:number;alive:boolean;developmental:boolean;away:boolean;abroad:boolean;placed:boolean;cutOff:boolean;imprisoned:boolean;near:boolean;city:boolean}
/** Source ddKidPlan: retain plans, invalidate lost sibling identity, then consider a new arrangement. */
export function resolveChildCarePlan(prior:ChildCarePlan|null,c:{parentAge:number;parentHealth:number;year:number;rich:boolean},siblings:CareSibling[],draw:()=>number):ChildCarePlan|null {
 let plan=prior;
 if(plan?.kind==='sibling'){
  const saved=plan;
  if(!siblings.some(s=>s.id===saved.siblingId&&s.alive&&s.name===saved.siblingName&&s.birthYear===saved.siblingBirthYear))plan=null;
 }
 if(plan||!(c.parentAge>=60||c.parentAge>=50&&c.parentHealth<35)||draw()>=.2)return plan;
 const candidate=siblings.filter(s=>s.alive&&!s.developmental&&!s.away&&!s.abroad&&!s.placed&&!s.cutOff&&!s.imprisoned&&s.age>=22&&(s.near||s.city))
  .sort((a,b)=>Number(b.near)-Number(a.near)||a.birthYear-b.birthYear)[0];
 const base={year:c.year,parentAge:c.parentAge};
 return candidate&&draw()<(c.rich?.45:.7)
  ?{...base,kind:'sibling',siblingId:candidate.id,siblingName:candidate.name,siblingBirthYear:candidate.birthYear}
  :{...base,kind:c.rich?'groupHome':'relatives'};
}

import type {Life,EventParams} from './types';
import {childImprisoned} from './child-prison';
import {educationEraInputs} from './education-era';
export function childCarePlanYear(life:Life,emit:(key:string,name:string,extra?:EventParams)=>void,draw:()=>number):void {
 const ppp=educationEraInputs(life.country,life.era,life.year).statistics.ppp;
 const rich=ppp>=15000&&['hi','eca'].includes(life.country.region);
 for(const child of life.family.children){
  const state=life.descendants.children.find(s=>s.childId===child.id)!;
  if(!child.alive||child.age<18||(state.birthDevelopment?.developmental?.supportLevel??0)<2||!state.homePlan?.staying)continue;
  const siblings=life.family.children.filter(s=>s.id!==child.id).map(s=>{
   const progress=life.descendants.children.find(p=>p.childId===s.id)!;
   return {id:s.id,name:s.name,birthYear:s.birthYear,age:s.age,alive:s.alive,developmental:!!progress.birthDevelopment?.developmental,
    away:false,abroad:s.country!==life.country.id,placed:false,cutOff:false,imprisoned:childImprisoned(s.alive,progress.prison,life.year),
    // Only observed household/city facts qualify; same-country residence alone is not proximity.
    near:progress.residence==='home',city:progress.homePlan?.decision?.reason==='city'};
  });
  const prior=state.carePlan??null;
  const next=life.justice.prisonUntil!==null?prior:resolveChildCarePlan(prior,{parentAge:life.age,parentHealth:life.stats.health,year:life.year,rich},siblings,draw);
  if(next!==prior){
   if(!next)delete state.carePlan;
   else {state.carePlan=next;life.stats.happiness+=2;emit(`carePlan.${next.kind}`,child.name,next.kind==='sibling'?{sibling:next.siblingName}:{});}
  }
  const worry=childCareWorry(state.careWorryYear,{parentAge:life.age,childAge:child.age,alive:child.alive,level:state.birthDevelopment!.developmental!.supportLevel,staying:!!state.homePlan?.staying,away:false,planned:!!state.carePlan,year:life.year},draw);
  if(worry!==null){state.careWorryYear=worry;emit('careWorry',child.name);}
 }
}
