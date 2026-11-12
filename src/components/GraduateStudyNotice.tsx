import {LockKeyhole} from 'lucide-react';
import {graduateStudyAccess} from '../game/graduate-study-access';
import type {Life} from '../game/types';
import type {translator} from '../lib/i18n';
/** Display-only: unavailable routes never enter numbered choices or automatic play. */
export function GraduateStudyNotice({life,t}:{life:Life;t:ReturnType<typeof translator>}){
 if(!life.pendingDecision?.id.startsWith('academicAfterUniversity-'))return null;
 const access=graduateStudyAccess(life);
 if(!access?.routeAvailable||access.eligible)return null;
 return <div className="study-locked-notice"><LockKeyhole size={18} aria-hidden="true"/><p>{t('study.graduateLocked',{amount:t.money(access.cost)})}</p></div>;
}
