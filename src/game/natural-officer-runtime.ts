import type {Life} from './types';
import {militaryRetirementAge} from './military-retirement';
/** Commission is an observed event; importing a previously commissioned life never calls this. */
export function initializeNaturalOfficerCareer(life:Life):void {
 const a=life.academics,e=a?.academy?.employment;
 if(a?.origin!=='birth'||!e||a.academy!.commissionedAge!==life.age||e.career)return;
 e.career={rank:0,jobYears:0,experienceYears:0,formalYears:0,lastSettledAge:life.age-1};
 // Conscription is not active in the resident-household generator's academy route.
 e.pensionService={age:life.age,remaining:0};
 // Do not turn earlier work of unknown formality into invented pension credit.
 const priorWork=life.history.some(row=>row.age<life.age&&row.annual?.employment==='employed'&&row.annual.job!=='childwork');
 if(!priorWork)e.retirementFacts={age:life.age,formalYears:0,civilYears:0,careerIncome:life.stats.annualIncome,careerPercentile:e.percentile};
}
/** Fresh planning inputs for the ordinary resident officer path, not legacy backfill. */
export function prepareNaturalOfficerYear(life:Life):void {
 const a=life.academics,e=a?.academy?.employment,c=e?.career;
 if(a?.origin!=='birth'||!c||life.stats.job!=='soldier'||life.stats.employment!=='employed'||life.justice.prisonUntil!==null)return;
 if(life.migration.moves.length)return; // Foreign-service experience deduction is not yet observed.
 c.promotionFacts={age:life.age,migrationExperienceLoss:0,inOffice:false,nomad:false,mandatoryRetirement:life.age>=militaryRetirementAge(true,c.rank)};
}
/** Use only time that was actually played; no whole-year credit for a selected label. */
export function observeNaturalOfficerFinance(life:Life):void {
 const a=life.academics,e=a?.academy?.employment,c=e?.career,f=a?.commissionFacts,t=life.timeline;
 if(a?.origin!=='birth'||!e||!c||!f||!t?.complete||!t.stageFocusTime||c.lastSettledAge>=life.age||life.stats.job!=='soldier'||life.stats.employment!=='employed'||life.justice.prisonUntil!==null||life.care.who==='self'||life.training.kind)return;
 const ledger=t.stageFocusTime,total=Object.values(ledger).reduce((sum,n)=>sum+n,0);
 const share=(key:'work'|'learn'|'family')=>total>0?(ledger[key]??0)/total:0;
 const previous=e.annualFacts;
 e.annualFacts={age:life.age,country:life.country.id,workShare:share('work'),learnShare:share('learn'),familyShare:share('family'),effortUsed:previous?.effortUsed??0,
  migrationPenalty:previous?.migrationPenalty??f.migrationPenalty,migrated:life.migration.moves.length>0,
  raisedThisYear:c.promotion?.status==='resolved'&&c.promotion.age===life.age&&c.rank>c.promotion.rank,
  apprentice:false,rehired:false,reducedHours:f.reducedHours,reducedWork:f.reducedWork,eraIncomeFactor:1,frontPayPercentile:null};
}
