import { getCountryById } from './countries';
import { fertilityAt, fertilityTarget, laterBirthAge } from './descendant-fertility';
import type { DescendantHooks } from './descendants';
import type { GreatGrandchild, GreatGreatGrandchild, Life } from './types';
import { MAX_GREAT_GRANDCHILDREN, MAX_GREAT_GREAT_GRANDCHILDREN } from "./family-limits";
export { MAX_GREAT_GRANDCHILDREN, MAX_GREAT_GREAT_GRANDCHILDREN } from "./family-limits";
function random(state: {rng:number}) {
 state.rng=(state.rng+0x6d2b79f5)>>>0;
 let n=state.rng; n=Math.imul(n^(n>>>15),n|1); n^=n+Math.imul(n^(n>>>7),n|61);
 return ((n^(n>>>14))>>>0)/4294967296;
}
/** Called once after the existing descendant year; no past births are reconstructed. */
export function laterGenerationsYear(life: Life, hooks: DescendantHooks) {
 const all=life.descendants;
 all.laterObservedSince ??= life.year;
 const rng={rng:all.laterRng??((life.seed^0x79ab32d1)>>>0)};
 const draw=()=>random(rng);
 const great=all.greatGrandchildren??=[];
 const greater=all.greatGreatGrandchildren??=[];
 const existingGreat=[...great];
 const emit=(key:string,params:Record<string,string|number>)=>hooks.event(life,key,'family','🌱',params);
 for(const child of [...existingGreat,...greater]) {
  if(!child.alive) continue;
  child.age++;
 }
 const bornBefore=[great.length,greater.length];
 for(const generation of [0,1] as const) {
  const parents=generation===0?all.grandchildren:existingGreat;
  for(const parent of parents) {
   if(!parent.alive||parent.age<18) continue;
   // The reference applies one player-current-country fertility context to all generations.
   const country=life.country;
   const children=generation===0?great.filter(c=>c.grandchildId===parent.id):greater.filter(c=>c.greatGrandchildId===parent.id);
   if (parent.fertilityTarget === undefined) {
    // Reference evaluates early loss once when this aggregate generation reaches adulthood.
    // Preserve observed legacy births and already assigned targets; never rewrite their past.
    const earlyLoss = generation === 1 && children.length === 0 &&
      draw() < Math.max(.01, Math.min(.15, country.u5 / 1000 * .75 + .01));
    parent.fertilityTarget = earlyLoss ? 0 : Math.max(children.length,
      fertilityTarget(country,fertilityAt(country.tfr,life.year+10),draw));
   }
   // An existing legacy child is retained; it never causes a replacement birth.
   if(parent.age>44||parent.age<laterBirthAge(country,parent.sex,life.era==='past'?life.year:undefined)||children.length>=parent.fertilityTarget) continue;
   const collection=generation===0?great:greater;
   if(collection.length >= (generation===0?MAX_GREAT_GRANDCHILDREN:MAX_GREAT_GREAT_GRANDCHILDREN)||draw()>=.4) continue;
   const sex=draw()<.512?'M':'F';
   const baby={id:`later-${generation}-${life.seed}-${life.year}-${collection.length}`,name:hooks.name(rng,getCountryById(parent.country)!,sex),sex,country:parent.country,age:0,birthYear:life.year,alive:true,deathAge:null};
   if(generation===0) great.push({...baby,grandchildId:parent.id} as GreatGrandchild);
   else greater.push({...baby,greatGrandchildId:parent.id} as GreatGreatGrandchild);
  }
 }
 for(const generation of [0,1] as const) {
  const count=(generation===0?great:greater).length;
  if(count===bornBefore[generation]) continue;
  const prefix=generation===0?'event.greatGrandchildren':'event.greatGreatGrandchildren';
  emit(`${prefix}${bornBefore[generation]===0?'First':'Born'}`,{count:count-bornBefore[generation],total:count});
  life.stats.happiness+=generation===0?6:5;life.stats.social+=3;
 }
 all.laterRng=rng.rng;
}
