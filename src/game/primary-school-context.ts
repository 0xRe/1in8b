import {educationAccessTraits} from './education-traits';
import type {Life} from './types';
import {educationAccess,type EducationAccessContext} from './education-access';
import {educationEraInputs} from './education-era';
import {historicalPrivateSchoolShare,type GermanSchoolHistory} from './school-era';
import type {PrimaryRuntimeContext} from './primary-school-state';
export interface PrimarySchoolEnvironment {
 rich:boolean;refugee:boolean;irregular:boolean;learningCentreOnly:boolean;
 absentParentIds:readonly string[];
 germanHistory?:Omit<GermanSchoolHistory,'currentCountry'>;
 accessModifiers:Pick<EducationAccessContext,'disclosedDisabilityMultiplier'|'upperSecondaryMultiplier'|'intellectualDisability'|'schoolEthnicityMultiplier'|'universityEthnicityMultiplier'|'wealthBoost'>;
}
/** Only the degree-requiring occupations currently represented by Person.job; expand with the job catalog. */
const degreeJobs=new Set(['teacher','nurse','engineer']);
/** Read-only adapter. Special household facts must be supplied explicitly, never inferred from wealth or country. */
export function primarySchoolContext(life:Life,environment:PrimarySchoolEnvironment):PrimaryRuntimeContext {
 const birth=life.migration.birthCountry;
 const era=educationEraInputs(birth,life.era,life.year);
 const access=educationAccess({...birth,...era.statistics},{...environment.accessModifiers,...educationAccessTraits(life),sex:life.sex,quintile:life.stats.incomeQuintile,urban:life.residence==='urban',...era.access});
 const german=environment.germanHistory?{...environment.germanHistory,currentCountry:life.country.id}:undefined;
 return {
  completion:access.transitions[0],region:life.country.region,war:life.country.war,year:life.year,
  quintile:life.stats.incomeQuintile,rich:environment.rich,
  privateShare:historicalPrivateSchoolShare(birth.id,birth.region,life.year,german),
  country:life.country.id,refugee:environment.refugee,irregular:environment.irregular,learningCentreOnly:environment.learningCentreOnly,
  educatedParentPresent:life.family.parents.some(parent=>parent.alive&&!environment.absentParentIds.includes(parent.id)&&degreeJobs.has(parent.job)),
 };
}
