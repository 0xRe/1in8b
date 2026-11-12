import {educationAccessTraits,educationTraits} from './education-traits';
import type {Life} from './types';
import type {DomesticCollegeContext} from './college-domestic';
import type {UpperSecondaryEnvironment} from './upper-secondary-context';
import {educationAccess} from './education-access';
import {educationEraInputs} from './education-era';
import {learningZ} from './learning-state';
export interface CollegeEnvironment {
 kind:DomesticCollegeContext['kind'];job:DomesticCollegeContext['job'];retaking:boolean;vocationalTrack:boolean;
 accessModifiers:UpperSecondaryEnvironment['accessModifiers'];
 adhd:boolean;dyslexia:boolean;dyslexiaDiagnosed:boolean;unsupportedAutism:boolean;
 /** Original parental political assessment fact; never inferred from ordinary employment. */
 politicallyMarkedParent:boolean;
}
/** Read-only application inputs. Eligibility/closure guards must run before resolving an application. */
export function collegeContext(life:Life,facts:CollegeEnvironment):DomesticCollegeContext|null {
 if(!life.learning)return null;
 const traits=educationTraits(life);
 const learning=traits??facts;
 const birth=life.migration.birthCountry,era=educationEraInputs(birth,life.era,life.year);
 const access=educationAccess({...birth,...era.statistics},{...facts.accessModifiers,...educationAccessTraits(life),sex:life.sex,quintile:life.stats.incomeQuintile,urban:life.residence==='urban',...era.access});
 return {
  kind:facts.kind,job:facts.job,retaking:facts.retaking,vocationalTrack:facts.vocationalTrack,
  country:life.country.id,birthCountry:birth.id,age:life.age,conditionalTertiary:access.transitions[3],knowledgeZ:learningZ(life.learning,life.age),
  eraMultiplier:life.era!=='today'&&life.year<1990&&['CZE','SVK'].includes(life.country.id)&&facts.politicallyMarkedParent?.35:1,
  neurodevelopmentMultiplier:(learning.adhd?.76:1)*(learning.dyslexia?.4*(learning.dyslexiaDiagnosed?1:.93):1),
  unsupportedAutism:learning.unsupportedAutism,
 };
}
