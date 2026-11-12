import {primarySchoolAccess,type PrimarySchoolContext} from './primary-school-access';
export interface PrimaryEntryContext extends PrimarySchoolContext {
 country:string;refugee:boolean;irregular:boolean;
 /** Specific restricted camp learning-centre pathway, not all refugee households. */
 learningCentreOnly:boolean;
 /** Present living parent whose occupation requires a degree; resolve from actual family records. */
 educatedParentPresent:boolean;
}
/** null means no homeschool draw; zero still consumes the supported country's historical draw. */
export function homeSchoolProbability(country:string,year:number):number|null {
 if(country!=='USA')return null;
 if(year<1985)return 0;
 if(year<1999)return .017*(year-1985)/14;
 if(year<2007)return .017+.012*(year-1999)/8;
 if(year<2012)return .029+.001*(year-2007);
 return .034;
}
/** Admission result only. The runtime commits enrollment and its event once at the entry boundary. */
export function resolvePrimaryEntry(context:PrimaryEntryContext,draw:()=>number):'school'|'homeSchool'|'learningCentre'|'outOfSchool' {
 if(context.learningCentreOnly)return draw()<.72?'learningCentre':'outOfSchool';
 const access=primarySchoolAccess(context);
 let admission=context.placement==='private'&&context.war<1?1:access.publicStart;
 if(context.educatedParentPresent&&context.war<1)admission=Math.max(admission,.998);
 const home=homeSchoolProbability(context.country,context.year);
 if(home!==null&&context.placement!=='private'&&!context.refugee&&!context.irregular&&context.war<1&&draw()<home)return 'homeSchool';
 return draw()<admission?'school':'outOfSchool';
}
