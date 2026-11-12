import type {BirthDevelopment} from './birth-development';
import type {Life} from './types';
import {namedLearningProbability} from './development-observation';
import {educationEraInputs} from './education-era';
export interface ChildLearningObservations {
 lastCheckedAge?:number;
 adhd?:{age:number;diagnosed:boolean};
 dyslexia?:{age:number;diagnosed:boolean};
}
interface Input {
 age:number;alive:boolean;away:boolean;traits:BirthDevelopment['attentionLearning'];
 access:{country:string;region:string;ppp:number;urban:boolean;year:number};
}
/** Source child branches: no enrollment gate and no direct parent stat effects. */
export function observeChildLearning(state:ChildLearningObservations,input:Input,draw:()=>number):string|null {
 const {age,traits,access}=input;
 if(!input.alive||input.away||!traits||age<=(state.lastCheckedAge??-1))return null;
 state.lastCheckedAge=age;
 if(traits.adhd&&!state.adhd&&age>=traits.noticedAt!){
  const diagnosed=draw()<namedLearningProbability(access,'adhd');state.adhd={age,diagnosed};return diagnosed?'adhdDiagnosed':'adhdUnrecognized';
 }
 if(traits.dyslexia&&!state.dyslexia&&age>=8&&access.ppp>=8000){
  const diagnosed=draw()<namedLearningProbability(access,'dyslexia');state.dyslexia={age,diagnosed};return diagnosed?'dyslexiaDiagnosed':'dyslexiaUnrecognized';
 }
 return null;
}
export function childLearningYear(life:Life,draw:()=>number,emit:(key:string,name:string)=>void):void {
 const access={country:life.country.id,region:life.country.region,ppp:educationEraInputs(life.country,life.era,life.year).statistics.ppp,urban:life.residence==='urban',year:life.year};
 for(const child of life.family.children){
  const progress=life.descendants.children.find(s=>s.childId===child.id);
  if(!child.alive||!progress?.birthDevelopment?.attentionLearning)continue;
  // Custody/placement separation is not yet modeled. Independent residence is not source `away`.
  const state=progress.learningObservations??={};
  const key=observeChildLearning(state,{age:child.age,alive:child.alive,away:false,traits:progress.birthDevelopment.attentionLearning,access},draw);
  if(key)emit(key,child.name);
 }
}
export function validateChildLearning(state:ChildLearningObservations,birth:BirthDevelopment|undefined,maxAge:number):void {
 const fail=()=>{throw Error('Invalid or unsupported life save.');};
 if(!state||typeof state!=='object'||Array.isArray(state)||!birth?.attentionLearning)fail();
 const checked=state.lastCheckedAge;
 if(!Number.isInteger(checked)||checked!<0||checked!>maxAge)fail();
 for(const key of ['adhd','dyslexia'] as const){
  const r=state[key];if(r===undefined)continue;
  const min=key==='adhd'?birth!.attentionLearning!.noticedAt:8;
  if(!birth!.attentionLearning![key]||!r||typeof r!=='object'||Array.isArray(r)||typeof r.diagnosed!=='boolean'||min===null||!Number.isInteger(r.age)||r.age<min||r.age>checked!)fail();
 }
 if(state.adhd&&state.dyslexia&&state.adhd.age===state.dyslexia.age)fail();
}
