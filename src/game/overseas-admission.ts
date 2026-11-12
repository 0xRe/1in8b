export interface OverseasApplication {
 level:'university'|'graduate';knowledge:number;admissionFactor:number;policyFactor:number;
 languageMatches:boolean;graduateProbability:number;scholarshipProbability:number;
 fullScholarship:boolean;selfFunded:boolean;quintile:number;quotedCost:number;savings:number;debt:number;
}
export interface OverseasAdmission {
 outcome:'overseas'|'domesticApplication'|'domesticGraduate'|'work'|'fundingUnavailable';
 governmentScholarship:boolean;familyContribution:number;personalCost:number;savings:number;debt:number;
 preparationYears:0|1;happiness:number;knowledge:number;
}
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
/** Caller validates a saved offer and atomically records this result before applying effects.
 * quotedCost already includes destination pricing and the language preparation surcharge.
 */
export function resolveOverseasAdmission(c:OverseasApplication,draw:()=>number):OverseasAdmission {
 const graduate=c.level==='graduate';
 const result:OverseasAdmission={outcome:'work',governmentScholarship:false,familyContribution:0,personalCost:0,savings:c.savings,debt:c.debt,preparationYears:0,happiness:-5,knowledge:0};
 const probability=c.fullScholarship
  ?clamp((.15+(c.knowledge-50)/300)*c.admissionFactor,.04,.3)
  :clamp((graduate?c.graduateProbability*.8+(c.knowledge-50)/200:.6+(c.knowledge-40)/100)*c.admissionFactor*c.policyFactor*(c.languageMatches?1:.9),.05,graduate?.85:.95);
 if(draw()>=probability){
  if(!graduate||c.fullScholarship)result.outcome='domesticApplication';
  else if(draw()<c.graduateProbability*.8){result.outcome='domesticGraduate';result.happiness=-2;}
  return result;
 }
 result.outcome='overseas';result.preparationYears=c.languageMatches?0:1;
 result.knowledge=graduate?4:6;result.happiness=c.fullScholarship?8:c.languageMatches?4:2;
 if(c.fullScholarship)return result;
 result.governmentScholarship=draw()<c.scholarshipProbability;
 const total=c.quotedCost*(result.governmentScholarship?.25:1);
 const share=c.selfFunded?0:graduate?([0,0,0,.2,.4,.6][c.quintile]??0):c.quintile>=5?.7:.4;
 result.familyContribution=total*share;result.personalCost=total-result.familyContribution;
 const cash=Math.min(c.savings,result.personalCost);
 const debt=c.debt+(result.personalCost-cash);
 // Refuse an unrepresentable charge before committing tuition or study effects.
 if(!Number.isFinite(debt)||debt>1e12)return {outcome:'fundingUnavailable',governmentScholarship:false,familyContribution:0,personalCost:0,savings:c.savings,debt:c.debt,preparationYears:0,happiness:-5,knowledge:0};
 result.savings=c.savings-cash;result.debt=debt;
 return result;
}
