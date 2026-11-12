export interface PensionIncomeContext {
 branch:'service'|'working'|'childwork'|'seekingPension'|'retired'|'inactive';
 earnedIncome:number;militaryPension:number;ordinaryPension:number;retiredPension:number;
 ordinaryEligible:boolean;soldier:boolean;prison:boolean;
}
/** Source finance branch order. Inputs exclude prior pension supplements and local-office pay. */
export function composePensionIncome(c:PensionIncomeContext):number {
 if(c.branch==='service'||c.branch==='childwork')return c.earnedIncome;
 if(c.branch==='working')return c.earnedIncome+(c.ordinaryEligible?c.ordinaryPension:c.soldier?0:c.militaryPension);
 if(c.branch==='seekingPension')return Math.max(c.ordinaryPension,c.militaryPension);
 if(c.branch==='retired')return Math.max(c.retiredPension,c.militaryPension);
 return c.prison?0:c.militaryPension;
}
