import {laterBirthAge} from './descendant-fertility';
import {canFormSameSexFamily,nonMaritalFactor,sameSexParentMethod} from './child-union';
import type {Country,GrandchildOrigin,Sex} from './types';
export interface ChildBirthContext {
 age:number;sex:Sex;alive:boolean;university:boolean;existingChildren:number;target:number;
 married:boolean;cohabiting:boolean;sameSexPartner:boolean;
 imprisoned:boolean;cutOff:boolean;separatedStepfamily:boolean;
 playerCountry:Country;residenceCountry:Country;year:number;past:boolean;
}
/** One eligible annual attempt; population capacity and idempotent year tracking belong to the engine. */
export function childBirthOutcome(c:ChildBirthContext,random:()=>number):GrandchildOrigin|null {
 if(!c.alive||c.imprisoned||c.cutOff||c.separatedStepfamily||c.existingChildren>=c.target||c.age<18||c.age>(c.sex==='F'?44:50))return null;
 const femaleBaseline=laterBirthAge(c.playerCountry,'F',c.past?c.year:undefined);
 const minimum=(c.university?Math.max(femaleBaseline+2,25):femaleBaseline)+(c.sex==='M'?3:0);
 if(c.age<minimum||c.sameSexPartner&&!canFormSameSexFamily(c.residenceCountry,c.year,c.sex))return null;
 if(random()>=.4)return null;
 const union=c.married?'married':c.cohabiting?'cohabiting':'solo';
 if(union==='solo'&&random()>=nonMaritalFactor(c.playerCountry)*.1)return null;
 const method=c.sameSexPartner?sameSexParentMethod(c.residenceCountry,c.year,c.sex,random):'natural';
 if(method===null)return null;
 return {method,union,country:c.residenceCountry.id,household:union==='solo'&&c.sex==='M'?'otherParent':'parent'};
}
