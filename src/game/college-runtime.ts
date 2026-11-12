import {studyAccess} from './study-access';
import {eligibleStudyDestinations} from './study-destinations';
import {prepareOverseasApplication} from './overseas-state';
import {academyAccess,academyCollegeMenu} from './academy-access-runtime';
import {queueUniversityRetake} from './university-retake-runtime';
import type {Life,Decision} from './types';
import type {CollegeEnvironment} from './college-context';
import {collegeContext} from './college-context';
import {collegeEntryGate} from './college-entry';
import {prepareCollege,commitCollege,commitCollegeAcademy} from './college-state';
import {initializeLegacyLearning} from './learning-state';
/** Observed personal/access facts. Absence must never be silently interpreted as false. */
export type CollegeRuntimeFacts=Pick<CollegeEnvironment,'adhd'|'dyslexia'|'dyslexiaDiagnosed'|'unsupportedAutism'|'politicallyMarkedParent'>&{rohingyaCamp:boolean;rohingyaRakhine:boolean};
export const isCollegeDecision=(id:unknown):boolean=>typeof id==='string'&&/^college-\d{1,3}$/.test(id);
function context(life:Life){
 const a=life.academics,f=a?.collegeFacts,c=a?.circumstances;
 if(!f||!c)return null;
 const job=life.stats.employment==='student'?'student':life.stats.employment==='employed'?'working':life.stats.employment==='unemployed'?'seeking':'other';
 const application=collegeContext(life,{...f,accessModifiers:c.accessModifiers,kind:a.college?.kind??(a.equivalency?.collegePending?'equivalency':'ordinary'),job,retaking:false,vocationalTrack:a.lastGraduation?.stage==='vocational'});
 return application?{...application,year:life.year,historical:life.era!=='today',imprisoned:life.justice.prisonUntil!==null,rohingyaCamp:f.rohingyaCamp,rohingyaRakhine:f.rohingyaRakhine}:null;
}
function seeking(life:Life){life.schooling.enrolled=false;life.schooling.childLabor=false;life.stats.employment='unemployed';life.stats.job='none';life.stats.annualIncome=0;}
/** Ordinary graduation and a consumed equivalency-pass receipt share the admission transaction. */
export function prepareCollegeRuntime(life:Life):string|null {
 const a=life.academics;
 if(a?.circumstances?.developmentalProtection)return null;
 if(!life.alive||!a?.collegeFacts||!a.circumstances||a.college||a.enrollment||a.qualification!==3||life.justice.prisonUntil!==null)return null;
 const equivalency=a.equivalency?.collegePending===true;
 if(!equivalency&&(a.lastGraduation?.age!==life.age||!['upperSecondary','vocational'].includes(a.lastGraduation.stage)))return null;
 life.learning=initializeLegacyLearning(life).learning;
 const c=context(life)!;const result=prepareCollege(a,c,academyCollegeMenu(life,c.kind));if(!result.gate)return null;
 life.academics=result.academic;
 life.stats.happiness+=result.gate.happiness;
 if(result.gate.job==='seeking')seeking(life);
 return result.gate.reason==='allowed'?null:result.gate.reason;
}
export function collegeDecision(life:Life):Decision|null {
 const a=life.academics,r=a?.college,c=context(life),id=`college-${life.age}`;
 if(a?.circumstances?.developmentalProtection)return null;
 if(!life.alive||!r||!c||r.kind!==c.kind||r.status!=='pending'||r.age!==life.age||r.country!==life.country.id||a.enrollment||a.qualification!==3||life.decisions.includes(id)||collegeEntryGate(c).reason!=='allowed')return null;
 return {id,type:'choice',age:life.age,key:'decision.college',params:{country:life.country.id},choices:r.choices.map(choice=>{const id={apply:'collegeApply',work:'collegeWork',army:'collegeArmy',navy:'collegeNavy',air:'collegeAir',abroad:'collegeAbroad'}[choice];return {id,key:choice==='work'&&r.kind==='equivalency'&&c.job==='working'?'choice.collegeKeepWorking':`choice.${id}`,params:{}};})};
}
export function resolveCollegeRuntime(life:Life,choice:string,draw:()=>number):string|null {
 const expected=collegeDecision(life),d=life.pendingDecision,c=context(life);
 if(!expected||!d||!c||d.id!==expected.id||d.params.country!==life.country.id||!expected.choices.some(option=>option.id===choice))return null;
 if(choice==='collegeAbroad'){
  const access=studyAccess(life),menu=academyCollegeMenu(life,c.kind);
  if(!access||!menu.choices.includes('abroad'))return null;
  const destinations=eligibleStudyDestinations({origin:life.migration.birthCountry.id,birthCountry:life.migration.birthCountry.id,year:life.year,muslim:life.stats.religion==='islam'});
  if(destinations.length&&prepareOverseasApplication(life,destinations,{fullScholarship:menu.abroad==='scholarship',selfFunded:!access.familyAbroad},draw)){
   life.academics!.college!.status='abroad';seeking(life);return 'abroad';
  }
  choice='collegeApply';
 }
 const branch=choice==='collegeArmy'?'army':choice==='collegeNavy'?'navy':choice==='collegeAir'?'air':null;
 if(branch){
  const result=commitCollegeAcademy(life.academics!,{...c,knowledge:life.stats.knowledge,health:life.stats.health},branch,academyAccess(life),draw);
  if(!result.effects)return null;
  life.academics=result.academic;const effects=result.effects.domestic;
  life.stats.health+=result.effects.health;life.stats.happiness+=effects.happiness;
  if(effects.status==='enrolled'){life.schooling.enrolled=true;life.schooling.droppedOut=false;life.schooling.childLabor=false;life.stats.job='student';life.stats.employment='student';life.stats.annualIncome=0;}
  else if(effects.job==='seeking')seeking(life);
  if(effects.retakeEligible)queueUniversityRetake(life,c.kind);
  return result.effects.academy?'academyEnrolled':result.effects.fallback?(effects.status==='enrolled'?'academyFallbackEnrolled':'academyFallbackRejected'):'academyRejected';
 }
 const result=commitCollege(life.academics!,c,choice==='collegeApply'?'apply':'work',draw);
 if(!result.effects)return null;
 life.academics=result.academic;const effects=result.effects;life.stats.happiness+=effects.happiness;
 if(effects.status==='enrolled'){
  life.schooling.enrolled=true;life.schooling.droppedOut=false;life.schooling.childLabor=false;
  if(effects.job==='student'){life.stats.employment='student';life.stats.job='student';life.stats.annualIncome=0;}
 }else if(effects.job==='seeking')seeking(life);
 if(effects.retakeEligible)queueUniversityRetake(life,c.kind);
 return effects.status;
}
