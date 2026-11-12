/** Source milRetAge: commissioned rank controls mandatory retirement, independently of pension age. */
export function militaryRetirementAge(commissioned:boolean,rank:0|1|2):number {
 return commissioned?([52,56,60] as const)[rank]:55;
}

export interface MilitaryRetirementContext {
 age:number;rank:0|1|2;commissioned:boolean;working:boolean;retired:boolean;handledAge:number|null;
 income:number;percentile:number;careerIncome:number;careerPercentile:number|null;
}
export interface MilitaryRetirementOffer {age:number;rank:0|1|2;pensionPreview:number;choices:readonly ['retire','other']}
export function militaryRetirementDue(c:MilitaryRetirementContext):boolean {
 return c.working&&!c.retired&&c.handledAge===null&&c.age>=militaryRetirementAge(c.commissioned,c.rank);
}
/** Source excludes soldiers from same-role fixed-term rehire, even where private workers can choose it. */
export function prepareMilitaryRetirement(c:MilitaryRetirementContext,calculatePension:(context:MilitaryRetirementContext)=>number):MilitaryRetirementOffer|null {
 return militaryRetirementDue(c)?{age:c.age,rank:c.rank,pensionPreview:calculatePension(c),choices:['retire','other']}:null;
}
/** Source previews and accepts pensions separately; the caller supplies the full pension calculation. */
export function resolveMilitaryRetirement(c:MilitaryRetirementContext,offer:MilitaryRetirementOffer,choice:string,calculatePension:(context:MilitaryRetirementContext)=>number) {
 if(!militaryRetirementDue(c)||offer.age!==c.age||offer.rank!==c.rank||(choice!=='retire'&&choice!=='other'))return null;
 const career={handledAge:c.age,careerIncome:Math.max(c.careerIncome,c.income),careerPercentile:c.careerPercentile??c.percentile,lastJob:'soldier' as const};
 if(choice==='retire')return {...career,job:'retired' as const,retired:true,income:c.income,pension:calculatePension({...c,...career}),happiness:4,health:3};
 return {...career,job:'none' as const,retired:false,income:0,oldJob:'soldier' as const,seekingYears:0,oldLookAge:c.age,happiness:-2,health:0};
}
