import type {UpperSchoolFacts} from './upper-secondary-runtime';
import type {SecondaryProgress,EquivalencyState} from './upper-secondary-year-state';
import type {UpperSecondaryRecord} from './upper-secondary-state';
import type {SchoolCircumstances} from './lower-secondary-runtime';
import type {LowerSecondaryRecord} from './lower-secondary-state';
import type {PrimarySchoolRecord} from './primary-school-state';
import type {FocusContext} from './focus-model';

export const SCHOOL_STAGES=['primary','lowerSecondary','upperSecondary','vocational','university','graduate','phd'] as const;
export type SchoolStage=typeof SCHOOL_STAGES[number];
export interface AcademicState {
 major?:import('./university-major').UniversityMajor;
 majorRecord?:import('./university-major-runtime').UniversityMajorRecord;
 studyAccess?:import('./study-access').StudyAccessFacts;
 studyGraduation?:import('./study-graduation').StudyGraduationOffer;
 studySettlement?:import('./study-settlement-runtime').StudySettlementRecord;
 overseasApplication?:import('./overseas-state').OverseasApplicationRecord;
 overseasResidence?:import('./overseas-state').OverseasResidence;
 origin?:'birth';
 academyAccess?:import('./academy-access-runtime').AcademyAccessFacts;
 supportedAdult?:import("./supported-adult-runtime").SupportedAdultRecord;
 supportedSchool?:import("./supported-school-runtime").SupportedSchoolRecord;
 primaryFacts?:import("./primary-school-runtime").PrimaryRuntimeFacts;
 collegeFacts?:import("./college-runtime").CollegeRuntimeFacts;
 commissionFacts?:import("./academy-runtime").CommissionFacts;
 academy?:{branch:import('./college-academy').AcademyBranch;startedAge:number;commissionedAge?:number;employment?:{retirementFacts?:import("./military-retirement-runtime").MilitaryRetirementFacts;retiredPension?:number;retirement?:import("./military-retirement-state").MilitaryRetirementRecord;pensionIndex?:import("./pension-index").PensionIndex;pension?:import("./military-pension").MilitaryPension;pensionService?:{age:number;remaining:number};lastMilitaryPay?:{income:number;country:string;age:number};sickOutAge?:number;healthExit?:{age:number;previousJob:'soldier'};formal:true;percentile:number;party:string|null;career?:import("./officer-career").OfficerCareer;annualFacts?:import("./officer-runtime").OfficerAnnualFacts};major:'mil'};
 college?:import("./college-state").CollegeRecord;
 circumstances?:SchoolCircumstances;
 upperFacts?:UpperSchoolFacts;
 secondaryProgress?:SecondaryProgress;
 equivalency?:EquivalencyState;
 upperSecondary?:UpperSecondaryRecord;
 specialistSchool?:{kind:'art'|'sport';hobby:string};
 lowerSecondary?:LowerSecondaryRecord;
 primary?:PrimarySchoolRecord;
 phdStartedAge?:number;
 phdInvitation?:{age:number;offered:boolean};
 lastWithdrawal?:{stage:'primary'|'lowerSecondary'|'upperSecondary'|'vocational'|'university'|'graduate'|'phd';age:number;completedYears:number;country:string};
 lastGraduation?:{stage:SchoolStage;age:number;country:string};
 version:1;qualification:number;doctorate:boolean;medicine:boolean;studyCountry:string|null;enrollment:SchoolState|null;
}
/** Explicit enrollment, distinct from completed qualifications and current employment. */
export interface SchoolState {
 /** Remaining language preparation, separate from degree credits. */
 preparationYears?:0|1;
 retention?:number;
 stage:SchoolStage;completedYears:number;lastSettledAge:number;
 paused:boolean;graduationPending:boolean;
}
const durations:Record<SchoolStage,number>={primary:6,lowerSecondary:3,upperSecondary:3,vocational:3,university:4,graduate:2,phd:5};
const fiveYearMedicine=new Set(['CHN','GBR','IND','PAK','BGD','NPL','LKA']);
/** USA/Canada's four-year undergraduate pre-med precedes a separate medical program. */
export function schoolDuration(stage:SchoolStage,country:string,medicine:boolean,studyCountry?:string):number {
 if(stage!=='university'||!medicine)return durations[stage];
 const location=studyCountry||country;
 return location==='USA'||location==='CAN'?4:fiveYearMedicine.has(location)?5:6;
}
/** One observed enrolled year; elapsed calendar gaps never manufacture study credit. */
export function settleSchoolYear(school:SchoolState,age:number,duration:number):SchoolState {
 if(school.paused||school.graduationPending||age<=school.lastSettledAge)return school;
 if(school.preparationYears===1)return {...school,preparationYears:0,lastSettledAge:age};
 const completedYears=school.completedYears+1;
 return {...school,completedYears,lastSettledAge:age,graduationPending:completedYears>=duration};
}
const qualification:Record<SchoolStage,number>={primary:1,lowerSecondary:2,upperSecondary:3,vocational:3,university:4,graduate:5,phd:0};
/** Caller commits graduation at the following year boundary, before planning new choices. */
export function graduateSchool(school:SchoolState|null,education:number,doctorate:boolean):{
 school:SchoolState|null;education:number;doctorate:boolean;graduated:SchoolStage|null;
} {
 if(!school?.graduationPending)return {school,education,doctorate,graduated:null};
 return {school:null,education:Math.max(education,qualification[school.stage]),doctorate:doctorate||school.stage==='phd',graduated:school.stage};
}
export function schoolFocusStage(school:SchoolState|null):FocusContext['school'] {
 if(!school||school.paused)return null;
 return ['university','graduate','phd'].includes(school.stage)?school.stage as FocusContext['school']:'basic';
}
