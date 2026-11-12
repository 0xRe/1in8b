import rates from '../data/pension-replacement.json';
import {incomeAtPercentile,type IncomeCountry} from './income-distribution';
type PensionCountry=IncomeCountry&{tfr:number};
const clamp=(v:number,l:number,h:number)=>Math.max(l,Math.min(h,v));
export const pensionReplacementRate=(c:PensionCountry)=>((rates as Record<string,number>)[c.id]??(c.region==='hi'?45:35))/100;
export const pensionYearFactor=(years:number)=>years>=10?clamp(years/40,.6,1):.6;
export function pensionEraFactor(c:PensionCountry,year:number,era:boolean):number {
 if(!era)return 1;
 if(year<2026)return c.id==='KOR'&&year<2008?clamp((year-1988)/20,.15,1):1;
 return c.tfr<1.6&&(c.region==='hi'||c.region==='eca')?1-.25*clamp((year-2035)/35,0,1):1;
}
export interface PensionBaseContext {
 country:PensionCountry;birthCountry:string;year:number;era:boolean;formalYears:number;civilYears:number;income:number;careerIncome:number;
 history:readonly {age:number;country:string;income:number}[];
 /** Modern country statistics, as used by the source's qualifying-history threshold. */
 countries:Readonly<Record<string,PensionCountry>>;
}
export function civilServicePensionRate(c:PensionBaseContext):number {
 const id=c.country.id,n=c.civilYears,y=c.year;
 if(c.birthCountry!==id||!['KOR','CHN'].includes(id))return 0;
 if(id==='KOR')return y<2010?n>=20?Math.min(.76,.5+.02*(n-20)):0:y<2016?n>=20?.019*Math.min(n,33):0:n>=10?(.019-.002*clamp((y-2016)/19,0,1))*Math.min(n,36):0;
 if(n<20)return 0;
 const legacy=.8+.1*clamp((n-20)/15,0,1);
 return y<2025?legacy:Math.min(legacy,pensionReplacementRate(c.country)*pensionYearFactor(c.formalYears)+.12*Math.min(n,y-2014)*12/139);
}
export function ordinaryPensionBase(c:PensionBaseContext,draw:()=>number):number {
 const country=c.country,eligible=country.region==='hi'||country.region==='eca'||c.formalYears>=10||country.region==='lac'&&draw()<.5;
 const era=pensionEraFactor(country,c.year,c.era),rate=pensionReplacementRate(country)*era,years=pensionYearFactor(c.formalYears),income=Math.max(c.income,c.careerIncome);
 let value=eligible?Math.max(incomeAtPercentile(country,.5)*.25*era,income*rate*years):0;
 const civil=civilServicePensionRate(c);
 if(civil>0){const total=Math.max(c.formalYears,c.civilYears),factor=c.era&&c.year>=2026?era:1;value=Math.max(value,income*civil*factor+(country.id==='KOR'?value*Math.max(0,total-c.civilYears)/total:0));}
 const earned=new Map<string,{years:number;income:number}>();let total=0;
 for(const row of c.history){const modern=c.countries[row.country];if(row.age<20||!modern||row.income<incomeAtPercentile(modern,.5)*.25)continue;const entry=earned.get(row.country)??{years:0,income:0};entry.years++;entry.income+=row.income;earned.set(row.country,entry);total++;}
 const foreign=[...earned.keys()].filter(id=>id!==country.id);
 if(!total||!foreign.length)return value;
 const home=earned.get(country.id);
 let combined=eligible&&home?Math.max(incomeAtPercentile(country,.5)*.25*era,home.income/home.years*rate*years)*home.years/total:0;
 for(const id of foreign){const modern=c.countries[id],entry=earned.get(id)!;if(['hi','eca'].includes(modern.region))combined+=entry.income/entry.years*pensionReplacementRate(modern)*pensionEraFactor(modern,c.year,c.era)*entry.years/total;}
 return combined;
}
