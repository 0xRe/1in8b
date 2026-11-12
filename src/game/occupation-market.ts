import market from '../data/occupation-market.json';
import {OCCUPATIONS,OCCUPATION_IDS,type OccupationId} from './occupations';
import {occupationEarlyRejection,occupationLateRejection,type OccupationAccessFacts} from './occupation-access';
type Sector='agr'|'ind'|'ser';
const industry:Readonly<Record<string,number>>={eap:.27,eca:.27,mena:.25,hi:.2,lac:.2,sa:.24,ssa:.11};
const availability=market.availability as Partial<Record<OccupationId,number>>;
export const occupationAvailability=(id:OccupationId)=>availability[id]??1;
export const occupationFamily=(id:OccupationId)=>(market.family as Partial<Record<OccupationId,string>>)[id];
/** rawWeights must include the source personal/country factors. This stage adds sector mass only. */
export function normalizeOccupationMarket(f:OccupationAccessFacts,agriculturePercent:number,rawWeights:Partial<Record<OccupationId,number>>):Partial<Record<OccupationId,number>>{
 const industrial=industry[f.region];if(industrial===undefined||!Number.isFinite(agriculturePercent)||agriculturePercent<0||agriculturePercent>100)throw new Error('Invalid employment sector facts');
 const shares:Record<Sector,number>={agr:agriculturePercent/100,ind:industrial,ser:Math.max(.1,1-agriculturePercent/100-industrial)};
 const totals:Record<Sector,number>={agr:0,ind:0,ser:0};
 const early=OCCUPATION_IDS.filter(id=>!occupationEarlyRejection(f,id)&&['agr','ind','ser'].includes(OCCUPATIONS[id].sector));
 // A later legal/retirement exclusion must not redistribute its availability to surviving roles.
 for(const id of early)totals[OCCUPATIONS[id].sector as Sector]+=occupationAvailability(id);
 const weights:Partial<Record<OccupationId,number>>={};
 for(const id of early){
  if(occupationLateRejection(f,id)||rawWeights[id]===undefined)continue;
  const raw=rawWeights[id]!;if(!Number.isFinite(raw)||raw<0)throw new Error('Invalid occupational weight');
  const sector=OCCUPATIONS[id].sector as Sector;
  weights[id]=raw*shares[sector]*market.sectorScale[sector]*10/totals[sector]*(sector==='agr'&&f.education>=4&&f.major!=='agr'?.06:1);
 }
 return weights;
}
