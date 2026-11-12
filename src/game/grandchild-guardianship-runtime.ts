import type {Decision,Life} from './types';
import {guardianshipNeed,guardianshipChoices,planGuardianship,guardianshipExpense,guardianDeparture,type GuardianChoice} from './grandchild-guardianship';
import {incomeAtPercentile} from './income-distribution';
import {educationEraInputs} from './education-era';
export interface GuardianReceipt {parentId:string;observedYear:number;year:number;choice:GuardianChoice;childIds:string[];health:number;untilYear?:number}
export interface GuardianshipState {version:1;pending:{parentId:string;year:number}|null;records:GuardianReceipt[];departed:string[];departureAnnounced:boolean}
const player=(life:Life)=>({age:life.age,health:life.stats.health,imprisoned:life.justice.prisonUntil!==null,residentialCare:false});
const minors=(life:Life,id:string)=>life.descendants.grandchildren.filter(g=>g.parentId===id&&g.alive&&g.age<18);
const children=(life:Life,id:string)=>minors(life,id).map(g=>({id:g.id,age:g.age,alive:g.alive,otherParent:g.origin?.household==='otherParent'}));
const state=(life:Life)=>life.descendants.guardianship??={version:1,pending:null,records:[],departed:[],departureAnnounced:false};
export const guardianDecisionId=(parentId:string)=>`guardian-${parentId}`;
function lossNeed(life:Life,parentId:string):'none'|'decision'|'otherParent' {
 const parent=life.family.children.find(c=>c.id===parentId),progress=life.descendants.children.find(s=>s.childId===parentId);
 if(!parent||!progress||life.descendants.guardianship?.records.some(r=>r.parentId===parentId))return 'none';
 return guardianshipNeed({alive:parent.alive,married:progress.marriedYear!==null,cohabited:progress.unionPlan?.cohabitationYear!=null,divorced:false},children(life,parentId));
}
export function observeGuardianLoss(life:Life,parentId:string):'none'|'decision'|'otherParent' {
 const need=lossNeed(life,parentId);
 if(need==='decision')state(life).pending={parentId,year:life.year};
 return need;
}
function pendingFamily(life:Life){
 const pending=life.descendants.guardianship?.pending;
 if(!life.alive||!pending||life.decisions.includes(guardianDecisionId(pending.parentId)))return null;
 const parent=life.family.children.find(c=>c.id===pending.parentId);
 if(!parent||lossNeed(life,parent.id)!=='decision')return null;
 return {pending,parent};
}
const choiceMap={guardianHome:'home',guardianKin:'kin',guardianOther:'other'} as const;
export function guardianDecision(life:Life):Decision|null {
 const family=pendingFamily(life);if(!family)return null;
 const options=guardianshipChoices(player(life)),count=minors(life,family.parent.id).length;
 const annual=median(life)*.12*count;
 return {id:guardianDecisionId(family.parent.id),type:'choice',age:life.age,key:count===1?'decision.guardianOne':'decision.guardian',params:{name:family.parent.name,count},
  choices:Object.entries(choiceMap).filter(([,choice])=>options.includes(choice)).map(([id,choice])=>({id,key:`choice.${id}`,params:{amount:choice==='home'?annual:choice==='kin'?annual*.35:0}}))};
}
export function resolveGuardianDecision(life:Life,choiceId:string):boolean {
 const family=pendingFamily(life),choice=choiceMap[choiceId as keyof typeof choiceMap];
 if(!family||!choice||life.pendingDecision?.id!==guardianDecisionId(family.parent.id))return false;
 const plan=planGuardianship(choice,player(life),children(life,family.parent.id),life.year);if(!plan)return false;
 const data=state(life);
 data.records.push({parentId:family.parent.id,observedYear:family.pending.year,year:life.year,choice,childIds:plan.childIds,health:life.stats.health,...(plan.funding?{untilYear:plan.funding.untilYear}:{})});
 for(const key of ['happiness','social','health'] as const)life.stats[key]+=plan.effects[key];
 life.decisions.push(guardianDecisionId(family.parent.id));data.pending=null;life.pendingDecision=null;return true;
}
export function guardianHome(life:Life,childId:string):boolean {
 const data=life.descendants.guardianship,g=life.descendants.grandchildren.find(c=>c.id===childId);
 return !!(g?.alive&&data&&!data.departed.includes(childId)&&data.records.some(r=>r.choice==='home'&&r.childIds.includes(childId)));
}
/** Active care is separate from the child's parent-country/lineage record. */
export function guardianArrangement(life:Life,childId:string):GuardianChoice|null {
 return life.descendants.guardianship?.records.find(r=>r.childIds.includes(childId))?.choice??null;
}
function median(life:Life){return incomeAtPercentile({...life.country,...educationEraInputs(life.country,life.era,life.year).statistics},.5);}
export function guardianAnnualCost(life:Life):number {
 const data=life.descendants.guardianship;if(!data)return 0;
 // The reference retains one latest kin commitment, rather than stacking older commitments.
 const kin=data.records.filter(r=>r.choice==='kin').at(-1);
 return guardianshipExpense(median(life),life.descendants.grandchildren.filter(g=>guardianHome(life,g.id)),kin?{count:kin.childIds.length,untilYear:kin.untilYear!}:undefined,life.year);
}
export function guardianYear(life:Life,emit:(key:string)=>void){
 const data=life.descendants.guardianship;if(!data)return;
 if(data.pending&&!pendingFamily(life))data.pending=null;
 const result=guardianDeparture(life.descendants.grandchildren.filter(g=>guardianHome(life,g.id)),data.departureAnnounced);
 for(const id of result.departed){data.departed.push(id);life.descendants.grandchildren.find(g=>g.id===id)!.residence='independent';}
 if(result.announce){data.departureAnnounced=true;life.stats.happiness+=result.happiness;emit('event.guardianDeparture');}
}
