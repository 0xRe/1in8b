import fertility from '../data/pension-fertility-era.json';
import type {Country,Era} from './types';
import {payEraCountry} from './pay-era';
/** Source eraAt inputs needed by pensions; other era demographics are not projected here. */
export function pensionEraCountry(country:Country,era:Era,calendarYear:number):Country {
 if(era==='today')return {...country};
 const series=(fertility as Record<string,number[]>)[country.id];
 if(!series)return {...country};
 const year=Math.max(1950,Math.min(2100,Math.round(calendarYear)));
 const tfr=Math.round(Math.max(.5,Math.min(9,country.tfr*series[year-1950]/Math.max(30,series[2026-1950])))*100)/100;
 return {...payEraCountry(country,era,year),tfr};
}
