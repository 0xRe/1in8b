import type {AcademicState} from '../game/school-model';
import type {translator} from './i18n';
/** Historical legacy levels keep their original labels; never infer a new qualification. */
export function qualificationLabel(legacy:number,academic:Pick<AcademicState,'qualification'|'doctorate'>|undefined,t:ReturnType<typeof translator>):string {
 return t(academic?academic.doctorate?'qualification.doctorate':`qualification.${academic.qualification}`:`education${legacy}`);
}
