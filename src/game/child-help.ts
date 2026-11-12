export interface ChildHelpParent {age:number;imprisoned:boolean;separated:boolean;median:number;incomeFloor:number;cash:number;investments:number;housing:number;rentalIncome:number;business:number;income:number;lastAge:number|null}
export interface HelpChild {id:string;alive:boolean;age:number;blocked:boolean;placed:boolean;median:number;bond:number;gives:boolean;away:boolean;abroad:boolean;degreeJob:boolean;agriculture:boolean}
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const eligible=(child:HelpChild)=>child.alive&&child.age>=22&&!child.blocked&&!child.placed;
export function heavyFamilyDebt(p:ChildHelpParent):boolean {
 if(p.cash>=0)return false;
 const debt=-p.cash-p.investments,income=Math.max(p.income+p.rentalIncome*.7,p.incomeFloor);
 if(debt<income*.25)return false;
 const uncovered=debt-Math.min(debt,p.housing*.8);
 return p.cash+p.investments+p.housing+p.business<0||uncovered>income*1.5||debt>income*6;
}
export function canRequestChildHelp(p:ChildHelpParent,children:readonly HelpChild[]):boolean {
 return p.age>=55&&!p.imprisoned&&!p.separated&&(p.lastAge===null||p.age-p.lastAge>=3)&&children.some(eligible)&&
   (p.cash+p.investments+p.housing+p.business<p.median*4||heavyFamilyDebt(p));
}
/** Outcome calculation only; caller enforces action eligibility and consumes its cooldown. */
export function requestChildHelp(p:ChildHelpParent,children:readonly HelpChild[],random:()=>number) {
 const distressed=p.cash<0||p.income<p.median*.4&&p.cash<p.median*2,wealthy=p.cash>p.median*8;
 const accepted:string[]=[],declined:string[]=[];let amount=0;
 for(const child of children.filter(eligible).slice(0,5)){
  const chance=clamp(.4+child.bond/80+(distressed?.2:0)-(wealthy?.3:0)+(child.gives?.1:0)-(child.away?.2:0),.08,.92);
  if(random()>=chance){declined.push(child.id);continue;}
  amount+=child.median*(child.degreeJob?.1:child.agriculture?.04:.06)*(child.abroad?1.3:1)*(distressed?1.3:1);
  accepted.push(child.id);
 }
 return {amount,accepted,declined,happiness:accepted.length?2:-2,social:accepted.length?1:0};
}
export function childHelpBond(c:{name:string;identityName:string;age:number;social:number;familyWeight:number;bond:number;temporaryBond:number;shame:number;abroad:boolean;withParent:boolean;returned:boolean;estranged:boolean}):number {
 let hash=0;for(const char of c.name+'kid'+c.identityName)hash=(hash*31+char.charCodeAt(0))>>>0;
 const bucket=hash%100;
 return (c.social-61)*.6+(bucket<10?-30:bucket<45?-10:10)+8*c.familyWeight+(c.age<10?20:c.age<19?-4:0)-
   (c.age>=8?10*c.shame:0)+c.bond+Math.min(20,c.temporaryBond)-(c.abroad?6:0)+(c.withParent?8:0)-(c.returned?8:0)-(c.estranged?12:0);
}
