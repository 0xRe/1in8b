import {childCarePlanYear} from './child-care-plan';
import {childTravelPractice} from './child-travel-practice';
import {childSchoolSupport} from './child-school-support';
import type {BirthDevelopment} from './birth-development';
import type {Life} from './types';
import {educationEraInputs} from './education-era';
export interface ChildDevelopmentObservation {version:1;age:number;diagnosed:boolean;earlyTherapy:boolean}
interface Input {
 age:number;alive:boolean;away:boolean;trait:NonNullable<BirthDevelopment['developmental']>;
 access:{country:string;region:string;ppp:number;urban:boolean;year:number};
}
/** First child developmental recognition. Subsequent school and caregiver branches are separate. */
export function observeChildDevelopment(prior:ChildDevelopmentObservation|undefined,input:Input):{record:ChildDevelopmentObservation;events:string[]}|null {
 const {age,trait,access}=input;
 if(prior||!input.alive||input.away||age<trait.noticedAt)return null;
 const diagnosed=(access.ppp>=10000||access.urban&&access.ppp>=4000)&&!(trait.kind==='autism'&&access.year<(access.region==='hi'?1980:2000));
 const late=trait.kind==='autism'&&!trait.intellectualDisability&&!trait.learningDifficulty&&age>=18;
 const earlyTherapy=!late&&trait.kind==='autism'&&diagnosed&&trait.learningDifficulty&&age<10&&access.ppp>=15000&&['hi','eca'].includes(access.region);
 const record:ChildDevelopmentObservation={version:1,age,diagnosed,earlyTherapy};
 if(late)return {record,events:diagnosed?['adultAutismDiagnosed']:[]};
 const events=[diagnosed?(trait.kind==='autism'?'autismDiagnosed':'intellectualDiagnosed'):'unrecognized'];
 if(earlyTherapy)events.push('earlyTherapy');
 return {record,events};
}
export function childDevelopmentYear(life:Life,emit:(key:string,name:string,extra?:import("./types").EventParams)=>void,draw:()=>number):void {
 const access={country:life.country.id,region:life.country.region,ppp:educationEraInputs(life.country,life.era,life.year).statistics.ppp,urban:life.residence==='urban',year:life.year};
 for(const child of life.family.children){
  const progress=life.descendants.children.find(s=>s.childId===child.id),trait=progress?.birthDevelopment?.developmental;
  if(!progress||!trait)continue;
  // Explicit custody/placement separation is still absent; independent residence is not source away.
  const result=observeChildDevelopment(progress.developmentObservation,{age:child.age,alive:child.alive,away:false,trait,access});
  if(result){progress.developmentObservation=result.record;for(const key of result.events)emit(key,child.name);}
  const travel=childTravelPractice(progress.travelPracticeAge,{age:child.age,alive:child.alive,away:false,level:trait.supportLevel},draw);
  if(travel!==null){progress.travelPracticeAge=travel;life.stats.happiness+=1;emit('travelPractice',child.name);}
  const school=childSchoolSupport(progress.schoolSupport,{age:child.age,alive:child.alive,away:false,level:trait.supportLevel,recognized:!!progress.developmentObservation,diagnosed:!!progress.developmentObservation?.diagnosed,ppp:access.ppp,region:access.region,year:access.year},draw);
  if(school){
   progress.schoolSupport=school;
   if(school.kind==='special'){progress.education='specialSchool';progress.employment='student';child.job='student';}
   if(school.kind==='home'){progress.education='outOfSchool';progress.employment='none';child.job='none';}
   emit(`school.${school.kind}`,child.name);
  }
 }
 childCarePlanYear(life,emit,draw);
}
export function validateChildDevelopmentObservation(record:ChildDevelopmentObservation,birth:BirthDevelopment|undefined,maxAge:number):void {
 const fail=()=>{throw Error('Invalid or unsupported life save.');};
 const trait=birth?.developmental;
 if(!record||typeof record!=='object'||Array.isArray(record)||record.version!==1||!trait||!Number.isInteger(record.age)||record.age<trait.noticedAt||record.age>maxAge||typeof record.diagnosed!=='boolean'||typeof record.earlyTherapy!=='boolean')fail();
 if(record.earlyTherapy&&(!record.diagnosed||trait!.kind!=='autism'||!trait!.learningDifficulty||record.age>=10))fail();
}
