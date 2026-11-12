import type {Life} from './types';

/** Recover only the old engine's observable uninterrupted university enrollment. */
export function recoverUniversityProgress(life:Life):void {
 if(life.schooling.university||!life.alive||!life.schooling.enrolled||life.stats.employment!=='student'||life.stats.education!==4)return;
 const admissions=life.events.filter(event=>event.key==='event.university');
 if(admissions.length!==1)return;
 const startedAge=admissions[0].age;
 const completedYears=life.age-startedAge;
 if(completedYears<0||completedYears>=4||life.events.some(event=>event.key==='event.degree'&&event.age>=startedAge))return;
 const before=life.history.find(row=>row.age===startedAge-1)?.annual;
 if(!before||before.education>=4)return;
 const rows=life.history.filter(row=>row.age>=startedAge);
 if(rows.length!==completedYears+1||rows.some(row=>!row.annual||row.annual.employment!=='student'))return;
 life.schooling.university={startedAge,completedYears,lastProgressAge:life.age};
 life.stats.education=before.education;
}
