import type {Life} from './types';
import {educationEraInputs} from './education-era';
/** The reference graduate route has its own access rule, distinct from undergraduate free exit. */
export function graduateStudyAccess(life:Life):{eligible:boolean;routeAvailable:boolean;selfFunded:boolean;cost:number}|null{
 const upper=life.academics?.upperFacts;if(!upper)return null;
 const ppp=educationEraInputs(life.country,life.era,life.year).statistics.ppp;
 const cost=40000/Math.max(.22,Math.min(1.25,.11*Math.sqrt(ppp/1000))),selfFunded=life.stats.incomeQuintile<3;
 const route=!life.migration.moves.length&&!life.academics?.overseasResidence&&!upper.unregisteredBirth&&!['PRK','USA','GBR','CAN','AUS'].includes(life.country.id);
 return {routeAvailable:route,eligible:route&&(!selfFunded||life.stats.savings>=cost),selfFunded,cost};
}
