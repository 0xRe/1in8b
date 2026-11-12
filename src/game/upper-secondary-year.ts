/** Audited schoolYear/quitAsk/schquit rules; the runtime commits these results once per observed school year. */
export type SchoolWithdrawalReason='bullying'|'marks'|'money'|'work'|'exam';
export interface UpperSecondaryYearContext {
 age:number;country:string;stage:'upperSecondary'|'vocational';completedYears:number;duration:number;
 retention?:number;persistent:boolean;developmentalProtection:boolean;homeSchool:boolean;quintile:number;war:number;
 withdrawalAnswered:boolean;committedToStay:boolean;militaryAcademy:boolean;studyAbroad:boolean;student:boolean;
 married:boolean;refugee:boolean;bullyingCount:number;knowledge:number;
}
export interface UpperSecondaryYearResult {
 kind:'continue'|'withdraw'|'choice';clearRetention:boolean;reason?:SchoolWithdrawalReason;mandatory?:boolean;
 happiness?:number;job?:'childwork'|'seeking';
}
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export function settleUpperSecondaryRisk(c:UpperSecondaryYearContext,draw:()=>number):UpperSecondaryYearResult {
 const keep:UpperSecondaryYearResult={kind:'continue',clearRetention:c.retention!==undefined&&c.completedYears>=c.duration};
 if(c.completedYears<1||c.completedYears>=c.duration)return keep;
 if(c.retention!==undefined&&!c.developmentalProtection&&draw()<(c.persistent?.8:1)*(1-clamp(c.retention,.01,1)**(1/(c.duration-1)))){
  const own=c.age>=15&&!c.homeSchool&&c.quintile>3&&c.war<1&&c.country!=='PRK';
  if(own)return c.committedToStay||c.withdrawalAnswered?{kind:'continue',clearRetention:true}:{kind:'choice',clearRetention:true,reason:c.knowledge<60?'marks':'work',mandatory:true};
  return {kind:'withdraw',clearRetention:true,happiness:-4,job:c.age<15?'childwork':'seeking'};
 }
 if(c.age<15||c.age>17||c.homeSchool||c.withdrawalAnswered||c.committedToStay||c.developmentalProtection||c.militaryAcademy||c.studyAbroad||!c.student||c.married||c.country==='PRK'||c.refugee||c.war>=1)return keep;
 const reasons:SchoolWithdrawalReason[]=[];
 if(c.bullyingCount>=1)reasons.push('bullying');
 if(c.knowledge<45)reasons.push('marks');
 if(c.quintile<=2)reasons.push('money');
 if(c.country==='KOR'&&c.stage==='upperSecondary'&&c.knowledge>=75)reasons.push('exam');
 if(!reasons.length)return keep;
 const reason=reasons[Math.floor(draw()*reasons.length)];
 return draw()<.07?{kind:'choice',reason,mandatory:false,clearRetention:false}:keep;
}
export function resolveSchoolWithdrawal(choice:'stay'|'ged'|'work',reason:SchoolWithdrawalReason,age:number):{
 leave:boolean;committedToStay:boolean;happiness:number;knowledge:number;examAt:number|null;
} {
 if(choice==='stay')return {leave:false,committedToStay:true,happiness:reason==='exam'?0:-1,knowledge:reason==='exam'?1:0,examAt:null};
 return {leave:true,committedToStay:false,happiness:reason==='bullying'?2:-2,knowledge:0,examAt:choice==='ged'?age+1:null};
}
export interface EquivalencyExamContext {
 age:number;examAt:number|null;target:1|2|3;qualification:number;knowledge:number;
 learnWeight:number;studyWeight:number;country:string;collegeCompleted:boolean;
}
/** Caller clears the pending exam together with this result; failure never leaves an automatic retry scheduled. */
export function settleEquivalencyExam(c:EquivalencyExamContext,draw:()=>number):{
 passed:boolean;qualification:number;happiness:number;knowledge:number;queueCollege:boolean;highSchoolPassAge:number|null;
}|null {
 if(c.examAt===null||c.age+1<c.examAt)return null;
 const passed=draw()<clamp(.72+(c.knowledge-40)/150+.15*(c.learnWeight+c.studyWeight),.25,.92);
 return {passed,qualification:passed?Math.max(c.qualification,c.target):c.qualification,happiness:passed?6:-3,knowledge:passed?2:0,queueCollege:passed&&c.target===3&&c.age<=25&&!c.collegeCompleted&&c.country!=='PRK',highSchoolPassAge:passed&&c.target===3?c.age:null};
}
