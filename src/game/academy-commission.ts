import {graduateSchool,type AcademicState} from './school-model';
import type {AcademyBranch} from './college-academy';
export interface CommissionEffect {
 job:'soldier';formal:true;percentile:number;officerSince:number;branch:AcademyBranch;suppressContinuation:true;
}
/** Before ordinary graduation continuation. Calibration is the resolved national PCAL × eraPcalK, not a guessed income multiplier. */
export function commissionAcademy(academic:AcademicState,age:number,country:string,calibration:number):{academic:AcademicState;effect:CommissionEffect|null} {
 const academy=academic.academy,school=academic.enrollment;
 if(!academy||academy.commissionedAge!==undefined||!school||school.stage!=='university'||school.paused||!school.graduationPending||school.completedYears<4||age<=school.lastSettledAge)return {academic,effect:null};
 if(!Number.isFinite(calibration)||calibration<=0)throw new RangeError('Missing officer pay calibration');
 const graduated=graduateSchool(school,academic.qualification,academic.doctorate);
 return {academic:{...academic,enrollment:graduated.school,qualification:graduated.education,academy:{...academy,commissionedAge:age},lastGraduation:{stage:'university',age,country:academic.studyCountry??country}},effect:{job:'soldier',formal:true,percentile:.68**calibration+.03,officerSince:age,branch:academy.branch,suppressContinuation:true}};
}
