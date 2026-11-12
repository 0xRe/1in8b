import {freeMovementZone} from './free-movement';
/** Source simulation probabilities, not immigration advice or a promise of a visa. */
const hostBase:Readonly<Record<string,number>>={CAN:.85,GBR:.85,AUS:.8,DEU:.8,NZL:.8,IRL:.75,NLD:.7,FIN:.65,SWE:.6,NOR:.6,DNK:.6,AUT:.6,JPN:.55,FRA:.55,BEL:.55,POL:.55,CZE:.55,PRT:.5,ARE:.5,USA:.45,KOR:.45,CHE:.45,ESP:.45,ITA:.45,HUN:.45,SGP:.45,RUS:.4,TUR:.3,MYS:.25,CHN:.15,SAU:.15};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export interface PostStudyProbability {country:string;ppp:number;graduate:boolean;shortageMajor:boolean;thirdCountry:boolean;birthCountry:string;year:number;}
export function postStudyProbability(c:PostStudyProbability):number{
 const base=hostBase[c.country]??(c.ppp<20000?.12:.4),skills=c.shortageMajor?.08:0;
 return c.thirdCountry?(freeMovementZone(c.birthCountry,c.country,c.year)?.85:clamp(base*.35+skills,.08,.4)):clamp(base+skills+(c.graduate?.05:0),.08,.95);
}
export type PostStudyOutcome='home'|'workPermit'|'spousePermit'|'denied';
/** The caller supplies observed spouse-route eligibility; third-country routes never use it. */
export function resolvePostStudy(c:{choice:'home'|'stay'|'third';probability:number;spouseFallbackEligible:boolean},draw:()=>number):PostStudyOutcome{
 if(c.choice==='home')return 'home';
 if(draw()<c.probability)return 'workPermit';
 if(c.choice==='stay'&&c.spouseFallbackEligible&&draw()<.85)return 'spousePermit';
 return 'denied';
}
