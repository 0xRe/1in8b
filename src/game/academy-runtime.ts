import {initializeNaturalOfficerCareer} from './natural-officer-runtime';
import type {Life} from './types';
import {commissionAcademy} from './academy-commission';
import {officerEntryIncome,officerPayCalibration,type OfficerPayModifiers} from './officer-pay';
import {payEraCountry} from './pay-era';
import {incomeAtPercentile} from './income-distribution';
export interface CommissionFacts extends OfficerPayModifiers {familyCanHelp:boolean;rohingyaCamp:boolean;partyToJoin:string|null}
/** Caller owns the draft. Explicit source facts prevent legacy family/political guesses. */
export function commissionAcademyRuntime(life:Life):{gift:number;party:string|null}|null {
 const academic=life.academics,facts=academic?.commissionFacts;
 if(academic?.origin==='birth'&&academic.academy&&academic.academy.commissionedAge===undefined&&facts)facts.familyCanHelp=life.family.parents.some(parent=>parent.alive);
 if(!life.alive||life.justice.prisonUntil!==null||!academic||!facts)return null;
 const current=payEraCountry(life.country,life.era,life.year);
 const result=commissionAcademy(academic,life.age,life.country.id,officerPayCalibration(current,life.country,life.era!=='today'));
 if(!result.effect)return null;
 life.academics=result.academic;
 life.academics.academy!.employment={formal:true,percentile:result.effect.percentile,party:life.country.id==='CHN'?facts.partyToJoin:null};
 life.stats.education=Math.max(4,life.stats.education);life.stats.job='soldier';life.stats.employment='employed';
 life.stats.annualIncome=officerEntryIncome(current,life.country,life.year,life.era!=='today',facts);
 life.schooling.enrolled=false;life.schooling.droppedOut=false;life.schooling.childLabor=false;
 const gift=life.stats.savings-life.stats.debt===0&&life.age<30&&life.stats.incomeQuintile>=2&&facts.familyCanHelp&&!facts.rohingyaCamp
  ?incomeAtPercentile(current,life.stats.incomeQuintile/5-.1)*.15*(life.stats.incomeQuintile-1):0;
 life.stats.savings+=gift;
 initializeNaturalOfficerCareer(life);
 return {gift,party:life.academics.academy!.employment!.party};
}
