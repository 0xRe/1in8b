import type {Country,Era} from './types';
import {educationEraInputs,eraPurchasingPower} from './education-era';
/** Salary-relevant projection only; does not imply historical mortality, politics or full economy parity. */
export function payEraCountry(country:Country,era:Era,calendarYear:number):Country {
 if(era==='today')return {...country};
 const ppp=eraPurchasingPower(country,era,calendarYear),education=educationEraInputs(country,era,calendarYear).statistics;
 const fit=(income:number)=>80/(1+Math.exp(Math.log(Math.max(200,income))-8.5));
 const agr=Math.round(Math.max(.5,Math.min(90,country.agr+fit(ppp)-fit(country.ppp))));
 return {...country,...education,agr};
}
