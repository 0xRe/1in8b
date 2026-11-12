import {educationAccessTraits} from './education-traits';
import type {Life} from './types';
import type {EducationAccessContext} from './education-access';
import {educationAccess} from './education-access';
import {educationEraInputs} from './education-era';
import {learningZ} from './learning-state';
import {selectSpecialistSchool,type UpperSecondaryContext} from './upper-secondary';
export interface UpperSecondaryEnvironment {
 homeSchool:boolean;refugeeCamp:boolean;refugee:boolean;irregular:boolean;returning:boolean;
 alreadySpecialist:boolean;
 /** Source-scale hobby facts; legacy skill and last-training age are not equivalent. */
 hobbies:readonly {id:string;since:number;level:number}[];
 accessModifiers:Pick<EducationAccessContext,'disclosedDisabilityMultiplier'|'upperSecondaryMultiplier'|'intellectualDisability'|'schoolEthnicityMultiplier'|'universityEthnicityMultiplier'|'wealthBoost'>;
}
/** Read-only adapter. Missing latent learning must be initialized explicitly by the runtime. */
export function upperSecondaryContext(life:Life,environment:UpperSecondaryEnvironment):UpperSecondaryContext|null {
 if(!life.learning)return null;
 const birth=life.migration.birthCountry,era=educationEraInputs(birth,life.era,life.year);
 const access=educationAccess({...birth,...era.statistics},{...environment.accessModifiers,...educationAccessTraits(life),sex:life.sex,quintile:life.stats.incomeQuintile,urban:life.residence==='urban',...era.access});
 return {
  country:life.country.id,birthCountry:birth.id,year:life.year,age:life.age,transition:access.transitions[2],
  quintile:life.stats.incomeQuintile,knowledgeZ:learningZ(life.learning,life.age),knowledge:life.stats.knowledge,urban:life.residence==='urban',
  homeSchool:environment.homeSchool,refugeeCamp:environment.refugeeCamp,refugee:environment.refugee,irregular:environment.irregular,returning:environment.returning,
  specialist:selectSpecialistSchool(era.statistics.ppp,environment.alreadySpecialist,environment.hobbies),
 };
}
