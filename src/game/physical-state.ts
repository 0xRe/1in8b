import {NAMED_SPORT_IDS} from './sport-catalog';
import type {HobbyId} from './types';
import {getCountryById} from './countries';
import type{Life}from'./types';
export type PhysicalKind='mobility'|'vision'|'hearing';
export type PhysicalSource='birth'|'polio'|'fever'|'road'|'work'|'stroke';
export interface PhysicalCondition {
 kind:PhysicalKind;since:number;source:PhysicalSource;wheelchair:boolean;noticeAt:number;recognizedAge?:number;aid:boolean;
 cerebralPalsy?:{kind:'spastic'|'dyskinetic'|'ataxic'|'mixed';age:number};
 childAid?:{age:number;received:boolean};
 sportsAdjustment?:{age:number;hobby?:HobbyId};
 equipment?:{offer?:{age:number;poorAtOffer:boolean};attempts:{age:number;poorAtOffer:boolean;action:'get'|'decline';cost:number}[]};
}
export interface PhysicalState{version:1;lastCheckedAge:number;condition:PhysicalCondition|null;polioAt?:number;support?:{age:number;amount:number;country:string}}
export interface PhysicalEnvironment{ppp:number;region:string;year:number}
export function drawPhysicalBirth(environment:PhysicalEnvironment,draw:()=>number):PhysicalState{
 const state:PhysicalState={version:1,lastCheckedAge:0,condition:null};
 const band=environment.ppp<5000?1:environment.ppp<20000?.6:0;
 const rates=[['mobility',.0028+.0012*band],['hearing',.0012+.0025*band],['vision',.0004+.001*band]] as const;
 for(const[kind,probability]of rates)if(draw()<probability){
  state.condition={kind,since:0,source:'birth',wheelchair:kind==='mobility'&&draw()<.45,noticeAt:kind==='hearing'?1+Math.floor(draw()*2):1,aid:false};return state;
 }
 const y=environment.year,region=environment.region;
 const polio=y<1960&&region==='hi'?.003:y<1990&&region!=='hi'?.005*(environment.ppp<20000?1:.4):y<2000&&(region==='sa'||region==='ssa')?.002:0;
 if(polio&&draw()<polio)state.polioAt=1+Math.floor(draw()*4);
 return state;
}
/** Independent birth stream; never called on an imported record. */
export function physicalBirthDraw(seed:number):()=>number{let state=(seed^0x70687931)>>>0;return()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return(state+.5)/4294967296;};}


/** Validate only; missing older facts stay unknown and no random draw occurs. */
export function validatePhysicalState(life:Pick<Life,'physicalState'|'age'|'decisions'>):void{
 const state=life.physicalState;if(state===undefined)return;
 const fail=()=>{throw Error('Invalid or unsupported life save.');};
 const object=(value:any,keys:string[])=>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!keys.includes(k)))fail();};
 const integer=(value:any,min:number,max:number)=>{if(!Number.isInteger(value)||value<min||value>max)fail();};
 object(state,['version','lastCheckedAge','condition','polioAt','support']);if(state.version!==1)fail();integer(state.lastCheckedAge,0,life.age);
 if(state.polioAt!==undefined){integer(state.polioAt,1,4);if(state.condition!==null||state.lastCheckedAge>=state.polioAt)fail();}
 if(state.condition===null){if(state.support!==undefined)fail();return;}
 const c=state.condition;object(c,['kind','since','source','wheelchair','noticeAt','recognizedAge','aid','cerebralPalsy','childAid','equipment','sportsAdjustment']);
 if(!['mobility','vision','hearing'].includes(c.kind)||!['birth','polio','fever','road','work','stroke'].includes(c.source)||typeof c.wheelchair!=='boolean'||typeof c.aid!=='boolean'||c.kind!=='mobility'&&c.wheelchair)fail();
 integer(c.since,c.source==='birth'?0:1,life.age);
 if(c.source==='birth'){if(c.since!==0)fail();integer(c.noticeAt,1,c.kind==='hearing'?2:1);}
 else{if(c.noticeAt!==c.since||c.recognizedAge!==c.since)fail();}
 if(c.source==='polio'&&(c.kind!=='mobility'||c.since>4)||c.source==='fever'&&(c.kind==='mobility'||c.since>10)||c.source==='work'&&(c.since<16||c.since>=65))fail();
 if(['work','road'].includes(c.source)&&c.kind==='hearing'||c.source==='stroke'&&c.kind!=='mobility')fail();
 if(c.recognizedAge!==undefined)integer(c.recognizedAge,c.noticeAt,state.lastCheckedAge);
 if(c.cerebralPalsy!==undefined){
  const cp=c.cerebralPalsy;object(cp,['kind','age']);
  if(c.source!=='birth'||c.kind!=='mobility'||!c.wheelchair||c.recognizedAge===undefined||!['spastic','dyskinetic','ataxic','mixed'].includes(cp.kind))fail();
  integer(cp.age,Math.max(3,(c.recognizedAge??0)+1),state.lastCheckedAge);
 }
 if(c.childAid!==undefined){
  const aid=c.childAid;object(aid,['age','received']);if(typeof aid.received!=='boolean'||c.recognizedAge===undefined)fail();
  integer(aid.age,Math.max(c.noticeAt+1,(c.recognizedAge??0)+1),Math.min(17,state.lastCheckedAge));
  if(aid.received&&!c.aid||c.cerebralPalsy?.age===aid.age)fail();
 }
 if(c.sportsAdjustment!==undefined){
  const record=c.sportsAdjustment;object(record,['age','hobby']);integer(record.age,c.since+1,state.lastCheckedAge);
  if(!['road','work','stroke'].includes(c.source)||c.recognizedAge===undefined)fail();
  if(record.hobby!==undefined&&(!(NAMED_SPORT_IDS as readonly string[]).includes(record.hobby)||record.age>c.since+2))fail();
 }
 if(c.equipment!==undefined){
  const equipment=c.equipment;object(equipment,['offer','attempts']);
  if(!Array.isArray(equipment.attempts)||equipment.attempts.length>3||!equipment.attempts.length&&!equipment.offer||c.recognizedAge===undefined||c.childAid?.received)fail();
  let last:{age:number;poorAtOffer:boolean;action:string}|undefined;
  for(const [index,a]of equipment.attempts.entries()){
   object(a,['age','poorAtOffer','action','cost']);integer(a.age,Math.max(18,(c.recognizedAge??0)+1,last?last.age+(index===1?8:2):18),state.lastCheckedAge);
   if(typeof a.poorAtOffer!=='boolean'||!['get','decline'].includes(a.action)||!Number.isFinite(a.cost)||a.cost<=0||a.cost>1e12||!life.decisions.includes(`physicalAid-${a.age}`))fail();
   if(last?.action==='get'||index===2&&(!last?.poorAtOffer||a.poorAtOffer))fail();last=a;
  }
  if(equipment.offer!==undefined){
   const offer=equipment.offer;object(offer,['age','poorAtOffer']);
   integer(offer.age,Math.max(18,(c.recognizedAge??0)+1,last?last.age+(equipment.attempts.length===1?8:2):18),state.lastCheckedAge);
   if(typeof offer.poorAtOffer!=='boolean'||equipment.attempts.length>=3||last?.action==='get'||equipment.attempts.length===2&&(!last?.poorAtOffer||offer.poorAtOffer))fail();
  }
  if(last?.action==='get'&&!c.aid)fail();
 }
 if(c.aid&&!c.childAid?.received&&!c.equipment?.attempts.some(a=>a.action==='get'))fail();
 if(state.support!==undefined){
  const support=state.support;object(support,['age','amount','country']);
  integer(support.age,Math.max(18,(c.recognizedAge??0)+1),Math.min(64,state.lastCheckedAge));
  if(c.recognizedAge===undefined||!Number.isFinite(support.amount)||support.amount<=0||support.amount>1e12||!['hi','eca'].includes(getCountryById(support.country)?.region??''))fail();
 }
}

export interface PhysicalFacts{kind:PhysicalKind|null;aid:boolean;wheelchair:boolean;since:number|null;source:PhysicalSource|null}
export function physicalFacts(life:Pick<Life,'physicalState'>):PhysicalFacts|null{
 if(!life.physicalState)return null;const c=life.physicalState.condition;
 return c&&c.recognizedAge!==undefined?{kind:c.kind,aid:c.aid,wheelchair:c.wheelchair,since:c.since,source:c.source}:{kind:null,aid:false,wheelchair:false,since:null,source:null};
}
