import type {Life} from './types';
import type {MilitaryRetirementContext} from './military-retirement';
import {getCountries} from './countries';
import {observedPensionHistory,pensionAmountAtYear} from './pension-history';
import {prepareMilitaryRetirementRecord,commitMilitaryRetirementRecord} from './military-retirement-state';
export interface MilitaryRetirementFacts {age:number;formalYears:number;civilYears:number;careerIncome:number;careerPercentile:number|null}
const countries=Object.fromEntries(getCountries().map(country=>[country.id,country]));
function inputs(life:Life,draw:()=>number){
 const academy=life.academics?.academy,e=academy?.employment,c=e?.career,f=e?.retirementFacts;
 if(!life.alive||!e||!c||!f||f.age!==life.age||f.formalYears<c.formalYears||life.justice.prisonUntil!==null||c.experienceYears>=20&&!e.lastMilitaryPay||!observedPensionHistory(life.history,life.age).complete)return null;
 const record=e.retirement;
 const context:MilitaryRetirementContext={age:life.age,rank:c.rank,commissioned:academy.commissionedAge!==undefined,working:life.stats.job==='soldier'&&life.stats.employment==='employed',retired:life.stats.employment==='retired',handledAge:record?.status==='resolved'?record.outcome.handledAge:null,income:life.stats.annualIncome,percentile:e.percentile,careerIncome:f.careerIncome,careerPercentile:f.careerPercentile};
 const calculate=(state:MilitaryRetirementContext)=>pensionAmountAtYear({country:life.country,birthCountry:life.migration.birthCountry.id,year:life.year,formalYears:f.formalYears,civilYears:f.civilYears,income:state.income,careerIncome:state.careerIncome,countries},life.history,life.age,life.era,{years:c.experienceYears,lastIncome:e.lastMilitaryPay?.income??0,lastCountry:e.lastMilitaryPay?.country??null,existing:e.pension??null},draw)!;
 return {e,context,calculate};
}
export function prepareMilitaryRetirementRuntime(life:Life,draw:()=>number):void {
 const input=inputs(life,draw);if(!input)return;
 const record=prepareMilitaryRetirementRecord(input.e.retirement,input.context,input.calculate);
 if(record)input.e.retirement=record;
}
export function resolveMilitaryRetirementRuntime(life:Life,choice:string,draw:()=>number):'retire'|'other'|null {
 const input=inputs(life,draw);if(!input?.e.retirement)return null;
 const record=commitMilitaryRetirementRecord(input.e.retirement,input.context,choice,input.calculate);
 if(!record||record.status!=='resolved')return null;
 const outcome=record.outcome;input.e.retirement=record;
 life.stats.job=outcome.job;life.stats.employment=outcome.retired?'retired':'unemployed';life.stats.annualIncome=outcome.income;
 life.stats.happiness=Math.max(0,Math.min(100,life.stats.happiness+outcome.happiness));life.stats.health=Math.max(0,Math.min(100,life.stats.health+outcome.health));
 if('pension' in outcome)input.e.retiredPension=outcome.pension;
 return record.choice;
}

export const isMilitaryRetirement=(id:unknown)=>typeof id==='string'&&/^militaryRetirement-\d{1,3}$/.test(id);
export function militaryRetirementDecision(life:Life):import('./types').Decision|null {
 const input=inputs(life,()=>{throw Error('Decision rendering must not calculate pension');});
 const record=input?.e.retirement,id=`militaryRetirement-${life.age}`;
 if(!input||!input.context.working||input.context.retired||!record||record.status!=='offered'||record.offer.age!==life.age||record.offer.rank!==input.context.rank||life.decisions.includes(id))return null;
 return {id,type:'choice',age:life.age,key:'decision.militaryRetirement',params:{rank:record.offer.rank,amount:record.offer.pensionPreview/12},choices:['militaryRetire','militaryOther'].map(id=>({id,key:`choice.${id}`,params:{}}))};
}

/** Carry totals only across an actually settled, uninterrupted officer year; never infer missed service. */
export function rollMilitaryRetirementFacts(life:Life):boolean {
 const e=life.academics?.academy?.employment,c=e?.career,f=e?.retirementFacts;
 if(!life.alive||!e||!c||!f||life.stats.job!=='soldier'||life.stats.employment!=='employed'||f.age!==life.age-1||c.lastSettledAge!==f.age||e.lastMilitaryPay?.age!==f.age||f.formalYears<c.formalYears)return false;
 e.retirementFacts={...f,age:life.age};return true;
}
