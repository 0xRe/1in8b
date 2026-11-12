import data from './child-union-data.json';
import type { Sex, Country, ChildUnionPlan } from './types';
import { laterBirthAge, fertilityAt, fertilityTarget } from './descendant-fertility';
/** Reference-game simulation, not a current legal classification. See child-union-rules audit. */
export type UnionAvailability = 'marriage' | 'partnership' | 'neither' | null;
export function unionAvailability(country: string, year: number): UnionAvailability {
 const threshold = (table: Record<string,number>) => table[country];
 if (data.unavailableCountries.includes(country) ||
   threshold(data.availabilityYear) !== undefined && year < threshold(data.availabilityYear)) return null;
 if (threshold(data.marriageYear) !== undefined && year >= threshold(data.marriageYear)) return 'marriage';
 if (threshold(data.civilPartnershipYear) !== undefined && year >= threshold(data.civilPartnershipYear)) return 'partnership';
 return year >= 2000 ? 'neither' : null;
}
export interface ChildOrientation {
 orientation: 'oppositeSex' | 'sameSex' | 'bisexual';
 sameSexPartner: boolean;
}
/** Call only when initializing an observed identity; callers must persist the result. */
export function drawChildOrientation(sex: Sex, availability: UnionAvailability, random:()=>number): ChildOrientation {
 const ordinary:ChildOrientation={orientation:'oppositeSex',sameSexPartner:false};
 if(availability===null) return ordinary;
 const rates={marriage:[.0165,.03,.13],partnership:[.012,.02,.11],neither:[.0063,.01,.07]}[availability];
 if(random()<rates[0]) return {orientation:'sameSex',sameSexPartner:true};
 if(random()<rates[1]*(sex==='F'?1.3:.7)) return {orientation:'bisexual',sameSexPartner:random()<rates[2]};
 return ordinary;
}
export type ParentFormation = 'adoption' | 'donor' | 'surrogacy';
/** Uses the child's residence and calendar year, not the player's fertility-target country. */
const SURROGACY_START:Record<string,number>={USA:1995,CAN:2004,GBR:2010,ISR:2022};
export function canFormSameSexFamily(country:{id:string;ppp:number},year:number,sex:Sex):boolean {
 const availability=unionAvailability(country.id,year);
 return availability==='marriage'||(sex==='F'?availability==='partnership'&&country.ppp>=15000:
  SURROGACY_START[country.id]!==undefined&&year>=SURROGACY_START[country.id]);
}
export function sameSexParentMethod(country:{id:string;ppp:number},year:number,sex:Sex,random:()=>number):ParentFormation|null {
 if(!canFormSameSexFamily(country,year,sex))return null;
 const married=unionAvailability(country.id,year)==='marriage';
 const surrogacy=SURROGACY_START[country.id]!==undefined&&year>=SURROGACY_START[country.id];
 if(sex==='F')return country.ppp>=15000&&(!married||random()<.7)?'donor':'adoption';
 return surrogacy&&(!married||random()<.35)?'surrogacy':'adoption';
}

/** Assign once on adulthood/first observation; existing children are historical facts. */
export function updateChildFertilityTarget(plan:ChildUnionPlan, context:{age:number;existingChildren:number;country:Country;year:number}, random:()=>number):void {
 if(context.age<18||plan.fertilityTarget!==null)return;
 let target=fertilityTarget(context.country,fertilityAt(context.country.tfr,context.year+10),random);
 if(plan.sameSexPartner){
  const availability=unionAvailability(context.country.id,context.year);
  const chance=context.country.ppp>=15000&&(availability==='marriage'||availability==='partnership')?.35:.1;
  target=random()<chance?Math.max(1,Math.round(target*.7)):0;
 }
 plan.fertilityTarget=Math.max(context.existingChildren,target);
}
/** Only records an observed transition; events and household changes belong to the caller. */
export function advanceChildCohabitation(plan:ChildUnionPlan,context:{age:number;year:number;alive:boolean;married:boolean}):boolean {
 if(!context.alive||context.married||plan.cohabitationYear!==null||plan.cohabitationAge===null||
   context.age<plan.cohabitationAge||context.year<plan.observedYear)return false;
 plan.cohabitationYear=context.year;
 return true;
}

export function nonMaritalFactor(country:Country):number {
 if(['JPN','KOR','TWN'].includes(country.id))return .03;
 return ({hi:.4,eca:.25,lac:.7,ssa:.35,eap:.1,mena:.02,sa:.01} as Record<string,number>)[country.region]??.01;
}
/** Caller must save this result once. Legacy lives keep unobserved orientation unknown. */
export function initializeChildUnionPlan(context:{age:number;year:number;sex:Sex;country:Country;weddingAge:number|null;spouseSex:Sex|null;legacy:boolean;marriageBaseline:number},random:()=>number):ChildUnionPlan {
 const base:ChildUnionPlan={version:1,observedYear:context.year,orientation:'unknown',sameSexPartner:context.spouseSex===null?null:context.spouseSex===context.sex,cohabitationAge:null,cohabitationYear:null,fertilityTarget:null};
 if(context.legacy||context.spouseSex!==null)return base;
 const availability=unionAvailability(context.country.id,context.year+Math.max(0,18-context.age));
 Object.assign(base,drawChildOrientation(context.sex,availability,random));
 base.disclosure=drawChildDisclosure(base.orientation,availability,context.age,random);
 const unavailableWedding=base.sameSexPartner&&context.weddingAge!==null&&unionAvailability(context.country.id,context.year+Math.max(0,context.weddingAge-context.age))!=='marriage';
 const chance=unavailableWedding?.6:context.weddingAge===null?Math.max(.03,Math.min(.9,nonMaritalFactor(context.country)*1.5)):0;
 if(chance>0&&random()<chance){
  const baseline=context.marriageBaseline+(context.sex==='M'?.5:0);
  base.cohabitationAge=Math.max(18,Math.round(baseline+(random()+random()-1)*8));
  if(context.age>base.cohabitationAge+1)base.cohabitationYear=context.year;
 }
 return base;
}

/** Audited sex-specific marriage timing; male birth-age offsets are not interchangeable. */
export function childMarriageBaseline(country:Country,sex:Sex,year?:number):number {
 const female=laterBirthAge(country,'F',year);
 if(sex==='F')return female;
 const male:Record<string,number>={NGA:27.7,IND:24.9,BGD:24,KOR:33,JPN:30.5,USA:30.2,SEN:30,GMB:29,GIN:26.5,MLI:24.5,BFA:25,MRT:25.5,CIV:25,CMR:24.5,TCD:24};
 return male[country.id]!==undefined?male[country.id]+female-laterBirthAge(country,'F'):
  female+Math.max(2,Math.min(8,2+(country.tfr-1.5)*1.2))-1.2;
}

/** Optional disclosure is separate from identity and partner selection. */
export function drawChildDisclosure(orientation:ChildUnionPlan['orientation'],availability:UnionAvailability,age:number,random:()=>number):{age:number|null;year:number|null} {
 const none={age:null,year:null};
 if(orientation!=='sameSex'&&orientation!=='bisexual')return none;
 const chance=(availability==='marriage'||availability==='partnership'?.8:.45)*(orientation==='bisexual'?.55:1);
 if(random()>=chance)return none;
 return {age:Math.max(age+1,17+Math.floor(random()*9)),year:null};
}
export function advanceChildDisclosure(plan:{age:number|null;year:number|null},context:{age:number;year:number;alive:boolean}):boolean {
 if(!context.alive||plan.age===null||plan.year!==null||context.age<plan.age)return false;
 plan.year=context.year;return true;
}

/** Source wedAt: absence of a plan enables the separate non-marital family path. */
export function drawChildMarriageAge(country:Country,sex:Sex,year:number|undefined,random:()=>number):number|null {
 const rates:Record<string,number>={hi:.72,eca:.85,lac:.75,mena:.92,sa:.97,ssa:.88,eap:.9};
 if(random()>=(rates[country.region]??.72))return null;
 return Math.max(18,Math.round(childMarriageBaseline(country,sex,year)+(sex==='M'?.5:0)+(random()+random()-1)*8));
}

/** Source kidUniWed timing rule; caller owns the once-only university transition. */
export function universityMarriageAge(weddingAge:number|null,age:number,married:boolean,random:()=>number):number|null {
 if(weddingAge===null||married||weddingAge-age>=5)return weddingAge;
 if(random()<.1)return weddingAge;
 return Math.max(weddingAge,23+Math.floor(random()*5));
}
