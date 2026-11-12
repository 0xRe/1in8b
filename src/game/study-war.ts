import data from '../data/study-war.json';
import {getCountryById} from './countries';
// Historical conflict intensity from the reference simulation; not live travel advice.
const conflicts=data as [string,number,number,number][];
export function studyWarAt(country:string,calendarYear:number):number{
 const current=getCountryById(country);
 if(!current||!Number.isFinite(calendarYear))return Infinity;
 const year=Math.max(1950,Math.min(2100,Math.round(calendarYear)));
 if(year>=2026)return Math.round(current.war*Math.pow(.5,(year-2026)/7)*10)/10;
 let intensity=0;
 for(const [id,start,end,value] of conflicts)if(id===country&&year>=start&&year<=end)intensity=Math.max(intensity,value);
 return intensity;
}
