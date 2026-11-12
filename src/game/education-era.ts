import data from '../data/education-era.json';
import type {Country,Era} from './types';
import type {EducationAccessContext} from './education-access';
interface Series {e1:number[];e2:number[];e3:number[];g?:number[];own?:number}
const series:Record<string,Series>=data;
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
function interpolate(values:number[],year:number):number {
 const position=clamp((year-1950)/5,0,values.length-1),index=Math.floor(position),fraction=position-index;
 return index===values.length-1?values[index]:values[index]*(1-fraction)+values[index+1]*fraction;
}
/** Only education and purchasing power are adjusted; other country statistics are not implied. */
export function educationEraInputs(country:Country,era:Era,calendarYear:number):{
 statistics:Pick<Country,'ppp'|'ter'|'eys'>;
 access:Pick<EducationAccessContext,'year'|'expectedYears'|'historical'>;
} {
 const statistics={ppp:country.ppp,ter:country.ter,eys:country.eys};
 if(era==='today')return {statistics,access:{}};
 const year=clamp(Math.round(calendarYear),1950,2100),history=series[country.id];
 const access:Pick<EducationAccessContext,'year'|'expectedYears'|'historical'>={year};
 statistics.ppp=Math.round(eraPurchasingPower(country,era,calendarYear));
 if(year>=2026){
  statistics.ter=country.ter+(Math.min(100,country.ter+35)-country.ter)*(1-Math.exp(-(year-2026)/35));
  statistics.eys=country.eys+(Math.max(country.eys,16.5)-country.eys)*(1-Math.exp(-(year-2026)/40));
 }else if(history){
  const endpoint=history.own?history.e3[12]:country.ter/1.45;
  const normalization=history.own?1:country.ter/1.45/Math.max(.5,history.e3[12]);
  const index=(y:number)=>6*Math.min(1,interpolate(history.e1,y)/100)+6*Math.min(1,interpolate(history.e2,y)/100)+4*Math.min(1,interpolate(history.e3,y)/100);
  const expected=country.eys/1.08;
  statistics.ter=clamp(year<=2010?interpolate(history.e3,year)*normalization:endpoint+(country.ter-endpoint)*(year-2010)/16,0,100);
  statistics.eys=clamp(year<=2010?expected*index(year)/Math.max(.5,index(2010)):expected+(country.eys-expected)*(year-2010)/16,.5,20);
  if(year<2010){
   access.expectedYears=expected;
   access.historical={primary:clamp(interpolate(history.e1,year)/Math.max(1,interpolate(history.e1,2010)),.02,1.1),secondary:clamp(interpolate(history.e2,year)/Math.max(1,interpolate(history.e2,2010)),.01,1.1)};
  }
 }
 statistics.ter=Math.round(statistics.ter);statistics.eys=Math.round(statistics.eys*10)/10;
 return {statistics,access};
}

/** Shared raw PPP before the source rounds country statistics; sector projection needs this precision. */
export function eraPurchasingPower(country:Country,era:Era,calendarYear:number):number {
 if(era==='today')return country.ppp;
 const year=clamp(Math.round(calendarYear),1950,2100),history=series[country.id];
 let scale=1;
 if(year<=2025)scale=history?.g?interpolate(history.g,year)/1000:1.02**(year-2026);
 else {
  let purchasingPower=country.ppp;
  for(let y=2026;y<year;y++){
   const growth=.009+.017*(1-Math.min(1,purchasingPower/60000));
   purchasingPower*=1+growth;scale*=1+growth;
  }
 }
 return Math.max(250,country.ppp*scale);
}
