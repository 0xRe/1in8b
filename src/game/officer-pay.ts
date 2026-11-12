import data from '../data/job-pay-calibration.json';
import {incomeAtPercentile,percentileOfIncome,type IncomeCountry} from './income-distribution';
const calibration:Record<string,number>=data.pcal,minimum:Record<string,number>=data.minw;
type PayCountry=IncomeCountry&{ter:number;agr:number};
const clamp=(value:number,low:number,high:number)=>Math.max(low,Math.min(high,value));
/** current must contain actual source year-adjusted PPP, tertiary and agricultural shares. */
export function officerPayCalibration(current:PayCountry,modern:PayCountry,historical:boolean):number {
 const era=historical?clamp(Math.exp(.739*(current.ter-modern.ter)/100-.048*(current.agr-modern.agr)/100+.168*Math.log(current.ppp/modern.ppp)),.3,3):1;
 return (calibration[current.id]??1)*era;
}
export interface OfficerPayModifiers {workShare:number;reducedHours:boolean;reducedWork:boolean;migrationPenalty:number}
/** Formal state jobs are exempt from the source gender-pay adjustment. This does not implement job-entry gifts/party/history. */
export function officerEntryIncome(current:PayCountry,modern:PayCountry,year:number,historical:boolean,m:OfficerPayModifiers):number {
 return officerIncome(current,year,.68**officerPayCalibration(current,modern,historical)+.03,m);
}
function officerIncome(current:PayCountry,year:number,settledPercentile:number,m:OfficerPayModifiers):number {
 const percentile=settledPercentile-m.migrationPenalty;
 const wageFloor=year>=2015?(minimum[current.id]??0)*1.15*incomeAtPercentile(current,.5):0;
 const income=clamp(Math.max(incomeAtPercentile(current,percentile),wageFloor),incomeAtPercentile(current,.004),incomeAtPercentile(current,.996));
 return income*(1+.1*m.workShare)*(m.reducedHours?.6:1)*(m.reducedWork?.55:1);
}

/** Source officer ladder has two promotions. Apply rank headroom after national/era calibration. */
export function officerPayRange(current:PayCountry,modern:PayCountry,historical:boolean,rank:0|1|2):[number,number] {
 const exponent=officerPayCalibration(current,modern,historical);
 const low=.68**exponent,high=.9**exponent;
 return [low,high+Math.max(0,.985-high)*[0,.8,.95][rank]];
}
export interface OfficerAnnualModifiers extends OfficerPayModifiers {
 apprentice:boolean;rehired:boolean;ageIncomeFactor:number;eraIncomeFactor:number;
 /** Caller must establish current-country mobilization, active front service, war and start year. */
 frontPayPercentile:number|null;
}
/** Annual source salary after percentile progression, before pension additions. */
export function officerAnnualIncome(current:PayCountry,year:number,percentile:number,m:OfficerAnnualModifiers):number {
 const wage=officerIncome(current,year,percentile,m)*(m.apprentice?.5:1)*(m.rehired?.65:1)*m.ageIncomeFactor*m.eraIncomeFactor;
 return m.frontPayPercentile===null?wage:Math.max(wage,incomeAtPercentile(current,m.frontPayPercentile));
}

/** Formal soldier employment is neither self-employed nor a special-job minimum-wage exemption. */
export function officerMinimumPercentile(current:PayCountry,year:number):number {
 return year<2015||!minimum[current.id]?0:percentileOfIncome(current,incomeAtPercentile(current,.5)*minimum[current.id]*1.15);
}
export function officerAgeIncomeFactor(age:number):number {
 return age<70?1:Math.max(.35,1-.05*(age-68));
}
