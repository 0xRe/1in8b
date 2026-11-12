export type ChildSupportedWork = 'dayActivities'|'shelteredWork'|'familyShop'|'familyFarm';
/** Source ddKidJob selection. The caller supplies the child's settled residence, not the parent's. */
export function childSupportedWork(c:{level:number;ppp:number;region:string;urban:boolean},draw:()=>number):ChildSupportedWork|null {
 if(c.level<2)return null;
 if(c.level===3)return 'dayActivities';
 const rich=c.ppp>=15000&&(c.region==='hi'||c.region==='eca');
 if(rich)return draw()<.25?'shelteredWork':'dayActivities';
 return draw()<.27?(c.urban?'familyShop':'familyFarm'):'dayActivities';
}

/** Source kidLife resolves this before choosing a job; callers must retain the result. */
export function childWorkResidence(c:{abroad:boolean;parentUrban:boolean;countryUrban:number;university:boolean},draw:()=>number):boolean {
 if(c.abroad)return true;
 const probability=c.parentUrban?.9:Math.max(.1,Math.min(.9,c.countryUrban/100*(c.university?1.2:.7)));
 return draw()<probability;
}
