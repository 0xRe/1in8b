import type {Life} from './types';
/** Snapshot identities only. Their jobs, ages and countries continue evolving normally. */
export function studyWaitingFamily(life:Life):{partnerId:string;childIds:string[]}|undefined {
 const partner=life.family.partner;
 if(!life.family.married||!partner?.alive||partner.country!==life.country.id)return undefined;
 return {partnerId:partner.id,childIds:life.family.children.filter(child=>child.alive&&child.age<18&&child.country===life.country.id&&life.descendants.children.some(state=>state.childId===child.id&&state.residence==='home')).map(child=>child.id)};
}
/** Called by an explicit return/failed-settlement route after study ends, never while enrolled. */
export function returnFromOverseasStudy(life:Life):boolean{
 const academic=life.academics,residence=academic?.overseasResidence;
 if(!life.alive||!academic||!residence||academic.enrollment||life.country.id!==residence.homeCountry)return false;
 delete academic.overseasResidence;
 life.residence='urban';life.schooling.enrolled=false;life.schooling.childLabor=false;
 if(life.stats.employment==='student'){life.stats.employment='unemployed';life.stats.job='none';life.stats.annualIncome=0;}
 return true;
}
