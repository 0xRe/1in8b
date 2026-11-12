import {activePhysicalCondition} from './physical-activity';
import {physicalEnvironment} from './physical-access';
import type {Life} from './types';
/** Source ndHsK/ndUniK and ddIDk. These are game calibration rules, not individual predictions. */
export function educationTraits(life:Pick<Life,'birthDevelopment'|'developmentObservations'>){
 const birth=life.birthDevelopment;if(!birth)return null;
 const attention=birth.attentionLearning,development=birth.developmental,observed=life.developmentObservations;
 const adhd=!!attention?.adhd,dyslexia=!!attention?.dyslexia;
 const dyslexiaDiagnosed=dyslexia&&observed?.dyslexia?.diagnosed===true;
 return {adhd,dyslexia,dyslexiaDiagnosed,
  unsupportedAutism:development?.kind==='autism'&&!development.intellectualDisability,
  intellectualDisability:!!development&&(development.kind==='intellectual'||development.intellectualDisability),
  upperSecondaryMultiplier:(adhd?.37*(observed?.adhd?.diagnosed||observed?.adultAdhd!==undefined?1:.8):1)*(dyslexia&&!dyslexiaDiagnosed?.5:1),
 };
}
export function educationAccessTraits(life:Pick<Life,'birthDevelopment'|'developmentObservations'> & Partial<Pick<Life,'physicalState'|'age'|'country'|'era'|'year'>>){
 const traits=educationTraits(life);
 const c=life.age!==undefined?activePhysicalCondition(life as Life):null;
 const disclosed=c&&life.country&&life.era&&life.year!==undefined?Math.min(.9,(physicalEnvironment(life as Life).ppp>=30000?.7:physicalEnvironment(life as Life).ppp>=10000?.5:.35)*(c.aid?1.5:1)):undefined;
 return {...(traits?{upperSecondaryMultiplier:traits.upperSecondaryMultiplier,intellectualDisability:traits.intellectualDisability}:{}),...(disclosed!==undefined?{disclosedDisabilityMultiplier:disclosed}:{})};
}
