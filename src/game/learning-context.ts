import type {Life} from './types';
import type {KnowledgeContext} from './focus-knowledge';

import {hobbyDefinition} from './hobby-catalog';
export function learningHobby(id:string):{knowledge:number;social:number} {
 if(id==='nature')return {knowledge:0,social:0};
 const definition=hobbyDefinition(id==='crafts'?'craft':id)??hobbyDefinition('sport')!;
 return {knowledge:definition.knowledge,social:definition.social};
}
/** Completed qualifications never imply active enrollment. */
export function learningContext(life:Life):KnowledgeContext {
 const school=life.academics?.enrollment;
 const available=life.justice.prisonUntil===null;
 const enrolled=available&&(life.academics?!!school&&!school.paused:life.schooling.enrolled);
 const higherEducation=enrolled&&(life.academics
  ? !!school&&['university','graduate','phd'].includes(school.stage)
  : !!life.schooling.university&&life.stats.employment==='student');
 const support=life.learning?.support;
 return {age:life.age,enrolled,higherEducation,
  ged:life.academics?.equivalency ? life.academics.equivalency.examAt!==null : !!support?.ged,adultCourse:!!support?.adultCourse,
  goodTeacher:support?.goodTeacherAge===life.age,
  curious:life.temperament.kind==='curious',health:life.stats.health,
  hobbies:life.hobbies.map(hobby=>learningHobby(hobby.id))};
}
