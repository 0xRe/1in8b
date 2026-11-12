import type {Life} from './types';
import {getCountries} from './countries';
import {incomeAtPercentile} from './income-distribution';
import {educationEraInputs} from './education-era';
import {childImprisoned} from './child-prison';
import {normalizeFocusTime} from './focus-effects';
import {canRequestChildHelp,childHelpBond,requestChildHelp} from './child-help';
const countries=new Map(getCountries().map(c=>[c.id,c]));
function context(life:Life){
 const country={...life.country,...educationEraInputs(life.country,life.era,life.year).statistics};
 const ages=life.decisions.flatMap(id=>{const m=/^activity-askKids-(\d{1,3})$/.exec(id);return m?[Number(m[1])]:[];});
 const parent={age:life.age,imprisoned:life.justice.prisonUntil!==null,separated:false,
  median:incomeAtPercentile(country,.5),incomeFloor:incomeAtPercentile(country,.3),
  cash:life.stats.savings-life.stats.debt,investments:life.stats.investments,housing:life.belongings.housingValue,
  rentalIncome:0,business:0,income:life.stats.annualIncome,lastAge:ages.length?Math.max(...ages):null};
 const ledger=life.timeline?.stageFocusTime;
 const familyWeight=ledger&&Object.values(ledger).some(t=>(t??0)>0)?normalizeFocusTime(ledger).family??0:
  life.stageFocus?(life.stageFocus.selection.current==='family'?1:0):life.focus==='relationships'?1:0;
 const children=life.family.children.map(child=>{
  const state=life.descendants.children.find(s=>s.childId===child.id),abroad=child.country!==life.country.id;
  const job=state?.retirement?.job??child.job;
  return {id:child.id,alive:child.alive,age:child.age,
   blocked:state?.employment==='student'||state?.employment==='unemployed'||childImprisoned(child.alive,state?.prison,life.year),placed:false,
   median:incomeAtPercentile(abroad?countries.get(child.country)!:country,.5),
   bond:childHelpBond({name:child.name,identityName:life.name,age:child.age,social:life.stats.social,familyWeight,bond:state?.bond??0,
    temporaryBond:0,shame:0,abroad,withParent:false,returned:false,estranged:false}),
   gives:state?.universityFunding?.result?.outcome==='funded',away:false,abroad,
   degreeJob:['teacher','nurse','engineer'].includes(job),agriculture:job==='farmer'};
 });
 return {parent,children};
}
export function canAskChildren(life:Life):boolean {
 if(!life.alive||life.pendingDecision)return false;
 const {parent,children}=context(life);return canRequestChildHelp(parent,children);
}
export function settleRequestedChildHelp(life:Life,random:()=>number){
 if(!canAskChildren(life))return null;
 const {parent,children}=context(life),result=requestChildHelp(parent,children,random);
 const amount=Math.round(result.amount*100)/100,repayment=Math.min(amount,life.stats.debt);
 life.stats.debt-=repayment;life.stats.savings+=amount-repayment;
 life.stats.happiness+=result.happiness;life.stats.social+=result.social;
 life.decisions.push(`activity-askKids-${life.age}`);
 return {...result,amount};
}
