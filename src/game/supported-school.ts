export interface SupportedSchoolAccess {ppp:number;region:string;year:number}
export type SupportedSchoolKind='specialSchool'|'specialClass'|'home';
export const richSchoolSupport=(c:SupportedSchoolAccess)=>c.ppp>=15000&&['hi','eca'].includes(c.region);
export function supportedSchoolAccess(c:SupportedSchoolAccess):number {
 return Math.max(.03,Math.min(.9,.03+.87*(Math.log(c.ppp)-Math.log(1500))/(Math.log(60000)-Math.log(1500))))*(c.year<1980&&c.region!=='hi'?.5:1);
}
/** Source ddSchoolStart: level3 does not consume the special-class selection draw. */
export function supportedSchoolEntry(level:2|3,c:SupportedSchoolAccess,draw:()=>number):SupportedSchoolKind {
 if(!richSchoolSupport(c)&&draw()>=supportedSchoolAccess(c))return 'home';
 return level===3||draw()>=.69?'specialSchool':'specialClass';
}
/** Source ddSchoolNext: successful supported study has a separate continuation path. */
export function supportedSchoolContinuation(stage:'primary'|'lowerSecondary'|'upperSecondary'|'vocational',age:number,c:SupportedSchoolAccess,draw:()=>number):'lowerSecondary'|'upperSecondary'|'home'|'adult' {
 if(stage==='upperSecondary'||stage==='vocational'||stage==='lowerSecondary'&&!richSchoolSupport(c)||stage==='primary'&&!richSchoolSupport(c)&&draw()>=supportedSchoolAccess(c))return age>=18||stage==='upperSecondary'||stage==='vocational'?'adult':'home';
 return stage==='primary'?'lowerSecondary':'upperSecondary';
}
