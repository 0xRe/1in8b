import type {Country,Era} from './types';
import type {MilitaryPension} from './military-pension';
import {getCountryById} from './countries';
import {payEraCountry} from './pay-era';
export interface PensionIndex {year:number;country?:string;increaseAge?:number}
export function pensionIndexFactor(country:string,year:number,previousPPP:number,currentPPP:number):number {
 const weight=country==='DEU'||country==='NLD'?1:country==='GBR'?(year>=2011?1:0):country==='CHN'?(year<2005?0:year<=2025?.9:.4):0;
 return weight&&previousPPP>0&&currentPPP>0?Math.exp(weight*Math.max(-.15,Math.min(.15,Math.log(currentPPP/previousPPP)))):1;
}
/** Source marks the first observed year without raising or fixing a pension country. */
export function indexMilitaryPension(pension:MilitaryPension,index:PensionIndex|undefined,currentCountry:Country,era:Era,year:number):{value:number;index:PensionIndex|undefined} {
 if(era==='today'||pension.value<=0||index?.year===year)return {value:pension.value,index};
 if(!index)return {value:pension.value,index:{year}};
 const country=getCountryById(index.country??currentCountry.id);
 if(!country)return {value:pension.value,index:{year,...(index.country?{country:index.country}:{})}};
 const factor=pensionIndexFactor(country.id,year,payEraCountry(country,era,year-1).ppp,payEraCountry(country,era,year).ppp);
 return {value:pension.value*factor,index:{...index,year,country:country.id}};
}

export function shouldAnnouncePensionIncrease(age:number,previous:number,current:number,increaseAge:number|undefined):boolean {
 return increaseAge===undefined&&age>=50&&previous>0&&current/previous>1.01;
}
