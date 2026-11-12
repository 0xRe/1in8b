import { getCountries, countryProbability } from '../game/countries';
import type { WeightMode } from '../game/types';

export const BIRTH_PREVIEW_TIMES=Array.from({length:25},(_,i)=>Math.round(3200*(i/24)**1.7));
const countries=getCountries();
/** Visual previews use a separate random sample; the actual life is drawn only on selection. */
export function previewCountry(mode:WeightMode,sample:number) {
 let remaining=Math.max(0,Math.min(.999999999,Number.isFinite(sample)?sample:0));
 for(const country of countries){remaining-=countryProbability(country,mode);if(remaining<0)return country;}
 return countries.at(-1)!;
}
export function createBirthTicket<T>(select:()=>T) {
 let selected=false,result:T;
 return {select(){if(!selected){result=select();selected=true;}return result;}};
}
