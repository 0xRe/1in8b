import type {EventParams,Hobby,HobbyId,Life} from './types';
import type {FeedCandidate} from './annual-feed';
import {hobbyDefinition,hobbyMedianIncome} from './hobby-catalog';
import {hobbyCategory,hobbyPracticeBlocked} from './named-sports';
import {hobbyDisplayId,hobbySidelineKey,type AdaptedHobbyId} from './physical-hobbies';
import {physicalCountry} from './physical-residence';
import {childImprisoned} from './child-prison';
export const HOBBY_ACTIVITIES:readonly HobbyId[]=['music','dance','art','sport','photo','cooking','hiking','drama','garden','fishing','writing'];
const solo=new Set<HobbyId>(['screen','sns','faith']);
const teaching=new Set<HobbyId>(['sport','music','dance','reading','fishing','cooking','garden','board','craft','art','photo','drama','writing']);
const contests=new Set<HobbyId>(['sport','music','dance','games','board','craft','art','photo','cooking','fishing','garden']);
export interface HobbyLifeOption {id:'friends'|'support'|'retired'|'teach'|'spouse'|'activity'|'contest'|'sidelines';hobby:HobbyId;key:string;name?:string;partnerId?:string}
interface Hooks {random:()=>number;event:(key:string,params:EventParams)=>void}
function bestHobby(life:Life):Hobby|undefined{
 const ranked=life.hobbies.filter(h=>h.progress&&h.progress.level>=2&&hobbyDefinition(h.id)).sort((a,b)=>b.progress!.level-a.progress!.level);
 return ranked.find(h=>!hobbyPracticeBlocked(life,h.id)||h.progress!.sidelinesAge===undefined)??ranked[0];
}
const baseEligible=(life:Life)=>life.alive&&life.academics?.origin==='birth'&&life.age>=12&&life.age<=95&&life.justice.prisonUntil===null&&!!bestHobby(life);
function stressed(life:Life):boolean{return life.stats.happiness<45||life.stats.employment==='unemployed'||life.stats.savings-life.stats.debt<-hobbyMedianIncome(life)*.5||life.events.some(e=>e.age<=life.age&&life.age-e.age<=2&&['event.familyDeath','event.healthLoss','event.descendantEarlyLoss','event.petFarewell'].includes(e.key));}
function childHere(life:Life):boolean{return life.family.children.some(child=>{
 const state=life.descendants.children.find(c=>c.childId===child.id);
 return child.alive&&child.age>=5&&child.age<=15&&child.country===physicalCountry(life)&&state?.residence==='home'&&!childImprisoned(child.alive,state.prison,life.year);
});}
/** Construct current options at dispatch. No RNG or household mutations occur here. */
export function hobbyLifeOptions(life:Life):HobbyLifeOption[]{
 if(!baseEligible(life))return [];
 const hobby=bestHobby(life)!,id=hobbyCategory(hobby.id),blocked=hobbyPracticeBlocked(life,hobby.id),options:HobbyLifeOption[]=[];
 const add=(kind:HobbyLifeOption['id'],extra:Partial<HobbyLifeOption>={})=>options.push({id:kind,hobby:hobby.id,key:`event.hobbyLife.${kind}`,...extra});
 if(blocked&&hobby.progress!.sidelinesAge===undefined){add('sidelines',{key:hobbySidelineKey(hobby.id)});return options;}
 const highSupport=(life.birthDevelopment?.developmental?.supportLevel??1)>=2;
 if(!solo.has(id))add('friends');
 if(id!=='sns'&&stressed(life))add('support');
 if(id!=='sns'&&life.stats.employment==='retired')add('retired');
 if(!blocked&&teaching.has(id)&&childHere(life))add('teach');
 const partner=life.family.partner;
 if(!blocked&&life.family.married&&life.relationship.status==='married'&&partner?.alive&&partner.country===physicalCountry(life)&&!solo.has(id)&&!highSupport&&life.hobbyState?.lifeStories?.sharedPartner?.name!==partner.name)add('spouse',{name:partner.name,partnerId:partner.id});
 if(!blocked&&life.age>=16&&HOBBY_ACTIVITIES.includes(id)&&!life.hobbyState?.lifeStories?.activities?.includes(id)&&!highSupport)add('activity',{key:`event.hobbyLife.activity.${id}`});
 if(!blocked&&hobby.progress!.level>=5&&contests.has(id)&&life.hobbyState?.lifeStories?.contestAge===undefined&&life.age<(id==='sport'?60:id==='dance'?70:200))add('contest');
 return options;
}
const pickIndex=(n:number,random:()=>number)=>Math.min(n-1,Math.floor(Math.max(0,Math.min(1-Number.EPSILON,random()))*n));
/** Cached annual eligibility is supplied by the shared scheduler; dispatch does not reroll it. */
export function hobbyLifeCandidate(life:Life,hooks:Hooks):FeedCandidate {
 return {id:'hob_life',minAge:12,maxAge:95,weight:30,repeatable:true,gap:4,
 eligible:gate=>baseEligible(life)&&gate(.06),run:()=>{
  if(!baseEligible(life))return;const options=hobbyLifeOptions(life);if(!options.length)return;
  const art=options.find(o=>o.id==='activity'&&o.hobby==='art');
  if(art)art.key+=pickIndex(2,hooks.random)===0?'.exhibit':'.visit';
  const option=options[pickIndex(options.length,hooks.random)];
  if(option.id==='sidelines'){
   life.hobbies.find(h=>h.id===option.hobby)!.progress!.sidelinesAge=life.age;
  }else if(option.id==='spouse'){
   const partner=life.family.partner!;
   if(partner.id!==option.partnerId||partner.name!==option.name)return;
   partner.bond=(partner.bond??0)+2;
   const stories=(life.hobbyState={...life.hobbyState,version:1}).lifeStories??={};
   const label=hobbyDisplayId(life,option.hobby);
   stories.sharedPartner={id:partner.id,name:partner.name,hobby:option.hobby,age:life.age,...(label!==option.hobby?{label:label as AdaptedHobbyId}:{})};
  }else if(option.id==='activity'||option.id==='contest'){
   const stories=(life.hobbyState={...life.hobbyState,version:1}).lifeStories??={};
   if(option.id==='activity')(stories.activities??=[]).push(hobbyCategory(option.hobby));else stories.contestAge=life.age;
  }
  life.stats.happiness=Math.min(100,life.stats.happiness+3);life.stats.social=Math.min(100,life.stats.social+1);
  hooks.event(option.key,{hobby:hobbyDisplayId(life,option.hobby),...(option.name?{name:option.name}:{})});
 }};
}
