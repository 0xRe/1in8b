import {ADAPTED_HOBBY_IDS} from '../game/physical-hobbies';
import {SOURCE_HOBBY_IDS} from '../game/hobby-catalog';
import { publicCountryName } from '../game/countries';

// Historical saves contain these authored English phrases. Normalize only known
// semantic fields, never names, reflections, free text or the saved object itself.
const jobKeys: Record<string,string> = {
  'as a farmer':'farmer', 'as an artisan':'artisan', 'as a service worker':'service',
  'as a teacher':'teacher', 'as a nurse':'nurse', 'as an engineer':'engineer',
  'as an entrepreneur':'entrepreneur', 'as a mechanic':'mechanic',
  'as a hairdresser':'hairdresser', 'in a new role':'none',
  'in a student role':'student', 'before retirement':'retired',
};
const homeKeys: Record<string,string> = {
  'with you':'family.home', 'with their parent':'family.parentHome',
  independently:'family.independent',
};
export function eventParameter(locale:string,key:string,field:string,value:string|number,catalog:Record<string,string>,fallback:Record<string,string>={}):string|number {
  if(typeof value==='string'&&field==='hobby'&&(key.startsWith('event.hobbyLife.')||key.startsWith('event.hobbyAuto')||key.startsWith('event.hobbyMilestone.')||key.startsWith('event.physical.sportReturn.'))&&(SOURCE_HOBBY_IDS.includes(value as any)||ADAPTED_HOBBY_IDS.includes(value as any)))return catalog[`hobby.${value}`]??fallback[`hobby.${value}`]??value;
  if(typeof value==='string'&&field==='major'&&key.startsWith('event.major.'))return catalog[`major.${value}`]??fallback[`major.${value}`]??value;
  if(locale==='en'||typeof value!=='string')return value;
  if(field==='job'&&['event.descendantJob','event.descendantPromotion'].includes(key)) {
    const job=jobKeys[value];return job ? catalog[`job.${job}`]??value : value;
  }
  if(field==='residence'&&key==='event.descendantHome') {
    const home=homeKeys[value];return home ? catalog[home]??value : value;
  }
  if(field==='country'&&(key.startsWith('event.')||key.startsWith('decision.')))return publicCountryName(value,locale);
  return value;
}
