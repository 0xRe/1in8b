import {getCountryById} from './countries';
export interface StudyOnwardContext {studyCountry:string;birthCountry:string;originalName:string;alreadyMigrated:boolean;freeExit:boolean;papersValid:boolean;destinationOpen:(country:string)=>boolean;}
// Reference simulation weights; insertion order is part of stable name-based selection.
const destinations:Readonly<Record<string,Readonly<Record<string,number>>>>={
 GBR:{CAN:3,AUS:3,ARE:2,IRL:1,NZL:1,USA:1},USA:{CAN:4,GBR:1,ARE:1,AUS:1},CAN:{USA:3,AUS:1,GBR:1},
 AUS:{NZL:2,CAN:2,GBR:1,SGP:1,ARE:1},NZL:{AUS:4,CAN:1,GBR:1},IRL:{GBR:3,CAN:1,AUS:1,USA:1},
 DEU:{NLD:2,CHE:2,AUT:1,GBR:1,CAN:1},FRA:{CAN:2,BEL:2,CHE:2,GBR:1},NLD:{DEU:2,BEL:1,GBR:1,CHE:1},
 JPN:{USA:1,AUS:1,SGP:1},KOR:{USA:1,AUS:1,CAN:1},
};
/** Caller supplies birth-country/year eligibility and the stable original name, not a mutable display name. */
export function studyOnwardDestination(c:StudyOnwardContext):string|null{
 const host=getCountryById(c.studyCountry);
 if(!host||host.ppp<30000||c.alreadyMigrated||!c.freeExit||!c.papersValid)return null;
 const candidates=Object.entries(destinations[host.id]??{CAN:1,AUS:1,GBR:1,DEU:1})
  .filter(([country])=>country!==c.birthCountry&&country!==host.id&&getCountryById(country)&&c.destinationOpen(country));
 if(!candidates.length)return null;
 let hash=7;
 for(const character of c.originalName+host.id)hash=(hash*31+character.charCodeAt(0))>>>0;
 let position=hash%candidates.reduce((sum,[,weight])=>sum+weight,0);
 for(const [country,weight] of candidates){position-=weight;if(position<0)return country;}
 return candidates[0][0];
}
