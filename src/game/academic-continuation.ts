import {graduateStudyAccess} from './graduate-study-access';
import {eligibleStudyDestinations} from './study-destinations';
import {prepareOverseasApplication} from './overseas-state';
import {physicalCountry} from './physical-residence';
import {addKnowledge} from './learning-state';
import type {Choice,Decision,Life} from './types';
import {graduateAdmissionProbability} from './school-admissions';
import {educationEraInputs} from './education-era';
export function academicDecisionAge(id:unknown):number|null {
 if(typeof id!=='string')return null;
 const match=/^(?:academicAfterUniversity|academicPhd)-(\d{1,3})$/.exec(id);
 return match&&Number(match[1])<=110?Number(match[1]):null;
}
function doctoralEligible(life:Life):boolean {
 return !!life.academics&&life.academics.qualification>=5&&!life.academics.doctorate&&life.academics.phdStartedAge===undefined&&life.age<=38&&life.stats.employment!=='retired'&&life.justice.prisonUntil===null;
}
/** Persist both accepted and absent invitations; reading a decision never consumes RNG. */
export function preparePostgraduateContinuation(life:Life,draw:()=>number):void {
 const academic=life.academics,degree=academic?.lastGraduation;
 if(!life.alive||!academic||!degree||degree.age!==life.age||academic.enrollment)return;
 if(degree.stage==='graduate'&&academic.phdInvitation?.age!==life.age){
  const offered=doctoralEligible(life)&&draw()<Math.max(.08,Math.min(.6,.15+(life.stats.knowledge-55)/120));
  academic.phdInvitation={age:life.age,offered};
 }
 if((degree.stage==='phd'||degree.stage==='graduate'&&academic.phdInvitation?.offered===false)&&life.stats.employment==='student'){
  life.stats.employment='unemployed';life.stats.job='none';life.stats.annualIncome=0;
 }
}
export function academicContinuationDecision(life:Life):Decision|null {
 const degree=life.academics?.lastGraduation;
 if(!life.alive||life.justice.prisonUntil!==null||!degree||degree.age!==life.age||life.academics!.enrollment)return null;
 if(degree.stage==='graduate'){
  const id=`academicPhd-${life.age}`;
  if(!doctoralEligible(life)||life.academics!.phdInvitation?.age!==life.age||!life.academics!.phdInvitation.offered||life.decisions.includes(id))return null;
  return {id,type:'choice',age:life.age,key:'decision.academicPhd',params:{country:life.country.id},choices:['academicPhdAccept','academicPhdWork'].map(id=>({id,key:`choice.${id}`,params:{}}))};
 }
 const id=`academicAfterUniversity-${life.age}`;
 if(life.academics!.studyGraduation?.age===life.age&&life.academics!.studyGraduation.outcome==='pending'||degree.stage!=='university'||life.academics!.qualification<4||life.academics!.academy?.commissionedAge===life.age||life.decisions.includes(id))return null;
 const working=life.stats.employment==='employed';
 const abroad=graduateStudyAccess(life);
 const options=[...(working?['academicKeep']:[]),'academicWork','academicGraduate',...(abroad?.eligible?['academicGraduateAbroad']:[])];
 return {id,type:'choice',age:life.age,key:'decision.academicAfterUniversity',params:{country:life.country.id,working:working?1:0},choices:options.map((id):Choice=>({id,key:`choice.${id}`,params:id==='academicGraduateAbroad'?{amount:abroad!.cost}:{}}))};
}
export function postgraduateJobDue(life:Life):boolean {
 const degree=life.academics?.lastGraduation;
 return !!degree&&degree.age===life.age&&['graduate','phd'].includes(degree.stage)&&life.alive&&life.justice.prisonUntil===null&&life.stats.employment!=='retired'&&!life.academics!.enrollment&&!(life.academics!.overseasResidence&&life.academics!.studyGraduation?.age===life.age&&life.academics!.studyGraduation.outcome==='pending')&&!academicContinuationDecision(life)&&!life.decisions.includes(`job-${life.age}`);
}
/** Mutates a caller-owned draft; the application draw is consumed only on a valid application. */
export function resolveAcademicContinuation(life:Life,choice:string,draw:()=>number):'enrolled'|'rejected'|'work'|'keep'|'doctoralEnrolled'|'doctoralWork'|'abroad'|null {
 const decision=life.pendingDecision,expected=academicContinuationDecision(life);
 if(!decision||!expected||decision.id!==expected.id||decision.params.country!==life.country.id||!expected.choices.some(c=>c.id===choice))return null;
 if(choice==='academicGraduateAbroad'){
  const access=graduateStudyAccess(life);
  if(!access?.eligible||decision.choices.find(c=>c.id===choice)?.params.amount!==access.cost)return null;
  const destinations=eligibleStudyDestinations({origin:life.migration.birthCountry.id,birthCountry:life.migration.birthCountry.id,year:life.year,muslim:life.stats.religion==='islam'});
  if(destinations.length&&prepareOverseasApplication(life,destinations,{fullScholarship:false,selfFunded:access.selfFunded},draw)){
   life.stats.job='none';life.stats.employment='unemployed';life.stats.annualIncome=0;return 'abroad';
  }
  choice='academicGraduate';
 }
 if(choice==='academicKeep')return 'keep';
 if(choice==='academicPhdAccept'){
  life.academics!.phdStartedAge=life.age;
  life.academics!.enrollment={stage:'phd',completedYears:0,lastSettledAge:life.age-1,paused:false,graduationPending:false};
  life.schooling.enrolled=true;life.schooling.childLabor=false;life.schooling.droppedOut=false;
  life.stats.job='student';life.stats.employment='student';life.stats.annualIncome=0;
  addKnowledge(life,3);return 'doctoralEnrolled';
 }
 if(choice==='academicGraduate'){
  const {statistics}=educationEraInputs(life.country,life.era,life.year);
  if(draw()<graduateAdmissionProbability(statistics.ter,life.stats.knowledge,life.stats.incomeQuintile)){
   life.academics!.enrollment={stage:'graduate',completedYears:0,lastSettledAge:life.age-1,paused:false,graduationPending:false};
   life.academics!.studyCountry=physicalCountry(life);
   life.schooling.enrolled=true;life.schooling.childLabor=false;life.schooling.droppedOut=false;
   life.stats.job='student';life.stats.employment='student';life.stats.annualIncome=0;
   return 'enrolled';
  }
 }
 life.schooling.enrolled=false;life.schooling.childLabor=false;
 life.stats.job='none';life.stats.employment='unemployed';life.stats.annualIncome=0;
 return choice==='academicPhdWork'?'doctoralWork':choice==='academicGraduate'?'rejected':'work';
}
