import{activePhysicalCondition}from'./physical-activity';
import {studyAccess} from './study-access';
import type {Life} from './types';
import {academyEligible} from './college-academy';
import {collegeMenu} from './college-menu';
/** Birth-generator facts, retained rather than reconstructed from a legacy save. */
export interface AcademyAccessFacts {disability:null|'hear'|'other';papersValid:boolean;criminalRecord:boolean;idol:boolean}
export function academyAccess(life:Life):boolean {
 const facts=life.academics?.academyAccess,upper=life.academics?.upperFacts;
 if(!facts||!upper||life.justice.prisonUntil!==null)return false;
 const body=activePhysicalCondition(life);
 const disability=facts.disability==='other'||body&&body.kind!=='hearing'?'other':body?'hear':facts.disability;
 return academyEligible({country:life.country.id,birthCountry:life.migration.birthCountry.id,age:life.age,year:life.year,historical:life.era!=='today',sex:life.sex,knowledge:life.stats.knowledge,health:life.stats.health,
  disability,immigrated:life.migration.moves.length>0,refugee:upper.refugee,papersValid:facts.papersValid&&!upper.irregular&&!upper.unregisteredBirth,married:life.family.married,idol:facts.idol,criminalRecord:facts.criminalRecord,religiousBelief:life.stats.religion!=='none'});
}
export function academyCollegeMenu(life:Life,kind:'ordinary'|'equivalency'|'reopened'){
 const study=studyAccess(life);
 return collegeMenu({country:life.country.id,kind,working:life.stats.employment==='employed',domesticFallback:false,
  freeExit:!!study?.freeExit&&!life.migration.moves.length&&!life.academics?.overseasResidence,papersValid:!!study?.papersValid,familyAbroad:!!study?.familyAbroad,recentlyFled:!!study?.recentlyFled,money:life.stats.savings,abroadCost:study?.abroadCost??Infinity,
  academyEligible:academyAccess(life),japaneseDefenseAcademy:life.country.id==='JPN'&&!(life.era!=='today'&&life.year<1953)});
}
