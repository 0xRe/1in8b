import {studyWarAt} from './study-war';
import data from '../data/study-destinations.json';
import {getCountryById} from './countries';
import {studyLanguages} from './study-language';
import type {EligibleStudyDestination} from './overseas-state';
export interface StudyDestinationContext {origin:string;birthCountry:string;year:number;muslim:boolean;warAt?:(country:string)=>number;}
const opening:Record<string,number>={CHN:1980,KOR:1995,MYS:2000,ARE:2005,TUR:1992,SGP:1990,KGZ:1995};
// Reference simulation rules only: these tables are not real-world visa guidance.
const restricted={2025:new Set('AFG,MMR,TCD,COG,GNQ,ERI,HTI,IRN,LBY,SOM,SDN,YEM,BDI,CUB,LAO,SLE,TGO,TKM,VEN'.split(',')),2026:new Set('AFG,MMR,BFA,TCD,COG,GNQ,ERI,HTI,IRN,LAO,LBY,MLI,NER,SLE,SOM,SSD,SDN,SYR,YEM,AGO,ATG,BEN,BDI,CIV,CUB,DMA,GAB,GMB,MWI,MRT,NGA,SEN,TZA,TGO,TON,VEN,ZMB,ZWE'.split(','))};
const admission:Record<string,number>={USA:.85,GBR:.9,CAN:.95,AUS:1.05,NZL:1.05,DEU:.85,FRA:.95,NLD:.9,CHE:.75,JPN:.95,KOR:1.05,CHN:1.15,RUS:1.2,TUR:1.15,MYS:1.15,KGZ:1.2,KAZ:1.15};
const scholarship:Record<string,number>={CHN:.3,TUR:.25,RUS:.3,HUN:.2,MAR:.3,EGY:.2,SAU:.4,KOR:.08,JPN:.08,DEU:.06};
export function studyDestinationOpen(c:StudyDestinationContext,destination:string):boolean{
 if(!getCountryById(destination)||destination===c.origin||destination===c.birthCountry||c.origin==='PRK'||destination==='PRK')return false;
 if(c.year<(opening[destination]??0)||destination==='USA'&&c.year>=2025&&restricted[c.year>=2026?2026:2025].has(c.origin))return false;
 if(c.year<1992&&((c.origin==='KOR'&&destination==='CHN')||(c.origin==='CHN'&&destination==='KOR')))return false;
 if(c.year>=2022&&(destination==='UKR'||[c.origin,c.birthCountry].includes('UKR')&&['RUS','BLR'].includes(destination)))return false;
 return (c.warAt?c.warAt(destination):studyWarAt(destination,c.year))<.2;
}
function policy(c:StudyDestinationContext,destination:string):[number,number]{
 if(destination==='USA'&&c.year>=2025)return [c.origin==='IND'?.5:.8,.85];
 if(destination==='CAN'&&c.year>=2024)return [c.year>=2025?.45:.55,.8];
 return [1,1];
}
export function eligibleStudyDestinations(c:StudyDestinationContext):EligibleStudyDestination[]{
 const origin=getCountryById(c.origin),regions=data.regions as Record<string,Record<string,number>>,countries=data.countries as Record<string,Record<string,number>>;
 const region=origin&&origin.region!=='hi'&&studyLanguages(c.origin,3).has('fr')?'fr':origin?.region??'hi';
 const preferred=countries[c.origin]??regions[region]??regions.hi;
 let entries=Object.entries(preferred).filter(([id])=>studyDestinationOpen(c,id));
 const fallback=entries.length===0;
 if(fallback)entries=Object.entries(regions.hi).filter(([id])=>studyDestinationOpen(c,id));
 return entries.map(([country,weight])=>{
  const [weightFactor,policyFactor]=policy(c,country);
  const scholarshipBlocked=country==='CHN'&&c.year<2000||['SAU','EGY'].includes(country)&&!c.muslim||country==='MAR'&&origin?.region!=='ssa';
  return {country,weight:fallback?weight:weight*(['SAU','EGY'].includes(country)&&!c.muslim?.2:1)*weightFactor,admissionFactor:admission[country]??1,policyFactor,scholarshipProbability:scholarshipBlocked?0:scholarship[country]??0};
 });
}
