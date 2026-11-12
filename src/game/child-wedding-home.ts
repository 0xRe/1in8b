import {childPatriarchal,childStayRate} from './child-home';
export type ChildWeddingHomeOutcome='pending'|'stay'|'leave'|'independent';
export interface ChildWeddingHomeReceipt {year:number;outcome:ChildWeddingHomeOutcome;resolvedYear:number|null}
/** Wedding household branch only. Planned departures and return-home decisions are separate. */
export function childWeddingHome(c:{country:string;region:string;sex:'M'|'F';independent:boolean;staying:boolean;parentImprisoned:boolean;childImprisoned:boolean;lastChild:boolean;otherStaying:boolean},random:()=>number):ChildWeddingHomeOutcome {
 if(c.independent)return 'independent';
 if(c.staying)return 'stay';
 if(c.parentImprisoned||c.childImprisoned)return 'pending';
 const patriarchal=childPatriarchal(c.country,c.region);
 const rate=childStayRate(c.country,c.region);
 if(patriarchal){if(c.sex==='F'||c.otherStaying)return 'leave';return random()<rate?'stay':'leave';}
 if(!c.lastChild)return 'leave';
 return random()<rate*(c.region==='hi'?.5:1)?'stay':'leave';
}
