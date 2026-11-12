import {prepareMilitaryRetirement,resolveMilitaryRetirement,militaryRetirementDue,type MilitaryRetirementContext,type MilitaryRetirementOffer} from './military-retirement';
type Outcome=NonNullable<ReturnType<typeof resolveMilitaryRetirement>>;
export type MilitaryRetirementRecord=
 | {status:'offered';offer:MilitaryRetirementOffer;outcome?:never;choice?:never}
 | {status:'resolved';offer:MilitaryRetirementOffer;choice:'retire'|'other';outcome:Outcome};
type Calculate=(context:MilitaryRetirementContext)=>number;
export function prepareMilitaryRetirementRecord(previous:MilitaryRetirementRecord|undefined,context:MilitaryRetirementContext,calculate:Calculate):MilitaryRetirementRecord|undefined {
 if(previous?.status==='resolved')return previous;
 if(!militaryRetirementDue(context))return undefined;
 if(previous?.offer.age===context.age&&previous.offer.rank===context.rank)return previous;
 const offer=prepareMilitaryRetirement(context,calculate);
 return offer?{status:'offered',offer}:undefined;
}
export function commitMilitaryRetirementRecord(record:MilitaryRetirementRecord,context:MilitaryRetirementContext,choice:string,calculate:Calculate):MilitaryRetirementRecord|null {
 if(record.status!=='offered'||(choice!=='retire'&&choice!=='other'))return null;
 const outcome=resolveMilitaryRetirement(context,record.offer,choice,calculate);
 return outcome?{status:'resolved',offer:record.offer,choice,outcome}:null;
}
