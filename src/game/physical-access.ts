import type{Life}from'./types';
import type{PhysicalEnvironment}from'./physical-state';
import{educationEraInputs}from'./education-era';
const clamp=(n:number,low:number,high:number)=>Math.max(low,Math.min(high,n));
export function physicalEnvironment(life:Life):PhysicalEnvironment{
 return{ppp:educationEraInputs(life.country,life.era,life.year).statistics.ppp,region:life.country.region,year:life.year};
}
/** Original-game assistive access calibration; not an individual medical prediction. */
export function physicalAccess(environment:PhysicalEnvironment):number{
 return clamp(.03+.87*(Math.log(environment.ppp)-Math.log(1500))/(Math.log(60000)-Math.log(1500)),.03,.9)*(environment.year<1980&&environment.region!=='hi'?.5:1);
}
