import type {SchoolStage} from './school-model';
/** null means no dropout draw; zero would still be a scheduled draw. */
export function postgraduateDropoutProbability(stage:SchoolStage,completedYears:number,duration:number,knowledge:number,health:number,persistent:boolean):number|null {
 if(completedYears<1)return null;
 const grit=persistent?.8:1;
 if(stage==='graduate')return (completedYears===1?.17:.072)*(health<40?1.8:1)*grit;
 if(stage==='phd'&&completedYears<duration)return .14*Math.max(.7,Math.min(1.5,70/Math.max(30,knowledge)))*grit;
 return null;
}

/** Cohort completion likelihood is established at admission, not recalculated after migration. */
export function universityDropoutProbability(retention:number|undefined,completedYears:number,duration:number,knowledge:number,persistent:boolean):number|null {
 if(retention===undefined||completedYears<1||completedYears>=duration)return null;
 const knowledgeMultiplier=knowledge>=85?.45:knowledge>=70?.78:knowledge>=50?1.12:1.68;
 return (persistent?.8:1)*(1-Math.max(.01,Math.min(1,retention))**(knowledgeMultiplier/(duration-1)));
}

/** Original academy attrition occurs before graduation and is independent of academic marks. */
export function academyDropoutProbability(completedYears:number,duration:number,persistent:boolean):number|null {
 return completedYears>=1&&completedYears<duration?.045*(persistent?.8:1):null;
}
