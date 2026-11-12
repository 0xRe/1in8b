import {addKnowledge} from './learning-state';
import type {Life,EventParams} from './types';
import type {FeedCandidate} from './annual-feed';
import {childImprisoned} from './child-prison';
interface Hooks {random:()=>number;event:(key:string,params?:EventParams)=>void}
/** Candidate rules for the ordinary feed; these do not run outside the weighted scheduler. */
export function custodyFeedCandidates(life:Life,hooks:Hooks):FeedCandidate[]{
 const emitVariant=(keys:string[],params?:EventParams)=>hooks.event(keys[Math.min(keys.length-1,Math.floor(hooks.random()*keys.length))],params);
 const imprisonedChild=()=>life.family.children.find(child=>childImprisoned(child.alive,life.descendants.children.find(s=>s.childId===child.id)?.prison,life.year));
 const prisoner=(id:string,weight:number,effects:Partial<Record<'knowledge'|'happiness'|'social'|'health',number>>,keys:string[],repeatable=false,gap?:number):FeedCandidate=>({
  id,minAge:14,maxAge:125,weight,repeatable,gap,
  eligible:()=>life.alive&&life.justice.prisonUntil!==null,
  run:()=>{for(const [stat,delta] of Object.entries(effects)){if(stat==='knowledge')addKnowledge(life,delta!);else life.stats[stat as keyof typeof effects]+=delta!;}emitVariant(keys)},
 });
 return [
  {id:'kidpr_v',minAge:36,maxAge:110,weight:30,repeatable:true,gap:1,
   eligible:gate=>life.alive&&life.justice.prisonUntil===null&&!!imprisonedChild()&&gate(.6),
   run:()=>{const child=imprisonedChild();if(!child)return;const state=life.descendants.children.find(c=>c.childId===child.id)!;state.bond=(state.bond??0)+1;life.stats.happiness-=1;emitVariant(['event.childPrisonVisit','event.childPrisonLetter','event.childPrisonConcern'],{name:child.name})}},
  prisoner('pr_learn',.8,{knowledge:4,happiness:2},['event.prisonTraining','event.prisonLibrary']),
  prisoner('pr_work',.7,{happiness:-1},['event.prisonWorkshop','event.prisonKitchen'],true,2),
  prisoner('pr_letter',.6,{social:2,happiness:1},['event.prisonFamilyLetter','event.prisonNotebook'],true,2),
  prisoner('pr_hard',.8,{happiness:-3,health:-2},['event.prisonSleepless','event.prisonSeasons'],true,2),
 ];
}
