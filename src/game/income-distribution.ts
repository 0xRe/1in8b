import {normalQuantile} from './normal-quantile';
export interface IncomeCountry {id:string;region:string;ppp:number;gi:number}
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
/** Inputs must already reflect the current calendar year's national statistics. */
function incomeSigma(country:IncomeCountry):number {
 const adjustment=['ssa','sa','mena'].includes(country.region)||(country.region==='eap'&&country.id!=='CHN')?.07:0;
 const inequality=clamp(country.gi+adjustment,.22,.68);
 return Math.SQRT2*normalQuantile((inequality+1)/2);
}
export function incomeAtPercentile(country:IncomeCountry,percentile:number):number {
 const sigma=incomeSigma(country);
 return country.ppp*.9*Math.exp(sigma*normalQuantile(clamp(percentile,.003,.997))-sigma*sigma/2);
}
export function childWorkIncome(country:IncomeCountry,paid:boolean):number {
 return paid?incomeAtPercentile(country,.05)*.15:0;
}

/** Source pctOfIncome, including its normal-CDF approximation and one-unit income floor. */
export function percentileOfIncome(country:IncomeCountry,income:number):number {
 const sigma=incomeSigma(country);
 const z=(Math.log(Math.max(1,income))-(Math.log(country.ppp*.9)-sigma*sigma/2))/sigma;
 const t=1/(1+.2316419*Math.abs(z));
 const tail=.3989423*Math.exp(-z*z/2)*t*(.3193815+t*(-.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));
 return z>0?1-tail:tail;
}

/** Global income percentile based on world median PPP (~$12,500) and global inequality (~0.62). */
export function worldIncomePercentile(income:number):number {
 const worldGini = 0.62;
 const worldPpp = 12500;
 const sigma = Math.SQRT2 * normalQuantile((worldGini + 1) / 2);
 const z = (Math.log(Math.max(1, income)) - (Math.log(worldPpp * 0.9) - sigma * sigma / 2)) / sigma;
 const t = 1 / (1 + 0.2316419 * Math.abs(z));
 const tail = 0.3989423 * Math.exp(-z * z / 2) * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
 return z > 0 ? 1 - tail : tail;
}
