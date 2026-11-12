/** Source behavior and integration requirements: 2026-10-26-grandchild-guardianship-audit.md. */
export interface GuardianPlayer {age:number;health:number;imprisoned:boolean;residentialCare:boolean}
export interface GuardianChild {id:string;alive:boolean;age:number;otherParent:boolean}
export type GuardianChoice='home'|'kin'|'other';
export interface GuardianFunding {count:number;untilYear:number}
export interface GuardianPlan {
 choice:GuardianChoice;childIds:string[];year:number;
 effects:{happiness:number;social:number;health:number};funding?:GuardianFunding;
}
const minors=(children:readonly GuardianChild[])=>children.filter(c=>c.alive&&c.age<18);
/** Call at an observed death, never to backfill historical deaths during save decoding. */
export function guardianshipNeed(parent:{alive:boolean;married:boolean;cohabited:boolean;divorced:boolean},children:readonly GuardianChild[]):'none'|'decision'|'otherParent' {
 const eligible=minors(children);
 if(parent.alive||!eligible.length)return 'none';
 return parent.married||parent.cohabited||parent.divorced||eligible.every(c=>c.otherParent)?'otherParent':'decision';
}
export function guardianshipChoices(player:GuardianPlayer):GuardianChoice[] {
 return [...(player.age<=78&&player.health>=35&&!player.imprisoned&&!player.residentialCare?['home' as const]:[]),'kin','other'];
}
/** Pure planning: the runtime must separately validate death/queue provenance and commit once. */
export function planGuardianship(choice:GuardianChoice,player:GuardianPlayer,children:readonly GuardianChild[],year:number):GuardianPlan|null {
 const eligible=minors(children);
 if(!eligible.length||!guardianshipChoices(player).includes(choice))return null;
 return {choice,childIds:eligible.map(c=>c.id),year,
  effects:choice==='home'?{happiness:-3,social:3,health:-2}:{happiness:0,social:0,health:0},
  ...(choice==='kin'?{funding:{count:eligible.length,untilYear:year+Math.max(1,18-Math.min(...eligible.map(c=>c.age)))}}:{})};
}
/** Wards are current home placements, not every grandchild whose parent lives at home. */
export function guardianshipExpense(median:number,wards:readonly {alive:boolean;age:number}[],funding:GuardianFunding|undefined,year:number):number {
 const homeCount=wards.filter(c=>c.alive&&c.age<19).length;
 const fundedCount=funding&&year<funding.untilYear?funding.count:0;
 return median*.12*(homeCount+fundedCount*.35);
}
/** Caller removes departed placements; announce persists once across all placements. */
export function guardianDeparture(wards:readonly {id:string;alive:boolean;age:number}[],alreadyAnnounced:boolean) {
 const departed=wards.filter(c=>c.alive&&c.age>=19).map(c=>c.id);
 const announce=departed.length>0&&!alreadyAnnounced;
 return {departed,announce,happiness:announce?3:0};
}
