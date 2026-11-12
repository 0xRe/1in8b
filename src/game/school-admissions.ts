/** Audited original 0.8.36 mechanics; caller must supply contextual, not national, tertiary odds. */
const examCountries=new Set(['KOR','JPN','CHN','TWN','VNM','IRN','TUR','IND','EGY','NGA','GRC']);
const twoRetakes=new Set(['KOR','JPN','CHN','TWN']);
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
export interface RetakeContext {
 country:string;age:number;attempts:number;quintile:number;happiness:number;ppp:number;
 married:boolean;refugee:boolean;irregular:boolean;imprisoned:boolean;
}
export function retakeEligibility(c:RetakeContext):'eligible'|'restricted'|'ineligible'|'money' {
 if(c.country==='PRK')return 'restricted';
 const maximum=(twoRetakes.has(c.country)?2:1)+(c.quintile>=4&&c.happiness>=35?1:0);
 if(c.attempts>=maximum||c.age>22||c.married||c.refugee||c.irregular||c.imprisoned)return 'ineligible';
 if(c.ppp<15000&&c.quintile<3)return 'money';
 return 'eligible';
}
export interface UniversityAdmissionContext {
 conditionalTertiary:number;knowledgeZ:number;age:number;country:string;retaking:boolean;
}
/** Before era and neurodevelopment modifiers; no RNG consumption or enrollment mutation. */
export function universityAdmissionProbability(c:UniversityAdmissionContext):number {
 const p=clamp(Math.max(c.conditionalTertiary,.03),.0001,.9999);
 const effort=1.15*(c.age<=13?1.7:2.05)*Math.exp(.85*clamp(c.knowledgeZ,-3,3)-.85**2/2);
 const attempt=c.retaking?(examCountries.has(c.country)?.55:.25):(c.country==='PRK'?1:.9);
 const multiplier=effort*attempt;
 const probability=p*multiplier/(1-p+p*multiplier);
 return c.knowledgeZ>=1.75&&c.conditionalTertiary>=.3?1-(1-probability)*.25:probability;
}
export function graduateAdmissionProbability(tertiaryPercentage:number,knowledge:number,quintile:number):number {
 return clamp(.1+tertiaryPercentage/400+(knowledge-40)/300+(quintile-3)*.03,.05,.45);
}

export interface UniversityApplicationContext extends UniversityAdmissionContext {
 birthCountry:string;vocationalTrack:boolean;eraMultiplier:number;
 neurodevelopmentMultiplier:number;unsupportedAutism:boolean;
}
export interface UniversityApplicationResult {
 status:'enrolled'|'rejected';mode:'open'|'competitive';retention:number|null;
}
const openUniversity:Record<string,{coefficient:number;academicTrackRequired:boolean}>={
 ARG:{coefficient:.45,academicTrackRequired:false},FRA:{coefficient:1,academicTrackRequired:false},
 DEU:{coefficient:1,academicTrackRequired:true},AUT:{coefficient:1,academicTrackRequired:true},CHE:{coefficient:1,academicTrackRequired:true},
};
/** Resolve an eligible application. Closure, custody and access checks precede this step. */
export function resolveUniversityApplication(c:UniversityApplicationContext,draw:()=>number):UniversityApplicationResult {
 const probability=universityAdmissionProbability(c);
 const open=openUniversity[c.country];
 if(open&&c.country===c.birthCountry&&!(open.academicTrackRequired&&c.vocationalTrack)){
  return {status:'enrolled',mode:'open',retention:clamp(probability*open.coefficient*c.neurodevelopmentMultiplier,.05,.9)};
 }
 const threshold=probability*c.eraMultiplier*(c.unsupportedAutism?.66:1)*c.neurodevelopmentMultiplier;
 // The source draws once even when the threshold is zero or exceeds one.
 return {status:draw()<threshold?'enrolled':'rejected',mode:'competitive',retention:null};
}

/** Original automatic retake policy; attempts count previously accepted preparation years. */
export function automaticRetakeProbability(country:string,attempts:number,quintile:number):number {
 return (examCountries.has(country)?.5:.25)*(attempts>=2?.3:attempts===1?.5:1)*(quintile>=3?1.2:.7);
}
