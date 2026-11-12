import completionData from '../data/education-completion.json';
import {getCountryById} from './countries';
import type {Country,Sex} from './types';
type Four = [number,number,number,number];
const calibrated:Record<string,number[]>=completionData;
const clamp=(x:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,x));
const odds=(p:number,m:number)=>{const q=clamp(p,.0001,.9999);return q*m/(1-q+q*m);};
const logistic=(x:number)=>1/(1+Math.exp(-x));
const logit=(p:number)=>Math.log(p/(1-p));
const femaleConstraints=new Set(['PAK','NER','TCD','MLI','CAF','SSD','YEM','GIN','BEN','SOM','BFA','CIV','CMR','ETH']);
const upperSecondary:Record<string,number>={KOR:.995,JPN:.985,TWN:.99};
const model=(years:number,region:string)=>[logistic(((region==='ssa'?years*.78:years)-7)/1.3),logistic((years-10)/1.4),logistic((years-12)/1.5)];
export interface EducationAccessContext {
 sex:Sex;quintile:number;urban:boolean;year?:number;
 /** Era-adjusted model years; calibration remains anchored to the modern country. */
 expectedYears?:number;
 historical?:{primary:number;secondary:number};
 /** Already resolved domain modifiers, in original application order. */
 disclosedDisabilityMultiplier?:number;upperSecondaryMultiplier?:number;
 intellectualDisability?:boolean;schoolEthnicityMultiplier?:number;universityEthnicityMultiplier?:number;
 wealthBoost?:5|10;
}
export interface EducationAccess {
 completion:Four;transitions:Four;secondaryBanned:boolean;universityClosed:boolean;
}
/** Simulation mechanics, not predictions about an individual or a current admissions policy. */
export function educationAccess(country:Country,c:EducationAccessContext):EducationAccess {
 let [primary,lower,upper]=model(c.expectedYears??country.eys,country.region);
 const rates=calibrated[country.id];
 const baseline=getCountryById(country.id);
 if(rates&&baseline){
  const modern=model(baseline.eys,baseline.region);
  const values=[primary,lower,upper].map((value,index)=>{
   if(!rates[index])return value;
   const shift=logit(clamp(rates[index]/100,.02,.995))-logit(clamp(modern[index],.002,.999));
   return shift?logistic(logit(value)+shift):value;
  });
  primary=values[0];lower=Math.min(values[1],primary*.998);upper=Math.min(values[2],lower*.998);
 }
 let tertiary=Math.min(.78,country.ter/100*.75);
 if(c.historical&&!(country.id==='PRK'&&(c.year??0)>=1975)){
  primary=Math.min(.995,primary*c.historical.primary);
  lower=Math.min(primary*.995,lower*c.historical.secondary**.7);
  upper=Math.min(lower*.995,upper*c.historical.secondary**1.2);
  tertiary=Math.min(tertiary,upper*.95);
 }
 const lowIncome=country.ppp<15000;
 const household=Math.exp((lowIncome?.6:.45)*(c.quintile-3))*(lowIncome?(c.urban?1.4:.75):1);
 let sexFactor=1;
 if(c.sex==='F'&&femaleConstraints.has(country.id))sexFactor=1-.35*(c.quintile>=5?(c.urban?.25:.7):(c.quintile===4&&c.urban?.6:1));
 const schoolHousehold=country.id==='PRK'?1:household;
 const transitions:Four=[
  odds(primary,schoolHousehold*sexFactor),odds(lower/primary,schoolHousehold*sexFactor),odds(upper/lower,schoolHousehold*sexFactor),
  odds(Math.min(.95,tertiary/Math.max(upper,.05)),household*(c.sex==='F'&&!['sa','ssa','mena'].includes(country.region)?1.2:c.sex==='M'?.9:sexFactor)),
 ];
 const override=upperSecondary[country.id];
 if(override&&!(c.year&&c.year<2000)){
  upper=Math.max(upper,override);transitions[2]=Math.max(transitions[2],override-(5-c.quintile)*.003);
 }
 const apply=(indexes:number[],multiplier:number|undefined)=>{
  if(multiplier===undefined||multiplier===1)return;
  for(const i of indexes)transitions[i]=odds(transitions[i],multiplier);
 };
 apply([0,1,2,3],c.disclosedDisabilityMultiplier);
 apply([2],c.upperSecondaryMultiplier);
 if(c.intellectualDisability)apply([3],.2);
 apply([0,1,2],c.schoolEthnicityMultiplier);apply([3],c.universityEthnicityMultiplier);
 apply([0,1,2,3],c.wealthBoost);
 let secondaryBanned=false,universityClosed=false;
 if(country.id==='AFG'&&c.sex==='F'&&(!c.year||(c.year>=1996&&c.year<=2001)||c.year>=2021)){
  transitions[1]=transitions[2]=transitions[3]=0;secondaryBanned=true;
 }
 if(c.year){
  if(country.id==='CHN'&&c.year>=1966&&c.year<=1976){transitions[3]*=c.year>=1970?.1:0;universityClosed=true;}
  if(country.id==='KHM'&&c.year>=1975&&c.year<=1979){transitions.fill(0);universityClosed=true;}
  if(country.id==='IRN'&&c.year>=1980&&c.year<=1983){transitions[3]=0;universityClosed=true;}
 }
 return {completion:[primary,lower,upper,tertiary],transitions,secondaryBanned,universityClosed};
}
