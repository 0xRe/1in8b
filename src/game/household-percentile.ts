import type {Country} from './types';
// Abramowitz–Stegun erf approximation; inversion below is an independent bisection.
export function normalCdf(value: number): number {
  const x=Math.abs(value)/Math.SQRT2;
  const t=1/(1+0.3275911*x);
  const tail=((((1.061405429*t-1.453152027)*t+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);
  return value<0 ? tail/2 : 1-tail/2;
}
const sigmas=new Map<number,number>();
function sigma(gini: number): number {
  const cached=sigmas.get(gini);
  if(cached!==undefined)return cached;
  let low=0,high=4;
  for(let iteration=0;iteration<48;iteration++){
    const middle=(low+high)/2;
    if(normalCdf(middle)<(gini+1)/2)low=middle;else high=middle;
  }
  const result=(low+high)/2*Math.SQRT2;
  sigmas.set(gini,result);
  return result;
}
/** Inputs are present annual incomes in the model's PPP units, not birth-income quintiles. */
export function householdIncomePercentile(country: Pick<Country,'id'|'region'|'gi'|'ppp'>, playerIncome: number, marriedPartnerIncome: number): number {
  const adjusted=['ssa','sa','mena'].includes(country.region)||(country.region==='eap'&&country.id!=='CHN');
  const spread=sigma(Math.max(.22,Math.min(.68,country.gi+(adjusted?.07:0))));
  const income=Math.max(1,Math.max(0,playerIncome)+marriedPartnerIncome)*.75;
  const location=Math.log(country.ppp*.9)-spread*spread/2;
  return normalCdf((Math.log(Math.max(1,income))-location)/spread);
}
