import type {Life} from '../game/types';
import type {translator} from '../lib/i18n';
import {majorChoiceChance} from '../game/university-major-runtime';
export function MajorChoiceDetails({life,choice,t}:{life:Life;choice:string;t:ReturnType<typeof translator>}){
 const chance=majorChoiceChance(life,choice);
 return <small>{t(`major.description.${choice.slice(6)}`)}{chance!==null&&<> · {t(`major.chance.${chance>=.6?'high':chance>=.35?'medium':'low'}`)}</>}</small>;
}
