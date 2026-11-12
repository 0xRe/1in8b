import type {Life} from './types';
/** Temporary study changes physical proximity without changing permanent migration records. */
export function physicalCountry(life:Life):string {
 return life.academics?.overseasResidence?.country??life.country.id;
}
