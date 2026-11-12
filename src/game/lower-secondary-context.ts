import {educationAccessTraits} from './education-traits';
import type {Life} from './types';
import type {EducationAccessContext} from './education-access';
import {educationAccess} from './education-access';
import {educationEraInputs} from './education-era';
import {learningZ} from './learning-state';
import type {LowerSecondaryContext} from './lower-secondary';
export interface LowerSecondaryEnvironment {
 homeSchool:boolean;learningCentre:boolean;topMarkAge:number|null;returning:boolean;
 /** Current historical conflict level, not an inferred value from birthplace. */
 currentWar:number;
 accessModifiers:Pick<EducationAccessContext,'disclosedDisabilityMultiplier'|'upperSecondaryMultiplier'|'intellectualDisability'|'schoolEthnicityMultiplier'|'universityEthnicityMultiplier'|'wealthBoost'>;
}
/** Read-only: unknown learning state requires explicit initialization by the runtime first. */
export function lowerSecondaryContext(life:Life,environment:LowerSecondaryEnvironment):LowerSecondaryContext|null {
 if(!life.learning)return null;
 const birth=life.migration.birthCountry;
 const era=educationEraInputs(birth,life.era,life.year);
 const access=educationAccess({...birth,...era.statistics},{...environment.accessModifiers,...educationAccessTraits(life),sex:life.sex,quintile:life.stats.incomeQuintile,urban:life.residence==='urban',...era.access});
 return {
  country:life.country.id,birthRegion:birth.region,year:life.year,age:life.age,
  transition:access.transitions[1],banned:access.secondaryBanned,quintile:life.stats.incomeQuintile,
  knowledge:life.stats.knowledge,knowledgeZ:learningZ(life.learning,life.age),
  homeSchool:environment.homeSchool,learningCentre:environment.learningCentre,topMarkAge:environment.topMarkAge,
  returning:environment.returning,war:environment.currentWar,
 };
}
